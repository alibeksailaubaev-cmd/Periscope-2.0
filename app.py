"""app.py — Flask-сервер камеры фиксации: видеопоток, детекция очков, журнал событий.

Запуск:
    python app.py                      # веб-камера ноутбука
    python app.py --source 0           # веб-камера №0
    python app.py --source http://192.168.0.10:8080/video    # телефон (IP Webcam)
    python app.py --source rtsp://user:pass@192.168.0.64:554/Streaming/Channels/101

После запуска откройте в браузере http://localhost:5000
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import logging
import os
import threading
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

# Настройки FFmpeg для RTSP: TCP-транспорт и таймаут, иначе поток «зависает».
os.environ.setdefault(
    "OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp|stimeout;5000000"
)

import cv2
import numpy as np
from flask import (
    Flask,
    Response,
    jsonify,
    render_template,
    request,
    send_from_directory,
)

from detector import PAINTER, GlassesDetector, annotate

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s  %(levelname)-7s %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("periscope.app")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CAPTURES_DIR = os.environ.get("CAPTURES_DIR", os.path.join(BASE_DIR, "static", "captures"))
THUMBS_DIR = os.path.join(CAPTURES_DIR, "thumbs")
EVENTS_JSON = os.environ.get("EVENTS_JSON", os.path.join(BASE_DIR, "events_log.json"))
EVENTS_CSV = os.environ.get("EVENTS_CSV", os.path.join(BASE_DIR, "events.csv"))

CSV_HEADERS = [
    "ID",
    "Дата и время",
    "Статус",
    "Имя файла фото",
    "Уверенность распознавания (%)",
]

STATUS_GLASSES = "В очках"
STATUS_MANUAL = "Ручной снимок"


# ---------------------------------------------------------------------------
# Журнал событий
# ---------------------------------------------------------------------------
class EventLog:
    """Потокобезопасный журнал: хранит события в JSON и дублирует в CSV."""

    def __init__(self, json_path: str, csv_path: str, limit: int = 20000) -> None:
        self.json_path = json_path
        self.csv_path = csv_path
        self.limit = limit
        self._lock = threading.Lock()
        self._events: List[Dict[str, Any]] = self._load()
        self._next_id = (self._events[-1]["id"] + 1) if self._events else 1

    # -- чтение/запись файлов -------------------------------------------------
    def _load(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.json_path):
            return []
        try:
            with open(self.json_path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            if isinstance(data, list):
                return [event for event in data if isinstance(event, dict) and "id" in event]
        except (OSError, ValueError) as exc:
            log.warning("Не удалось прочитать %s: %s", self.json_path, exc)
        return []

    def _flush_locked(self) -> None:
        tmp = self.json_path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(self._events, fh, ensure_ascii=False, indent=2)
        os.replace(tmp, self.json_path)

        tmp = self.csv_path + ".tmp"
        # utf-8-sig — чтобы кириллица корректно открывалась в Excel.
        with open(tmp, "w", encoding="utf-8-sig", newline="") as fh:
            writer = csv.writer(fh, delimiter=";")
            writer.writerow(CSV_HEADERS)
            for event in self._events:
                writer.writerow(self._as_row(event))
        os.replace(tmp, self.csv_path)

    @staticmethod
    def _as_row(event: Dict[str, Any]) -> List[Any]:
        return [
            event.get("id"),
            event.get("datetime"),
            event.get("status"),
            event.get("filename"),
            event.get("confidence"),
        ]

    # -- API ------------------------------------------------------------------
    def add(
        self,
        status: str,
        filename: str,
        confidence: float,
        extra: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        now = datetime.now()
        with self._lock:
            event = {
                "id": self._next_id,
                "datetime": now.strftime("%Y-%m-%d %H:%M:%S"),
                "date": now.strftime("%d.%m.%Y"),
                "time": now.strftime("%H:%M:%S"),
                "timestamp": now.timestamp(),
                "status": status,
                "filename": filename,
                "confidence": round(float(confidence), 1),
                "url": f"/captures/{filename}",
                "thumb_url": f"/captures/thumbs/{filename}",
            }
            if extra:
                event.update(extra)
            self._next_id += 1
            self._events.append(event)
            if len(self._events) > self.limit:
                self._events = self._events[-self.limit :]
            self._flush_locked()
            return event

    def recent(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self._lock:
            return list(reversed(self._events[-limit:]))

    def all(self) -> List[Dict[str, Any]]:
        with self._lock:
            return list(self._events)

    def stats(self) -> Dict[str, Any]:
        with self._lock:
            total = len(self._events)
            today = datetime.now().strftime("%Y-%m-%d")
            today_count = sum(
                1 for event in self._events if str(event.get("datetime", "")).startswith(today)
            )
            last = self._events[-1] if self._events else None
            return {"total": total, "today": today_count, "last_event": last}

    def clear(self, delete_photos: bool = False) -> int:
        with self._lock:
            removed = len(self._events)
            if delete_photos:
                for event in self._events:
                    for path in (
                        os.path.join(CAPTURES_DIR, str(event.get("filename", ""))),
                        os.path.join(THUMBS_DIR, str(event.get("filename", ""))),
                    ):
                        try:
                            if os.path.isfile(path):
                                os.remove(path)
                        except OSError as exc:
                            log.warning("Не удалось удалить %s: %s", path, exc)
            self._events = []
            self._next_id = 1
            self._flush_locked()
            return removed


# ---------------------------------------------------------------------------
# Настройки обработки
# ---------------------------------------------------------------------------
class Settings:
    """Параметры, которые можно менять из веб-интерфейса на лету."""

    def __init__(self) -> None:
        self.source: str = "0"
        self.cooldown: float = 4.0          # пауза между снимками, сек
        self.sensitivity: float = 0.5       # чувствительность детектора очков
        self.min_stable_frames: int = 3     # кадров подряд для подтверждения
        self.autosave: bool = True          # сохранять снимки автоматически
        self.mirror: bool = False           # зеркалить кадр (удобно для веб-камеры)
        self.process_width: int = 960       # ширина кадра для обработки
        self.jpeg_quality: int = 80
        self.stream_fps: int = 20

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source": self.source,
            "cooldown": self.cooldown,
            "sensitivity": self.sensitivity,
            "min_stable_frames": self.min_stable_frames,
            "autosave": self.autosave,
            "mirror": self.mirror,
            "process_width": self.process_width,
            "jpeg_quality": self.jpeg_quality,
            "stream_fps": self.stream_fps,
        }


# ---------------------------------------------------------------------------
# Рабочий поток видеопотока
# ---------------------------------------------------------------------------
class StreamWorker:
    """Читает кадры из источника, прогоняет через детектор и хранит последний кадр."""

    def __init__(self, detector: GlassesDetector, events: EventLog, settings: Settings) -> None:
        self.detector = detector
        self.events = events
        self.settings = settings

        self._thread: Optional[threading.Thread] = None
        self._stop = threading.Event()
        self._condition = threading.Condition()
        self._frame_jpeg: Optional[bytes] = None
        self._frame_raw: Optional[np.ndarray] = None
        self._frame_seq = 0

        self._lock = threading.Lock()
        self._state = "stopped"          # stopped | connecting | live | error
        self._message = "Поток не запущен"
        self._fps = 0.0
        self._faces: List[Dict[str, Any]] = []
        self._status_text = "Ожидание подключения"
        self._status_level = "idle"      # idle | searching | plain | glasses | error
        self._last_capture: Optional[Dict[str, Any]] = None
        self._last_save_time = 0.0
        self._track_last_save: Dict[int, float] = {}
        self._frames_total = 0
        self._started_at: Optional[float] = None
        self._resolution: Tuple[int, int] = (0, 0)

    # -- управление -----------------------------------------------------------
    def start(self, source: Optional[str] = None) -> None:
        self.stop()
        if source is not None:
            self.settings.source = source
        self._stop.clear()
        self.detector.reset()
        with self._lock:
            self._state = "connecting"
            self._message = f"Подключение к {self.settings.source} ..."
            self._status_text = "Подключение..."
            self._status_level = "idle"
            self._track_last_save.clear()
            self._started_at = time.time()
            self._frames_total = 0
        self._thread = threading.Thread(target=self._run, name="stream", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        thread = self._thread
        if thread and thread.is_alive():
            thread.join(timeout=5.0)
        self._thread = None
        self._clear_frame()
        with self._lock:
            if self._state != "error":
                self._state = "stopped"
                self._message = "Поток остановлен"
            self._status_text = "Поток остановлен"
            self._status_level = "idle"
            self._fps = 0.0
            self._faces = []

    @property
    def running(self) -> bool:
        return bool(self._thread and self._thread.is_alive())

    def _clear_frame(self) -> None:
        """Сбрасывает последний кадр, чтобы в браузере не «залипала» старая картинка."""
        with self._condition:
            self._frame_jpeg = None
            self._frame_raw = None
            self._frame_seq += 1
            self._condition.notify_all()

    # -- источник -------------------------------------------------------------
    @staticmethod
    def _parse_source(source: str):
        text = (source or "0").strip()
        if text.lower() in ("", "webcam", "camera", "local"):
            return 0
        if text.isdigit():
            return int(text)
        return text

    def _open(self):
        target = self._parse_source(self.settings.source)
        capture = cv2.VideoCapture(target)
        if isinstance(target, int):
            capture.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            capture.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        try:
            capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # минимальная задержка
        except cv2.error:
            pass
        return capture

    # -- основной цикл --------------------------------------------------------
    def _run(self) -> None:
        capture = None
        failures = 0
        backoff = 1.0
        last_time = time.time()

        while not self._stop.is_set():
            if capture is None or not capture.isOpened():
                if capture is not None:
                    capture.release()
                self._set_state("connecting", f"Подключение к {self.settings.source} ...")
                capture = self._open()
                if not capture.isOpened():
                    capture.release()
                    capture = None
                    self._set_state(
                        "error",
                        f"Не удалось открыть источник «{self.settings.source}». "
                        "Проверьте URL, доступ к камере и сеть.",
                        status_text="Нет сигнала",
                        status_level="error",
                    )
                    self._clear_frame()
                    if self._stop.wait(backoff):
                        break
                    backoff = min(backoff * 2, 10.0)
                    continue
                backoff = 1.0
                failures = 0
                self._set_state("live", "Поток активен", status_text="Поиск...", status_level="searching")

            ok, frame = capture.read()
            if not ok or frame is None:
                failures += 1
                if failures >= 15:
                    log.warning("Поток оборвался, переподключаюсь...")
                    capture.release()
                    capture = None
                    failures = 0
                    self._set_state("connecting", "Поток оборвался, переподключение...")
                if self._stop.wait(0.05):
                    break
                continue

            failures = 0
            frame = self._prepare(frame)
            faces = self.detector.process(frame)
            annotated = annotate(frame.copy(), faces, self.detector)
            self._handle_detections(frame, annotated, faces)
            self._draw_hud(annotated)
            self._publish(frame, annotated)

            now = time.time()
            delta = now - last_time
            last_time = now
            if delta > 0:
                with self._lock:
                    self._fps = 0.85 * self._fps + 0.15 * (1.0 / delta) if self._fps else 1.0 / delta
                    self._frames_total += 1
                    self._resolution = (annotated.shape[1], annotated.shape[0])

        if capture is not None:
            capture.release()

    def _prepare(self, frame: np.ndarray) -> np.ndarray:
        if self.settings.mirror:
            frame = cv2.flip(frame, 1)
        width = self.settings.process_width
        if width and frame.shape[1] > width:
            scale = width / frame.shape[1]
            frame = cv2.resize(
                frame, (width, int(frame.shape[0] * scale)), interpolation=cv2.INTER_AREA
            )
        return frame

    # -- реакция на детекции --------------------------------------------------
    def _handle_detections(
        self, clean: np.ndarray, annotated: np.ndarray, faces: List
    ) -> None:
        confirmed = [face for face in faces if self.detector.is_confirmed(face)]
        if confirmed:
            best = max(confirmed, key=lambda face: face.confidence)
            status_text = "Обнаружен человек в очках"
            status_level = "glasses"
            if self.settings.autosave:
                self._maybe_capture(annotated, best)
        elif faces:
            status_text = "Лицо в кадре: без очков"
            status_level = "plain"
        else:
            status_text = "Поиск..."
            status_level = "searching"

        with self._lock:
            self._faces = [face.to_dict() for face in faces]
            self._status_text = status_text
            self._status_level = status_level

    def _maybe_capture(self, annotated: np.ndarray, face) -> None:
        """Сохраняет кадр с учётом задержки (защита от спама снимками)."""
        now = time.time()
        cooldown = max(0.5, float(self.settings.cooldown))
        if now - self._last_save_time < cooldown:
            return
        if now - self._track_last_save.get(face.track_id, 0.0) < cooldown:
            return
        self._last_save_time = now
        self._track_last_save[face.track_id] = now
        self.save_frame(annotated, STATUS_GLASSES, face.confidence, track_id=face.track_id)

    def save_frame(
        self,
        frame: np.ndarray,
        status: str,
        confidence: float,
        track_id: Optional[int] = None,
    ) -> Optional[Dict[str, Any]]:
        os.makedirs(CAPTURES_DIR, exist_ok=True)
        os.makedirs(THUMBS_DIR, exist_ok=True)

        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"glasses_{stamp}.jpg"
        path = os.path.join(CAPTURES_DIR, filename)
        suffix = 1
        while os.path.exists(path):  # несколько событий в одну секунду
            filename = f"glasses_{stamp}_{suffix}.jpg"
            path = os.path.join(CAPTURES_DIR, filename)
            suffix += 1

        params = [int(cv2.IMWRITE_JPEG_QUALITY), 92]
        if not cv2.imwrite(path, frame, params):
            log.error("Не удалось сохранить снимок %s", path)
            return None

        thumb_width = 360
        scale = thumb_width / frame.shape[1]
        if scale < 1.0:
            thumb = cv2.resize(
                frame, (thumb_width, int(frame.shape[0] * scale)), interpolation=cv2.INTER_AREA
            )
        else:
            thumb = frame
        cv2.imwrite(os.path.join(THUMBS_DIR, filename), thumb,
                    [int(cv2.IMWRITE_JPEG_QUALITY), 75])

        event = self.events.add(
            status=status,
            filename=filename,
            confidence=confidence,
            extra={"track_id": track_id, "source": self.settings.source},
        )
        with self._lock:
            self._last_capture = event
        log.info("Снимок сохранён: %s (%.1f%%)", filename, confidence)
        return event

    def snapshot(self) -> Optional[Dict[str, Any]]:
        """Ручной снимок текущего кадра из веб-интерфейса."""
        with self._condition:
            frame = None if self._frame_raw is None else self._frame_raw.copy()
        if frame is None:
            return None
        with self._lock:
            faces = list(self._faces)
        confidence = max((face.get("confidence", 0.0) for face in faces), default=0.0)
        return self.save_frame(frame, STATUS_MANUAL, confidence)

    # -- HUD и публикация кадра ----------------------------------------------
    def _draw_hud(self, frame: np.ndarray) -> None:
        with self._lock:
            status_text = self._status_text
            level = self._status_level
            fps = self._fps
        colors = {
            "glasses": (60, 220, 80),
            "plain": (70, 160, 250),
            "searching": (200, 200, 200),
            "error": (60, 60, 235),
            "idle": (180, 180, 180),
        }
        color = colors.get(level, (200, 200, 200))
        height, width = frame.shape[:2]
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, height - 42), (width, height), (18, 20, 26), -1)
        cv2.addWeighted(overlay, 0.65, frame, 0.35, 0, frame)
        cv2.circle(frame, (18, height - 21), 7, color, -1)
        PAINTER.draw(frame, status_text, (34, height - 33), 18, (240, 244, 250))
        stamp = datetime.now().strftime("%d.%m.%Y %H:%M:%S")
        info = f"{stamp}   {fps:.1f} FPS"
        text_w, _ = PAINTER.text_size(info, 16)
        PAINTER.draw(frame, info, (max(0, width - text_w - 12), height - 32), 16, (170, 180, 195))

    def _publish(self, clean: np.ndarray, annotated: np.ndarray) -> None:
        ok, buffer = cv2.imencode(
            ".jpg", annotated, [int(cv2.IMWRITE_JPEG_QUALITY), self.settings.jpeg_quality]
        )
        if not ok:
            return
        with self._condition:
            self._frame_jpeg = buffer.tobytes()
            self._frame_raw = clean
            self._frame_seq += 1
            self._condition.notify_all()

    def frames(self):
        """Генератор MJPEG для тега <img> в браузере."""
        last_seq = -1
        min_interval = 1.0 / max(1, self.settings.stream_fps)
        while True:
            with self._condition:
                if self._frame_seq == last_seq:
                    self._condition.wait(timeout=1.0)
                frame = self._frame_jpeg
                last_seq = self._frame_seq
            if frame is None:
                frame = self._placeholder_jpeg()
            yield (
                b"--frame\r\nContent-Type: image/jpeg\r\n"
                b"Content-Length: " + str(len(frame)).encode() + b"\r\n\r\n" + frame + b"\r\n"
            )
            time.sleep(min_interval)

    def _placeholder_jpeg(self) -> bytes:
        frame = np.full((480, 854, 3), 22, dtype=np.uint8)
        cv2.rectangle(frame, (0, 0), (853, 479), (48, 52, 62), 2)
        with self._lock:
            message = self._message
        for text, y, size, color in (
            ("Нет видеопотока", 200, 30, (235, 238, 245)),
            (message[:70], 250, 18, (150, 160, 175)),
        ):
            width_px, _ = PAINTER.text_size(text, size)
            PAINTER.draw(frame, text, ((frame.shape[1] - width_px) // 2, y), size, color)
        ok, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        return buffer.tobytes() if ok else b""

    # -- состояние ------------------------------------------------------------
    def _set_state(
        self,
        state: str,
        message: str,
        status_text: Optional[str] = None,
        status_level: Optional[str] = None,
    ) -> None:
        with self._lock:
            self._state = state
            self._message = message
            if status_text:
                self._status_text = status_text
            if status_level:
                self._status_level = status_level
        log.info("[%s] %s", state, message)

    def status(self) -> Dict[str, Any]:
        with self._lock:
            uptime = time.time() - self._started_at if self._started_at else 0.0
            return {
                "state": self._state,
                "message": self._message,
                "running": self.running,
                "source": self.settings.source,
                "fps": round(self._fps, 1),
                "faces": list(self._faces),
                "faces_count": len(self._faces),
                "glasses_count": sum(1 for face in self._faces if face.get("glasses")),
                "status_text": self._status_text,
                "status_level": self._status_level,
                "last_capture": self._last_capture,
                "frames_total": self._frames_total,
                "uptime": round(uptime, 1),
                "resolution": {"width": self._resolution[0], "height": self._resolution[1]},
            }


# ---------------------------------------------------------------------------
# Flask-приложение
# ---------------------------------------------------------------------------
app = Flask(__name__, template_folder="templates", static_folder="static")

settings = Settings()
event_log = EventLog(EVENTS_JSON, EVENTS_CSV)
detector = GlassesDetector(
    sensitivity=settings.sensitivity, min_stable_frames=settings.min_stable_frames
)
worker = StreamWorker(detector, event_log, settings)


@app.after_request
def _no_cache(response: Response) -> Response:
    if request.path.startswith(("/api/", "/video_feed")):
        response.headers["Cache-Control"] = "no-store, max-age=0"
    return response


@app.route("/")
def index():
    return render_template(
        "index.html",
        settings=settings.to_dict(),
        backend=detector.backend_name,
        version="2.0",
    )


@app.route("/video_feed")
def video_feed():
    return Response(
        worker.frames(), mimetype="multipart/x-mixed-replace; boundary=frame"
    )


@app.route("/captures/<path:filename>")
def captures(filename: str):
    return send_from_directory(CAPTURES_DIR, filename)


@app.route("/api/status")
def api_status():
    data = worker.status()
    data["stats"] = event_log.stats()
    data["settings"] = settings.to_dict()
    data["backend"] = detector.backend_name
    return jsonify(data)


@app.route("/api/connect", methods=["POST"])
def api_connect():
    payload = request.get_json(silent=True) or {}
    source = str(payload.get("source", settings.source)).strip()
    if not source:
        return jsonify({"ok": False, "error": "Пустой адрес источника"}), 400
    worker.start(source)
    return jsonify({"ok": True, "source": source, "status": worker.status()})


@app.route("/api/disconnect", methods=["POST"])
def api_disconnect():
    worker.stop()
    return jsonify({"ok": True, "status": worker.status()})


@app.route("/api/settings", methods=["GET", "POST"])
def api_settings():
    if request.method == "GET":
        return jsonify(settings.to_dict())

    payload = request.get_json(silent=True) or {}
    try:
        if "cooldown" in payload:
            settings.cooldown = max(0.5, min(60.0, float(payload["cooldown"])))
        if "sensitivity" in payload:
            settings.sensitivity = max(0.0, min(1.0, float(payload["sensitivity"])))
        if "min_stable_frames" in payload:
            settings.min_stable_frames = max(1, min(15, int(payload["min_stable_frames"])))
        if "autosave" in payload:
            settings.autosave = bool(payload["autosave"])
        if "mirror" in payload:
            settings.mirror = bool(payload["mirror"])
        if "process_width" in payload:
            settings.process_width = max(320, min(1920, int(payload["process_width"])))
    except (TypeError, ValueError) as exc:
        return jsonify({"ok": False, "error": f"Некорректное значение: {exc}"}), 400

    detector.configure(
        sensitivity=settings.sensitivity, min_stable_frames=settings.min_stable_frames
    )
    return jsonify({"ok": True, "settings": settings.to_dict()})


@app.route("/api/snapshot", methods=["POST"])
def api_snapshot():
    event = worker.snapshot()
    if event is None:
        return jsonify({"ok": False, "error": "Нет кадра — сначала подключите камеру"}), 409
    return jsonify({"ok": True, "event": event})


@app.route("/api/events")
def api_events():
    limit = request.args.get("limit", default=100, type=int)
    return jsonify({"events": event_log.recent(max(1, min(limit, 2000))), "stats": event_log.stats()})


@app.route("/api/events/clear", methods=["POST"])
def api_events_clear():
    payload = request.get_json(silent=True) or {}
    removed = event_log.clear(delete_photos=bool(payload.get("delete_photos")))
    return jsonify({"ok": True, "removed": removed})


@app.route("/api/export.csv")
def api_export_csv():
    events = event_log.all()
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=";")
    writer.writerow(CSV_HEADERS)
    for event in events:
        writer.writerow(EventLog._as_row(event))
    filename = f"periscope_report_{datetime.now():%Y%m%d_%H%M%S}.csv"
    return Response(
        "﻿" + buffer.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.route("/api/export.json")
def api_export_json():
    filename = f"periscope_report_{datetime.now():%Y%m%d_%H%M%S}.json"
    body = json.dumps(event_log.all(), ensure_ascii=False, indent=2)
    return Response(
        body,
        mimetype="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.route("/api/export.xlsx")
def api_export_xlsx():
    """Отчёт в Excel (нужен pandas + openpyxl, иначе вернём CSV)."""
    try:
        import pandas as pd
    except ImportError:
        return jsonify({"ok": False, "error": "pandas не установлен"}), 501

    frame = pd.DataFrame(
        [EventLog._as_row(event) for event in event_log.all()], columns=CSV_HEADERS
    )
    buffer = io.BytesIO()
    try:
        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
            frame.to_excel(writer, index=False, sheet_name="События")
    except (ImportError, ValueError) as exc:
        return jsonify({"ok": False, "error": f"Excel-экспорт недоступен: {exc}"}), 501
    filename = f"periscope_report_{datetime.now():%Y%m%d_%H%M%S}.xlsx"
    return Response(
        buffer.getvalue(),
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.route("/api/health")
def api_health():
    return jsonify({"ok": True, "backend": detector.backend_name, "state": worker.status()["state"]})


# ---------------------------------------------------------------------------
# Точка входа
# ---------------------------------------------------------------------------
def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Камера фиксации людей в очках")
    parser.add_argument("--source", default=os.environ.get("VIDEO_SOURCE", "0"),
                        help="0 — веб-камера, либо RTSP/HTTP URL")
    parser.add_argument("--host", default=os.environ.get("HOST", "0.0.0.0"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", 5000)))
    parser.add_argument("--cooldown", type=float, default=float(os.environ.get("COOLDOWN", 4.0)),
                        help="пауза между снимками, сек (по умолчанию 4)")
    parser.add_argument("--sensitivity", type=float, default=0.5,
                        help="чувствительность детектора очков 0..1")
    parser.add_argument("--mirror", action="store_true", help="зеркалить кадр")
    parser.add_argument("--no-autostart", action="store_true",
                        help="не подключаться к камере при запуске")
    parser.add_argument("--debug", action="store_true")
    return parser.parse_args(argv)


def main() -> None:
    args = parse_args()
    settings.source = args.source
    settings.cooldown = args.cooldown
    settings.sensitivity = args.sensitivity
    settings.mirror = args.mirror
    detector.configure(sensitivity=args.sensitivity)

    os.makedirs(CAPTURES_DIR, exist_ok=True)
    os.makedirs(THUMBS_DIR, exist_ok=True)

    if not args.no_autostart:
        worker.start(args.source)

    log.info("Дашборд: http://localhost:%s  (бэкенд детекции: %s)", args.port, detector.backend_name)
    try:
        app.run(host=args.host, port=args.port, debug=args.debug,
                threaded=True, use_reloader=False)
    finally:
        worker.stop()
        detector.close()


if __name__ == "__main__":
    main()
