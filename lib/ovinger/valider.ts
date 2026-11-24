import { finnFeiltype, maksFeiltyper, type Nivaa } from './feiltyper'
import type {
  FunnetFeil,
  Oving,
  OvingerResultat,
  ValgtFeiltype,
} from './types'

// Rått svar fra språkmodellen (JSON-skjemaet i app/api/generate-exercises).
export interface RaattSvar {
  feil: FunnetFeil[]
  valgte_feiltyper: {
    kode: string
    grunn: string
    regel: string
    regel_morsmaal: string
  }[]
  ovinger: {
    kode: string
    format: string
    instruksjon: string
    forklaring: string
    fra_elevteksten: boolean
    setningsstart: string
    ord_i_riktig_rekkefolge: string[]
    andre_riktige_svar: string[]
    slutttegn: string
    setning_med_luke: string
    alternativer: string[]
    riktig_svar: string
  }[]
  positivt: string
  positivt_morsmaal: string
}

export const LUKE = '___'
const MAKS_OVINGER_PER_FEILTYPE = 4

// Ord til ordbanken: uten tegn som punktum og komma, og uten tomme ord.
export function rensOrd(ord: string[]): string[] {
  return ord
    .flatMap((o) => o.split(/\s+/u))
    .map((o) => o.replace(/[.,;:!?«»"()]/gu, '').trim())
    .filter(Boolean)
}

// Sammenligner to svar uten å bry seg om store/små bokstaver og tegn.
export function normaliser(tekst: string): string {
  return rensOrd([tekst]).join(' ').toLocaleLowerCase('nb-NO')
}

function lagOving(o: RaattSvar['ovinger'][number]): Oving | null {
  const felles = {
    kode: o.kode,
    instruksjon: o.instruksjon.trim() || 'Løs oppgaven.',
    forklaring: o.forklaring.trim(),
    fra_elevteksten: Boolean(o.fra_elevteksten),
  }

  if (o.format === 'bygg_setning') {
    const ord = rensOrd(o.ord_i_riktig_rekkefolge)
    if (ord.length < 2 || ord.length > 12) return null
    const fasit = normaliser(ord.join(' '))
    const andre = o.andre_riktige_svar
      .map((svar) => rensOrd([svar]))
      // Et alternativt svar må bruke nøyaktig de samme ordene.
      .filter(
        (alt) =>
          alt.length === ord.length &&
          normaliser([...alt].sort().join(' ')) === normaliser([...ord].sort().join(' ')) &&
          normaliser(alt.join(' ')) !== fasit
      )
    return {
      ...felles,
      format: 'bygg_setning',
      setningsstart: o.setningsstart.trim(),
      ord,
      andre_riktige: andre,
      slutttegn: o.slutttegn.trim() === '?' ? '?' : '.',
    }
  }

  if (o.format === 'velg_ord') {
    const deler = o.setning_med_luke.split(/_{2,}/u)
    if (deler.length !== 2) return null
    const alternativer = Array.from(
      new Set(o.alternativer.map((a) => a.trim()).filter(Boolean))
    )
    const riktig = o.riktig_svar.trim()
    if (alternativer.length < 2 || alternativer.length > 4) return null
    if (!alternativer.includes(riktig)) return null
    return {
      ...felles,
      format: 'velg_ord',
      foer_luke: deler[0],
      etter_luke: deler[1],
      alternativer,
      riktig_svar: riktig,
    }
  }

  return null
}

// Gjør svaret fra modellen trygt å vise: bare kjente koder, maks antall
// feiltyper for nivået (dok. kap. 1.1), og bare øvinger med gyldig format.
export function validerSvar(raatt: RaattSvar, nivaa: Nivaa): OvingerResultat {
  const feil = raatt.feil.filter((f) => finnFeiltype(f.kode))

  const antallPerKode = new Map<string, number>()
  for (const f of feil) {
    antallPerKode.set(f.kode, (antallPerKode.get(f.kode) ?? 0) + 1)
  }

  const sett = new Set<string>()
  const valgte: ValgtFeiltype[] = []
  for (const v of raatt.valgte_feiltyper) {
    const feiltype = finnFeiltype(v.kode)
    if (!feiltype || sett.has(v.kode)) continue
    sett.add(v.kode)
    valgte.push({
      kode: v.kode,
      navn: feiltype.navn,
      grunn: v.grunn,
      regel: v.regel,
      regel_morsmaal: v.regel_morsmaal,
      antall: antallPerKode.get(v.kode) ?? 0,
    })
    if (valgte.length >= maksFeiltyper(nivaa)) break
  }

  const ovinger: Oving[] = []
  for (const v of valgte) {
    const forKoden = raatt.ovinger
      .filter((o) => o.kode === v.kode)
      .map(lagOving)
      .filter((o): o is Oving => o !== null)
      .slice(0, MAKS_OVINGER_PER_FEILTYPE)
    ovinger.push(...forKoden)
  }

  // En feiltype uten gyldige øvinger vises ikke.
  const medOvinger = valgte.filter((v) => ovinger.some((o) => o.kode === v.kode))

  return {
    nivaa,
    feil,
    valgte_feiltyper: medOvinger,
    ovinger,
    positivt: raatt.positivt,
    positivt_morsmaal: raatt.positivt_morsmaal,
  }
}
