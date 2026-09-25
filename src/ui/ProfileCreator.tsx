import { useState, type FormEvent } from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import type { Locale, SkillLevel, Snapshot } from "../shared/contracts";
import { choose } from "../i18n";
import { errorText } from "./context";

export function ProfileCreator({
  locale,
  onCreated,
  onCancel,
}: {
  locale: Locale;
  onCreated: (snapshot: Snapshot) => void;
  onCancel?: () => void;
}) {
  const l = (ru: string, en: string) => choose(locale, ru, en);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("new");
  const [rating, setRating] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const cleanNickname = nickname.normalize("NFKC").trim();
    if (!/^[\p{L}\p{N}_-]{2,24}$/u.test(cleanNickname)) {
      setError(
        l(
          "Для ника нужны 2–24 буквы, цифры, дефисы или знаки подчёркивания.",
          "Use 2–24 letters, numbers, hyphens or underscores for your nickname.",
        ),
      );
      return;
    }
    setError("");
    setSaving(true);
    try {
      const snapshot = await window.chessApp.createProfile({
        name: name.trim(),
        nickname: cleanNickname,
        skillLevel,
        locale,
        ...(rating === "" ? {} : { rating: Number(rating) }),
      });
      onCreated(snapshot);
    } catch (cause) {
      setError(errorText(cause, locale));
    } finally {
      setSaving(false);
    }
  }
  return (
    <form
      className="profile-create-form"
      onSubmit={(event) => void submit(event)}
      aria-label={l("Создать профиль", "Create profile")}
    >
      <div className="profile-create-fields">
        <label htmlFor="profile-name">
          {l("Имя", "Name")}
          <input
            id="profile-name"
            autoFocus
            autoComplete="name"
            required
            maxLength={40}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label htmlFor="profile-nickname">
          <span id="nickname-label">{l("Никнейм", "Nickname")}</span>
          <input
            id="profile-nickname"
            autoComplete="nickname"
            required
            minLength={2}
            maxLength={24}
            value={nickname}
            aria-describedby="nickname-help"
            aria-labelledby="nickname-label"
            onChange={(event) => setNickname(event.target.value)}
          />
          <span id="nickname-help" className="field-help">
            {l(
              "Уникальный ник на этом компьютере: 2–24 символа, без пробелов.",
              "Unique on this computer: 2–24 characters, without spaces.",
            )}
          </span>
        </label>
        <label htmlFor="profile-skill">
          <span id="skill-label">{l("Уровень игры", "Chess experience")}</span>
          <select
            id="profile-skill"
            aria-labelledby="skill-label"
            value={skillLevel}
            onChange={(event) =>
              setSkillLevel(event.target.value as SkillLevel)
            }
          >
            <option value="new">
              {l("С нуля — изучаю правила", "From zero — learning the rules")}
            </option>
            <option value="beginner">
              {l("Начинающий — знаю основы", "Beginner — I know the basics")}
            </option>
            <option value="intermediate">
              {l(
                "Средний — регулярно играю",
                "Intermediate — I play regularly",
              )}
            </option>
            <option value="advanced">
              {l("Продвинутый — играю уверенно", "Advanced — confident player")}
            </option>
          </select>
        </label>
        <label htmlFor="profile-rating">
          <span id="rating-label">
            {l("Мой рейтинг · необязательно", "My rating · optional")}
          </span>
          <input
            id="profile-rating"
            type="number"
            inputMode="numeric"
            min={0}
            max={3000}
            step={1}
            placeholder="0–3000"
            value={rating}
            aria-describedby="rating-help"
            aria-labelledby="rating-label"
            onChange={(event) => setRating(event.target.value)}
          />
          <span id="rating-help" className="field-help">
            {l(
              "Укажи свой рейтинг, если знаешь. 0 — рейтинга пока нет.",
              "Enter your rating if you know it. 0 means no rating yet.",
            )}
          </span>
        </label>
      </div>
      <p className="field-help profile-path-help">
        {skillLevel === "new"
          ? l(
              "Начнём с правил и знакомства с фигурами. Уровень можно изменить позже.",
              "Start with the rules and pieces. You can change your level later.",
            )
          : l(
              "Начнём с тактики, дебютов и практики. Уровень можно изменить позже.",
              "Start with tactics, openings and practice. You can change your level later.",
            )}
      </p>
      {error && (
        <p className="profile-form-error" role="alert">
          {error}
        </p>
      )}
      <div className="profile-create-actions">
        {onCancel && (
          <button
            className="secondary"
            type="button"
            disabled={saving}
            onClick={onCancel}
          >
            <ArrowLeft size={18} />
            {l("Назад", "Back")}
          </button>
        )}
        <button
          className="primary"
          type="submit"
          disabled={saving || !name.trim() || !nickname.trim()}
        >
          {saving
            ? l("Создаём профиль…", "Creating profile…")
            : l("Создать профиль и начать", "Create profile and start")}
          <ArrowRight size={18} />
        </button>
      </div>
    </form>
  );
}
