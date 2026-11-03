# Endringslogg

Endringsloggen vises på `/endringslogg` under «Om Språkhjelp». Innholdet ligger i
[`lib/endringslogg.ts`](../lib/endringslogg.ts).

## Slik legger du til en endring

Legg en ny oppføring **øverst** i `ENDRINGSLOGG` (nyeste først):

```ts
{
  dato: '2026-11-10',
  tittel: 'Valgfri overskrift',            // kan sløyfes
  endringer: [
    { type: 'nytt', tekst: 'Hva som er nytt, sett fra lærer eller elev.' },
    { type: 'forbedret', tekst: 'Hva som fungerer bedre.' },
    { type: 'rettet', tekst: 'Hvilken feil som er rettet.' },
  ],
},
```

- `type` er `nytt`, `forbedret` eller `rettet`. Det styrer merkelappen på siden.
- Skriv kort, på norsk, og om det brukeren merker. Ikke kopier tekniske PR-titler.
- Interne endringer brukeren ikke merker (refaktorering, avhengigheter, oppsett) tas ikke med.
- Bruk datoen endringen ble merget til `dev`, eller datoen den ble publisert hvis du heller vil det.
  Velg én praksis og hold deg til den.

## De andre sidene under «Om Språkhjelp»

| Side | Fil |
| --- | --- |
| Lærerveiledning | `app/laererveiledning/page.tsx` |
| Om verktøyene | `app/om/page.tsx` |
| Læreplaner | `app/laereplaner/page.tsx` + `lib/laereplaner.ts` (målene) |
| Personvern og GDPR | `app/personvern/page.tsx` (oppdater `SIST_OPPDATERT` når teksten endres) |
| Endringslogg | `app/endringslogg/page.tsx` + `lib/endringslogg.ts` |

Fanene leser rekkefølgen fra `components/om/sections.ts`.
