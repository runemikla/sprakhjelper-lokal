// One VLFK profile colour per tool, the same as in the tool illustrations.
// Use as a surface (icon tile, tag) with ink text, never as text colour.
export const VERKTOY_FARGE: Record<string, string> = {
  '/spraakhjelper': 'bg-vlfk-lyseblaa',
  '/laer-ord': 'bg-vlfk-lys-rosa',
  '/lytteoving': 'bg-vlfk-lysegronn',
  '/grammatikk': 'bg-vlfk-gul',
  '/grupper': 'bg-vlfk-lilla',
  '/snakkebot': 'bg-vlfk-mint',
}

// The same colours as a left edge, for panels that belong to a tool (for
// example the instruction cards in admin). Written out in full so Tailwind
// keeps the classes.
export const VERKTOY_KANT: Record<string, string> = {
  '/spraakhjelper': 'border-l-vlfk-lyseblaa',
  '/laer-ord': 'border-l-vlfk-lys-rosa',
  '/lytteoving': 'border-l-vlfk-lysegronn',
  '/grammatikk': 'border-l-vlfk-gul',
  '/grupper': 'border-l-vlfk-lilla',
  '/snakkebot': 'border-l-vlfk-mint',
}
