import { FEILKODER } from './feiltyper'

const str = { type: 'string' } as const;
const bool = { type: 'boolean' } as const;
const strArray = { type: 'array', items: str } as const;

// JSON-skjemaet språkmodellen svarer etter (strict structured output).
export const OVINGER_SVARSKJEMA = {
  type: 'object',
  properties: {
    feil: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kode: { type: 'string', enum: FEILKODER },
          utdrag: str,
          rettet: str,
          forklaring: str,
          global: bool,
          forventet_paa_nivaa: bool,
        },
        required: ['kode', 'utdrag', 'rettet', 'forklaring', 'global', 'forventet_paa_nivaa'],
        additionalProperties: false,
      },
    },
    valgte_feiltyper: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kode: { type: 'string', enum: FEILKODER },
          grunn: str,
          regel: str,
          regel_morsmaal: str,
        },
        required: ['kode', 'grunn', 'regel', 'regel_morsmaal'],
        additionalProperties: false,
      },
    },
    ovinger: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kode: { type: 'string', enum: FEILKODER },
          format: { type: 'string', enum: ['bygg_setning', 'velg_ord'] },
          instruksjon: str,
          forklaring: str,
          fra_elevteksten: bool,
          setningsstart: str,
          ord_i_riktig_rekkefolge: strArray,
          andre_riktige_svar: strArray,
          slutttegn: str,
          setning_med_luke: str,
          alternativer: strArray,
          riktig_svar: str,
        },
        required: [
          'kode',
          'format',
          'instruksjon',
          'forklaring',
          'fra_elevteksten',
          'setningsstart',
          'ord_i_riktig_rekkefolge',
          'andre_riktige_svar',
          'slutttegn',
          'setning_med_luke',
          'alternativer',
          'riktig_svar',
        ],
        additionalProperties: false,
      },
    },
    positivt: str,
    positivt_morsmaal: str,
  },
  required: ['feil', 'valgte_feiltyper', 'ovinger', 'positivt', 'positivt_morsmaal'],
  additionalProperties: false,
};
