import type { Locale } from "../shared/contracts";
export type BotDefinition = {
  id: string;
  name: Record<Locale, string>;
  rating: number;
  style:
    | "learning"
    | "attack"
    | "solid"
    | "tricky"
    | "development"
    | "tactical"
    | "positional"
    | "balanced"
    | "endgame";
  thinkMs: number;
  mistakeRate: number;
};
const entries: [string, string, string, number, BotDefinition["style"]][] = [
  ["pixel", "Пиксель", "Pixel", 300, "learning"],
  ["spark", "Искра", "Spark", 600, "attack"],
  ["quiet", "Тихон", "Quiet", 600, "solid"],
  ["fox", "Лис", "Fox", 600, "tricky"],
  ["vega", "Вега", "Vega", 900, "development"],
  ["granite", "Гранит", "Granite", 900, "solid"],
  ["rock", "Рок", "Rock", 900, "tactical"],
  ["astra", "Астра", "Astra", 1200, "attack"],
  ["cedar", "Кедр", "Cedar", 1200, "positional"],
  ["orion", "Орион", "Orion", 1500, "balanced"],
  ["rook", "Ладья", "Rook", 1800, "endgame"],
  ["nova", "Нова", "Nova", 2200, "balanced"],
];
const settings: Record<number, [number, number]> = {
  300: [250, 0.75],
  600: [250, 0.55],
  900: [400, 0.35],
  1200: [700, 0.2],
  1500: [1000, 0.1],
  1800: [1500, 0.04],
  2200: [2000, 0],
};
export const bots: readonly BotDefinition[] = entries.map(
  ([id, ru, en, rating, style]) => ({
    id,
    name: { ru, en },
    rating,
    style,
    thinkMs: settings[rating][0],
    mistakeRate: settings[rating][1],
  }),
);
export const legacyBot = (level = 1) =>
  bots.find(
    (b) => b.id === ["pixel", "spark", "vega", "orion", "nova"][level],
  ) ?? bots[1];
export const botStyle: Record<
  BotDefinition["style"],
  Record<Locale, string>
> = {
  learning: {
    ru: "Учится: часто оставляет фигуры без защиты",
    en: "Learning: often leaves pieces undefended",
  },
  attack: { ru: "Атака и активные фигуры", en: "Attacks and active pieces" },
  solid: {
    ru: "Защита, размены, безопасный король",
    en: "Defence, trades and king safety",
  },
  tricky: { ru: "Угрозы и простые ловушки", en: "Threats and simple traps" },
  development: {
    ru: "Развитие и захват центра",
    en: "Development and central control",
  },
  tactical: { ru: "Тактические осложнения", en: "Tactical complications" },
  positional: {
    ru: "Постепенное улучшение позиции",
    en: "Gradual positional improvement",
  },
  balanced: { ru: "Универсальная игра", en: "Balanced play" },
  endgame: {
    ru: "Размены и техника эндшпиля",
    en: "Trades and endgame technique",
  },
};
