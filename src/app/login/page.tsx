"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDevLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const result = await signIn("dev-credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setErrorMessage("ユーザー名またはパスワードが違います");
      return;
    }

    window.location.href = "/";
  }

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

        <hr style={{ margin: "1.5rem 0" }} />
        <p style={{ fontSize: "0.85rem", color: "#888" }}>開発用ログイン</p>
        <form onSubmit={handleDevLogin} style={{ display: "grid", gap: "0.5rem" }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {errorMessage ? (
            <p style={{ color: "red", fontSize: "0.85rem" }}>{errorMessage}</p>
          ) : null}
          <button type="submit">ログイン</button>
        </form>
      </section>
    </main>
  );
}
