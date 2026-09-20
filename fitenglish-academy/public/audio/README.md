# Listening recordings

Drop an mp3 here and the matching track plays the **recording** instead of the
device's synthetic voice. The player shows a "Native recording" badge when it
does, and falls back to speech synthesis whenever a file is missing — so the
app works with none, one, or both of these present.

| File | Track | Speaker | Script |
| --- | --- | --- | --- |
| `trainer-instructions.mp3` | Trainer's instructions (A2, ~48s) | a male PE teacher | `src/data/listening.js` → `tracks[0].script` |
| `nutrition-advice.mp3` | Nutrition advice (B1, ~62s) | a female nutritionist | `src/data/listening.js` → `tracks[1].script` |

Read the script exactly as written — the comprehension questions depend on the
details (two minutes of jogging, ten squats, two hours before training, and so
on).

Recording notes: mono is fine, 128 kbps mp3 keeps the file well under a
megabyte, and leaving half a second of silence at each end stops the first word
being clipped.
