"""detector.py — детекция лиц и определение очков.

Модуль решает две задачи:

1. Находит лица в кадре. Поддерживаются три бэкенда (выбирается первый доступный):
   * ``mediapipe.tasks``  — современный API MediaPipe (FaceDetector + FaceLandmarker),
     модели скачиваются один раз в папку ``models/``;
   * ``mediapipe.solutions`` — классический API MediaPipe (версии 0.10.x);
   * ``OpenCV Haar Cascade`` — работает всегда, без интернета и без MediaPipe.

2. По каждому лицу считает вероятность того, что на человеке очки.
   Используется эвристика по краям (Sobel): оправа очков даёт длинные
   горизонтальные линии на переносице, над глазами и на дужках у висков,
   чего нет на гладкой коже. Все метрики нормируются по шуму кожи щеки,
   поэтому детектор устойчив к шумному видео с IP-камеры.

Результат сглаживается по времени (медиана последних кадров + гистерезис),
чтобы статус не «мигал» между «В ОЧКАХ» и «БЕЗ ОЧКОВ».
"""

from __future__ import annotations

import logging
import math
import os
import threading
import time
import urllib.request
from collections import deque
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

import cv2
import numpy as np

log = logging.getLogger("periscope.detector")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.environ.get("MODELS_DIR", os.path.join(BASE_DIR, "models"))

# Модели скачиваются автоматически при первом запуске в папку ``models/``.
# Приложение работает и без интернета — просто с более простым бэкендом.
MODEL_URLS = {
    # MediaPipe Tasks
    "face_detector.tflite": (
        "https://storage.googleapis.com/mediapipe-models/face_detector/"
        "blaze_face_short_range/float16/1/blaze_face_short_range.tflite"
    ),
    "face_landmarker.task": (
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
        "face_landmarker/float16/1/face_landmarker.task"
    ),
    # OpenCV YuNet — быстрый DNN-детектор лиц (запасной вариант без MediaPipe)
    # (opencv_zoo хранит веса в Git LFS — нужен media-адрес, а не raw)
    "face_detection_yunet.onnx": (
        "https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/"
        "face_detection_yunet/face_detection_yunet_2023mar.onnx"
    ),
    # Каскад Хаара — последний рубеж (в OpenCV 5 больше не входит в пакет)
    "haarcascade_frontalface_default.xml": (
        "https://raw.githubusercontent.com/opencv/opencv/4.x/data/"
        "haarcascades/haarcascade_frontalface_default.xml"
    ),
}

MEDIAPIPE_MODELS = ("face_detector.tflite", "face_landmarker.task")

# ---------------------------------------------------------------------------
# Индексы ключевых точек FaceMesh (топология из 468/478 точек)
# ---------------------------------------------------------------------------
LM_EYE_L_OUTER, LM_EYE_L_INNER = 33, 133
LM_EYE_R_INNER, LM_EYE_R_OUTER = 362, 263
LM_EYE_L_TOP, LM_EYE_L_BOTTOM = 159, 145
LM_EYE_R_TOP, LM_EYE_R_BOTTOM = 386, 374
LM_BROW_L, LM_BROW_R = 105, 334
LM_NOSE_BRIDGE, LM_NOSE_TIP = 168, 4
LM_CHEEK_L, LM_CHEEK_R = 50, 280
LM_FACE_L, LM_FACE_R = 234, 454
LM_FOREHEAD, LM_CHIN = 10, 152


# ---------------------------------------------------------------------------
# Структуры данных
# ---------------------------------------------------------------------------
@dataclass
class FaceResult:
    """Одно лицо в кадре с результатом проверки на очки."""

    track_id: int
    box: Tuple[int, int, int, int]          # x, y, w, h в пикселях
    face_score: float                        # уверенность детектора лиц (0..1)
    raw_score: float                         # «сырая» оценка очков для кадра (0..1)
    score: float                             # сглаженная оценка очков (0..1)
    glasses: bool                            # финальное решение
    confidence: float                        # уверенность распознавания, %
    stable_frames: int                       # сколько кадров подряд держится решение

    def to_dict(self) -> dict:
        x, y, w, h = self.box
        return {
            "track_id": self.track_id,
            "box": {"x": x, "y": y, "w": w, "h": h},
            "face_score": round(self.face_score, 3),
            "score": round(self.score, 3),
            "glasses": self.glasses,
            "confidence": round(self.confidence, 1),
        }


@dataclass
class _Track:
    """Внутреннее состояние одного отслеживаемого лица."""

    track_id: int
    box: Tuple[int, int, int, int]
    scores: deque = field(default_factory=lambda: deque(maxlen=9))
    glasses: bool = False
    stable_frames: int = 0
    last_seen: float = 0.0


# ---------------------------------------------------------------------------
# Вспомогательные функции
# ---------------------------------------------------------------------------
def _iou(a: Sequence[int], b: Sequence[int]) -> float:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    x1, y1 = max(ax, bx), max(ay, by)
    x2, y2 = min(ax + aw, bx + bw), min(ay + ah, by + bh)
    if x2 <= x1 or y2 <= y1:
        return 0.0
    inter = (x2 - x1) * (y2 - y1)
    union = aw * ah + bw * bh - inter
    return inter / union if union > 0 else 0.0


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def _soft(value: float, low: float, high: float) -> float:
    """Плавно переводит значение из диапазона [low, high] в [0, 1]."""
    if high <= low:
        return 0.0
    return _clamp((value - low) / (high - low))


def _aligned_patch(
    gray: np.ndarray,
    center: Tuple[float, float],
    size: Tuple[float, float],
    angle_deg: float,
) -> Optional[np.ndarray]:
    """Вырезает прямоугольник, повёрнутый вместе с наклоном головы."""
    w, h = int(round(size[0])), int(round(size[1]))
    if w < 6 or h < 4:
        return None
    matrix = cv2.getRotationMatrix2D((float(center[0]), float(center[1])), angle_deg, 1.0)
    matrix[0, 2] += w / 2.0 - center[0]
    matrix[1, 2] += h / 2.0 - center[1]
    patch = cv2.warpAffine(
        gray, matrix, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE
    )
    return patch if patch.size else None


def _gradients(patch: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    blurred = cv2.GaussianBlur(patch, (3, 3), 0)
    gx = cv2.Sobel(blurred, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(blurred, cv2.CV_32F, 0, 1, ksize=3)
    return gx, gy


def _horizontal_mask(patch: np.ndarray, threshold: float) -> np.ndarray:
    """Маска пикселей, принадлежащих горизонтальным краям (оправа очков)."""
    gx, gy = _gradients(patch)
    gy_abs, gx_abs = np.abs(gy), np.abs(gx)
    return (gy_abs > threshold) & (gy_abs > 1.4 * gx_abs)


def _line_coverage(patch: np.ndarray, threshold: float) -> Tuple[float, float]:
    """Возвращает (максимальная «сплошность» горизонтальной линии, плотность краёв)."""
    mask = _horizontal_mask(patch, threshold)
    if mask.size == 0:
        return 0.0, 0.0
    # Небольшое размытие по вертикали: линия оправы может «гулять» на 1-2 пикселя.
    rows = mask.astype(np.float32)
    if rows.shape[0] >= 3:
        rows = cv2.blur(rows, (1, 3))
    coverage = float(rows.mean(axis=1).max())
    density = float(mask.mean())
    return coverage, density


def _noise_level(patch: Optional[np.ndarray]) -> float:
    """Оценка «шумности» гладкого участка кожи — точка отсчёта для порогов."""
    if patch is None or patch.size == 0:
        return 8.0
    _, gy = _gradients(patch)
    return float(np.mean(np.abs(gy)))


# ---------------------------------------------------------------------------
# Отрисовка текста с поддержкой кириллицы
# ---------------------------------------------------------------------------
_FONT_CANDIDATES = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial.ttf",
)

_TRANSLIT = {
    "А": "A", "Б": "B", "В": "V", "Г": "G", "Д": "D", "Е": "E", "Ж": "ZH", "З": "Z",
    "И": "I", "Й": "Y", "К": "K", "Л": "L", "М": "M", "Н": "N", "О": "O", "П": "P",
    "Р": "R", "С": "S", "Т": "T", "У": "U", "Ф": "F", "Х": "H", "Ц": "C", "Ч": "CH",
    "Ш": "SH", "Щ": "SCH", "Ъ": "", "Ы": "Y", "Ь": "", "Э": "E", "Ю": "YU", "Я": "YA",
}


def _translit(text: str) -> str:
    return "".join(_TRANSLIT.get(ch, _TRANSLIT.get(ch.upper(), ch)) for ch in text.upper())


class TextPainter:
    """Рисует кириллический текст на кадре (PIL), с откатом на cv2.putText."""

    def __init__(self) -> None:
        self._fonts: Dict[int, object] = {}
        self._font_path: Optional[str] = None
        self._pil = None
        try:
            from PIL import Image, ImageDraw, ImageFont  # noqa: F401

            self._pil = (Image, ImageDraw, ImageFont)
            for path in _FONT_CANDIDATES:
                if os.path.exists(path):
                    self._font_path = path
                    break
        except ImportError:
            log.info("Pillow не найден — подписи будут латиницей")

    @property
    def unicode_ready(self) -> bool:
        return self._pil is not None and self._font_path is not None

    def _font(self, size: int):
        if size not in self._fonts:
            _, _, ImageFont = self._pil  # type: ignore[misc]
            self._fonts[size] = ImageFont.truetype(self._font_path, size)
        return self._fonts[size]

    def text_size(self, text: str, size: int) -> Tuple[int, int]:
        if self.unicode_ready:
            font = self._font(size)
            box = font.getbbox(text)
            return int(box[2] - box[0]), int(box[3] - box[1])
        scale = size / 30.0
        (w, h), _ = cv2.getTextSize(_translit(text), cv2.FONT_HERSHEY_SIMPLEX, scale, 2)
        return w, h

    def draw(
        self,
        frame: np.ndarray,
        text: str,
        origin: Tuple[int, int],
        size: int = 20,
        color: Tuple[int, int, int] = (255, 255, 255),
    ) -> np.ndarray:
        """Рисует текст; ``origin`` — левый верхний угол надписи."""
        if not self.unicode_ready:
            scale = size / 30.0
            cv2.putText(
                frame, _translit(text), (origin[0], origin[1] + size),
                cv2.FONT_HERSHEY_SIMPLEX, scale, color, 2, cv2.LINE_AA,
            )
            return frame
        Image, ImageDraw, _ = self._pil  # type: ignore[misc]
        image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        draw = ImageDraw.Draw(image)
        draw.text(origin, text, font=self._font(size), fill=(color[2], color[1], color[0]))
        frame[:] = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        return frame


PAINTER = TextPainter()


# ---------------------------------------------------------------------------
# Бэкенды детекции лиц
# ---------------------------------------------------------------------------
def ensure_model(name: str, allow_download: bool = True, timeout: float = 20.0) -> Optional[str]:
    """Возвращает путь к модели, при необходимости скачивая её один раз.

    Если модели нет и скачать не удалось (нет интернета) — возвращает ``None``,
    и детектор переключается на следующий доступный бэкенд.
    """
    path = os.path.join(MODELS_DIR, name)
    if os.path.exists(path) and os.path.getsize(path) > 10_000:
        return path
    if not allow_download or name not in MODEL_URLS:
        return None
    os.makedirs(MODELS_DIR, exist_ok=True)
    try:
        log.info("Скачиваю модель %s ...", name)
        with urllib.request.urlopen(MODEL_URLS[name], timeout=timeout) as response:
            data = response.read()
        if len(data) < 10_000 or data[:20].startswith(b"version https://"):
            # Сервер вернул HTML-заглушку или указатель Git LFS вместо весов.
            raise ValueError(f"получен некорректный файл ({len(data)} байт)")
        tmp = path + ".part"
        with open(tmp, "wb") as fh:
            fh.write(data)
        os.replace(tmp, path)
        log.info("Модель %s готова (%.1f МБ)", name, len(data) / 1e6)
        return path
    except Exception as exc:  # нет интернета — не страшно, есть запасные бэкенды
        log.warning("Не удалось скачать %s: %s", name, exc)
        if os.path.exists(path + ".part"):
            try:
                os.remove(path + ".part")
            except OSError:
                pass
        return None


class _FaceBackend:
    """Базовый интерфейс бэкенда: кадр -> (боксы с уверенностью, ключевые точки)."""

    name = "none"

    def detect(self, frame_bgr: np.ndarray):
        raise NotImplementedError

    def close(self) -> None:
        pass


class MediaPipeTasksBackend(_FaceBackend):
    """MediaPipe Tasks API (mediapipe >= 0.10, включая 1.x)."""

    name = "mediapipe-tasks"

    def __init__(
        self, max_faces: int = 4, min_confidence: float = 0.5, allow_download: bool = True
    ) -> None:
        import mediapipe as mp
        from mediapipe.tasks import python as mp_python
        from mediapipe.tasks.python import vision as mp_vision

        detector_path = ensure_model("face_detector.tflite", allow_download)
        landmarker_path = ensure_model("face_landmarker.task", allow_download)
        if not detector_path:
            raise FileNotFoundError("face_detector.tflite не найден")

        self._mp = mp
        self._timestamp = 0
        self._detector = mp_vision.FaceDetector.create_from_options(
            mp_vision.FaceDetectorOptions(
                base_options=mp_python.BaseOptions(model_asset_path=detector_path),
                running_mode=mp_vision.RunningMode.VIDEO,
                min_detection_confidence=min_confidence,
            )
        )
        self._landmarker = None
        if landmarker_path:
            self._landmarker = mp_vision.FaceLandmarker.create_from_options(
                mp_vision.FaceLandmarkerOptions(
                    base_options=mp_python.BaseOptions(model_asset_path=landmarker_path),
                    running_mode=mp_vision.RunningMode.VIDEO,
                    num_faces=max_faces,
                    min_face_detection_confidence=min_confidence,
                )
            )

    def detect(self, frame_bgr: np.ndarray):
        height, width = frame_bgr.shape[:2]
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        image = self._mp.Image(image_format=self._mp.ImageFormat.SRGB, data=rgb)
        self._timestamp += 33  # таймстемпы обязаны строго возрастать

        boxes: List[Tuple[Tuple[int, int, int, int], float]] = []
        result = self._detector.detect_for_video(image, self._timestamp)
        for detection in result.detections:
            bbox = detection.bounding_box
            score = detection.categories[0].score if detection.categories else 0.9
            boxes.append((
                (int(bbox.origin_x), int(bbox.origin_y), int(bbox.width), int(bbox.height)),
                float(score),
            ))

        landmarks: List[np.ndarray] = []
        if self._landmarker is not None:
            mesh = self._landmarker.detect_for_video(image, self._timestamp)
            for face in mesh.face_landmarks:
                landmarks.append(
                    np.array([[lm.x * width, lm.y * height] for lm in face], dtype=np.float32)
                )
        return boxes, landmarks

    def close(self) -> None:
        for obj in (self._detector, self._landmarker):
            try:
                if obj is not None:
                    obj.close()
            except Exception:
                pass


class MediaPipeSolutionsBackend(_FaceBackend):
    """Классический API MediaPipe (mp.solutions), версии 0.8–0.10."""

    name = "mediapipe-solutions"

    def __init__(
        self, max_faces: int = 4, min_confidence: float = 0.5, allow_download: bool = True
    ) -> None:
        import mediapipe as mp

        self._detection = mp.solutions.face_detection.FaceDetection(
            model_selection=1, min_detection_confidence=min_confidence
        )
        self._mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=max_faces,
            refine_landmarks=False,
            min_detection_confidence=min_confidence,
            min_tracking_confidence=0.5,
        )

    def detect(self, frame_bgr: np.ndarray):
        height, width = frame_bgr.shape[:2]
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        rgb.flags.writeable = False

        boxes: List[Tuple[Tuple[int, int, int, int], float]] = []
        detections = self._detection.process(rgb)
        for detection in detections.detections or []:
            rel = detection.location_data.relative_bounding_box
            boxes.append((
                (
                    int(rel.xmin * width), int(rel.ymin * height),
                    int(rel.width * width), int(rel.height * height),
                ),
                float(detection.score[0]) if detection.score else 0.9,
            ))

        landmarks: List[np.ndarray] = []
        mesh = self._mesh.process(rgb)
        for face in mesh.multi_face_landmarks or []:
            landmarks.append(
                np.array([[lm.x * width, lm.y * height] for lm in face.landmark], dtype=np.float32)
            )
        return boxes, landmarks

    def close(self) -> None:
        for obj in (self._detection, self._mesh):
            try:
                obj.close()
            except Exception:
                pass


class YuNetBackend(_FaceBackend):
    """OpenCV YuNet (DNN) — быстрый детектор лиц с 5 ключевыми точками.

    Используется, когда MediaPipe недоступен. Даёт координаты глаз и носа —
    этого достаточно, чтобы точно вырезать зоны переносицы, ободков и дужек.
    """

    name = "opencv-yunet"

    def __init__(
        self, max_faces: int = 4, min_confidence: float = 0.5, allow_download: bool = True
    ) -> None:
        if not hasattr(cv2, "FaceDetectorYN"):
            raise RuntimeError("Версия OpenCV без FaceDetectorYN")
        model_path = ensure_model("face_detection_yunet.onnx", allow_download)
        if not model_path:
            raise FileNotFoundError("face_detection_yunet.onnx не найден")
        self._max_faces = max_faces
        self._size = (320, 320)
        self._detector = cv2.FaceDetectorYN.create(
            model_path, "", self._size, min_confidence, 0.3, max_faces
        )

    def detect(self, frame_bgr: np.ndarray):
        height, width = frame_bgr.shape[:2]
        if (width, height) != self._size:
            self._size = (width, height)
            self._detector.setInputSize(self._size)
        _, faces = self._detector.detect(frame_bgr)
        boxes, landmarks = [], []
        for row in (faces if faces is not None else []):
            x, y, w, h = row[:4]
            boxes.append(((int(x), int(y), int(w), int(h)), float(row[14])))
            # 5 точек: правый глаз, левый глаз, нос, правый и левый уголки рта
            landmarks.append(np.array(row[4:14], dtype=np.float32).reshape(5, 2))
        return boxes[: self._max_faces], landmarks[: self._max_faces]


class HaarBackend(_FaceBackend):
    """Последний рубеж: каскады Хаара. Работают без DNN-моделей и почти везде."""

    name = "opencv-haar"

    def __init__(
        self, max_faces: int = 4, min_confidence: float = 0.5, allow_download: bool = True
    ) -> None:
        self._face = self._load("haarcascade_frontalface_default.xml", allow_download)
        self._profile = self._load("haarcascade_profileface.xml", allow_download=False)
        if self._face is None or self._face.empty():
            raise RuntimeError("Не найден каскад haarcascade_frontalface_default.xml")
        self._max_faces = max_faces

    @staticmethod
    def _load(filename: str, allow_download: bool = True):
        """Ищет каскад в OpenCV, в системных папках и в models/ (при нужде — качает)."""
        candidates = [
            os.path.join(getattr(getattr(cv2, "data", None), "haarcascades", ""), filename),
            os.path.join(MODELS_DIR, filename),
            os.path.join("/usr/share/opencv4/haarcascades", filename),
            os.path.join("/usr/share/opencv/haarcascades", filename),
        ]
        for path in candidates:
            if path and os.path.exists(path):
                cascade = cv2.CascadeClassifier(path)
                if not cascade.empty():
                    return cascade
        path = ensure_model(filename, allow_download)
        if path:
            cascade = cv2.CascadeClassifier(path)
            if not cascade.empty():
                return cascade
        return None

    def detect(self, frame_bgr: np.ndarray):
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)
        found = self._face.detectMultiScale(gray, 1.2, 5, minSize=(70, 70))
        if len(found) == 0 and self._profile is not None and not self._profile.empty():
            found = self._profile.detectMultiScale(gray, 1.2, 5, minSize=(70, 70))
        boxes = [((int(x), int(y), int(w), int(h)), 0.75) for x, y, w, h in found]
        boxes.sort(key=lambda item: item[0][2] * item[0][3], reverse=True)
        return boxes[: self._max_faces], []


class NullBackend(_FaceBackend):
    """Заглушка: лиц не находит, но позволяет серверу подняться и показать ошибку."""

    name = "недоступен"

    def __init__(self, *args, **kwargs) -> None:
        log.error(
            "Ни один детектор лиц не доступен. Установите mediapipe или дайте "
            "приложению доступ в интернет, чтобы скачать модель YuNet."
        )

    def detect(self, frame_bgr: np.ndarray):
        return [], []


# ---------------------------------------------------------------------------
# Основной класс детектора
# ---------------------------------------------------------------------------
class GlassesDetector:
    """Детектор лиц + классификатор «очки / без очков» с временным сглаживанием."""

    def __init__(
        self,
        max_faces: int = 4,
        min_face_confidence: float = 0.5,
        sensitivity: float = 0.5,
        min_stable_frames: int = 3,
        allow_download: bool = True,
    ) -> None:
        self.max_faces = max_faces
        self.min_face_confidence = min_face_confidence
        self.sensitivity = float(sensitivity)
        self.min_stable_frames = int(min_stable_frames)

        self._lock = threading.Lock()
        self._tracks: Dict[int, _Track] = {}
        self._next_track_id = 1
        self._frame_index = 0

        self.backend = self._build_backend(allow_download)
        log.info("Бэкенд детекции лиц: %s", self.backend_name)

    # -- инициализация бэкенда ------------------------------------------------
    def _build_backend(self, allow_download: bool) -> _FaceBackend:
        """Берёт первый рабочий бэкенд: MediaPipe -> YuNet -> Хаар -> заглушка."""
        candidates: List[type] = []
        try:
            import mediapipe  # noqa: F401

            candidates += [MediaPipeTasksBackend, MediaPipeSolutionsBackend]
        except ImportError:
            log.warning("MediaPipe не установлен — пробуем детекторы OpenCV")
        candidates += [YuNetBackend, HaarBackend]

        for backend_cls in candidates:
            try:
                return backend_cls(self.max_faces, self.min_face_confidence, allow_download)
            except Exception as exc:
                log.warning("Бэкенд %s недоступен: %s", backend_cls.name, exc)
        return NullBackend()

    @property
    def backend_name(self) -> str:
        return self.backend.name

    # -- настройки ------------------------------------------------------------
    def configure(
        self,
        sensitivity: Optional[float] = None,
        min_stable_frames: Optional[int] = None,
    ) -> None:
        with self._lock:
            if sensitivity is not None:
                self.sensitivity = _clamp(float(sensitivity), 0.0, 1.0)
            if min_stable_frames is not None:
                self.min_stable_frames = max(1, int(min_stable_frames))

    def reset(self) -> None:
        """Сбрасывает треки (например, после переподключения камеры)."""
        with self._lock:
            self._tracks.clear()
            self._frame_index = 0

    # -- главный метод --------------------------------------------------------
    def process(self, frame_bgr: np.ndarray) -> List[FaceResult]:
        """Обрабатывает кадр и возвращает список лиц с решением по очкам."""
        if frame_bgr is None or frame_bgr.size == 0:
            return []

        self._frame_index += 1
        boxes, landmark_sets = self.backend.detect(frame_bgr)
        boxes = [item for item in boxes if item[1] >= self.min_face_confidence]
        boxes = boxes[: self.max_faces]
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)

        results: List[FaceResult] = []
        used_landmarks: set = set()
        for box, face_score in boxes:
            box = self._clip_box(box, frame_bgr.shape)
            if box is None:
                continue
            landmarks = self._match_landmarks(box, landmark_sets, used_landmarks)
            raw = self._glasses_score(gray, box, landmarks)
            track = self._update_track(box, raw)
            results.append(
                FaceResult(
                    track_id=track.track_id,
                    box=box,
                    face_score=face_score,
                    raw_score=raw,
                    score=self._smoothed(track),
                    glasses=track.glasses,
                    confidence=self._confidence(track),
                    stable_frames=track.stable_frames,
                )
            )

        self._prune_tracks()
        return results

    # -- геометрия ------------------------------------------------------------
    @staticmethod
    def _clip_box(box: Tuple[int, int, int, int], shape) -> Optional[Tuple[int, int, int, int]]:
        height, width = shape[:2]
        x, y, w, h = box
        x1, y1 = max(0, x), max(0, y)
        x2, y2 = min(width, x + w), min(height, y + h)
        if x2 - x1 < 24 or y2 - y1 < 24:
            return None
        return x1, y1, x2 - x1, y2 - y1

    @staticmethod
    def _match_landmarks(
        box: Tuple[int, int, int, int],
        landmark_sets: List[np.ndarray],
        used: set,
    ) -> Optional[np.ndarray]:
        """Сопоставляет бокс лица с ближайшим набором ключевых точек."""
        cx, cy = box[0] + box[2] / 2.0, box[1] + box[3] / 2.0
        best_index, best_distance = -1, float("inf")
        for index, points in enumerate(landmark_sets):
            if index in used or points is None or len(points) not in (5, 468, 478):
                continue
            px, py = float(points[:, 0].mean()), float(points[:, 1].mean())
            distance = math.hypot(px - cx, py - cy)
            if distance < best_distance:
                best_index, best_distance = index, distance
        if best_index >= 0 and best_distance < max(box[2], box[3]):
            used.add(best_index)
            return landmark_sets[best_index]
        return None

    @staticmethod
    def _geometry_from_landmarks(points: np.ndarray) -> dict:
        eye_l = (points[LM_EYE_L_OUTER] + points[LM_EYE_L_INNER]) / 2.0
        eye_r = (points[LM_EYE_R_OUTER] + points[LM_EYE_R_INNER]) / 2.0
        return {
            "eye_l": eye_l,
            "eye_r": eye_r,
            "inner_l": points[LM_EYE_L_INNER],
            "inner_r": points[LM_EYE_R_INNER],
            "brow_l": points[LM_BROW_L],
            "brow_r": points[LM_BROW_R],
            "bridge": points[LM_NOSE_BRIDGE],
            "nose_tip": points[LM_NOSE_TIP],
            "cheek_l": points[LM_CHEEK_L],
            "cheek_r": points[LM_CHEEK_R],
            "face_l": points[LM_FACE_L],
            "face_r": points[LM_FACE_R],
        }

    @staticmethod
    def _geometry_from_five(points: np.ndarray) -> dict:
        """Геометрия по 5 точкам YuNet: два глаза, нос и уголки рта."""
        eyes = sorted(points[:2], key=lambda point: float(point[0]))
        eye_l, eye_r = np.array(eyes[0], np.float32), np.array(eyes[1], np.float32)
        nose = np.array(points[2], np.float32)
        distance = max(1.0, float(np.linalg.norm(eye_r - eye_l)))
        along = (eye_r - eye_l) / distance          # вдоль линии глаз
        down = np.array([-along[1], along[0]], np.float32)  # перпендикуляр вниз
        return {
            "eye_l": eye_l,
            "eye_r": eye_r,
            "inner_l": eye_l + along * 0.26 * distance,
            "inner_r": eye_r - along * 0.26 * distance,
            "brow_l": eye_l - down * 0.30 * distance,
            "brow_r": eye_r - down * 0.30 * distance,
            "bridge": (eye_l + eye_r) / 2.0 - down * 0.04 * distance,
            "nose_tip": nose,
            "cheek_l": eye_l + down * 0.85 * distance - along * 0.10 * distance,
            "cheek_r": eye_r + down * 0.85 * distance + along * 0.10 * distance,
            "face_l": eye_l - along * 0.72 * distance,
            "face_r": eye_r + along * 0.72 * distance,
        }

    @staticmethod
    def _geometry_from_box(box: Tuple[int, int, int, int]) -> dict:
        """Приблизительная геометрия лица, когда ключевых точек нет (Haar)."""
        x, y, w, h = box
        eye_y = y + 0.40 * h
        eye_l = np.array([x + 0.31 * w, eye_y], dtype=np.float32)
        eye_r = np.array([x + 0.69 * w, eye_y], dtype=np.float32)
        return {
            "eye_l": eye_l,
            "eye_r": eye_r,
            "inner_l": np.array([x + 0.42 * w, eye_y], dtype=np.float32),
            "inner_r": np.array([x + 0.58 * w, eye_y], dtype=np.float32),
            "brow_l": np.array([x + 0.31 * w, y + 0.31 * h], dtype=np.float32),
            "brow_r": np.array([x + 0.69 * w, y + 0.31 * h], dtype=np.float32),
            "bridge": np.array([x + 0.50 * w, eye_y - 0.02 * h], dtype=np.float32),
            "nose_tip": np.array([x + 0.50 * w, y + 0.62 * h], dtype=np.float32),
            "cheek_l": np.array([x + 0.26 * w, y + 0.66 * h], dtype=np.float32),
            "cheek_r": np.array([x + 0.74 * w, y + 0.66 * h], dtype=np.float32),
            "face_l": np.array([x + 0.02 * w, eye_y], dtype=np.float32),
            "face_r": np.array([x + 0.98 * w, eye_y], dtype=np.float32),
        }

    # -- оценка очков ---------------------------------------------------------
    def _glasses_score(
        self,
        gray: np.ndarray,
        box: Tuple[int, int, int, int],
        landmarks: Optional[np.ndarray],
    ) -> float:
        if landmarks is None:
            geo = self._geometry_from_box(box)
        elif len(landmarks) == 5:
            geo = self._geometry_from_five(landmarks)
        else:
            geo = self._geometry_from_landmarks(landmarks)
        eye_l, eye_r = geo["eye_l"], geo["eye_r"]
        eye_distance = float(np.linalg.norm(eye_r - eye_l))
        if eye_distance < 18:  # лицо слишком мелкое — надёжно судить нельзя
            return 0.0
        angle = math.degrees(math.atan2(float(eye_r[1] - eye_l[1]), float(eye_r[0] - eye_l[0])))

        # Опорный шум: гладкая кожа щеки. По нему подбираем порог для краёв.
        cheek_size = (0.30 * eye_distance, 0.22 * eye_distance)
        noise = max(
            _noise_level(_aligned_patch(gray, tuple(geo["cheek_l"]), cheek_size, angle)),
            _noise_level(_aligned_patch(gray, tuple(geo["cheek_r"]), cheek_size, angle)),
        )
        threshold = max(11.0, 2.6 * noise)

        signals: List[Tuple[float, float]] = []  # (значение 0..1, вес)

        # 1. Переносица: перемычка оправы между глазами.
        bridge_center = (geo["inner_l"] + geo["inner_r"]) / 2.0
        bridge_center = bridge_center + np.array([0.0, -0.04 * eye_distance], dtype=np.float32)
        bridge = _aligned_patch(
            gray, tuple(bridge_center), (0.42 * eye_distance, 0.34 * eye_distance), angle
        )
        if bridge is not None:
            coverage, density = _line_coverage(bridge, threshold)
            signals.append((max(_soft(coverage, 0.30, 0.80), _soft(density, 0.06, 0.26)), 0.34))

        # 2. Верхний ободок над каждым глазом.
        rim_values = []
        for eye, brow in ((eye_l, geo["brow_l"]), (eye_r, geo["brow_r"])):
            center = np.array(
                [eye[0], (eye[1] + brow[1]) / 2.0 - 0.02 * eye_distance], dtype=np.float32
            )
            patch = _aligned_patch(
                gray, tuple(center), (0.62 * eye_distance, 0.30 * eye_distance), angle
            )
            if patch is None:
                continue
            coverage, density = _line_coverage(patch, threshold)
            rim_values.append(max(_soft(coverage, 0.42, 0.92), _soft(density, 0.08, 0.30)))
        if rim_values:
            signals.append((float(np.mean(rim_values)), 0.30))

        # 3. Нижний ободок / линия под глазом.
        lower_values = []
        for eye in (eye_l, eye_r):
            center = np.array([eye[0], eye[1] + 0.30 * eye_distance], dtype=np.float32)
            patch = _aligned_patch(
                gray, tuple(center), (0.58 * eye_distance, 0.26 * eye_distance), angle
            )
            if patch is None:
                continue
            coverage, _ = _line_coverage(patch, threshold)
            lower_values.append(_soft(coverage, 0.45, 0.95))
        if lower_values:
            signals.append((float(np.max(lower_values)), 0.16))

        # 4. Дужки очков у висков (левая и правая стороны лица).
        temple_values = []
        for eye, edge in ((eye_l, geo["face_l"]), (eye_r, geo["face_r"])):
            center = (np.array(eye, dtype=np.float32) * 0.45 + np.array(edge, dtype=np.float32) * 0.55)
            patch = _aligned_patch(
                gray, tuple(center), (0.34 * eye_distance, 0.26 * eye_distance), angle
            )
            if patch is None:
                continue
            coverage, _ = _line_coverage(patch, threshold)
            temple_values.append(_soft(coverage, 0.50, 0.95))
        if temple_values:
            signals.append((float(np.max(temple_values)), 0.20))

        if not signals:
            return 0.0
        total_weight = sum(weight for _, weight in signals)
        score = sum(value * weight for value, weight in signals) / total_weight

        # Чувствительность из интерфейса сдвигает шкалу: 0.5 — нейтрально.
        gain = 0.65 + 0.85 * self.sensitivity
        return _clamp(score * gain)

    # -- треки и сглаживание --------------------------------------------------
    def _update_track(self, box: Tuple[int, int, int, int], raw_score: float) -> _Track:
        now = time.time()
        with self._lock:
            best_id, best_iou = None, 0.0
            for track_id, track in self._tracks.items():
                value = _iou(track.box, box)
                if value > best_iou:
                    best_id, best_iou = track_id, value

            if best_id is not None and best_iou >= 0.25:
                track = self._tracks[best_id]
            else:
                track = _Track(track_id=self._next_track_id, box=box)
                self._tracks[track.track_id] = track
                self._next_track_id += 1

            track.box = box
            track.last_seen = now
            track.scores.append(raw_score)

            smoothed = float(np.median(track.scores))
            on_threshold, off_threshold = 0.52, 0.40
            was_glasses = track.glasses
            if track.glasses:
                track.glasses = smoothed >= off_threshold
            else:
                track.glasses = smoothed >= on_threshold
            track.stable_frames = track.stable_frames + 1 if track.glasses == was_glasses else 1
            return track

    @staticmethod
    def _smoothed(track: _Track) -> float:
        return float(np.median(track.scores)) if track.scores else 0.0

    def _confidence(self, track: _Track) -> float:
        """Уверенность в процентах: оценка + бонус за стабильность решения."""
        score = self._smoothed(track)
        base = score * 100.0 if track.glasses else (1.0 - score) * 100.0
        bonus = min(6.0, 1.5 * max(0, track.stable_frames - 1))
        return round(_clamp(base + bonus, 1.0, 99.9), 1)

    def _prune_tracks(self, ttl: float = 2.0) -> None:
        now = time.time()
        with self._lock:
            stale = [tid for tid, track in self._tracks.items() if now - track.last_seen > ttl]
            for track_id in stale:
                del self._tracks[track_id]

    def is_confirmed(self, face: FaceResult) -> bool:
        """Решение считается подтверждённым после N стабильных кадров."""
        return face.glasses and face.stable_frames >= self.min_stable_frames

    def close(self) -> None:
        self.backend.close()


# ---------------------------------------------------------------------------
# Отрисовка результата на кадре
# ---------------------------------------------------------------------------
COLOR_GLASSES = (60, 220, 80)     # зелёный — человек в очках
COLOR_PLAIN = (70, 160, 250)      # оранжево-синий — лицо без очков
COLOR_IDLE = (200, 200, 200)


def annotate(
    frame: np.ndarray,
    faces: Sequence[FaceResult],
    detector: Optional[GlassesDetector] = None,
    show_score: bool = True,
) -> np.ndarray:
    """Рисует рамки и подписи («В ОЧКАХ» / «БЕЗ ОЧКОВ») поверх кадра."""
    for face in faces:
        x, y, w, h = face.box
        confirmed = detector.is_confirmed(face) if detector else face.glasses
        color = COLOR_GLASSES if face.glasses else COLOR_PLAIN
        thickness = 3 if confirmed else 2
        cv2.rectangle(frame, (x, y), (x + w, y + h), color, thickness)

        label = "В ОЧКАХ" if face.glasses else "БЕЗ ОЧКОВ"
        if show_score:
            label = f"{label} · {face.confidence:.0f}%"
        font_size = max(14, min(26, int(h * 0.14)))
        text_w, text_h = PAINTER.text_size(label, font_size)
        pad = 6
        top = max(0, y - text_h - 2 * pad)
        cv2.rectangle(
            frame, (x, top), (x + text_w + 2 * pad, top + text_h + 2 * pad), color, -1
        )
        PAINTER.draw(frame, label, (x + pad, top + pad - 2), font_size, (20, 25, 30))

        # Уголки рамки — «прицел» для подтверждённого события.
        if confirmed:
            corner = max(10, int(min(w, h) * 0.18))
            for dx, dy in ((0, 0), (w, 0), (0, h), (w, h)):
                px, py = x + dx, y + dy
                sx = -1 if dx else 1
                sy = -1 if dy else 1
                cv2.line(frame, (px, py), (px + sx * corner, py), color, 4)
                cv2.line(frame, (px, py), (px, py + sy * corner), color, 4)
    return frame
