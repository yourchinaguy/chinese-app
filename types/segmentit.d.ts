declare module "segmentit" {
  export class Segment {
    constructor();
    doSegment(text: string): { w: string; p: number }[];
  }
  export function useDefault(s: Segment): Segment;
}
