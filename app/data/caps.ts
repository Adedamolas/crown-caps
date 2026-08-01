/**
 * Cap inventory. See docs/ASSETS.md §4 for the record shape.
 *
 * ⚠️ `disputed`, `blurb`, `history` and every `value` RENDER VERBATIM ON THE SITE.
 * Visitor-facing prose only — never a filename, a doc section, an internal note or a
 * texture name. `note` is the safe place for working detail; it is never rendered.
 *
 * SOURCING RULES (CLAUDE.md §8):
 * - Every factual field is `Sourced<T>` and carries a URL. `note` holds the exact
 *   supporting evidence, so any claim can be re-checked fast.
 * - A field with no source is ABSENT. Never a placeholder, never a guess.
 *
 * SOURCE QUALITY, 2026-08-01: the strongest entries below cite crowncaps.info, a
 * collectors' database of 355,000+ catalogued caps. Its records carry the *rim text
 * printed on the cap itself* — bottler name, address, licence wording and NRN
 * registration number. For "was this drink bottled in Nigeria, by whom", that is
 * primary evidence and it outranks the encyclopaedia entries used elsewhere here.
 *
 * ⚠️ THIS SUPERSEDES AN EARLIER ROUND OF RESEARCH. Gold Spot, Limca and Crush were
 * previously marked as having no documented Nigerian distribution, on the basis that
 * general-web sources only describe them as Indian and American brands. That was
 * wrong. All three were bottled in Nigeria under licence, by named Nigerian companies,
 * and the caps say so. Do not reintroduce those `disputed` flags.
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

const NBC_WIKI = 'https://en.wikipedia.org/wiki/Nigerian_Bottling_Company';
const SEVENUP_WIKI = 'https://en.wikipedia.org/wiki/Seven-Up_Bottling_Company';
/** Institute of Developing Economies (JETRO) — a research institute, not a blog. */
const IDE = 'https://www.ide.go.jp/English/Data/Africa_file/Company/nigeria06.html';
/** Individual catalogued caps, each carrying the rim text printed on the crown. */
const cc = (id: number) => `https://crowncaps.info/caps/${id}`;

const PEPSI_NG: Sourced<string> = {
  value:
    'Pepsi reached Nigeria through Seven-Up. When Pepsi International took over ' +
    'Seven-Up International in the early 1990s, the Nigerian bottler added Pepsi to ' +
    'the line it had been running since 1960.',
  source: IDE,
  note: '"In the early 1990s when Pepsi International took over Seven-Up International, the company introduced the Pepsi brand in Nigeria." Source says "early 1990s"; some secondary pages claim 1992 without citation, so no exact year is stated.',
};

/**
 * Nigerian bottlers printed the recommended retail price on the crown. Attested
 * across brands and eras, most explicitly on Coca-Cola caps reading "Rec. Retail
 * Price" and "RRP" in full.
 */
const PRICE_ON_CAP: Sourced<string> = {
  value: 'Nigerian bottlers printed the recommended retail price on the crown itself.',
  source: cc(244605),
  note: 'Cap 244605 reads "₦ 1.50 Rec. Retail Price"; caps 216595 and 185926 read "₦80 RRP" and "₦70 RRP". 110 of 543 catalogued Nigerian soft-drink caps carry a ₦ price marking.',
};

export const CAPS: Cap[] = [
  {
    slug: 'coca-cola',
    texture: 'coca-cola',
    name: 'Coca-Cola',
    history: {
      value:
        'Coca-Cola has been bottled in Nigeria since 1953, when the Nigerian Bottling ' +
        'Company began production in the basement of the Mainland Hotel in Lagos.',
      source: NBC_WIKI,
      note: '"NBC, started production in 1953 at the basement facilities of the mainland Hotel, owned by Leventis Group producing Coke licensed from Coca Cola Company."',
    },
    bottler: {
      value: 'Nigerian Bottling Company, Iddo House, Lagos',
      source: cc(216595),
      note: 'Rim text: "Nigerian Bottling Company Ltd., head office: Iddo House, Lagos, Nigeria. Authorised bottler. © The Coca-Cola Company."',
    },
    priceThen: PRICE_ON_CAP,
    disputed:
      'Sources disagree on the founding date: Wikipedia gives 1953, while Coca-Cola ' +
      'HBC and company profiles state the Nigerian Bottling Company was incorporated ' +
      'in November 1951 by A. G. Leventis. 1953 is the production date and is the ' +
      'better-attested of the two.',
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
      value: 'Seven-Up Bottling Company, Ijora, Lagos',
      source: SEVENUP_WIKI,
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
      value: 'Seven-Up Bottling Company, Ijora, Lagos',
      source: SEVENUP_WIKI,
    },
  },
  {
    slug: 'fanta',
    texture: 'fanta',
    name: 'Fanta',
    history: {
      value:
        'Fanta orange was introduced to the Nigerian market in 1960 by the Nigerian ' +
        'Bottling Company.',
      source: NBC_WIKI,
      note: '"In 1960, NBC introduced Fanta orange drink into the market and later Sprite lemon drink."',
    },
    flavour: { value: 'Orange', source: NBC_WIKI },
    years: { value: 'In Nigeria from 1960', source: NBC_WIKI },
    bottler: { value: 'Nigerian Bottling Company', source: NBC_WIKI },
    priceThen: PRICE_ON_CAP,
  },
  {
    slug: 'sprite',
    texture: 'sprite',
    name: 'Sprite',
    history: {
      value:
        'Sprite followed Fanta into the Nigerian market, introduced by the Nigerian ' +
        'Bottling Company some time after 1960.',
      source: NBC_WIKI,
      note: '"In 1960, NBC introduced Fanta orange drink into the market and later Sprite lemon drink." The source says only "later", so no exact year is claimed.',
    },
    flavour: { value: 'Lemon', source: NBC_WIKI },
    bottler: { value: 'Nigerian Bottling Company', source: NBC_WIKI },
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
      source: SEVENUP_WIKI,
      note: '"Production of its first product, 7 Up started on October 1, 1960."',
    },
    years: { value: 'In Nigeria from 1 October 1960', source: SEVENUP_WIKI },
    bottler: {
      value: 'Seven-Up Bottling Company, 247 Apapa Road, Ijora, Lagos',
      source: cc(244025),
      note: 'Founded by the El-Khalil family from Lebanon. Rim text on Nigerian 7up caps gives the Ijora address; later caps read "247 Moshood Abiola Way, Ijora, Lagos".',
    },
  },
  {
    slug: '7up-n25',
    texture: '7up-old',
    name: '7up',
    variant: '₦25',
    history: {
      value:
        'The ₦25 is a price. Nigerian bottlers printed the recommended retail price ' +
        'straight onto the crown, and this cap is one of a run that also came at ₦50 ' +
        'and ₦70 as the price of a bottle climbed.',
      source: cc(285444),
      note: 'Cap 285444 is this exact design: "7up ₦ 25 / 7up N25 / Carbonated Soft Drink / NRN 01-0164". Sibling caps 244025 (₦50), 243620 (N70), 201523 (₦50). Coca-Cola caps of the same era spell it out as "Rec. Retail Price" and "RRP".',
    },
    bottler: {
      value: 'Seven-Up Bottling Company, Ijora, Lagos',
      source: cc(285444),
      note: 'NRN 01-0164 is the Nigerian registration number carried by Seven-Up 7up caps.',
    },
    priceThen: {
      value: '₦25 recommended retail price',
      source: cc(285444),
      note: 'Printed on the cap face.',
    },
  },
  {
    slug: 'dew',
    texture: 'dew',
    name: 'Mountain Dew',
    history: {
      value:
        'Sold in Nigeria simply as Dew, bottled by Seven-Up in Lagos under authority ' +
        'from PepsiCo.',
      source: cc(297573),
      note: 'Rim text: "Bottled by Seven-Up Bottling Company Plc. 247 Moshood Abiola Way, Ijora, Lagos. Under Authority of Pepsico Inc." Cap face reads "Dew / Carbonated Beverage".',
    },
    bottler: {
      value: 'Seven-Up Bottling Company, 247 Moshood Abiola Way, Ijora, Lagos',
      source: cc(297573),
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
        'out how to carbonate water commercially. Bitter Lemon arrived much later, in ' +
        '1957, and reached Nigeria through the Coca-Cola bottling system.',
      source: 'https://en.wikipedia.org/wiki/Schweppes',
      note: '"founded in Geneva in 1783"; product timeline "Bitter lemon (1957)". Nigerian bottling from cap 54024.',
    },
    flavour: { value: 'Bitter lemon', source: 'https://en.wikipedia.org/wiki/Schweppes' },
    years: {
      value: 'Brand founded 1783; Bitter Lemon from 1957',
      source: 'https://en.wikipedia.org/wiki/Schweppes',
    },
    bottler: {
      value: 'Nigerian Bottling Company, Iddo House, Lagos',
      source: cc(54024),
      note: 'Rim text: "PRODUCED UNDER AUTHORITY OF ATLANTIC INDUSTRIES, NIGERIAN BOTTLING COMPANY LTD. HEAD OFFICE: IDDO HOUSE, IDDO, LAGOS". 20 Nigerian Schweppes caps catalogued.',
    },
    priceThen: PRICE_ON_CAP,
  },
  {
    slug: 'crush',
    texture: 'crush',
    name: 'Crush',
    history: {
      value:
        'Crush was created in 1911 by the chemist Neil C. Ward. In Nigeria it was ' +
        'bottled in Lagos under licence from Crush International, by Seven-Up and ' +
        'later by Nigerian Breweries.',
      source: cc(244196),
      note: 'Rim text: "Bottled locally under Authority from Crush International (USA) Inc. Evanston, ILL. 60202". Cap 244197: "Bottled by Nigerian Breweries PLC, Iganmu House, Abebe Village Road, Lagos". Origin date from https://en.wikipedia.org/wiki/Crush_(drink)',
    },
    flavour: { value: 'Orange', source: 'https://en.wikipedia.org/wiki/Crush_(drink)' },
    bottler: {
      value: 'Seven-Up Bottling Company, 247 Apapa Road, Ijora, Lagos',
      source: cc(242698),
      note: 'Rim text: "Bottled by Seven-up Bottling Co. Ltd. 247, Apapa Road (Ijora) Lagos, Nigeria". Also bottled by Nigerian Breweries Plc (cap 244197). One cap is marked "Crush Lottery".',
    },
  },
  {
    slug: 'limca',
    texture: 'limca',
    name: 'Limca',
    history: {
      value:
        'Limca was launched in India in 1977 by Ramesh Chauhan of Parle, and The ' +
        'Coca-Cola Company bought the brand in 1992. In Nigeria it was bottled by the ' +
        'Nigerian Bottling Company in Lagos, and by Limca Bottlers in Onitsha, Warri ' +
        'and Okigwe.',
      source: cc(245199),
      note: 'Rim text: "Limca Bottlers, Onitsha, Warry, Okigwe, Nigeria. registred user © the Coca-Cola Company NRN 01-0317". NBC caps carry NRN 01-0545. Indian origin from https://en.wikipedia.org/wiki/Limca',
    },
    flavour: { value: 'Lemon and lime', source: 'https://en.wikipedia.org/wiki/Limca' },
    bottler: {
      value: 'Nigerian Bottling Company, Iddo House, Lagos',
      source: cc(245193),
      note: 'Rim text: "Nigerian Bottling Company Ltd., Head Office: Iddo House, Lagos, Nigeria. Authorised bottler. © The Coca-Cola Company. NRN: 01-0545". 20 Nigerian Limca caps catalogued.',
    },
    priceThen: {
      value: 'Sold at ₦25, ₦30 and ₦60 as prices rose',
      source: cc(119490),
      note: 'Cap 119490 "Limca ₦25"; cap 245199 "Limca ₦30"; cap 245192 "Limca ₦60 RRP".',
    },
  },
  ...(['goldspot', 'goldspot-golden', 'goldspot-orange'] as const).map((texture, i) => ({
    slug: ['gold-spot', 'gold-spot-golden', 'gold-spot-red'][i],
    texture,
    name: 'Gold Spot',
    variant: [undefined, 'Golden', 'Red'][i],
    history: {
      value:
        'Gold Spot began in India, launched by Parle in 1952, and The Coca-Cola ' +
        'Company bought it in 1993. In Nigeria it was bottled in Lagos by Femstar & ' +
        'Co. and in Warri by the Warri Bottling Company, and stayed long enough that ' +
        'one cap celebrates "25 Years Refreshing Nigeria".',
      source: cc(239285),
      note: 'Cap 239285 reads "Gold Spot 25 Years Refreshing Nigeria", rim "Femstar & Co, Ltd 2/4 Abimbola Street, Isolo Lagos, Nigeria. Registered User © The Coca-Cola Company, NRN: 01-0546". Cap 325659 (1990) is Warri Bottling Company. Indian origin from https://en.wikipedia.org/wiki/Gold_Spot',
    },
    flavour: {
      value: 'Orange',
      source: cc(302896),
      note: 'Cap face: "Gold Spot / Orange Soft Drink".',
    },
    bottler: {
      value: 'Femstar & Co., 2/4 Abimbola Street, Isolo, Lagos',
      source: cc(294245),
      note: 'Rim text: "Femstar & Co Ltd, 2/4 Abimbola Street, Isolo, Lagos, Nigeria. Registered User © The Coca-Cola Company, NRN: 01-0546". Also Warri Bottling Company Limited, Warri/Sapele Road Effurun (cap 325659, dated 1990), and bottled under authority of Sonpar Ltd (cap 304009).',
    },
  })),
];

/**
 * TODO
 * - `gold-spot-red` vs the file named `goldspot-orange` — confirm with Rehoboth.
 *   The catalogued Nigerian Gold Spot caps are all orange soft drink.
 * - Mirinda IS a documented Nigerian brand (32 catalogued caps, Seven-Up Lagos and
 *   Endo Bottling Project, Onitsha) even though no Mirinda model exists in /public.
 *   Worth asking Rehoboth whether that was the design he scrapped.
 * - Teem and Krest also appear on Nigerian caps if the collection ever expands.
 * - Pepsi's exact Nigerian launch year is still only "early 1990s".
 */
