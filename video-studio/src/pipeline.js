import path from 'node:path';
import fs from 'node:fs';
import { getJob, saveJob, getLogger, jobPath } from './store.js';
import { generateScript, styleSuffix } from './providers/script.js';
import { synthesizeSpeech } from './providers/tts.js';
import { generateImage } from './providers/image.js';
import { buildSceneClip, concatClips } from './ffmpegTools.js';
import { animateScene } from './providers/animate.js';
import { FORMAT_PRESETS } from './config.js';

class PausedError extends Error {}

// `job` here is the very object stored in the in-memory job map (see
// store.js), so a pause request set by the API on that same object is
// visible here without any extra signalling.
function checkPause(job) {
  if (job.pauseRequested) throw new PausedError();
}

export async function runJob(jobId) {
  const job = getJob(jobId);
  if (!job) return;
  const logger = getLogger(jobId);
  const preset = FORMAT_PRESETS[job.format];

  job.status = 'running';
  job.pauseRequested = false;
  job.runsCount += 1;
  if (!job.startedAt) job.startedAt = new Date().toISOString();
  saveJob(job);
  logger.line(`Запуск задания (попытка №${job.runsCount})`);

  try {
    if (!job.script) {
      logger.line('Генерирую сценарий...');
      job.script = await generateScript(
        { topic: job.topic, delivery: job.delivery, format: job.format, options: job.options },
        logger,
      );
      job.title = job.script.title;
      const n = job.script.scenes.length;
      job.progress = {
        scriptsTotal: n, scriptsDone: n,
        voiceTotal: n, voiceDone: 0,
        framesTotal: n, framesDone: 0,
        videoTotal: n, videoDone: 0,
      };
      saveJob(job);
      logger.line(`Сценарий готов: "${job.title}", сцен: ${n}`);
    }
    checkPause(job);

    const scenes = job.script.scenes;
    const audioDir = jobPath(jobId, 'audio');
    const imagesDir = jobPath(jobId, 'images');
    const clipsDir = jobPath(jobId, 'clips');
    const outputDir = jobPath(jobId, 'output');
    const styleText = styleSuffix(job.options.visualStyle);

    for (let i = 0; i < scenes.length; i++) {
      checkPause(job);
      const outPath = path.join(audioDir, `scene_${i}.mp3`);
      if (!fs.existsSync(outPath)) {
        logger.line(`Озвучиваю сцену ${i + 1}/${scenes.length}`);
        await synthesizeSpeech({ text: scenes[i].narration, outPath }, logger);
      }
      job.progress.voiceDone = i + 1;
      saveJob(job);
    }

    for (let i = 0; i < scenes.length; i++) {
      checkPause(job);
      const outPath = path.join(imagesDir, `scene_${i}.jpg`);
      if (!fs.existsSync(outPath)) {
        logger.line(`Генерирую кадр ${i + 1}/${scenes.length}`);
        const prompt = `${scenes[i].imagePrompt}, ${styleText}`;
        const buffer = await generateImage({ prompt, width: preset.width, height: preset.height, sceneIndex: i }, logger);
        fs.writeFileSync(outPath, buffer);
      }
      job.progress.framesDone = i + 1;
      saveJob(job);
    }

    const animateCount = { none: 0, first: 1, all: scenes.length }[job.options.animation] ?? 0;
    const clipPaths = scenes.map((_, i) => path.join(clipsDir, `scene_${i}.mp4`));
    for (let i = 0; i < scenes.length; i++) {
      checkPause(job);
      if (!fs.existsSync(clipPaths[i])) {
        const imagePath = path.join(imagesDir, `scene_${i}.jpg`);
        const audioPath = path.join(audioDir, `scene_${i}.mp3`);
        if (i < animateCount) {
          logger.line(`Анимирую сцену ${i + 1}/${scenes.length} (это дольше и дороже обычного кадра)`);
          try {
            await animateScene({
              imagePath,
              audioPath,
              prompt: `${scenes[i].imagePrompt}, ${styleText}`,
              outPath: clipPaths[i],
              width: preset.width,
              height: preset.height,
            }, logger);
          } catch (err) {
            logger.line(`Анимация не удалась (${err.message}) — собираю сцену обычным кадром`);
          }
        }
        if (!fs.existsSync(clipPaths[i])) {
          logger.line(`Собираю видео-сегмент ${i + 1}/${scenes.length}`);
          await buildSceneClip({
            imagePath,
            audioPath,
            outPath: clipPaths[i],
            width: preset.width,
            height: preset.height,
          });
        }
      }
      job.progress.videoDone = i + 1;
      saveJob(job);
    }

    checkPause(job);
    const finalPath = path.join(outputDir, 'video.mp4');
    if (!fs.existsSync(finalPath)) {
      logger.line('Склеиваю финальное видео...');
      await concatClips(clipPaths, finalPath);
      logger.line('Финальное видео готово');
    }
    job.outputVideo = path.relative(jobPath(jobId), finalPath);
    saveJob(job);

    const coverPath = path.join(outputDir, 'cover.jpg');
    if (!fs.existsSync(coverPath)) {
      logger.line('Генерирую обложку...');
      const coverBuffer = await generateImage(
        { prompt: `${job.script.coverPrompt}, ${styleText}`, width: preset.width, height: preset.height, sceneIndex: 0 },
        logger,
      );
      fs.writeFileSync(coverPath, coverBuffer);
    }
    job.coverImage = path.relative(jobPath(jobId), coverPath);

    job.status = 'done';
    job.finishedAt = new Date().toISOString();
    job.error = null;
    saveJob(job);
    logger.line('Готово!');
  } catch (err) {
    if (err instanceof PausedError) {
      job.status = 'paused';
      saveJob(job);
      logger.line('Задание остановлено пользователем. Его можно продолжить.');
    } else {
      job.status = 'failed';
      job.error = err.message;
      saveJob(job);
      logger.line(`Ошибка: ${err.message}`);
    }
  }
}
