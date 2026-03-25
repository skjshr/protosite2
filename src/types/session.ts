export type SessionStatus = "idle" | "working" | "paused" | "ended";

export interface ActiveSession {
  fieldId: string;
  // どの用途で動いているセッションかを識別する。
  fieldName: string;
  // ActiveSession は ended を持たない。終了したら EndedSession へ移る。
  status: "working" | "paused";
  // ISO 文字列で保持すると、保存や API 受け渡し時に扱いやすい。
  startedAt: string;
  // paused でないときは null。
  pausedAt: string | null;
  // 休憩の累積秒。再開時・終了時に時刻差から計算して加算する。
  pauseAccumulatedSeconds: number;
}

export interface EndedSession {
  fieldId: string;
  fieldName: string;
  status: "ended";
  startedAt: string;
  // ended 状態では pausedAt は意味を持たないので null で固定する。
  pausedAt: null;
  endedAt: string;
  pauseAccumulatedSeconds: number;
  // 表示やスコア計算に使う「実作業時間」。
  effectiveSeconds: number;
  score: number;
  xp: number;
}
