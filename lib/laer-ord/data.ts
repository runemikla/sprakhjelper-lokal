// Word lists for «Lær ord», ported from the Ordbank A1 prototype.
// Each word has an image in /laer-ord/img/<id>.webp and two recordings in
// /laer-ord/lyd: <id>.mp3 (the word) and <id>-s.mp3 (the example sentence).
// In the example sentence the target word is wrapped in [brackets].

export interface Word {
  id: string
  ord: string
  boying: string
  en: string
  s: string
  tema?: string
}

export interface Theme {
  id: string
  navn: string
  ord: Word[]
}

export const THEMES: Theme[] = [
  {
    "id": "kantine",
    "navn": "Lunsj i kantinen",
    "ord": [
      {
        "id": "kantine-kantine",
        "ord": "kantine",
        "boying": "ei/en kantine, kantina/kantinen, kantiner",
        "en": "canteen",
        "s": "Vi går i [kantina]."
      },
      {
        "id": "kantine-stol",
        "ord": "stol",
        "boying": "en stol, stolen, stoler",
        "en": "chair",
        "s": "Jeg tar en [stol]."
      },
      {
        "id": "kantine-benk",
        "ord": "benk",
        "boying": "en benk, benken, benker",
        "en": "bench",
        "s": "Vi sitter på [benken]."
      },
      {
        "id": "kantine-bord",
        "ord": "bord",
        "boying": "et bord, bordet, bord",
        "en": "table",
        "s": "Vi finner et [bord]."
      },
      {
        "id": "kantine-skal",
        "ord": "skål",
        "boying": "ei/en skål, skåla/skålen, skåler",
        "en": "bowl",
        "s": "Suppa er i [skåla]."
      },
      {
        "id": "kantine-tallerken",
        "ord": "tallerken",
        "boying": "en tallerken, tallerkenen, tallerkener",
        "en": "plate",
        "s": "Jeg tar en [tallerken]."
      },
      {
        "id": "kantine-kopp",
        "ord": "kopp",
        "boying": "en kopp, koppen, kopper",
        "en": "cup",
        "s": "Kaffen er i [koppen]."
      },
      {
        "id": "kantine-glass",
        "ord": "glass",
        "boying": "et glass, glasset, glass",
        "en": "glass",
        "s": "Jeg tar et [glass]."
      },
      {
        "id": "kantine-kniv",
        "ord": "kniv",
        "boying": "en kniv, kniven, kniver",
        "en": "knife",
        "s": "Jeg trenger en [kniv]."
      },
      {
        "id": "kantine-skje",
        "ord": "skje",
        "boying": "ei/en skje, skjea/skjeen, skjeer",
        "en": "spoon",
        "s": "Jeg spiser med [skje]."
      },
      {
        "id": "kantine-gaffel",
        "ord": "gaffel",
        "boying": "en gaffel, gaffelen, gafler",
        "en": "fork",
        "s": "Har du en [gaffel]?"
      },
      {
        "id": "kantine-kaffe",
        "ord": "kaffe",
        "boying": "en kaffe, kaffen",
        "en": "coffee",
        "s": "Læreren drikker [kaffe]."
      },
      {
        "id": "kantine-te",
        "ord": "te",
        "boying": "en te, teen",
        "en": "tea",
        "s": "Jeg vil ha [te]."
      },
      {
        "id": "kantine-vann",
        "ord": "vann",
        "boying": "et vann, vannet",
        "en": "water",
        "s": "[Vannet] er kaldt."
      },
      {
        "id": "kantine-salatbar",
        "ord": "salatbar",
        "boying": "en salatbar, salatbaren, salatbarer",
        "en": "salad bar",
        "s": "Jeg går til [salatbaren]."
      },
      {
        "id": "kantine-salt",
        "ord": "salt",
        "boying": "et salt, saltet",
        "en": "salt",
        "s": "Kan jeg få [saltet]?"
      },
      {
        "id": "kantine-pepper",
        "ord": "pepper",
        "boying": "en pepper, pepperen",
        "en": "pepper",
        "s": "Jeg vil ha [pepper]."
      },
      {
        "id": "kantine-vekt",
        "ord": "vekt",
        "boying": "ei/en vekt, vekta/vekten, vekter",
        "en": "scale",
        "s": "Sett skåla på [vekta]."
      },
      {
        "id": "kantine-bolle",
        "ord": "bolle",
        "boying": "en bolle, bollen, boller",
        "en": "bun",
        "s": "[Bollen] er god."
      },
      {
        "id": "kantine-yoghurt",
        "ord": "yoghurt",
        "boying": "en yoghurt, yoghurten, yoghurter",
        "en": "yoghurt",
        "s": "Jeg spiser [yoghurt]."
      },
      {
        "id": "kantine-baguett",
        "ord": "baguett",
        "boying": "en baguett, baguetten, baguetter",
        "en": "baguette (sandwich)",
        "s": "Jeg kjøper en [baguett]."
      },
      {
        "id": "kantine-rundstykke",
        "ord": "rundstykke",
        "boying": "et rundstykke, rundstykket, rundstykker",
        "en": "bread roll (with filling)",
        "s": "[Rundstykket] har ost."
      },
      {
        "id": "kantine-kontanter",
        "ord": "kontanter",
        "boying": "kontanter, kontantene (flertall)",
        "en": "cash",
        "s": "Jeg betaler med [kontanter]."
      },
      {
        "id": "kantine-bankkort",
        "ord": "bankkort",
        "boying": "et bankkort, bankkortet, bankkort",
        "en": "bank card",
        "s": "Jeg betaler med [bankkort]."
      },
      {
        "id": "kantine-kasse",
        "ord": "kasse",
        "boying": "ei/en kasse, kassa/kassen, kasser",
        "en": "checkout, till",
        "s": "Jeg betaler i [kassa]."
      },
      {
        "id": "kantine-kake",
        "ord": "kake",
        "boying": "ei/en kake, kaka/kaken, kaker",
        "en": "cake",
        "s": "[Kaka] er god."
      },
      {
        "id": "kantine-spise",
        "ord": "spise",
        "boying": "spiser – spiste – har spist",
        "en": "eat",
        "s": "Vi [spiser] lunsj."
      },
      {
        "id": "kantine-drikke",
        "ord": "drikke",
        "boying": "drikker – drakk – har drukket",
        "en": "drink",
        "s": "Jeg [drikker] vann."
      }
    ]
  },
  {
    "id": "blandet",
    "navn": "Blandede ord (første prøve)",
    "ord": [
      {
        "id": "eple",
        "ord": "eple",
        "boying": "et eple, eplet, epler",
        "en": "apple",
        "tema": "Mat og drikke",
        "s": "Jeg spiser et [eple] i friminuttet."
      },
      {
        "id": "brod",
        "ord": "brød",
        "boying": "et brød, brødet, brød",
        "en": "bread",
        "tema": "Mat og drikke",
        "s": "Vi kjøper [brød] i butikken."
      },
      {
        "id": "ost",
        "ord": "ost",
        "boying": "en ost, osten, oster",
        "en": "cheese",
        "tema": "Mat og drikke",
        "s": "Jeg har [ost] på brødskiva."
      },
      {
        "id": "melk",
        "ord": "melk",
        "boying": "ei/en melk, melka/melken",
        "en": "milk",
        "tema": "Mat og drikke",
        "s": "Vil du ha et glass [melk]?"
      },
      {
        "id": "fisk",
        "ord": "fisk",
        "boying": "en fisk, fisken, fisker",
        "en": "fish",
        "tema": "Mat og drikke",
        "s": "Vi spiser [fisk] til middag."
      },
      {
        "id": "bok",
        "ord": "bok",
        "boying": "ei/en bok, boka/boken, bøker",
        "en": "book",
        "tema": "Klasserommet: ting",
        "s": "Åpne [boka] på side ti."
      },
      {
        "id": "blyant",
        "ord": "blyant",
        "boying": "en blyant, blyanten, blyanter",
        "en": "pencil",
        "tema": "Klasserommet: ting",
        "s": "Kan jeg låne en [blyant]?"
      },
      {
        "id": "sekk",
        "ord": "sekk",
        "boying": "en sekk, sekken, sekker",
        "en": "backpack",
        "tema": "Klasserommet: ting",
        "s": "[Sekken] min er tung."
      },
      {
        "id": "stol",
        "ord": "stol",
        "boying": "en stol, stolen, stoler",
        "en": "chair",
        "tema": "Hjem og bolig",
        "s": "Sett deg på [stolen]."
      },
      {
        "id": "jakke",
        "ord": "jakke",
        "boying": "ei/en jakke, jakka/jakken, jakker",
        "en": "jacket",
        "tema": "Klær",
        "s": "Ta på deg [jakka], det er kaldt ute."
      },
      {
        "id": "spise",
        "ord": "spise",
        "boying": "spiser – spiste – har spist",
        "en": "eat",
        "tema": "Vanlige verb",
        "s": "Vi [spiser] lunsj klokka elleve."
      },
      {
        "id": "sove",
        "ord": "sove",
        "boying": "sover – sov – har sovet",
        "en": "sleep",
        "tema": "Vanlige verb",
        "s": "Jeg [sover] åtte timer hver natt."
      }
    ]
  }
]
