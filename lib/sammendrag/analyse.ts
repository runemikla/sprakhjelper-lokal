// Sammendraget i Skrivehjelp: svarformatet fra språkmodellen og en
// normalisering som tåler både det nye formatet (med feiltyper) og det gamle
// (hva_var_bra / hva_kan_bli_bedre som fritekst).
//
// Feilkodene er de samme som i «Øv på feilene dine» (lib/ovinger/feiltyper.ts),
// fra dokumentet «Feiltyper i elevtekster og øvinger (A1–B2)».

import { FEILKODER, finnFeiltype } from '@/lib/ovinger/feiltyper'

export interface Tospraaklig {
  bokmaal: string
  morsmaal: string
}

export interface FeilEksempel {
  feil: string
  riktig: string
}

export interface FeiltypeOversikt {
  kode: string
  feiltype: string
  antall: number
  eksempel: FeilEksempel
}

export interface TekstAnalyse {
  bra: Tospraaklig
  // Kort oppsummering (2–4 setninger), som «bra».
  kan_bli_bedre: Tospraaklig
  ordliste: FeilEksempel[]
  feiltyper: FeiltypeOversikt[]
  totalt_antall_feil: number
}

const str = { type: 'string' } as const

const tospraaklig = {
  type: 'object',
  properties: { bokmaal: str, morsmaal: str },
  required: ['bokmaal', 'morsmaal'],
  additionalProperties: false,
} as const

const feilRiktig = {
  type: 'object',
  properties: { feil: str, riktig: str },
  required: ['feil', 'riktig'],
  additionalProperties: false,
} as const

const kode = { type: 'string', enum: FEILKODER } as const

// JSON-skjemaet modellen svarer etter (strict structured output). Det styrer
// formatet uansett hvilken versjon av instruksen som er aktiv.
export const SAMMENDRAG_SVARSKJEMA = {
  type: 'object',
  properties: {
    bra: tospraaklig,
    kan_bli_bedre: tospraaklig,
    ordliste: { type: 'array', items: feilRiktig },
    feiltyper: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kode,
          feiltype: str,
          antall: { type: 'integer' },
          eksempel: feilRiktig,
        },
        required: ['kode', 'feiltype', 'antall', 'eksempel'],
        additionalProperties: false,
      },
    },
    totalt_antall_feil: { type: 'integer' },
  },
  required: ['bra', 'kan_bli_bedre', 'ordliste', 'feiltyper', 'totalt_antall_feil'],
  additionalProperties: false,
}

// ---------------------------------------------------------------------------
// Normalisering
// ---------------------------------------------------------------------------

type Raatt = Record<string, unknown>

function tekst(verdi: unknown): string {
  return typeof verdi === 'string' ? verdi.trim() : ''
}

function erObjekt(verdi: unknown): verdi is Raatt {
  return typeof verdi === 'object' && verdi !== null && !Array.isArray(verdi)
}

function tilTospraaklig(verdi: unknown): Tospraaklig {
  if (typeof verdi === 'string') return { bokmaal: verdi.trim(), morsmaal: verdi.trim() }
  if (!erObjekt(verdi)) return { bokmaal: '', morsmaal: '' }
  const bokmaal = tekst(verdi.bokmaal)
  return { bokmaal, morsmaal: tekst(verdi.morsmaal) || bokmaal }
}

function tilFeilRiktig(verdi: unknown): FeilEksempel | null {
  if (!erObjekt(verdi)) return null
  const feil = tekst(verdi.feil)
  const riktig = tekst(verdi.riktig)
  return feil || riktig ? { feil, riktig } : null
}

function liste<T>(verdi: unknown, map: (v: unknown) => T | null): T[] {
  return Array.isArray(verdi) ? verdi.map(map).filter((v): v is T => v !== null) : []
}

function normaliserKode(verdi: unknown): string | null {
  const k = tekst(verdi).toUpperCase()
  return finnFeiltype(k) ? k : null
}

// Gjør modellens svar om til TekstAnalyse. Ukjente koder tas ut, feiltyper med
// samme kode slås sammen, listen sorteres etter antall og totalen regnes ut på
// nytt, slik at tallene alltid stemmer med tabellen.
export function normaliserAnalyse(raatt: unknown): TekstAnalyse {
  const r: Raatt = erObjekt(raatt) ? raatt : {}

  const bra =
    r.bra !== undefined
      ? tilTospraaklig(r.bra)
      : { bokmaal: tekst(r.hva_var_bra), morsmaal: tekst(r.hva_var_bra_morsmaal) || tekst(r.hva_var_bra) }

  // Nytt format: { bokmaal, morsmaal }. Eldre formater: en liste med ett punkt
  // per feiltype (PR #49) eller hva_kan_bli_bedre som fritekst.
  let kanBliBedre: Tospraaklig
  if (Array.isArray(r.kan_bli_bedre)) {
    const punkter = r.kan_bli_bedre.filter(erObjekt).map((v) => tilTospraaklig(v.forklaring))
    kanBliBedre = {
      bokmaal: punkter.map((p) => p.bokmaal).filter(Boolean).join(' '),
      morsmaal: punkter.map((p) => p.morsmaal).filter(Boolean).join(' '),
    }
  } else if (r.kan_bli_bedre !== undefined) {
    kanBliBedre = tilTospraaklig(r.kan_bli_bedre)
  } else {
    kanBliBedre = {
      bokmaal: tekst(r.hva_kan_bli_bedre),
      morsmaal: tekst(r.hva_kan_bli_bedre_morsmaal) || tekst(r.hva_kan_bli_bedre),
    }
  }

  const perKode = new Map<string, FeiltypeOversikt>()
  for (const v of Array.isArray(r.feiltyper) ? r.feiltyper : []) {
    if (!erObjekt(v)) continue
    const k = normaliserKode(v.kode)
    const antall = Math.round(Number(v.antall))
    if (!k || !Number.isFinite(antall) || antall < 1) continue
    const finnes = perKode.get(k)
    if (finnes) {
      finnes.antall += antall
      continue
    }
    perKode.set(k, {
      kode: k,
      feiltype: tekst(v.feiltype) || finnFeiltype(k)?.navn || k,
      antall,
      eksempel: tilFeilRiktig(v.eksempel) ?? { feil: '', riktig: '' },
    })
  }
  const feiltyper = [...perKode.values()].sort((a, b) => b.antall - a.antall)

  return {
    bra,
    kan_bli_bedre: kanBliBedre,
    ordliste: liste(r.ordliste, tilFeilRiktig),
    feiltyper,
    totalt_antall_feil: feiltyper.reduce((sum, f) => sum + f.antall, 0),
  }
}
