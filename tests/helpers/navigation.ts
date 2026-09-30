import type { Page } from "@playwright/test";

type Destination = {
  names: [string, string];
  parent?: [string, string];
  aliases?: string[];
};
const learn: [string, string] = ["Обучение", "Learn"];
const analysis: [string, string] = ["Анализ", "Analysis"];
const destinations: Destination[] = [
  { names: ["Сегодня", "Today"] },
  { names: ["Играть", "Play"] },
  { names: learn },
  { names: analysis },
  { names: ["Уроки", "Lessons"], parent: learn },
  { names: ["Задачи", "Puzzles"], parent: learn },
  { names: ["Видение доски", "Board vision"], parent: learn },
  { names: ["Практика", "Practice"], parent: learn },
  { names: ["Мои партии", "My games"], parent: analysis },
  { names: ["Разбор", "Review"], parent: analysis },
  { names: ["Исследования", "Studies"], parent: analysis },
  { names: ["Конструктор", "Position editor"], parent: analysis },
  {
    names: ["База партий", "Game database"],
    parent: analysis,
    aliases: [
      "Большая база",
      "Offline database",
      "Big library",
      "Extended database",
    ],
  },
  { names: ["Настройки", "Settings"] },
  { names: ["Сменить профиль", "Switch profile"] },
];

/** Open a named section, revealing its parent first when local navigation is hidden. */
export async function navigateSection(page: Page, label: string) {
  const destination = destinations.find((item) =>
    [...item.names, ...(item.aliases ?? [])].includes(label),
  );
  if (!destination) throw new Error(`Unknown navigation destination: ${label}`);
  const language =
    (await page.locator("html").getAttribute("lang")) === "en" ? 1 : 0;
  const name = destination.names[language];
  if (destination.parent) {
    const local = page
      .locator(".section-navigation")
      .getByRole("button", { name, exact: true });
    if (!(await local.isVisible()))
      await page
        .locator(".primary-navigation")
        .getByRole("button", {
          name: destination.parent[language],
          exact: true,
        })
        .click();
    await local.click();
  } else {
    await page
      .locator(".sidebar")
      .getByRole("button", { name, exact: true })
      .click();
  }
}
