import * as userRepository from "../repositories/user-repository";

export type OAuthProfile = {
  provider: string;
  providerAccountId: string;
  email?: string;
  emailVerified: boolean;
};

/**
 * Identity 統合ロジック:
 * 1. 既存の Identity があればその User を返す
 * 2. ない場合、verified email を持つ既存 User/Identity があれば統合（Link）する
 * 3. いずれもなければ新規作成する。ただし X で email がない場合は新規作成を禁止する。
 */
export async function resolveUserByOAuthProfile(profile: OAuthProfile) {
  const normalizedEmail = profile.email?.trim().toLowerCase();

  // 1. プロバイダー固有の Identity で検索
  const existingIdentity = await userRepository.findIdentity(
    profile.provider,
    profile.providerAccountId
  );
  if (existingIdentity) {
    return existingIdentity.user;
  }

  // 2. Identity がない場合、認証済みメールアドレスによる統合を試みる
  if (normalizedEmail && profile.emailVerified) {
    // Primary Email または 他の Identity の Email で既存ユーザーを探す
    const userByPrimary = await userRepository.findUserByPrimaryEmail(normalizedEmail);
    if (userByPrimary) {
      await userRepository.linkIdentityToUser(userByPrimary.id, {
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
        email: profile.email,
        normalizedEmail,
      });
      return userByPrimary;
    }

    const identityByEmail = await userRepository.findIdentityByEmail(normalizedEmail);
    if (identityByEmail) {
      await userRepository.linkIdentityToUser(identityByEmail.userId, {
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
        email: profile.email,
        normalizedEmail,
      });
      return identityByEmail.user;
    }

    // 3. 既存ユーザーが見つからない場合は新規作成
    return await userRepository.createUserWithIdentity({
      email: profile.email,
      normalizedEmail,
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
    });
  }

  // 4. verified email が取得できない場合
  // X 等でメールアドレスが取得できない新規ユーザー作成は禁止
  if (profile.provider === "twitter" || profile.provider === "x") {
    throw new Error("X_AUTH_NO_VERIFIED_EMAIL");
  }

  throw new Error("VERIFIED_EMAIL_REQUIRED");
}