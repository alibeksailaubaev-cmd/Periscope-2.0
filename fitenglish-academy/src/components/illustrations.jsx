/**
 * Flat SVG scenes for the unit introduction — people actually doing the thing,
 * not abstract icons. Drawn inline so the prototype ships no image files: they
 * scale cleanly, work offline, and read correctly in both themes.
 *
 * Shared construction: a 120×120 viewBox, a tinted disc behind the scene,
 * ink-coloured rounded strokes for the figure, brand colours for props.
 */
const BLAZE = '#FF6B35'
const BLAZE_SOFT = '#FFC5AB'
const MINT = '#00B894'
const MINT_SOFT = '#8FEAD6'
const INK = '#2D3436'
const PAPER = '#FFFFFF'

/** Tinted disc every scene sits on. */
function Disc({ colour = BLAZE, opacity = 0.12 }) {
  return <circle cx="60" cy="60" r="52" fill={colour} opacity={opacity} />
}

const limb = { stroke: INK, strokeWidth: 6.5, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' }

/** A head that stays readable even when a limb passes behind it. */
function Head({ cx, cy, r = 9.5 }) {
  return <circle cx={cx} cy={cy} r={r} fill={INK} stroke={PAPER} strokeWidth="2.5" />
}

/* ------------------------------------------------------------------ */
/* Sport                                                               */
/* ------------------------------------------------------------------ */

/** A runner mid-stride on a track. */
export function RunIllustration(props) {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="A person running on a track" {...props}>
      <Disc />
      <path d="M14 98 Q60 86 106 98" stroke={BLAZE_SOFT} strokeWidth="7" strokeLinecap="round" fill="none" />
      <g stroke={BLAZE} strokeWidth="4.5" strokeLinecap="round" opacity="0.5">
        <line x1="12" y1="40" x2="28" y2="40" />
        <line x1="8" y1="54" x2="22" y2="54" />
      </g>
      <Head cx={76} cy={26} r={9.5} />
      <g {...limb}>
        <path d="M72 38 L62 62" />
        <path d="M62 62 L74 76 L72 94" />
        <path d="M62 62 L44 70 L36 88" />
        <path d="M70 42 L90 34" />
        <path d="M68 46 L50 54" />
      </g>
      <circle cx="93" cy="32" r="4.5" fill={MINT} />
    </svg>
  )
}

/** A swimmer doing front crawl, one arm out of the water. */
export function SwimIllustration(props) {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="A person swimming" {...props}>
      <Disc colour={MINT} opacity={0.16} />
      <Head cx={80} cy={54} r={9.5} />
      <g {...limb}>
        <path d="M72 60 L40 66" />
        <path d="M82 46 Q92 30 100 24" />
        <path d="M60 64 Q50 74 40 72" />
        <path d="M40 66 Q28 62 20 68" />
        <path d="M40 68 Q30 78 22 78" />
      </g>
      <g stroke={MINT} strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M10 84 q10 -7 20 0 t20 0 t20 0 t20 0 t20 0" />
        <path d="M10 96 q10 -7 20 0 t20 0 t20 0 t20 0 t20 0" opacity="0.6" />
      </g>
      <g fill={MINT_SOFT}>
        <circle cx="20" cy="60" r="3.5" />
        <circle cx="28" cy="52" r="2.5" />
        <circle cx="100" cy="16" r="3" />
      </g>
    </svg>
  )
}

/** A cyclist on a bike, seen from the side. */
export function CycleIllustration(props) {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="A person riding a bicycle" {...props}>
      <Disc colour={MINT} opacity={0.12} />
      <g stroke={INK} strokeWidth="4" fill="none">
        <circle cx="30" cy="86" r="16" />
        <circle cx="90" cy="86" r="16" />
        <path d="M30 86 L56 86 L70 62 M56 86 L70 62 L90 86 M70 62 L84 62" />
      </g>
      <Head cx={74} cy={34} r={9.5} />
      <g {...limb}>
        <path d="M70 44 L60 62" />
        <path d="M60 62 L56 86" />
        <path d="M60 62 L70 80" />
        <path d="M70 46 L86 60" />
      </g>
      <path d="M64 26 q10 -6 19 2" stroke={BLAZE} strokeWidth="5" strokeLinecap="round" fill="none" />
      <g stroke={BLAZE} strokeWidth="4" strokeLinecap="round" opacity="0.45">
        <line x1="10" y1="48" x2="24" y2="48" />
        <line x1="14" y1="60" x2="26" y2="60" />
      </g>
    </svg>
  )
}

/** A player kicking a football. */
export function BallIllustration(props) {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="A person kicking a football" {...props}>
      <Disc />
      <path d="M14 98 Q60 88 106 98" stroke={BLAZE_SOFT} strokeWidth="7" strokeLinecap="round" fill="none" />
      <Head cx={72} cy={26} r={9.5} />
      <g {...limb}>
        <path d="M72 38 L70 62" />
        <path d="M70 62 L78 78 L76 94" />
        <path d="M70 62 L50 74 L38 84" />
        <path d="M72 42 L88 50" />
        <path d="M70 44 L56 52" />
      </g>
      <circle cx="26" cy="88" r="12" fill={PAPER} stroke={INK} strokeWidth="3" />
      <g fill={INK}>
        <polygon points="26,82 30,85 28,90 24,90 22,85" />
      </g>
    </svg>
  )
}

/** Someone lifting a dumbbell overhead. */
export function LiftIllustration(props) {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="A person lifting a dumbbell" {...props}>
      <Disc />
      <Head cx={60} cy={42} r={10} />
      <g {...limb}>
        <path d="M60 54 L60 78" />
        <path d="M60 78 L48 98" />
        <path d="M60 78 L74 98" />
        <path d="M60 58 L42 34" />
        <path d="M60 58 L78 34" />
      </g>
      <g stroke={BLAZE} strokeWidth="7" strokeLinecap="round">
        <line x1="34" y1="26" x2="86" y2="26" />
      </g>
      <g fill={BLAZE}>
        <rect x="24" y="16" width="11" height="20" rx="4" />
        <rect x="85" y="16" width="11" height="20" rx="4" />
      </g>
      <g stroke={MINT} strokeWidth="4" strokeLinecap="round" opacity="0.6">
        <line x1="18" y1="54" x2="28" y2="54" />
        <line x1="92" y1="54" x2="102" y2="54" />
      </g>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* The other three habits                                              */
/* ------------------------------------------------------------------ */

/** Someone holding a balanced plate: half vegetables, protein, carbohydrates. */
export function EatIllustration(props) {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="A person with a plate of healthy food" {...props}>
      <Disc colour={MINT} opacity={0.14} />
      {/* The plate is drawn from above so the three food groups are visible. */}
      <circle cx="76" cy="62" r="25" fill={PAPER} stroke={INK} strokeWidth="3" />
      <path d="M76 62 L76 37 A25 25 0 0 1 76 87 Z" fill={MINT} />
      <path d="M76 62 L76 37 A25 25 0 0 0 51 62 Z" fill={BLAZE} />
      <path d="M76 62 L51 62 A25 25 0 0 0 76 87 Z" fill={BLAZE_SOFT} />
      <circle cx="76" cy="62" r="25" fill="none" stroke={INK} strokeWidth="3" />

      <Head cx={28} cy={38} r={10} />
      <g {...limb}>
        <path d="M28 50 L28 76" />
        <path d="M28 76 L20 96" />
        <path d="M28 76 L36 96" />
        <path d="M28 56 L48 62" />
      </g>

      <g stroke={INK} strokeWidth="3" strokeLinecap="round">
        <line x1="106" y1="44" x2="106" y2="82" />
        <line x1="101" y1="44" x2="101" y2="56" />
        <line x1="111" y1="44" x2="111" y2="56" />
      </g>
    </svg>
  )
}

/** Someone drinking from a sports bottle. */
export function DrinkIllustration(props) {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="A person drinking water from a bottle" {...props}>
      <Disc colour={MINT} opacity={0.16} />
      <Head cx={48} cy={40} r={11} />
      <g {...limb}>
        <path d="M48 53 L48 82" />
        <path d="M48 82 L38 100" />
        <path d="M48 82 L58 100" />
        <path d="M48 58 L66 46" />
      </g>
      <g transform="rotate(-38 74 38)">
        <rect x="66" y="16" width="16" height="8" rx="3" fill={INK} />
        <rect x="63" y="24" width="22" height="42" rx="10" fill={PAPER} stroke={INK} strokeWidth="3" />
        <path d="M63 44 h22 v12 a10 10 0 0 1 -10 10 h-2 a10 10 0 0 1 -10 -10 Z" fill={MINT} />
      </g>
      <g fill={MINT}>
        <circle cx="96" cy="64" r="4" opacity="0.8" />
        <circle cx="104" cy="76" r="2.8" opacity="0.55" />
      </g>
    </svg>
  )
}

/** Someone asleep in bed under a crescent moon. */
export function SleepIllustration(props) {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="A person sleeping in bed" {...props}>
      <Disc colour={INK} opacity={0.09} />
      {/* A crescent is a circle with an offset circle punched out of it —
          arc-only paths silently collapse when the radii do not fit the chord. */}
      <defs>
        <mask id="kf-moon">
          <rect width="120" height="120" fill="white" />
          <circle cx="100" cy="24" r="17" fill="black" />
        </mask>
      </defs>
      <circle cx="90" cy="30" r="18" fill={BLAZE} mask="url(#kf-moon)" />
      <g fill={MINT}>
        <circle cx="26" cy="26" r="3.5" />
        <circle cx="40" cy="16" r="2.2" />
      </g>
      <rect x="14" y="62" width="30" height="18" rx="8" fill={PAPER} stroke={INK} strokeWidth="3" />
      <Head cx={40} cy={66} r={9.5} />
      <path d="M14 80 h92 a0 0 0 0 1 0 0 v6 a6 6 0 0 1 -6 6 H20 a6 6 0 0 1 -6 -6 Z" fill={MINT_SOFT} stroke={INK} strokeWidth="3" />
      <path d="M50 80 q18 -14 40 -2" fill={MINT_SOFT} stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <g fill={INK} opacity="0.55" fontFamily="Poppins, sans-serif" fontWeight="700">
        <text x="56" y="46" fontSize="13">z</text>
        <text x="66" y="36" fontSize="16">z</text>
      </g>
    </svg>
  )
}

/** A heart with a pulse line through it — used in the definition card. */
export function HeartIllustration(props) {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="A heart with a pulse line" {...props}>
      <Disc opacity={0.1} />
      <path
        d="M60 94 C24 70 20 50 30 38 C40 26 56 30 60 44 C64 30 80 26 90 38 C100 50 96 70 60 94 Z"
        fill={BLAZE}
      />
      <path
        d="M26 62 h16 l6 -14 l9 28 l7 -16 h14"
        fill="none"
        stroke={PAPER}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
