"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(body.error ?? "保存に失敗しました。");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setMessage("通信エラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="container">
      <section className="panel">
        <h1>初期設定</h1>
        <p>表示名（ユーザー名）を設定してください。</p>
        <form onSubmit={handleSubmit}>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="4〜20文字で入力"
            minLength={4}
            maxLength={20}
            required
          />
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : "保存"}
          </button>
        </form>
        {message ? <p className="error">{message}</p> : null}
      </section>
    </main>
  );
}
