/**
 * Fold the production build into one self-contained .html file.
 *
 * Why: a normal Vite build loads its JS as an external module, which browsers
 * refuse to do over file://. Inlining the module makes the page open with a
 * double click, with no server, no install and no internet.
 *
 * Fonts are downloaded once and embedded as base64 so the offline file looks
 * exactly like the hosted one.
 */
import fs from 'node:fs/promises'
import path from 'node:path'

const DIST = 'dist-standalone'
const OUT = 'FitEnglish-Academy.html'
const FONT_CSS =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&display=swap'
// A modern UA makes Google Fonts serve woff2 rather than legacy formats.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

async function embeddedFontCss() {
  const res = await fetch(FONT_CSS, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`font css: ${res.status}`)
  let css = await res.text()

  const urls = [...new Set([...css.matchAll(/url\((https:\/\/[^)]+\.woff2)\)/g)].map((m) => m[1]))]
  let bytes = 0
  for (const url of urls) {
    const font = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!font.ok) throw new Error(`font file: ${url} ${font.status}`)
    const buf = Buffer.from(await font.arrayBuffer())
    bytes += buf.length
    css = css.split(url).join(`data:font/woff2;base64,${buf.toString('base64')}`)
  }
  console.log(`  fonts: ${urls.length} files, ${(bytes / 1024).toFixed(0)} KB`)
  return css
}

const html = await fs.readFile(path.join(DIST, 'index.html'), 'utf8')
const js = await fs.readFile(path.join(DIST, 'app.js'), 'utf8')
const css = await fs.readFile(path.join(DIST, 'app.css'), 'utf8')

let fonts = ''
try {
  fonts = await embeddedFontCss()
} catch (error) {
  console.warn(`  fonts: skipped (${error.message}) — the file falls back to system fonts`)
}

const body = html
  // Replace the external stylesheet and script with their contents.
  .replace(/<link rel="stylesheet"[^>]*href="\.\/app\.css"[^>]*>/, `<style>${fonts}\n${css}</style>`)
  .replace(/<script type="module"[^>]*src="\.\/app\.js"[^>]*><\/script>/, () => `<script type="module">${js}</script>`)
  // The remote font stylesheet is now embedded; drop the network requests.
  .replace(/<link rel="preconnect"[^>]*>\s*/g, '')
  .replace(/<link[^>]*fonts\.googleapis\.com[^>]*>\s*/g, '')

if (body.includes('app.js') || body.includes('app.css')) {
  throw new Error('inlining failed — the build output names changed')
}

await fs.writeFile(OUT, body)
const { size } = await fs.stat(OUT)
console.log(`  wrote ${OUT} — ${(size / 1024 / 1024).toFixed(2)} MB`)
