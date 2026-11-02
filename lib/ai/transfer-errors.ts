// Transfer errors per language (detailed descriptions).
// These lists describe common first-language transfer errors that the writing
// helper ("Skrivehjelp") should pay special attention to. Keyed by the mother
// language value sent from the client. Shared between the API route that builds
// the system prompt and the admin instructions page so both show the exact
// same content.
export const TRANSFER_ERRORS: Record<string, string> = {
  'amharisk': `Amharisk:
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • «Det»-setninger, altså setninger der «det» fungerer som formelt subjekt
  • Norske vokaler, spesielt «u», «y» og «ø»
  • Ord med mange ulike konsonanter etter hverandre
  • Preteritum vs. perfektum i verb-bøying
  • Substantiv-bøying, bl.a. bestemt vs. ubestemt form`,

  'arabisk': `Arabisk:
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • Norske vokaler, spesielt «u», «y» og «ø»
  • Preteritum vs. perfektum i verb-bøying
  • Substantiv-bøying, bl.a. bestemt vs. ubestemt form`,

  'arabisk-syrisk': `Arabisk (syrisk):
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • Norske vokaler, spesielt «u», «y» og «ø»
  • Preteritum vs. perfektum i verb-bøying
  • Substantiv-bøying, bl.a. bestemt vs. ubestemt form`,

  'dari': `Dari / Farsi / Persisk:
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • «Det»-setninger, altså setninger der «det» fungerer som formelt subjekt
  • Norske vokaler, spesielt «u», «y» og «ø»
  • Ord med mange ulike konsonanter etter hverandre
  • Plassering av ordet «ikke»
  • Substantiv-bøying, bl.a. bestemt vs. ubestemt form`,

  'engelsk': `Engelsk:
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • Substantiv-bøying, bl.a. bestemt vs. ubestemt form
  • Kjønn på substantiv (en/ei/et)
  • Norske vokaler, spesielt «y» og «ø»
  • Preteritum vs. perfektum i verb-bøying`,

  'farsi': `Dari / Farsi / Persisk:
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • «Det»-setninger, altså setninger der «det» fungerer som formelt subjekt
  • Norske vokaler, spesielt «u», «y» og «ø»
  • Ord med mange ulike konsonanter etter hverandre
  • Plassering av ordet «ikke»
  • Substantiv-bøying, bl.a. bestemt vs. ubestemt form`,

  'persisk': `Dari / Farsi / Persisk:
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • «Det»-setninger, altså setninger der «det» fungerer som formelt subjekt
  • Norske vokaler, spesielt «u», «y» og «ø»
  • Ord med mange ulike konsonanter etter hverandre
  • Plassering av ordet «ikke»
  • Substantiv-bøying, bl.a. bestemt vs. ubestemt form`,

  'kurmandsji': `Kurmandsji (kurdisk):
  • Bestemt artikkel (determinativ)
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • «Det»-setninger, altså setninger der «det» fungerer som formelt subjekt
  • Norske vokaler, spesielt «u», «y» og «ø»
  • Ord med mange ulike konsonanter etter hverandre
  • Plassering av ordet «ikke»`,

  'kurdisk': `Kurmandsji (kurdisk):
  • Bestemt artikkel (determinativ)
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • «Det»-setninger, altså setninger der «det» fungerer som formelt subjekt
  • Norske vokaler, spesielt «u», «y» og «ø»
  • Ord med mange ulike konsonanter etter hverandre
  • Plassering av ordet «ikke»`,

  'mandarin': `Mandarin (kinesisk):
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • Ord med mange ulike konsonanter etter hverandre
  • Substantiv-bøying
  • Verb-bøying`,

  'kinesisk': `Mandarin (kinesisk):
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • Ord med mange ulike konsonanter etter hverandre
  • Substantiv-bøying
  • Verb-bøying`,

  'pashto': `Pashto:
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • «Det»-setninger, altså setninger der «det» fungerer som formelt subjekt
  • Norske vokaler, spesielt «u», «y» og «ø»
  • Ord med mange ulike konsonanter etter hverandre
  • Plassering av ordet «ikke»
  • Substantiv-bøying, bl.a. bestemt vs. ubestemt form`,

  'polsk': `Polsk:
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • Norske vokaler, spesielt «u», «y» og «ø»
  • Preteritum vs. perfektum i verb-bøying
  • Pronomen
  • Substantiv-bøying, bl.a. bestemt vs. ubestemt form`,

  'portugisisk': `Portugisisk:
  • Bestemt artikkel (determinativ)
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • Gradbøying og plassering av adjektiv
  • Konsonanten «s» i opptakt (som på portugisisk uttales «es», noe som kan føre til at eleven feilaktig skriver «es» i ord med «s» som opptakt)
  • Konsonantene «h» og «r» («h» er alltid stum på portugisisk, og kan derfor feilaktig få bortfall i skrift)
  • Korrekt ubestemt artikkel (en, ett) foran substantiv i ubestemt form entall
  • Negasjon
  • Sammensatte substantiv
  • Spørresetninger`,

  'russisk': `Russisk / Ukrainsk:
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • Korrekt ubestemt artikkel (en, ett) foran substantiv i ubestemt form entall
  • Norske vokaler, spesielt «u», «y» og «ø»
  • Preteritum vs. perfektum i verb-bøying
  • Substantiv-bøying, bl.a. bestemt vs. ubestemt form`,

  'ukrainsk': `Russisk / Ukrainsk:
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • Korrekt ubestemt artikkel (en, ett) foran substantiv i ubestemt form entall
  • Norske vokaler, spesielt «u», «y» og «ø»
  • Preteritum vs. perfektum i verb-bøying
  • Substantiv-bøying, bl.a. bestemt vs. ubestemt form`,

  'somali': `Somali:
  • Bestemt artikkel (determinativ)
  • De norske konsonantene «p», «v» og «kj»
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • Den norske vokalen «y»
  • Kjønn på substantiv
  • Preposisjoner`,

  'spansk': `Spansk:
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • Substantiv-bøying, bl.a. bestemt vs. ubestemt form
  • Korrekt ubestemt artikkel (en, ett) foran substantiv i ubestemt form entall
  • Norske vokaler, spesielt «y» og «ø»
  • Plassering av adjektiv`,

  'swahili': `Swahili:
  • Adjektiv
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • Diftonger
  • Ord med mange ulike konsonanter etter hverandre
  • Pronomen
  • Substantiv-bøying
  • Verb-bøying`,

  'tagalog': `Tagalog:
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • Substantiv-bøying, bl.a. bestemt vs. ubestemt form
  • Kjønn på substantiv (en/ei/et)
  • Norske vokaler, spesielt «u», «y» og «ø»
  • Verb-bøying, spesielt i fortid
  • Subjektstvang, altså at en setning alltid skal inneholde subjekt`,

  'thai': `Thai:
  • De norske konsonantene «l» og «r»
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • Norske vokaler, spesielt «u», «y» og «ø»
  • Ord med mange ulike konsonanter etter hverandre
  • Subjektstvang, altså at en setning alltid skal inneholde subjekt
  • Substantiv-bøying
  • Verb-bøying`,

  'tigrinja': `Tigrinja:
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • «Det»-setninger, altså setninger der «det» fungerer som formelt subjekt
  • Norske vokaler, spesielt «u», «y» og «ø»
  • Ord med mange ulike konsonanter etter hverandre
  • Preteritum vs. perfektum i verb-bøying
  • Substantiv-bøying, bl.a. bestemt vs. ubestemt form`,

  'tyrkisk': `Tyrkisk:
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • Den norske vokalen «y»
  • Ord med mange ulike konsonanter etter hverandre
  • Pronomen
  • Substantiv-bøying, bl.a. bestemt vs. ubestemt form
  • Å lage leddsetninger`,

  'ungarsk': `Ungarsk:
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • Substantiv-bøying, bl.a. bestemt vs. ubestemt form
  • Korrekt ubestemt artikkel (en, ett) foran substantiv i ubestemt form entall
  • Norske vokaler, spesielt «y» og «ø»
  • Preposisjoner`,

  'vietnamesisk': `Vietnamesisk:
  • De strenge reglene for plassering av ord i setninger, blant annet V2-regelen, altså at verbet skal stå på andre plass i helsetninger
  • Konsonantene «f», «j», «w» og «z»
  • Passive konstruksjoner (som f.eks. «bilen blir kjørt»)
  • Sammensatte substantiv
  • Stavelsene «kj», «sy» og «øy»
  • Substantiv-bøying, bl.a. bestemt vs. ubestemt form
  • Verb-bøying, spesielt i fortid`
};
