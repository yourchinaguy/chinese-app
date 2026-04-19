export const BOX_INTERVALS_DAYS = [1, 2, 4, 8, 16] as const;
export const MAX_BOX = 5;

export type SrsState = {
  box: number;
  due_at: number;
  last_reviewed_at: number | null;
};

export function initialState(nowMs: number = Date.now()): SrsState {
  return {
    box: 1,
    due_at: Math.floor(nowMs / 1000),
    last_reviewed_at: null,
  };
}

export function advance(
  currentBox: number,
  gotIt: boolean,
  nowMs: number = Date.now(),
): SrsState {
  const nextBox = gotIt ? Math.min(currentBox + 1, MAX_BOX) : 1;
  const intervalDays = BOX_INTERVALS_DAYS[nextBox - 1];
  const nowSec = Math.floor(nowMs / 1000);
  return {
    box: nextBox,
    due_at: nowSec + intervalDays * 86400,
    last_reviewed_at: nowSec,
  };
}
