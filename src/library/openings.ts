import data from "../content/openings.json";
export type Opening = (typeof data)[number];
export const openings: Opening[] = data;
export function openingPriority(o: Opening) {
  if (/Bongcloud|Grob|Barnes|Ware|Duras|Englund|Latvian|Elephant/.test(o.name))
    return 3;
  if (
    o.line.length <= 12 &&
    /Italian Game|Scotch Game|Four Knights|Queen's Gambit|Slav Defense|Caro-Kann|French Defense|London System/.test(
      family(o),
    )
  )
    return 1;
  return 2;
}
export function openingLevel(o: Opening) {
  return o.line.length <= 8
    ? "first"
    : o.line.length <= 14
      ? "beginner"
      : o.line.length <= 22
        ? "intermediate"
        : "advanced";
}
const names: Record<string, string> = {
  "Italian Game": "Итальянская партия",
  "Scotch Game": "Шотландская партия",
  "Four Knights Game": "Дебют четырёх коней",
  "Sicilian Defense": "Сицилианская защита",
  "French Defense": "Французская защита",
  "Caro-Kann Defense": "Защита Каро — Канн",
  "Scandinavian Defense": "Скандинавская защита",
  "Ruy Lopez": "Испанская партия",
  "Queen's Gambit": "Ферзевый гамбит",
  "Queen's Gambit Declined": "Отказанный ферзевый гамбит",
  "Queen's Gambit Accepted": "Принятый ферзевый гамбит",
  "King's Gambit": "Королевский гамбит",
  "King's Gambit Accepted": "Принятый королевский гамбит",
  "King's Gambit Declined": "Отказанный королевский гамбит",
  "King's Indian Defense": "Староиндийская защита",
  "Queen's Indian Defense": "Новоиндийская защита",
  "Nimzo-Indian Defense": "Защита Нимцовича",
  "Slav Defense": "Славянская защита",
  "Semi-Slav Defense": "Полуславянская защита",
  "English Opening": "Английское начало",
  "London System": "Лондонская система",
  "Indian Defense": "Индийская защита",
  "Dutch Defense": "Голландская защита",
  "Pirc Defense": "Защита Пирца",
  "Modern Defense": "Современная защита",
  "Vienna Game": "Венская партия",
  "Bishop's Opening": "Дебют слона",
  "Danish Gambit": "Датский гамбит",
  "Russian Game": "Русская партия",
  "Alekhine Defense": "Защита Алехина",
  "Nimzowitsch Defense": "Защита Нимцовича",
  "Philidor Defense": "Защита Филидора",
  "Benoni Defense": "Защита Бенони",
  "Benko Gambit": "Волжский гамбит",
  "Catalan Opening": "Каталонское начало",
  "Zukertort Opening": "Дебют Цукерторта",
  "King's Pawn Game": "Дебют королевской пешки",
  "Queen's Pawn Game": "Дебют ферзевой пешки",
};
export function family(o: Opening) {
  return o.name.split(":")[0];
}
export function openingName(o: Opening, locale: "ru" | "en") {
  const base = family(o);
  return locale === "ru" && names[base]
    ? names[base] + o.name.slice(base.length)
    : o.name;
}
