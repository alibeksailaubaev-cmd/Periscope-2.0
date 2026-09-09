import { FORMAT_PRESETS, VISUAL_STYLES, OFFLINE_MODE } from '../config.js';
import { generateScriptOpenAI, openaiConfigured } from './openai.js';

const POLLINATIONS_TEXT_URL = 'https://text.pollinations.ai/openai';
const REQUEST_TIMEOUT_MS = 45_000;

function buildSystemPrompt(options) {
  const rules = [
    'Ты сценарист коротких видеороликов. Отвечай СТРОГО валидным JSON без markdown-обрамления.',
    'Формат ответа: {"title": string, "coverPrompt": string, "scenes": [{"narration": string, "imagePrompt": string}, ...]}.',
    '"narration" — текст закадрового голоса для одной сцены на русском языке, без ремарок и таймкодов.',
    '"imagePrompt" и "coverPrompt" — короткие описания кадра на английском языке для генератора изображений, без текста и надписей на картинке.',
  ];
  if (options.historicalAccuracy) {
    rules.push('Придерживайся исторически подтверждённых фактов, избегай вымышленных деталей и спекуляций.');
  }
  if (options.materialsProfile) {
    rules.push('Опирайся на общеизвестные, хорошо задокументированные источники и избегай непроверяемых утверждений.');
  }
  if (options.animation && options.animation !== 'none') {
    // Video models refuse to depict recognisable real people, so a scene
    // built around someone's face gets blocked and silently degrades to a
    // still. Composing around places and objects keeps scenes animatable.
    rules.push(
      'Кадры пойдут в видеогенератор, который отказывается показывать узнаваемых реальных людей. ' +
      'Поэтому в "imagePrompt" не описывай лица и фигуры конкретных исторических личностей: ' +
      'вместо них — места, интерьеры, предметы, документы, руки за работой, силуэты со спины, ' +
      'толпа издалека, пейзажи и техника той эпохи.',
    );
  }
  return rules.join(' ');
}

function buildUserPrompt(topic, delivery, preset) {
  return [
    `Тема ролика: "${topic}".`,
    `Подача: ${delivery}.`,
    `Разбей сценарий ровно на ${preset.scenes} сцен.`,
    `Каждая сцена — примерно ${preset.wordsPerScene} слов закадрового текста.`,
  ].join(' ');
}

function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) throw new Error('Ответ модели не содержит JSON');
    return JSON.parse(text.slice(start, end + 1));
  }
}

function normalizeScript(raw, preset) {
  const scenes = Array.isArray(raw.scenes) ? raw.scenes : [];
  if (scenes.length === 0) throw new Error('Сценарий без сцен');
  return {
    title: String(raw.title || '').trim() || 'Без названия',
    coverPrompt: String(raw.coverPrompt || raw.scenes?.[0]?.imagePrompt || '').trim() || 'documentary cover art',
    scenes: scenes.slice(0, preset.scenes * 2).map((scene) => ({
      narration: String(scene.narration || '').trim(),
      imagePrompt: String(scene.imagePrompt || '').trim() || 'documentary illustration',
    })).filter((scene) => scene.narration.length > 0),
  };
}

async function requestPollinationsScript(topic, delivery, preset) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(POLLINATIONS_TEXT_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'system', content: buildSystemPrompt(preset.options) },
          { role: 'user', content: buildUserPrompt(topic, delivery, preset) },
        ],
      }),
    });
    if (!response.ok) throw new Error(`Pollinations text API вернул ${response.status}`);
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Пустой ответ от Pollinations text API');
    return normalizeScript(extractJson(content), preset);
  } finally {
    clearTimeout(timer);
  }
}

// No network / no key needed: deterministically slices the topic into
// scenes so the pipeline always has something to work with, even when
// the free text API above is unreachable or rate-limited.
function buildOfflineScript(topic, delivery, preset) {
  const scenes = Array.from({ length: preset.scenes }, (_, i) => {
    const part = i + 1;
    return {
      narration: `Сцена ${part} из ${preset.scenes}. ${delivery} рассказ о теме «${topic}». ` +
        'Этот текст — заглушка офлайн-режима: подключите бесплатный текстовый API, чтобы получить настоящий сценарий.',
      imagePrompt: `${topic}, scene ${part} of ${preset.scenes}, documentary illustration`,
    };
  });
  return {
    title: topic || 'Без названия',
    coverPrompt: `${topic}, cover art, documentary`,
    scenes,
  };
}

export async function generateScript({ topic, delivery, format, options }, logger) {
  const preset = { ...FORMAT_PRESETS[format], options };
  if (OFFLINE_MODE) {
    logger.line('OFFLINE_MODE включён — сценарий строится локально без обращения к API');
    return buildOfflineScript(topic, delivery, preset);
  }
  if (openaiConfigured()) {
    try {
      logger.line('Запрашиваю сценарий у OpenAI');
      const content = await generateScriptOpenAI(buildSystemPrompt(preset.options), buildUserPrompt(topic, delivery, preset));
      return normalizeScript(extractJson(content), preset);
    } catch (err) {
      logger.line(`OpenAI недоступен (${err.message}) — пробую бесплатный текстовый API`);
    }
  }
  try {
    logger.line('Запрашиваю сценарий у бесплатного текстового API (Pollinations)');
    return await requestPollinationsScript(topic, delivery, preset);
  } catch (err) {
    logger.line(`Текстовый API недоступен (${err.message}) — использую офлайн-заглушку сценария`);
    return buildOfflineScript(topic, delivery, preset);
  }
}

// Image models render Cyrillic as garbled lookalikes ("ВАСТОК" for
// "ВОСТОК"), which instantly gives a frame away as generated, so every
// prompt carries an explicit ban on lettering.
const NO_TEXT = 'no text, no lettering, no writing, no letters, no signage, no watermarks, no captions';

export function styleSuffix(visualStyle) {
  return `${VISUAL_STYLES[visualStyle] || VISUAL_STYLES.realism}, ${NO_TEXT}`;
}
