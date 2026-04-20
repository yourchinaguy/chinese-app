// Grammar points surfaced on article analysis. Deliberately biased toward
// paired / correlative structures — they're reliable to detect via regex
// and they're the kind of thing that levels a learner's Chinese up from
// "comprehensible" to "real".
//
// Naming, descriptions, and HSK-level estimates are hand-authored. For the
// canonical, definitive explanation of each pattern we link to the Chinese
// Grammar Wiki (AllSet Learning, CC BY-NC-SA 3.0) via a search URL — the wiki
// has no stable public API, but the search handles every pattern name we use.

export type CEFR = "A1" | "A2" | "B1" | "B2" | "C1";

export type GrammarPoint = {
  id: string;
  name: string;       // English name of the structure
  patternZh: string;  // Canonical Chinese pattern notation
  cefr: CEFR;
  approxHsk: 1 | 2 | 3 | 4 | 5 | 6;
  description: string;
  patterns: RegExp[]; // one or more detection regexes (variants)
  // Tokens that belong exclusively to this structure as connectives. When
  // the point is detected in a text, these tokens are filtered out of the
  // vocabulary word pickers (they're already covered by the grammar card).
  // Only include truly distinctive connectives — skip overly common ones
  // like 一/就/才/都/也 whose other uses would get wrongly suppressed.
  connectives: string[];
  wikiQuery: string;  // search string passed to the wiki
};

function wikiUrl(q: string): string {
  return `https://resources.allsetlearning.com/chinese/grammar/?search=${encodeURIComponent(q)}`;
}

export const GRAMMAR_POINTS: GrammarPoint[] = [
  {
    id: "yue-yue",
    name: "The more ... the more",
    patternZh: "越……越……",
    cefr: "B1",
    approxHsk: 4,
    description:
      "Expresses that as one thing increases, another increases in proportion. Second 越 attaches to an adjective or change verb.",
    patterns: [/越(?!来越)[^。！？\n]{1,30}?越/u],
    connectives: ["越"],
    wikiQuery: "越 越",
  },
  {
    id: "yuelaiyue",
    name: "More and more",
    patternZh: "越来越……",
    cefr: "A2",
    approxHsk: 3,
    description: "'Getting more and more [adj/verb]' — gradual intensification.",
    patterns: [/越来越/u],
    connectives: ["越来越"],
    wikiQuery: "越来越",
  },
  {
    id: "yi-jiu",
    name: "As soon as ... then",
    patternZh: "一……就……",
    cefr: "A2",
    approxHsk: 3,
    description: "Immediate sequence: the moment A happens, B happens.",
    patterns: [/一[^。！？\n]{1,25}?就/u],
    connectives: [],
    wikiQuery: "一 就 as soon as",
  },
  {
    id: "budan-erqie",
    name: "Not only ... but also",
    patternZh: "不但……而且……",
    cefr: "B1",
    approxHsk: 4,
    description:
      "Adds a second, usually stronger claim. Both clauses share the same subject.",
    patterns: [/不但[^。！？\n]{1,80}?而且/u],
    connectives: ["不但", "而且"],
    wikiQuery: "不但 而且",
  },
  {
    id: "bujin-erqie",
    name: "Not only ... but also (formal)",
    patternZh: "不仅……而且……",
    cefr: "B2",
    approxHsk: 5,
    description: "More formal / written variant of 不但…而且…",
    patterns: [/不仅(?!仅)[^。！？\n]{1,80}?(而且|还|也)/u],
    connectives: ["不仅", "而且"],
    wikiQuery: "不仅 而且",
  },
  {
    id: "bujinjin-er",
    name: "Not merely ... but rather",
    patternZh: "不仅仅……而……",
    cefr: "C1",
    approxHsk: 6,
    description:
      "Emphatic variant of 不仅…而且… — 'not merely X; rather Y'. Common in editorial/analytical writing.",
    patterns: [/不仅仅[^。！？\n]{1,80}?(而|而是|而且)/u],
    connectives: ["不仅仅", "而是", "而"],
    wikiQuery: "不仅仅 而",
  },
  {
    id: "suiran-danshi",
    name: "Although ... still",
    patternZh: "虽然……但是/可是/不过/然而……",
    cefr: "A2",
    approxHsk: 3,
    description: "Concessive: sets up an expectation, then reverses it.",
    patterns: [/虽然[^。！？\n]{1,80}?(但是|可是|不过|然而|却)/u],
    connectives: ["虽然", "但是", "可是", "不过", "然而"],
    wikiQuery: "虽然 但是",
  },
  {
    id: "jinguan-danshi",
    name: "Despite ... still",
    patternZh: "尽管……但是/仍然……",
    cefr: "B2",
    approxHsk: 5,
    description: "Stronger concessive than 虽然 — 'despite X, still Y'.",
    patterns: [/尽管[^。！？\n]{1,80}?(但是|可是|仍然|仍|还是|依然)/u],
    connectives: ["尽管", "仍然", "依然"],
    wikiQuery: "尽管 但是",
  },
  {
    id: "yinwei-suoyi",
    name: "Because ... therefore",
    patternZh: "因为……所以……",
    cefr: "A2",
    approxHsk: 3,
    description: "Explicit cause-and-effect connector pair.",
    patterns: [/因为[^。！？\n]{1,80}?所以/u],
    connectives: ["因为", "所以"],
    wikiQuery: "因为 所以",
  },
  {
    id: "youyu-yinci",
    name: "Due to ... therefore (formal)",
    patternZh: "由于……因此/所以……",
    cefr: "B2",
    approxHsk: 5,
    description: "Formal cause-and-effect, common in news and essays.",
    patterns: [/由于[^。！？\n]{1,80}?(因此|所以|从而)/u],
    connectives: ["由于", "因此", "从而"],
    wikiQuery: "由于 因此",
  },
  {
    id: "zhiyao-jiu",
    name: "As long as ... then",
    patternZh: "只要……就……",
    cefr: "B1",
    approxHsk: 4,
    description: "Sufficient condition: if the first part holds, the second follows.",
    patterns: [/只要[^。！？\n]{1,60}?就/u],
    connectives: ["只要"],
    wikiQuery: "只要 就",
  },
  {
    id: "zhiyou-cai",
    name: "Only if ... then",
    patternZh: "只有……才……",
    cefr: "B1",
    approxHsk: 4,
    description: "Necessary condition: without the first part, the second can't happen.",
    patterns: [/只有[^。！？\n]{1,60}?才/u],
    connectives: ["只有"],
    wikiQuery: "只有 才",
  },
  {
    id: "chufei-fouze",
    name: "Unless ... otherwise",
    patternZh: "除非……否则/不然……",
    cefr: "C1",
    approxHsk: 6,
    description: "Unless the condition holds, the alternative (usually undesirable) happens.",
    patterns: [/除非[^。！？\n]{1,80}?(否则|不然)/u],
    connectives: ["除非", "否则", "不然"],
    wikiQuery: "除非 否则",
  },
  {
    id: "wulun-dou",
    name: "No matter what ... still",
    patternZh: "无论/不管……都/也……",
    cefr: "B1",
    approxHsk: 4,
    description: "Asserts something holds regardless of the variable in the first clause.",
    patterns: [/(无论|不管)[^。！？\n]{1,60}?(都|也)/u],
    connectives: ["无论", "不管"],
    wikiQuery: "无论 都",
  },
  {
    id: "ji-you",
    name: "Both ... and",
    patternZh: "既……又/也……",
    cefr: "B1",
    approxHsk: 4,
    description: "Joins two qualities or actions — parallel, balanced.",
    patterns: [/既[^。！？\n]{1,40}?(又|也)/u],
    connectives: ["既"],
    wikiQuery: "既 又",
  },
  {
    id: "you-you",
    name: "Both ... and (colloquial)",
    patternZh: "又……又……",
    cefr: "A2",
    approxHsk: 3,
    description: "Colloquial parallel — often for co-occurring qualities/actions.",
    patterns: [/又[^。！？\n]{1,20}?又/u],
    connectives: [],
    wikiQuery: "又 又",
  },
  {
    id: "yaome-yaome",
    name: "Either ... or",
    patternZh: "要么……要么……",
    cefr: "B2",
    approxHsk: 5,
    description: "Presents two alternatives between which a choice must be made.",
    patterns: [/要么[^。！？\n]{1,60}?要么/u],
    connectives: ["要么"],
    wikiQuery: "要么 要么",
  },
  {
    id: "ningke-yebu",
    name: "Would rather ... than",
    patternZh: "宁可/宁愿……也(不)……",
    cefr: "C1",
    approxHsk: 6,
    description: "Expresses a strong preference even at a cost.",
    patterns: [/(宁可|宁愿)[^。！？\n]{1,60}?也/u],
    connectives: ["宁可", "宁愿"],
    wikiQuery: "宁可 也",
  },
  {
    id: "yuqi-buru",
    name: "Rather than ... it's better to",
    patternZh: "与其……不如……",
    cefr: "C1",
    approxHsk: 6,
    description: "Compares two options and recommends the second.",
    patterns: [/与其[^。！？\n]{1,60}?不如/u],
    connectives: ["与其", "不如"],
    wikiQuery: "与其 不如",
  },
  {
    id: "jiran-jiu",
    name: "Since ... then (inferential)",
    patternZh: "既然……就……",
    cefr: "B1",
    approxHsk: 4,
    description: "Given a known fact, draws a conclusion or recommendation.",
    patterns: [/既然[^。！？\n]{1,60}?就/u],
    connectives: ["既然"],
    wikiQuery: "既然 就",
  },
  {
    id: "yibian-yibian",
    name: "While ... simultaneously",
    patternZh: "一边……一边……",
    cefr: "A2",
    approxHsk: 3,
    description: "Two actions happening at the same time by the same subject.",
    patterns: [/一边[^。！？\n]{1,40}?一边/u],
    connectives: ["一边"],
    wikiQuery: "一边 一边",
  },
  {
    id: "kuaiyao-le",
    name: "About to ...",
    patternZh: "快要/就要……了",
    cefr: "A2",
    approxHsk: 3,
    description: "Imminent action or state — about to happen.",
    patterns: [/(快要|就要|快|要)[^。！？\n]{1,20}?了(?=[。！？\n])/u],
    connectives: ["快要", "就要"],
    wikiQuery: "快要 了",
  },
  {
    id: "yijing-le",
    name: "Already ...",
    patternZh: "已经……了",
    cefr: "A2",
    approxHsk: 2,
    description: "Marks an action as already completed or a state as already reached.",
    patterns: [/已经[^。！？\n]{1,40}?了(?=[。！？\n])/u],
    connectives: ["已经"],
    wikiQuery: "已经 了",
  },
];

export function grammarPointById(id: string): GrammarPoint | null {
  return GRAMMAR_POINTS.find((p) => p.id === id) ?? null;
}

export function wikiUrlFor(point: GrammarPoint): string {
  return wikiUrl(point.wikiQuery);
}
