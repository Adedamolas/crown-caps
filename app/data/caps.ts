/**
 * Cap inventory. See docs/ASSETS.md §4 for the record shape.
 *
 * SOURCING RULES (CLAUDE.md §8):
 * - Every factual field is `Sourced<T>` and carries a URL. `note` holds the exact
 *   supporting sentence from that source, so any claim can be re-checked fast.
 * - A field with no source is ABSENT. Never a placeholder, never a guess.
 * - Nothing here was written from model memory. Every entry below came from a
 *   retrieved page, and anything that could not be retrieved was left out.
 *
 * ⚠️ STATUS: these are mostly Wikipedia-grade, which is a starting point, not the
 * finish line. Before launch, upgrade to primary sources (company records, newspaper
 * archives, trademark filings). Marked TODO at the bottom.
 *
 * ⚠️ THE BIG ONE — see `disputed` on Gold Spot, Limca and Crush. Their Nigerian
 * distribution is NOT documented in any authoritative source I could retrieve, only
 * in Nigerian forum recollection. Do not state them as Nigerian-market drinks.
 */

/** A fact that may render only because someone checked it. */
export type Sourced<T> = { value: T; source: string; note?: string };

export type Cap = {
  slug: string;
  /** key into /public/tex/<texture>-{256,1024}.webp */
  texture: string;
  name: string;
  /** distinguishes the three Gold Spots and the two Pepsis — never let these merge */
  variant?: string;

  blurb?: Sourced<string>;
  history?: Sourced<string>;
  flavour?: Sourced<string>;
  bottler?: Sourced<string>;
  years?: Sourced<string>;
  priceThen?: Sourced<string>;

  /** Rendered verbatim where provenance is genuinely contested. */
  disputed?: string;
};

const NBC = 'https://en.wikipedia.org/wiki/Nigerian_Bottling_Company';
const SEVENUP = 'https://en.wikipedia.org/wiki/Seven-Up_Bottling_Company';
/** Institute of Developing Economies (JETRO) — a research institute, not a blog. */
const IDE = 'https://www.ide.go.jp/English/Data/Africa_file/Company/nigeria06.html';

const PEPSI_NG: Sourced<string> = {
  value:
    'Pepsi reached Nigeria through Seven-Up. When Pepsi International took over ' +
    'Seven-Up International in the early 1990s, the Nigerian bottler added Pepsi to ' +
    'the line it had been running since 1960.',
  source: IDE,
  note: '"In the early 1990s when Pepsi International took over Seven-Up International, the company introduced the Pepsi brand in Nigeria." — the source says "early 1990s"; some secondary pages claim 1992, which is not corroborated here, so no exact year is stated.',
};

/** Applies to every Indian-origin brand on this shelf. */
const NOT_DOCUMENTED_IN_NIGERIA =
  'Widely remembered in Nigeria, but no authoritative source documenting official ' +
  'Nigerian bottling or distribution has been found. Treated as unconfirmed.';

export const CAPS: Cap[] = [
  {
    slug: 'coca-cola',
    texture: 'coca-cola',
    name: 'Coca-Cola',
    history: {
      value:
        'Coca-Cola has been bottled in Nigeria since 1953, when the Nigerian Bottling ' +
        'Company began production in the basement of the Mainland Hotel in Lagos.',
      source: NBC,
      note: '"NBC, started production in 1953 at the basement facilities of the mainland Hotel, owned by Leventis Group producing Coke licensed from Coca Cola Company."',
    },
    bottler: {
      value: 'Nigerian Bottling Company',
      source: NBC,
      note: 'NBC held the Coca-Cola franchise; the company was part of the Leventis Group.',
    },
    disputed:
      'Sources disagree on the founding date: Wikipedia gives 1953, while Coca-Cola ' +
      'HBC and company profiles state NBC was incorporated in November 1951 by ' +
      'A. G. Leventis. 1953 is the production date and is the better-attested of the two.',
  },
  {
    slug: 'pepsi',
    texture: 'pepsi',
    name: 'Pepsi',
    history: PEPSI_NG,
    years: {
      value: 'In Nigeria from the early 1990s',
      source: IDE,
      note: '"In the early 1990s when Pepsi International took over Seven-Up International, the company introduced the Pepsi brand in Nigeria."',
    },
    bottler: {
      value: 'Seven-Up Bottling Company',
      source: SEVENUP,
      note: '"Currently, the firm markets 7-Up, Pepsi, Mirinda, Teem, Supa Komando and Mountain Dew"',
    },
  },
  {
    slug: 'pepsi-retro',
    texture: 'pepsi-old',
    name: 'Pepsi',
    variant: 'Retro',
    history: PEPSI_NG,
    bottler: {
      value: 'Seven-Up Bottling Company',
      source: SEVENUP,
      note: '"Currently, the firm markets 7-Up, Pepsi, Mirinda, Teem, Supa Komando and Mountain Dew"',
    },
  },
  {
    slug: 'fanta',
    texture: 'fanta',
    name: 'Fanta',
    history: {
      value: 'Fanta orange was introduced to the Nigerian market in 1960 by the Nigerian Bottling Company.',
      source: NBC,
      note: '"In 1960, NBC introduced Fanta orange drink into the market and later Sprite lemon drink."',
    },
    flavour: {
      value: 'Orange',
      source: NBC,
      note: '"NBC introduced Fanta orange drink into the market"',
    },
    years: {
      value: 'In Nigeria from 1960',
      source: NBC,
      note: '"In 1960, NBC introduced Fanta orange drink into the market"',
    },
    bottler: { value: 'Nigerian Bottling Company', source: NBC },
  },
  {
    slug: 'sprite',
    texture: 'sprite',
    name: 'Sprite',
    history: {
      value:
        'Sprite followed Fanta into the Nigerian market, introduced by the Nigerian ' +
        'Bottling Company some time after 1960.',
      source: NBC,
      note: '"In 1960, NBC introduced Fanta orange drink into the market and later Sprite lemon drink." — the source says only "later", so no exact year is claimed here.',
    },
    flavour: { value: 'Lemon', source: NBC, note: '"...and later Sprite lemon drink."' },
    bottler: { value: 'Nigerian Bottling Company', source: NBC },
  },
  {
    slug: '7up',
    texture: '7up',
    name: '7up',
    variant: 'Gold',
    history: {
      value:
        'The first bottle of 7 Up produced in Nigeria rolled off the line on 1 October ' +
        '1960 — the day Nigeria became independent.',
      source: SEVENUP,
      note: '"Production of its first product, 7 Up started on October 1, 1960."',
    },
    years: {
      value: 'In Nigeria from 1 October 1960',
      source: SEVENUP,
      note: '"Production of its first product, 7 Up started on October 1, 1960."',
    },
    bottler: {
      value: 'Seven-Up Bottling Company',
      source: SEVENUP,
      note: '"The venture was a brainchild of the El-Khalil family from Lebanon."',
    },
  },
  {
    slug: '7up-n25',
    texture: '7up-old',
    name: '7up',
    variant: '₦25',
    bottler: { value: 'Seven-Up Bottling Company', source: SEVENUP },
    disputed:
      'The ₦25 on this cap is unexplained. No source was found confirming whether it ' +
      'was a price marking, an under-crown promotional prize, or something else. ' +
      'CLAUDE.md §9 previously listed "₦25" as a separate brand — it is not; the ' +
      'artwork is a 7up cap (embedded texture "N25 7UP COVER").',
  },
  {
    slug: 'dew',
    texture: 'dew',
    name: 'Mountain Dew',
    bottler: {
      value: 'Seven-Up Bottling Company',
      source: SEVENUP,
      note: '"Currently, the firm markets 7-Up, Pepsi, Mirinda, Teem, Supa Komando and Mountain Dew"',
    },
  },
  {
    slug: 'schweppes',
    texture: 'schweppes',
    name: 'Schweppes',
    variant: 'Bitter Lemon',
    history: {
      value:
        'Schweppes is the oldest name on this shelf. Johann Jacob Schweppe, a German ' +
        'watchmaker and amateur scientist, founded it in Geneva in 1783 after working ' +
        'out how to carbonate water commercially. Bitter Lemon arrived much later, in 1957.',
      source: 'https://en.wikipedia.org/wiki/Schweppes',
      note: '"founded in Geneva in 1783" / founder listed as "Johann Jacob Schweppe", a "German watchmaker and amateur scientist" / product timeline: "Bitter lemon (1957)"',
    },
    flavour: {
      value: 'Bitter lemon',
      source: 'https://en.wikipedia.org/wiki/Schweppes',
      note: 'Product timeline: "Bitter lemon (1957)"',
    },
    years: {
      value: 'Brand founded 1783; Bitter Lemon from 1957',
      source: 'https://en.wikipedia.org/wiki/Schweppes',
      note: '"founded in Geneva in 1783" / "Bitter lemon (1957)"',
    },
    disputed:
      'Schweppes ownership is split by territory — The Coca-Cola Company holds it in ' +
      'many markets, Keurig Dr Pepper in the US and Canada, Suntory across much of ' +
      'Europe. Who bottled and distributed it in Nigeria has not been confirmed.',
  },
  {
    slug: 'crush',
    texture: 'crush',
    name: 'Crush',
    history: {
      value:
        'Crush was created in 1911 by the chemist Neil C. Ward, who developed the ' +
        'formula with Clayton J. Howel of the Orange Crush Company.',
      source: 'https://en.wikipedia.org/wiki/Crush_(drink)',
      note: '"Crush was created in 1911 by beverage and extract chemist Neil C. Ward."',
    },
    flavour: { value: 'Orange', source: 'https://en.wikipedia.org/wiki/Crush_(drink)' },
    disputed: NOT_DOCUMENTED_IN_NIGERIA,
  },
  {
    slug: 'limca',
    texture: 'limca',
    name: 'Limca',
    history: {
      value:
        'Limca was launched in India in 1977 by Ramesh Chauhan of Parle, after his ' +
        "attempt to license Duke's lemonade formula was refused. The Coca-Cola Company " +
        'bought the brand from Parle in 1992.',
      source: 'https://en.wikipedia.org/wiki/Limca',
      note: '"Chauhan decided to come up with his own formula, which he launched under the Limca brand in 1977." / "Coca-Cola bought local soft-drink (soda) brands, from Parle Bisleri owner Ramesh Chauhan including Limca."',
    },
    flavour: { value: 'Lemon and lime', source: 'https://en.wikipedia.org/wiki/Limca' },
    disputed: NOT_DOCUMENTED_IN_NIGERIA,
  },
  ...(['goldspot', 'goldspot-golden', 'goldspot-orange'] as const).map((texture, i) => ({
    slug: ['gold-spot', 'gold-spot-golden', 'gold-spot-red'][i],
    texture,
    name: 'Gold Spot',
    variant: [undefined, 'Golden', 'Red'][i],
    history: {
      value:
        'Gold Spot was introduced in India by Parle Products in 1952 and became one of ' +
        'the country\'s best-known soft drinks. Parle sold it to The Coca-Cola Company ' +
        'in 1993, and Coca-Cola withdrew it in 2000 to make room for Fanta.',
      source: 'https://en.wikipedia.org/wiki/Gold_Spot',
      note: '"Gold Spot was an artificially orange-flavored carbonated soft drink created by Parle Products, introduced in 1952" / "Gold Spot was withdrawn by Coke from the market in order to re-make space for Coca-Cola\'s Fanta brand."',
    },
    flavour: { value: 'Orange', source: 'https://en.wikipedia.org/wiki/Gold_Spot' },
    disputed: NOT_DOCUMENTED_IN_NIGERIA,
  })),
];

/**
 * TODO before launch
 * - Upgrade every source above from Wikipedia to a primary record.
 * - Resolve Gold Spot / Limca / Crush Nigerian distribution, or say plainly on the
 *   site that these were remembered but are undocumented here.
 * - Resolve the ₦25 cap.
 * - Schweppes: brand history sourced, but the Nigerian bottler is still unknown.
 * - Pepsi: pin the exact Nigerian launch year. IDE says "early 1990s"; secondary
 *   pages say 1992 without citation. Seven-Up's own archives would settle it.
 * - `gold-spot-red` vs the file named `goldspot-orange` — confirm with Rehoboth.
 */
