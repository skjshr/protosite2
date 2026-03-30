import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isOnboardingPage = req.nextUrl.pathname === "/onboarding";

    if (token && !token.onboardingCompleted && !isOnboardingPage) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    if (token && token.onboardingCompleted && isOnboardingPage) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ req, token }) => {
        if (token) {
          return true;
        }

        return req.nextUrl.pathname === "/";
      },
    },
  },
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
