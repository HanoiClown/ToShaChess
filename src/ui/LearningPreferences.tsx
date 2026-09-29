import type { Locale, Profile } from "../shared/contracts";
export const defaultLearning: NonNullable<Profile["learning"]> = {
  minutes: 60,
  goal: "balanced",
  explanation: "detailed",
};
export function LearningPreferences({
  value,
  onChange,
  locale,
}: {
  value: NonNullable<Profile["learning"]>;
  onChange: (value: NonNullable<Profile["learning"]>) => void;
  locale: Locale;
}) {
  const ru = locale === "ru";
  return (
    <>
      <label>
        {ru ? "Время на занятие" : "Time per session"}
        <select
          value={value.minutes}
          onChange={(e) =>
            onChange({
              ...value,
              minutes: Number(e.target.value) as 15 | 30 | 60,
            })
          }
        >
          {[15, 30, 60].map((n) => (
            <option value={n} key={n}>
              {n} {ru ? "минут" : "minutes"}
            </option>
          ))}
        </select>
      </label>
      <label>
        {ru ? "Учебная цель" : "Learning goal"}
        <select
          value={value.goal}
          onChange={(e) =>
            onChange({ ...value, goal: e.target.value as typeof value.goal })
          }
        >
          <option value="basics">
            {ru ? "Правила и основы" : "Rules and basics"}
          </option>
          <option value="tactics">
            {ru
              ? "Меньше зевков, больше тактики"
              : "Fewer blunders, better tactics"}
          </option>
          <option value="openings">
            {ru ? "Дебюты и планы" : "Openings and plans"}
          </option>
          <option value="balanced">
            {ru ? "Понемногу обо всём" : "Balanced practice"}
          </option>
        </select>
      </label>
      <label>
        {ru ? "Объяснения при открытии урока" : "Lesson explanations"}
        <select
          value={value.explanation}
          onChange={(e) =>
            onChange({
              ...value,
              explanation: e.target.value as typeof value.explanation,
            })
          }
        >
          <option value="short">{ru ? "Сначала кратко" : "Short first"}</option>
          <option value="detailed">
            {ru ? "Сразу подробно" : "Detailed first"}
          </option>
        </select>
      </label>
    </>
  );
}
