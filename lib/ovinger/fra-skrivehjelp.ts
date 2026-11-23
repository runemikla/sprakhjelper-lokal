// Teksten eleven tar med fra Skrivehjelp til «Øv på feilene dine» under
// Grammatikkøving. Den ligger i sessionStorage (som resten av Skrivehjelp), så
// elevteksten aldri havner i en URL og forsvinner når fanen lukkes.

export interface TekstForOvinger {
  originalText: string
  morsmaal: string
  morsmaalNavn: string
  morsmaalFlagg?: string
  // Setningene slik Skrivehjelp har rettet dem.
  setninger: { elev: string; rettet: string }[]
}

const NOKKEL = 'ov-pa-feilene-tekst'

export function lagreTekstForOvinger(data: TekstForOvinger): boolean {
  try {
    sessionStorage.setItem(NOKKEL, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function hentTekstForOvinger(): TekstForOvinger | null {
  try {
    const lagret = sessionStorage.getItem(NOKKEL)
    if (!lagret) return null
    const data = JSON.parse(lagret) as Partial<TekstForOvinger>
    if (typeof data.originalText !== 'string' || !data.originalText.trim()) return null
    if (typeof data.morsmaal !== 'string' || !data.morsmaal) return null
    return {
      originalText: data.originalText,
      morsmaal: data.morsmaal,
      morsmaalNavn: typeof data.morsmaalNavn === 'string' ? data.morsmaalNavn : data.morsmaal,
      morsmaalFlagg: typeof data.morsmaalFlagg === 'string' ? data.morsmaalFlagg : undefined,
      setninger: Array.isArray(data.setninger)
        ? data.setninger.filter(
            (s): s is { elev: string; rettet: string } =>
              typeof s?.elev === 'string' && typeof s?.rettet === 'string'
          )
        : [],
    }
  } catch {
    return null
  }
}
