"use server";

import { gradeText, type GradeResult } from "@/lib/grade";
import type { HskLevel } from "@/lib/hsk";

export async function gradePastedText(
  text: string,
  targetLevel: HskLevel,
): Promise<GradeResult> {
  return gradeText(text, {
    knownSet: new Set(),
    targetLevel,
  });
}
