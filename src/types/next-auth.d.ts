import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      onboardingCompleted: boolean;
    };
  }

  interface User {
    id: string;
    onboardingCompleted: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    onboardingCompleted?: boolean;
  }
}
