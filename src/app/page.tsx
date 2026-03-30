"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  fetchCollection,
  fetchHomeData,
  fetchRanking,
  saveEndedWorkSessionRequest,
} from "@/lib/api-client";
import {
  calculateCurrentEffectiveSeconds,
  createWorkSession,
  endWorkSession,
  pauseWorkSession,
  resumeWorkSession,
} from "@/lib/work-session";
import {
  calculateRawSessionScore,
  calculateXpFromRawScore,
  roundScoreForDisplay,
} from "@/lib/scoring";
import {
  formatIsoToLocalDateTime,
  formatSecondsToMinutesAndSeconds,
} from "@/lib/time-format";
import type {
  CollectionResponse,
  HomeDataResponse,
  RankingResponse,
  SaveEndedWorkSessionResponse,
} from "@/types/api";
import type { ActiveWorkSession } from "@/types/work-session";

type GuestSessionResult = {
  effectiveSeconds: number;
  score: number;
  xpGained: number;
  droppedItem: null;
  isGuest: true;
};

type SessionResultState = SaveEndedWorkSessionResponse | GuestSessionResult;

const GUEST_FIELD_ID = "guest";
const GUEST_FIELD_NAME = "ゲストセッション";

function isGuestSessionResult(result: SessionResultState): result is GuestSessionResult {
  return "isGuest" in result;
}

export default function HomePage() {
  const { data: session, status } = useSession();

  const [homeData, setHomeData] = useState<HomeDataResponse | null>(null);
  const [isLoadingHomeData, setIsLoadingHomeData] = useState(false);

  const [activeSession, setActiveSession] = useState<ActiveWorkSession | null>(null);
  const [displayEffectiveSeconds, setDisplayEffectiveSeconds] = useState(0);

  const [sessionResult, setSessionResult] = useState<SessionResultState | null>(null);

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "collection">("home");

  const [collectionData, setCollectionData] = useState<CollectionResponse | null>(null);
  const [activeCollectionTheme, setActiveCollectionTheme] = useState<string | null>(null);
  const [isLoadingCollection, setIsLoadingCollection] = useState(false);

  const [ranking, setRanking] = useState<RankingResponse | null>(null);
  const [isLoadingRanking, setIsLoadingRanking] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isLoggedIn = Boolean(session?.user?.id);

  useEffect(() => {
    if (!isLoggedIn) {
      setHomeData(null);
      setSelectedFieldId(null);
      return;
    }

    let cancelled = false;

    async function loadHomeData() {
      setIsLoadingHomeData(true);
      setErrorMessage(null);

      try {
        const data = await fetchHomeData();
        if (cancelled) {
          return;
        }

        setHomeData(data);
        if (data.fields.length > 0) {
          setSelectedFieldId((current) => {
            if (current && data.fields.some((field) => field.id === current)) {
              return current;
            }
            return data.fields[0]?.id ?? null;
          });
        } else {
          setSelectedFieldId(null);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : "ホームデータ取得に失敗しました");
      } finally {
        if (!cancelled) {
          setIsLoadingHomeData(false);
        }
      }
    }

    void loadHomeData();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setRanking(null);
      return;
    }

    let cancelled = false;

    async function loadRanking() {
      setIsLoadingRanking(true);
      try {
        const response = await fetchRanking();
        if (cancelled) {
          return;
        }
        setRanking(response);
      } catch {
        if (!cancelled) {
          setRanking(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRanking(false);
        }
      }
    }

    void loadRanking();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || activeTab !== "collection" || collectionData !== null) {
      return;
    }

    let cancelled = false;

    async function loadCollection() {
      setIsLoadingCollection(true);

      try {
        const data = await fetchCollection();
        if (cancelled) {
          return;
        }
        setCollectionData(data);
        setActiveCollectionTheme(data.themes[0]?.themeKey ?? null);
      } catch {
        if (!cancelled) {
          setCollectionData({ themes: [] });
          setActiveCollectionTheme(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCollection(false);
        }
      }
    }

    void loadCollection();

    return () => {
      cancelled = true;
    };
  }, [activeTab, collectionData, isLoggedIn]);

  useEffect(() => {
    if (!activeSession || activeSession.status !== "working") {
      return;
    }

    const intervalId = setInterval(() => {
      setDisplayEffectiveSeconds(calculateCurrentEffectiveSeconds(activeSession, new Date()));
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [activeSession]);

  const selectedField = useMemo(() => {
    if (!homeData || !selectedFieldId) {
      return null;
    }

    return homeData.fields.find((field) => field.id === selectedFieldId) ?? null;
  }, [homeData, selectedFieldId]);

  const currentEffectiveSeconds = activeSession
    ? calculateCurrentEffectiveSeconds(activeSession, new Date())
    : 0;

  function handleStartSession() {
    const now = new Date();

    if (isLoggedIn) {
      if (!selectedField) {
        return;
      }
      const startedSession = createWorkSession(selectedField.id, selectedField.name, now);
      setActiveSession(startedSession);
      setDisplayEffectiveSeconds(0);
      setSessionResult(null);
      return;
    }

    const guestSession = createWorkSession(GUEST_FIELD_ID, GUEST_FIELD_NAME, now);
    setActiveSession(guestSession);
    setDisplayEffectiveSeconds(0);
    setSessionResult(null);
  }

  function handlePauseSession() {
    if (!activeSession) {
      return;
    }

    const pausedSession = pauseWorkSession(activeSession, new Date());
    setActiveSession(pausedSession);
    setDisplayEffectiveSeconds(calculateCurrentEffectiveSeconds(pausedSession, new Date()));
  }

  function handleResumeSession() {
    if (!activeSession) {
      return;
    }

    const resumedSession = resumeWorkSession(activeSession, new Date());
    setActiveSession(resumedSession);
    setDisplayEffectiveSeconds(calculateCurrentEffectiveSeconds(resumedSession, new Date()));
  }

  async function handleEndSession() {
    if (!activeSession) {
      return;
    }

    const now = new Date();
    const endedSession = endWorkSession(activeSession, now);

    setErrorMessage(null);

    if (isLoggedIn) {
      try {
        const result = await saveEndedWorkSessionRequest({
          fieldId: endedSession.fieldId,
          startedAt: activeSession.startedAt,
          endedAt: now.toISOString(),
          pauseAccumulatedSeconds: endedSession.pauseAccumulatedSeconds,
        });
        setSessionResult(result);

        const refreshedHomeData = await fetchHomeData();
        setHomeData(refreshedHomeData);

        const refreshedRanking = await fetchRanking();
        setRanking(refreshedRanking);

        if (result.droppedItem !== null && collectionData !== null) {
          const refreshedCollection = await fetchCollection();
          setCollectionData(refreshedCollection);
          setActiveCollectionTheme((currentTheme) => {
            if (currentTheme && refreshedCollection.themes.some((theme) => theme.themeKey === currentTheme)) {
              return currentTheme;
            }
            return refreshedCollection.themes[0]?.themeKey ?? null;
          });
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "セッション保存に失敗しました");
      }
    } else {
      const rawScore = calculateRawSessionScore(
        endedSession.effectiveSeconds,
        endedSession.pauseAccumulatedSeconds,
      );

      const guestResult: GuestSessionResult = {
        effectiveSeconds: endedSession.effectiveSeconds,
        score: roundScoreForDisplay(rawScore),
        xpGained: calculateXpFromRawScore(rawScore),
        droppedItem: null,
        isGuest: true,
      };

      setSessionResult(guestResult);
    }

    setActiveSession(null);
    setDisplayEffectiveSeconds(0);
  }

  function handleResetResult() {
    setSessionResult(null);
    setErrorMessage(null);
  }

  if (status === "loading") {
    return <main className="container">読み込み中...</main>;
  }

  return (
    <main className="container">
      {!isLoggedIn ? (
        <div className="panel guest-banner">
          ゲストモードで体験中 — 記録を残すには
          <button type="button" onClick={() => signIn(undefined, { callbackUrl: "/" })}>
            ログイン
          </button>
        </div>
      ) : null}

      <section className="panel">
        <h1>学習進捗タイマー</h1>
        <p>ユーザー: {isLoggedIn ? session?.user?.name ?? "ユーザー" : "ゲスト"}</p>

        {isLoggedIn && homeData ? (
          <div>
            <p>Lv {homeData.summary.level}</p>
            <progress max={1} value={homeData.summary.levelProgress.progressRate} />
            <p>総XP: {homeData.summary.totalXp}</p>
          </div>
        ) : null}

        {isLoggedIn ? (
          <button type="button" onClick={() => signOut({ callbackUrl: "/login" })}>
            ログアウト
          </button>
        ) : null}
      </section>

      <section className="panel tab-panel">
        <button type="button" onClick={() => setActiveTab("home")} disabled={activeTab === "home"}>
          ホーム
        </button>
        {isLoggedIn ? (
          <button
            type="button"
            onClick={() => setActiveTab("collection")}
            disabled={activeTab === "collection"}
          >
            コレクション
          </button>
        ) : null}
      </section>

      {errorMessage ? <p className="error">{errorMessage}</p> : null}

      {activeTab === "home" ? (
        <>
          {sessionResult ? (
            <section className="panel">
              <h2>セッション結果</h2>
              <p>有効時間: {formatSecondsToMinutesAndSeconds(sessionResult.effectiveSeconds)}</p>
              <p>スコア: {sessionResult.score}</p>
              <p>獲得XP: {sessionResult.xpGained}</p>
              {!isGuestSessionResult(sessionResult) && sessionResult.leveledUp ? (
                <p>レベルアップ: Lv {sessionResult.level}</p>
              ) : null}
              {sessionResult.droppedItem ? (
                <p>
                  獲得アイテム: {sessionResult.droppedItem.name} ({sessionResult.droppedItem.rarity})
                </p>
              ) : null}
              {isGuestSessionResult(sessionResult) ? (
                <button type="button" onClick={() => signIn(undefined, { callbackUrl: "/" })}>
                  ログインして記録を保存する
                </button>
              ) : null}
              <button type="button" onClick={handleResetResult}>
                次のセッションを始める
              </button>
            </section>
          ) : (
            <section className="panel">
              <h2>セッション</h2>

              {!activeSession ? (
                isLoggedIn ? (
                  homeData?.fields.length ? (
                    <>
                      <select
                        value={selectedFieldId ?? ""}
                        onChange={(event) => setSelectedFieldId(event.target.value)}
                      >
                        {homeData.fields.map((field) => (
                          <option key={field.id} value={field.id}>
                            {field.name}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={handleStartSession} disabled={!selectedField}>
                        フィールドを選んで開始
                      </button>
                    </>
                  ) : (
                    <p>先にフィールドを作成してください。</p>
                  )
                ) : (
                  <button type="button" onClick={handleStartSession}>
                    ゲストセッションを開始する
                  </button>
                )
              ) : (
                <>
                  <p>
                    {activeSession.fieldName}: {formatSecondsToMinutesAndSeconds(displayEffectiveSeconds || currentEffectiveSeconds)}
                  </p>
                  {activeSession.status === "working" ? (
                    <>
                      <button type="button" onClick={handlePauseSession}>
                        休憩
                      </button>
                      <button type="button" onClick={handleEndSession}>
                        終了
                      </button>
                    </>
                  ) : (
                    <>
                      <p>一時停止中</p>
                      <button type="button" onClick={handleResumeSession}>
                        再開
                      </button>
                      <button type="button" onClick={handleEndSession}>
                        終了
                      </button>
                    </>
                  )}
                </>
              )}
            </section>
          )}

          {isLoggedIn && homeData ? (
            <>
              <section className="panel">
                <h2>フィールド累計一覧</h2>
                {isLoadingHomeData ? <p>読み込み中...</p> : null}
                <ul>
                  {homeData.fields.map((field) => (
                    <li key={field.id}>
                      {field.name} / {field.themeDisplayName} / {formatSecondsToMinutesAndSeconds(field.totalEffectiveSeconds)} / {field.totalSessions} セッション
                    </li>
                  ))}
                </ul>
              </section>

              <section className="panel">
                <h2>最近の履歴</h2>
                <ul>
                  {homeData.recentWorkSessions.map((workSession) => (
                    <li key={`${workSession.fieldId}-${workSession.startedAt}`}>
                      {formatIsoToLocalDateTime(workSession.endedAt)} / {workSession.fieldName} / {formatSecondsToMinutesAndSeconds(workSession.effectiveSeconds)} / score {workSession.score} / xp {workSession.xp}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="panel">
                <h2>ランキング（今週）</h2>
                {isLoadingRanking ? <p>読み込み中...</p> : null}
                {ranking ? (
                  <ul>
                    {ranking.nearby.map((entry) => (
                      <li key={`${entry.rank}-${entry.username}`}>
                        {entry.isCurrentUser ? "★" : ""}
                        {entry.rank}位 {entry.username} {entry.weeklyScore.toFixed(1)}pt
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>ランキングを取得できませんでした。</p>
                )}
              </section>
            </>
          ) : null}
        </>
      ) : (
        <section className="panel">
          <h2>コレクション</h2>
          {isLoadingCollection ? <p>読み込み中...</p> : null}
          {!isLoadingCollection && collectionData ? (
            <>
              <div className="tab-panel">
                {collectionData.themes.map((theme) => (
                  <button
                    key={theme.themeKey}
                    type="button"
                    onClick={() => setActiveCollectionTheme(theme.themeKey)}
                    disabled={activeCollectionTheme === theme.themeKey}
                  >
                    {theme.themeDisplayName}
                  </button>
                ))}
              </div>

              {collectionData.themes
                .filter((theme) => theme.themeKey === activeCollectionTheme)
                .map((theme) => (
                  <ul key={theme.themeKey}>
                    {theme.items.map((item) => (
                      <li key={item.id}>
                        {item.isAcquired ? `${item.name} (${item.rarity})` : "???"}
                        {item.isAcquired && item.description ? ` - ${item.description}` : ""}
                      </li>
                    ))}
                  </ul>
                ))}
            </>
          ) : (
            <p>図鑑データがありません。</p>
          )}
        </section>
      )}
    </main>
  );
}
