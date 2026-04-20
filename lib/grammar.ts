import {
  GRAMMAR_POINTS,
  wikiUrlFor,
  type CEFR,
} from "@/data/grammar-points";
import { splitSentences } from "./sentences";

// Serializable across the server-action boundary (no RegExp leaks through).
export type GrammarMatch = {
  pointId: string;
  name: string;
  patternZh: string;
  cefr: CEFR;
  approxHsk: number;
  description: string;
  wikiUrl: string;
  sentence: string;
  matchedText: string;
  matchStart: number;
  matchEnd: number;
  connectives: string[];
};

export function detectGrammarPoints(text: string): GrammarMatch[] {
  const sentences = splitSentences(text);
  const matches: GrammarMatch[] = [];
  const seen = new Set<string>();

  for (const sentence of sentences) {
    for (const point of GRAMMAR_POINTS) {
      if (seen.has(point.id)) continue;
      for (const re of point.patterns) {
        const result = re.exec(sentence);
        if (result) {
          matches.push({
            pointId: point.id,
            name: point.name,
            patternZh: point.patternZh,
            cefr: point.cefr,
            approxHsk: point.approxHsk,
            description: point.description,
            wikiUrl: wikiUrlFor(point),
            sentence,
            matchedText: result[0],
            matchStart: result.index,
            matchEnd: result.index + result[0].length,
            connectives: point.connectives,
          });
          seen.add(point.id);
          break;
        }
      }
    }
  }
  return matches;
}
