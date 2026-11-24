import type { Nivaa } from './feiltyper'

// En feil språkmodellen fant i elevteksten (dok. kap. 5).
export interface FunnetFeil {
  kode: string
  utdrag: string
  rettet: string
  forklaring: string
  global: boolean
  forventet_paa_nivaa: boolean
}

// En feiltype som er valgt ut til øving.
export interface ValgtFeiltype {
  kode: string
  navn: string
  grunn: string
  regel: string
  regel_morsmaal: string
  antall: number
}

export interface ByggSetningOving {
  format: 'bygg_setning'
  kode: string
  instruksjon: string
  forklaring: string
  fra_elevteksten: boolean
  setningsstart: string
  // Riktig rekkefølge. Klienten blander ordene.
  ord: string[]
  // Andre riktige rekkefølger (hver som en liste med ord).
  andre_riktige: string[][]
  slutttegn: string
}

export interface VelgOrdOving {
  format: 'velg_ord'
  kode: string
  instruksjon: string
  forklaring: string
  fra_elevteksten: boolean
  // Setningen delt rundt luken.
  foer_luke: string
  etter_luke: string
  alternativer: string[]
  riktig_svar: string
}

export type Oving = ByggSetningOving | VelgOrdOving

export interface OvingerResultat {
  nivaa: Nivaa
  feil: FunnetFeil[]
  valgte_feiltyper: ValgtFeiltype[]
  ovinger: Oving[]
  positivt: string
  positivt_morsmaal: string
}
