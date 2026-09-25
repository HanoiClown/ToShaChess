import type { Store } from "../storage/store";
export const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export class Budget {
  constructor(private store: Store) {}
  total(date = new Date()) {
    return this.store.data.usage
      .filter((x) => x.month === monthKey(date))
      .reduce((s, x) => s + (x.actual ?? x.reserved), 0);
  }
  reserve(id: string, amount: number, date = new Date()) {
    if (
      !Number.isSafeInteger(amount) ||
      amount < 0 ||
      this.store.data.usage.some((x) => x.id === id) ||
      this.total(date) + amount > this.store.data.settings.budget
    )
      return false;
    this.store.update((d) => {
      d.usage.push({
        id,
        month: monthKey(date),
        reserved: amount,
        actual: null,
      });
    });
    return true;
  }
  settle(id: string, amount: number) {
    if (!Number.isSafeInteger(amount) || amount < 0)
      throw Error("Invalid usage");
    this.store.update((d) => {
      const r = d.usage.find((x) => x.id === id);
      if (!r) throw Error("Unknown request");
      r.actual = amount;
    });
  }
}
