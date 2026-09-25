import {
  useState,
  useEffect,
  useCallback,
  useRef,
  lazy,
  Suspense,
} from "react";
import {
  Home,
  Swords,
  ChartNoAxesCombined,
  BookOpen,
  Target,
  History,
  Settings,
  Users,
  ChevronRight,
  X,
  ShieldCheck,
  Languages,
  Eye,
  UserPlus,
  Upload,
  Database,
} from "lucide-react";
import type { Snapshot, Locale } from "../shared/contracts";
import { AppContext, errorText, type Route } from "./context";
import { translate, choose } from "../i18n";
import { Today } from "../screens/Today";
import { Play } from "../screens/Play";
import { Review } from "../screens/Review";
import { Learn } from "../screens/Learn";
const Puzzles = lazy(() =>
  import("../screens/Puzzles").then((m) => ({ default: m.Puzzles })),
);
import { HistoryScreen } from "../screens/History";
import { SettingsScreen } from "../screens/Settings";
import { Vision } from "../screens/Vision";
import { ProfileCreator } from "./ProfileCreator";
import { configureSound, disposeSound, unlockSound } from "../audio/sounds";
const Openings = lazy(() =>
  import("../screens/Openings").then((m) => ({ default: m.Openings })),
);
const DatabaseScreen = lazy(() =>
  import("../screens/Database").then((m) => ({ default: m.DatabaseScreen })),
);
const routes: { id: Route; icon: typeof Home }[] = [
  { id: "today", icon: Home },
  { id: "play", icon: Swords },
  { id: "review", icon: ChartNoAxesCombined },
  { id: "learn", icon: BookOpen },
  { id: "puzzles", icon: Target },
  { id: "vision", icon: Eye },
  { id: "database", icon: Database },
  { id: "history", icon: History },
];
export default function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [route, setRoute] = useState<Route>("today"),
    [reviewId, setReviewId] = useState<string | null>(null),
    [error, setError] = useState(""),
    [dismissedNotice, setDismissedNotice] = useState<string | null>(null),
    [entryLocale, setEntryLocale] = useState<Locale>("ru"),
    [creatingProfile, setCreatingProfile] = useState(false);
  useEffect(() => {
    if (snapshot) configureSound(snapshot.database.settings);
  }, [snapshot?.database.settings.sound, snapshot?.database.settings.volume]);
  useEffect(() => {
    const unlock = () => unlockSound();
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlock, { capture: true });
      window.removeEventListener("keydown", unlock, { capture: true });
      disposeSound();
    };
  }, []);
  const refresh = useCallback(async () => {
    setSnapshot(await window.chessApp.snapshot());
  }, []);
  useEffect(() => {
    if (!window.chessApp) {
      setError("Открой ToShaChess.exe / Open ToShaChess.exe");
      return;
    }
    void refresh().catch((e) => setError(String(e)));
    return window.chessApp.onUpdate(
      () => void refresh().catch((e) => setError(String(e))),
    );
  }, [refresh]);
  const profile = snapshot?.database.profiles.find(
      (p) => p.id === snapshot.activeProfile,
    ),
    locale = profile?.locale ?? entryLocale,
    l = (ru: string, en: string) => choose(locale, ru, en);
  const routeRef = useRef(route);
  useEffect(() => {
    document.documentElement.dataset.theme = profile?.theme ?? "green";
  }, [profile?.id, profile?.theme]);
  routeRef.current = route;
  useEffect(() => {
    if (!profile) return;
    const profileId = profile.id;
    let last = Date.now(),
      input = Date.now();
    const touch = () => {
      input = Date.now();
    };
    window.addEventListener("pointerdown", touch);
    window.addEventListener("keydown", touch);
    const save = () => {
      const now = Date.now(),
        seconds = Math.min(30, (now - last) / 1000);
      last = now;
      if (document.hasFocus() && now - input < 300000 && seconds >= 1)
        return window.chessApp
          .recordActivity(profileId, routeRef.current, seconds)
          .catch(() => {});
    };
    const interval = setInterval(() => void save(), 30000),
      onSwitch = (e: Event) => {
        const result = save();
        if (result) (e as CustomEvent<Promise<unknown>[]>).detail.push(result);
      };
    window.addEventListener("chess-before-switch", onSwitch);
    return () => {
      clearInterval(interval);
      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("keydown", touch);
      window.removeEventListener("chess-before-switch", onSwitch);
    };
  }, [profile?.id]);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const fail = (e: unknown) => {
    if (!String(e).includes("Cancelled")) setError(errorText(e, locale));
  };
  const nav = (next: Route, id?: string) => {
    if (id) setReviewId(id);
    setRoute(next);
  };
  async function switchProfile() {
    const pending: Promise<unknown>[] = [];
    window.dispatchEvent(
      new CustomEvent("chess-before-switch", { detail: pending }),
    );
    await Promise.all(pending);
    await window.chessApp.selectProfile(null);
    setRoute("today");
    setReviewId(null);
    await refresh();
  }
  async function language(next: Locale) {
    if (profile) {
      await window.chessApp.updateProfile({ ...profile, locale: next });
      await refresh();
    } else setEntryLocale(next);
  }
  const languageSwitch = (
    <div className="language-switch" aria-label="Language">
      <Languages size={16} />
      {(["ru", "en"] as const).map((code) => (
        <button
          key={code}
          className={locale === code ? "active" : ""}
          onClick={() => void language(code).catch(fail)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
  const banner =
    error ||
    (snapshot?.notice !== dismissedNotice &&
      snapshot?.notice &&
      errorText(snapshot.notice, locale));
  if (!snapshot)
    return (
      <div className="launch-screen">
        <img src="./pieces/wN.svg" alt="" />
        <h1>ToShaChess</h1>
        <p>
          {error ||
            l("Открываем твою шахматную комнату…", "Opening your chess room…")}
        </p>
      </div>
    );
  if (!profile)
    return (
      <div className="profile-page">
        <header>
          <div className="brand">
            <img src="./pieces/wP.svg" alt="" />
            ToSha<span>Chess</span>
          </div>
          {languageSwitch}
        </header>
        <main className="profile-main">
          <h1>
            {creatingProfile || snapshot.database.profiles.length === 0
              ? l("Твоя игра начинается здесь", "Your game starts here")
              : l("Кто сегодня играет?", "Who’s playing today?")}
          </h1>
          <p>
            {creatingProfile || snapshot.database.profiles.length === 0
              ? l(
                  "Создай профиль, чтобы сохранять партии и видеть свой прогресс.",
                  "Create a profile to save your games and follow your progress.",
                )
              : l(
                  "Твоя доска. Твой темп. Твой прогресс.",
                  "Your board. Your pace. Your progress.",
                )}
          </p>
          {banner && (
            <p className="profile-form-error" role="alert">
              {banner}
            </p>
          )}
          {creatingProfile || snapshot.database.profiles.length === 0 ? (
            <ProfileCreator
              locale={locale}
              onCreated={(next) => {
                setSnapshot(next);
                setCreatingProfile(false);
                setError("");
                setRoute("today");
                setReviewId(null);
              }}
              onCancel={
                snapshot.database.profiles.length
                  ? () => setCreatingProfile(false)
                  : undefined
              }
            />
          ) : (
            <>
              <div className="profile-choices">
                {snapshot.database.profiles.map((p, i) => (
                  <button
                    className="profile-choice"
                    key={p.id}
                    onClick={() =>
                      void window.chessApp
                        .selectProfile(p.id)
                        .then(refresh)
                        .catch(fail)
                    }
                  >
                    <div
                      className="profile-avatar"
                      style={{ background: p.color }}
                    >
                      <img
                        src={`./pieces/w${i === 0 ? "N" : "R"}.svg`}
                        alt=""
                      />
                    </div>
                    <strong>{p.name}</strong>
                    {p.nickname && (
                      <small className="profile-nickname">@{p.nickname}</small>
                    )}
                    <span>
                      {p.level === "new"
                        ? l("Начать с основ", "Start with the basics")
                        : l("Развивать свою игру", "Build your game")}
                    </span>
                    <ChevronRight size={20} />
                  </button>
                ))}
              </div>
              <div className="profile-entry-actions">
                <button
                  className="secondary"
                  disabled={snapshot.database.profiles.length >= 20}
                  onClick={() => {
                    setError("");
                    setCreatingProfile(true);
                  }}
                >
                  <UserPlus size={18} />
                  {l("Создать профиль", "Create profile")}
                </button>
              </div>
              {snapshot.database.profiles.length >= 20 && (
                <p className="field-help">
                  {l(
                    "На этом компьютере уже 20 профилей.",
                    "This computer already has 20 profiles.",
                  )}
                </p>
              )}
            </>
          )}
          {!creatingProfile && (
            <button
              className="text-button profile-restore"
              onClick={() =>
                void window.chessApp
                  .importBackup()
                  .then((next) => {
                    if (next) {
                      setSnapshot(next);
                      setError("");
                    }
                  })
                  .catch(fail)
              }
            >
              <Upload size={16} />
              {l("Восстановить из резервной копии", "Restore from backup")}
            </button>
          )}
          <div className="profile-foot">
            <ShieldCheck size={18} />
            {l(
              "Партии и достижения сохраняются отдельно",
              "Games and progress stay separate",
            )}
          </div>
        </main>
        <footer>
          {l(
            "Личный шахматный клуб · Stockfish 19",
            "Your personal chess club · Stockfish 19",
          )}
        </footer>
      </div>
    );
  return (
    <AppContext.Provider
      value={{ snapshot, profile, locale, nav, refresh, fail, reviewId }}
    >
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <img src="./pieces/wP.svg" alt="" />
            ToSha<span>Chess</span>
          </div>
          <nav>
            {routes.map(({ id, icon: Icon }) => (
              <button
                key={id}
                className={
                  route === id ||
                  (id === "learn" && ["openings", "endgames"].includes(route))
                    ? "nav-link active"
                    : "nav-link"
                }
                onClick={() => nav(id)}
              >
                <Icon size={23} />
                <span>{translate(locale, id)}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="engine-status">
              <span />
              {l("Stockfish 19 · локально", "Stockfish 19 · local")}
            </div>
            <button
              className={`nav-link ${route === "settings" ? "active" : ""}`}
              onClick={() => nav("settings")}
            >
              <Settings size={21} />
              <span>{translate(locale, "settings")}</span>
            </button>
            <button
              className="nav-link"
              onClick={() => void switchProfile().catch(fail)}
            >
              <Users size={21} />
              <span>{translate(locale, "switch")}</span>
            </button>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div className="profile-chip">
              <span style={{ background: profile.color }}>
                {profile.name.slice(0, 1).toUpperCase()}
              </span>
              <strong>{profile.name}</strong>
              {profile.nickname && (
                <small className="profile-nickname">@{profile.nickname}</small>
              )}
              <small>
                {profile.level === "new"
                  ? l("Первые шаги", "First steps")
                  : l("Личная тренировка", "Personal training")}
              </small>
            </div>
            {languageSwitch}
          </header>
          {banner && (
            <div className="notice" role="status">
              <span>{banner}</span>
              <button
                aria-label={l("Закрыть", "Close")}
                onClick={() => {
                  setError("");
                  setDismissedNotice(snapshot.notice);
                }}
              >
                <X size={18} />
              </button>
            </div>
          )}
          <main className="main-content">
            {route === "today" && <Today />}
            <div style={{ display: route === "play" ? "block" : "none" }}>
              <Play key={profile.id} />
            </div>
            {route === "review" && <Review />}
            {route === "learn" && <Learn />}
            <Suspense
              fallback={
                <p className="empty-state" role="status">
                  {l("Открываем библиотеку…", "Opening the library…")}
                </p>
              }
            >
              {route === "puzzles" && <Puzzles key="puzzles" />}
              {route === "endgames" && <Puzzles key="endgames" endgames />}
              {route === "openings" && <Openings />}
              {route === "database" && <DatabaseScreen />}
            </Suspense>
            {route === "vision" && <Vision />}
            {route === "history" && <HistoryScreen />}
            {route === "settings" && <SettingsScreen />}
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
}
