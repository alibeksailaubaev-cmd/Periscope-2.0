import { Howl } from 'howler'

/**
 * Play a real human recording for a listening track.
 *
 * The prototype ships no audio files, so this always reports "unavailable" and
 * the caller falls back to speech synthesis. Drop an mp3 at the track's
 * `audioUrl` (e.g. `public/audio/nutrition-advice.mp3`) and the same track will
 * start playing the native-speaker recording instead, with no code change.
 */
export function playRecording(url, { onEnd, onUnavailable, rate = 1 } = {}) {
  if (!url) {
    onUnavailable?.()
    return () => {}
  }

  let howl
  try {
    howl = new Howl({
      src: [url],
      html5: true,
      rate,
      onend: () => onEnd?.(),
      onloaderror: () => onUnavailable?.(),
      onplayerror: () => onUnavailable?.(),
    })
    howl.play()
  } catch {
    onUnavailable?.()
    return () => {}
  }

  return () => {
    try {
      howl.stop()
      howl.unload()
    } catch {
      /* no-op */
    }
  }
}
