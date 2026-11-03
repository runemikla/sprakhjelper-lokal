// The pages under the «Om Språkhjelp» menu, in menu order.
export const OM_SECTIONS = [
  { href: '/laererveiledning', label: 'Lærerveiledning' },
  { href: '/om', label: 'Om verktøyene' },
  { href: '/personvern', label: 'Personvern og GDPR' },
  { href: '/endringslogg', label: 'Endringslogg' },
] as const

export type OmSectionHref = (typeof OM_SECTIONS)[number]['href']
