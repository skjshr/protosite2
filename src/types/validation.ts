/**
 * ユーザー名のバリデーションルール:
 * - 前後空白を除いた状態で 4文字以上 20文字以下
 * - 使用可能文字: 日本語、英数字、アンダースコア(_)、ハイフン(-)
 * - 絵文字、改行、制御文字は不可
 */
export function validateUsername(username: string): { isValid: boolean; error?: string } {
  const trimmed = username.trim();

  if (trimmed.length < 4 || trimmed.length > 20) {
    return { isValid: false, error: "ユーザー名は4文字以上20文字以下で入力してください。" };
  }

  // 日本語(ひらがな・カタカナ・漢字)、英数字、アンダースコア、ハイフンのみ許可
  // 絵文字や制御文字を排除する
  const validPattern = /^[a-zA-Z0-9_\-\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+$/;
  if (!validPattern.test(trimmed)) {
    return { isValid: false, error: "ユーザー名に使用できない文字が含まれています。" };
  }

  return { isValid: true };
}

export function normalizeUsername(username: string): string {
  // 重複チェック用の正規化（小文字化など。日本語の場合はそのまま）
  return username.trim().toLowerCase();
}