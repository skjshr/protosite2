export function formatSecondsToMinutesAndSeconds(totalSeconds: number): string {
  // 表示関数は「見た目だけ」を担当させ、計算ロジックと分離する。
  // floor しておくと 12.9 秒のような値が来ても表示が安定する。
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, "0");
  return `${minutes}:${paddedSeconds}`;
}

export function formatIsoToLocalDateTime(isoDateTime: string): string {
  const parsedDate = new Date(isoDateTime);
  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }
  return parsedDate.toLocaleString("ja-JP");
}
