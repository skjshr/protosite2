"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <main className="container">
      <section className="panel">
        <h1>ログイン</h1>
        <p>IDPでサインインしてください。</p>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <button onClick={() => signIn("google", { callbackUrl: "/" })}>Google でログイン</button>
          <button onClick={() => signIn("github", { callbackUrl: "/" })}>GitHub でログイン</button>
          <button onClick={() => signIn("twitter", { callbackUrl: "/" })}>X (Twitter) でログイン</button>
        </div>
      </section>
    </main>
  );
}
