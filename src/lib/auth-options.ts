import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import TwitterProvider from "next-auth/providers/twitter";
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

  return providers;
}

export const authOptions: NextAuthOptions = {
  providers: buildProviders(),
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account) {
        return true;
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
