// Strengt JSON-skjema for setningsdelingen i Skrivehjelp
// (app/api/split-sentences-azure). Azure krever et objekt på toppnivå, så
// setningene ligger i «sentences». Ruten pakker ut listen, slik at klienten får
// samme data som før. Ligger i egen fil slik at evals kan bruke samme skjema.
export const SETNINGSDELING_SVARSKJEMA = {
  type: 'object',
  properties: {
    sentences: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          original: {
            type: 'string',
            description:
              'Setningen slik eleven skrev den, med korrigert tegnsetting og stor forbokstav. Ingen ord endret.',
          },
          corrected: {
            type: 'string',
            description: 'Identisk med «original».',
          },
        },
        required: ['original', 'corrected'],
        additionalProperties: false,
      },
    },
  },
  required: ['sentences'],
  additionalProperties: false,
} as const

export interface DeltSetning {
  original: string
  corrected: string
}
