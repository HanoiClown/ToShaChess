import type { Locale } from "../shared/contracts";
import type { Route } from "./context";

export type NavigationGroup = "today" | "play" | "learn" | "analysis";
type NavigationItem = {
  route: Route;
  label: Record<Locale, string>;
};

export const primaryNavigation: (NavigationItem & { id: NavigationGroup })[] = [
  { id: "today", route: "today", label: { ru: "Сегодня", en: "Today" } },
  { id: "play", route: "play", label: { ru: "Играть", en: "Play" } },
  { id: "learn", route: "learn", label: { ru: "Обучение", en: "Learn" } },
  { id: "analysis", route: "history", label: { ru: "Анализ", en: "Analysis" } },
];

export const sectionNavigation: Record<NavigationGroup, NavigationItem[]> = {
  today: [],
  play: [],
  learn: [
    { route: "learn", label: { ru: "Уроки", en: "Lessons" } },
    { route: "puzzles", label: { ru: "Задачи", en: "Puzzles" } },
    { route: "vision", label: { ru: "Видение доски", en: "Board vision" } },
    { route: "training", label: { ru: "Практика", en: "Practice" } },
  ],
  analysis: [
    { route: "history", label: { ru: "Мои партии", en: "My games" } },
    { route: "review", label: { ru: "Разбор", en: "Review" } },
    { route: "studies", label: { ru: "Исследования", en: "Studies" } },
    { route: "editor", label: { ru: "Конструктор", en: "Position editor" } },
    { route: "database", label: { ru: "База партий", en: "Game database" } },
  ],
};

// Derive selection from the real route so card launches and course links agree
// with navigation clicks, without a second navigation state to synchronize.
const routeGroups: Record<Route, NavigationGroup | null> = {
  today: "today",
  play: "play",
  learn: "learn",
  openings: "learn",
  endgames: "learn",
  puzzles: "learn",
  vision: "learn",
  training: "learn",
  history: "analysis",
  review: "analysis",
  studies: "analysis",
  editor: "analysis",
  database: "analysis",
  settings: null,
};

export function navigationGroup(route: Route): NavigationGroup | null {
  return routeGroups[route];
}

export function activeLocalRoute(route: Route): Route | null {
  if (route === "openings" || route === "endgames") return "learn";
  const group = navigationGroup(route);
  return group === "learn" || group === "analysis" ? route : null;
}
