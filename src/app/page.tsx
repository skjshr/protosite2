"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createField, loadFields } from "@/lib/field-storage";
import { getThemeDescription, getThemeLabel } from "@/lib/field-theme";
import {
  appendSavedSession,
  calculateFieldSessionTotals,
  calculateSessionHistorySummary,
  getRecentSavedSessions,
  loadSavedSessions,
} from "@/lib/session-history-storage";
import {
  calculateCurrentEffectiveSeconds,
  createSession,
  endSession,
  pauseSession,
  resumeSession,
} from "@/lib/session";
import {
  formatIsoToLocalDateTime,
  formatSecondsToMinutesAndSeconds,
} from "@/lib/time-format";
import type { ActiveSession, EndedSession } from "@/types/session";
import type { SavedSession } from "@/types/session-history";
import type { Field, FieldTheme } from "@/types/field";

function useNowTick(
  activeSession: ActiveSession | null,
): { now: Date; syncNow: () => void } {
  // now は「現在時刻のスナップショット」。
  // 秒表示を更新するトリガーとしてだけ使う。
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // activeSession がない or paused の間は表示が進まないのでタイマー不要。
    if (!activeSession || activeSession.status !== "working") {
      return;
    }

    // working 中だけ 1 秒ごとに現在時刻を更新し、表示を進める。
    const timerId = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      // 画面再描画や状態変更時に前の interval を必ず解放する。
      // これを忘れるとタイマーが多重起動して表示が壊れる。
      clearInterval(timerId);
    };
  }, [activeSession]);

  function syncNow() {
    setNow(new Date());
  }

  return { now, syncNow };
}

export default function Home() {
  // activeSession: 進行中セッション（working / paused）
  // result: 終了済みセッション（ended）
  // 2つを分けることで、画面分岐が読みやすくなる。
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [result, setResult] = useState<EndedSession | null>(null);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldTheme, setNewFieldTheme] = useState<FieldTheme>("miner");
  const [newFieldIsPublic, setNewFieldIsPublic] = useState(false);
  // ドメイン関数から投げられたエラーを UI で可視化する。
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const sessionActionLockRef = useRef(false);
  const fieldActionLockRef = useRef(false);
  const { now, syncNow } = useNowTick(activeSession);

  useEffect(() => {
    // localStorage の読み込みは副作用なので、初回レンダー後に実行する。
    setSavedSessions(loadSavedSessions());
    setFields(loadFields());
  }, []);

  const historySummary = useMemo(() => {
    return calculateSessionHistorySummary(savedSessions);
  }, [savedSessions]);

  const recentSavedSessions = useMemo(() => {
    return getRecentSavedSessions(savedSessions, 5);
  }, [savedSessions]);

  const totalsByField = useMemo(() => {
    return calculateFieldSessionTotals(savedSessions);
  }, [savedSessions]);

  // 表示秒数は保存せず、毎回「時刻情報」から導出する。
  const effectiveSeconds = activeSession
    ? calculateCurrentEffectiveSeconds(activeSession, now)
    : 0;

  function handleCreateField() {
    if (fieldActionLockRef.current) {
      return;
    }
    fieldActionLockRef.current = true;

    const trimmedName = newFieldName.trim();
    if (!trimmedName) {
      setErrorMessage("用途名を入力してください。");
      fieldActionLockRef.current = false;
      return;
    }

    try {
      const nextFields = createField(fields, {
        name: trimmedName,
        theme: newFieldTheme,
        isPublic: newFieldIsPublic,
      });
      setFields(nextFields);
      setNewFieldName("");
      setNewFieldTheme("miner");
      setNewFieldIsPublic(false);
      setErrorMessage(null);
    } finally {
      fieldActionLockRef.current = false;
    }
  }

  function handleStartSession(fieldId: string, fieldName: string) {
    if (sessionActionLockRef.current) {
      return;
    }
    sessionActionLockRef.current = true;

    // 開始時は「進行中セッションを作る」ことだけに集中する。
    // 結果画面・エラー表示は新しい実行の邪魔になるのでリセットする。
    const startedSession = createSession(fieldId, fieldName, new Date());
    setActiveSession(startedSession);
    setResult(null);
    setErrorMessage(null);
    sessionActionLockRef.current = false;
  }

  function handlePauseSession() {
    if (sessionActionLockRef.current) {
      return;
    }
    sessionActionLockRef.current = true;

    // ボタン表示で基本は防いでいるが、念のため null ガードを置く。
    if (!activeSession) {
      sessionActionLockRef.current = false;
      return;
    }

    try {
      // 状態遷移ロジックは UI に書かず、lib へ委譲する。
      const pausedSession = pauseSession(activeSession, new Date());
      setActiveSession(pausedSession);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Pause failed.");
    } finally {
      sessionActionLockRef.current = false;
    }
  }

  function handleResumeSession() {
    if (sessionActionLockRef.current) {
      return;
    }
    sessionActionLockRef.current = true;

    if (!activeSession) {
      sessionActionLockRef.current = false;
      return;
    }

    try {
      // 再開時は pauseAccumulatedSeconds の更新が必要なので、必ず lib 関数を通す。
      const resumedSession = resumeSession(activeSession, new Date());
      setActiveSession(resumedSession);
      // 1秒タイマーを待たずに「今」を反映して、再開直後の表示遅延を抑える。
      syncNow();
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Resume failed.");
    } finally {
      sessionActionLockRef.current = false;
    }
  }

  function handleEndSession() {
    if (sessionActionLockRef.current) {
      return;
    }
    sessionActionLockRef.current = true;

    if (!activeSession) {
      sessionActionLockRef.current = false;
      return;
    }

    try {
      // 終了処理で score / xp まで確定し、結果画面に必要な値を一度に作る。
      const endedSession = endSession(activeSession, new Date());
      setResult(endedSession);
      setSavedSessions(appendSavedSession(endedSession, savedSessions));
      // 終了後に activeSession を残すと二重終了できてしまうため即クリアする。
      setActiveSession(null);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "End failed.");
    } finally {
      sessionActionLockRef.current = false;
    }
  }

  return (
    <main className="container">
      <h1>最小タイマー</h1>

      <section className="panel">
        <h2>用途フィールド作成</h2>
        <p>
          用途名:
          <input
            value={newFieldName}
            onChange={(event) => setNewFieldName(event.target.value)}
            placeholder="例: AWS学習"
          />
        </p>
        <p>
          職業テーマ:
          <select
            value={newFieldTheme}
            onChange={(event) => setNewFieldTheme(event.target.value as FieldTheme)}
          >
            <option value="miner">Miner</option>
            <option value="fisher">Fisher</option>
            <option value="collector">Collector</option>
          </select>
        </p>
        <label>
          <input
            type="checkbox"
            checked={newFieldIsPublic}
            onChange={(event) => setNewFieldIsPublic(event.target.checked)}
          />
          公開する
        </label>
        <p>
          <button onClick={handleCreateField}>用途フィールドを作成</button>
        </p>
      </section>

      <section className="panel">
        <h2>累計</h2>
        <p>累計XP: {historySummary.totalXp}</p>
        <p>
          累計有効時間:{" "}
          {formatSecondsToMinutesAndSeconds(historySummary.totalEffectiveSeconds)}
        </p>
      </section>

      <section className="panel">
        <h2>用途フィールド一覧</h2>
        {fields.length === 0 && <p>まだ用途フィールドがありません。</p>}
        {fields.map((field) => {
          const fieldTotals = totalsByField[field.id];
          return (
            <div key={field.id}>
              <p>
                {field.name} ({getThemeLabel(field.theme)})
              </p>
              <p>{getThemeDescription(field.theme)}</p>
              <p>公開設定: {field.isPublic ? "公開" : "非公開"}</p>
              <p>
                累計有効時間:{" "}
                {formatSecondsToMinutesAndSeconds(
                  fieldTotals?.totalEffectiveSeconds ?? 0,
                )}{" "}
                / 累計セッション: {fieldTotals?.totalSessions ?? 0}
              </p>
              <button
                onClick={() => handleStartSession(field.id, field.name)}
                disabled={activeSession !== null}
              >
                この用途で開始
              </button>
            </div>
          );
        })}
      </section>

      <section className="panel">
        <h2>最近のセッション（5件）</h2>
        {recentSavedSessions.length === 0 && <p>まだセッションがありません。</p>}
        {recentSavedSessions.map((savedSession) => (
          <div key={`${savedSession.endedAt}-${savedSession.startedAt}`}>
            <p>用途: {savedSession.fieldName}</p>
            <p>fieldId: {savedSession.fieldId}</p>
            <p>
              開始: {formatIsoToLocalDateTime(savedSession.startedAt)} / 終了:{" "}
              {formatIsoToLocalDateTime(savedSession.endedAt)}
            </p>
            <p>
              有効時間:{" "}
              {formatSecondsToMinutesAndSeconds(savedSession.effectiveSeconds)} / score:{" "}
              {savedSession.score} / xp: {savedSession.xp}
            </p>
          </div>
        ))}
      </section>

      {activeSession && (
        <section className="panel">
          {/* 進行中状態では「現在の状態」と「有効時間」を表示する。 */}
          <p>用途: {activeSession.fieldName}</p>
          <p>fieldId: {activeSession.fieldId}</p>
          <p>状態: {activeSession.status}</p>
          <p>経過(有効): {formatSecondsToMinutesAndSeconds(effectiveSeconds)}</p>
          {activeSession.status === "working" && (
            <button onClick={handlePauseSession}>休憩</button>
          )}
          {activeSession.status === "paused" && (
            <button onClick={handleResumeSession}>再開</button>
          )}
          <button onClick={handleEndSession}>終了</button>
        </section>
      )}

      {result && (
        <section className="panel">
          {/* 結果画面は endedSession の値だけを表示する。 */}
          <h2>結果</h2>
          <p>用途: {result.fieldName}</p>
          <p>有効作業時間: {formatSecondsToMinutesAndSeconds(result.effectiveSeconds)}</p>
          <p>休憩時間: {formatSecondsToMinutesAndSeconds(result.pauseAccumulatedSeconds)}</p>
          <p>スコア: {result.score}</p>
          <p>XP: {result.xp}</p>
          <p>fieldId: {result.fieldId}</p>
          <button
            onClick={() => handleStartSession(result.fieldId, result.fieldName)}
            disabled={activeSession !== null}
          >
            もう一度開始
          </button>
        </section>
      )}

      {errorMessage && <p className="error">{errorMessage}</p>}
    </main>
  );
}
