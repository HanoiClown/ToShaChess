import type { Locale } from "../shared/contracts";
import { bots, botStyle } from "./catalog";
export function chooseQuip(input: {
  botId: string;
  event: "start" | "check" | "capture" | "loss" | "end";
  locale: Locale;
  ply: number;
  now: number;
  lastPly: number;
  lastAt: number;
}): string | null {
  if (
    input.event !== "end" &&
    input.event !== "start" &&
    (input.ply - input.lastPly < 3 || input.now - input.lastAt < 15000)
  )
    return null;
  const b = bots.find((b) => b.id === input.botId);
  if (!b) return null;
  const ru = input.locale === "ru";
  if (input.event === "start")
    return (
      (ru ? "Мой план: " : "My approach: ") +
      botStyle[b.style][input.locale].toLowerCase() +
      "."
    );
  const lines = {
    check: ru
      ? "Шах. Королю нужно внимание."
      : "Check. The king needs attention.",
    capture: ru
      ? "Размен меняет позицию. Что дальше?"
      : "A trade changes the position. What comes next?",
    loss: ru
      ? "Фигура потеряна. Продолжим бороться."
      : "A piece is gone. Let’s keep playing.",
    end: ru
      ? "Спасибо за игру! В разборе найдём ключевые моменты."
      : "Thanks for the game! Let’s review the key moments.",
  };
  return lines[input.event];
}
