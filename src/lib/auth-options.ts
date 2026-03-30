import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import TwitterProvider from "next-auth/providers/twitter";
import { findOrCreateDevUser } from "@/server/repositories/user-repository";
import { resolveUserByOAuthProfile } from "@/server/services/user-service";

function buildProviders() {
  const providers: NextAuthOptions["providers"] = [];

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (googleClientId && googleClientSecret) {
    providers.push(
      GoogleProvider({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      }),
    );
  }

  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (githubClientId && githubClientSecret) {
    providers.push(
      GitHubProvider({
        clientId: githubClientId,
        clientSecret: githubClientSecret,
      }),
    );
  }

  const twitterClientId = process.env.TWITTER_CLIENT_ID;
  const twitterClientSecret = process.env.TWITTER_CLIENT_SECRET;
  if (twitterClientId && twitterClientSecret) {
    providers.push(
      TwitterProvider({
        clientId: twitterClientId,
        clientSecret: twitterClientSecret,
        version: "2.0",
      }),
    );
  }

  const devLoginEnabled = process.env.DEV_LOGIN_ENABLED === "true";
  const devUsername = process.env.DEV_LOGIN_USERNAME;
  const devPassword = process.env.DEV_LOGIN_PASSWORD;

  if (devLoginEnabled && devUsername && devPassword) {
    providers.push(
      CredentialsProvider({
        id: "dev-credentials",
        name: "開発用ログイン",
        credentials: {
          username: { label: "Username", type: "text" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          if (
            credentials?.username !== devUsername
            || credentials?.password !== devPassword
          ) {
            return null;
          }

          const devUser = await findOrCreateDevUser(devUsername);
          return {
            id: devUser.id,
            name: devUsername,
            onboardingCompleted: devUser.onboardingCompleted,
          };
        },
      }),
    );
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  providers: buildProviders(),
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || account.provider === "dev-credentials") {
        return true;
      }

      if (account.provider === "github" && !user.email) {
        return "/login?error=EmailRequired";
      }

      if (!profile) {
        return false;
      }

      try {
        const dbUser = await resolveUserByOAuthProfile({
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          email: user.email ?? undefined,
          emailVerified: true,
        });

        user.id = dbUser.id;
        user.onboardingCompleted = dbUser.onboardingCompleted;
        return true;
      } catch (error) {
        console.error("SignIn error:", error);
        if (account.provider === "github") {
          return "/login?error=EmailRequired";
        }
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.onboardingCompleted = user.onboardingCompleted;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.onboardingCompleted = Boolean(token.onboardingCompleted);
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
