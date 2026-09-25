import { createContext, useContext } from "react";
import type { Snapshot, Profile, Locale } from "../shared/contracts";
import { choose, translate, type TranslationKey } from "../i18n";
export type Route =
  | "today"
  | "play"
  | "review"
  | "learn"
  | "puzzles"
  | "history"
  | "settings"
  | "vision"
  | "openings"
  | "endgames";
type Context = {
  snapshot: Snapshot;
  profile: Profile;
  locale: Locale;
  nav: (route: Route, id?: string) => void;
  refresh: () => Promise<void>;
  fail: (e: unknown) => void;
  reviewId: string | null;
};
export const AppContext = createContext<Context | null>(null);
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw Error("Missing app context");
  return {
    ...ctx,
    t: (key: TranslationKey) => translate(ctx.locale, key),
    l: (ru: string, en: string) => choose(ctx.locale, ru, en),
  };
}
export function errorText(error: unknown, locale: Locale) {
  const s = String((error as Error)?.message ?? error).replace(
    /^Error invoking remote method '[^']+': Error: /,
    "",
  );
  const messages: Record<string, [string, string]> = {
    cloud_unavailable: [
      "Облачный ИИ недоступен. Проверь ключ, баланс и лимит аккаунта. Локальный анализ работает.",
      "Cloud AI is unavailable. Check your key, credits and account limits. Local analysis still works.",
    ],
    cloud_network_reserved: [
      "Сеть прервала ответ ИИ. Возможная стоимость оставлена в резерве; автоматического повтора не будет.",
      "The AI request lost its connection. Possible cost remains reserved; it will not be retried automatically.",
    ],
    budget_exhausted: [
      "Достигнут месячный лимит приложения. Доступны Stockfish и локальный тренер.",
      "The monthly app budget is reached. Stockfish and the local coach remain available.",
    ],
    cloud_invalid_response: [
      "ИИ вернул неполный формат. Используются локальные объяснения.",
      "AI returned an invalid format. Local explanations are available.",
    ],
    cloud_incomplete: [
      "Ответ ИИ не завершён. Доступен локальный разбор.",
      "The AI response was incomplete. Local analysis is available.",
    ],
    no_key: [
      "Добавь API-ключ в настройках для разговорных объяснений.",
      "Add an API key in Settings for conversational explanations.",
    ],
    invalid_key: [
      "Ключ должен начинаться с sk-. Проверь, что он скопирован полностью.",
      "The key must start with sk-. Make sure you copied it completely.",
    ],
    storage_recovered: [
      "Данные восстановлены из последней исправной копии. Повреждённый файл сохранён отдельно.",
      "Data was restored from the last valid backup. The damaged file was preserved.",
    ],
    wrong_profile: [
      "Профиль уже сменился. Действие прежнего профиля отменено.",
      "The profile has changed. The previous profile’s action was cancelled.",
    ],
    secure_storage_unavailable: [
      "Защищённое хранилище Windows недоступно. Ключ не сохранён.",
      "Windows secure storage is unavailable. The key was not saved.",
    ],
    analysis_not_ready: [
      "Сначала запусти анализ этой партии.",
      "Analyze this game first.",
    ],
  };
  return messages[s] ? choose(locale, ...messages[s]) : s;
}
