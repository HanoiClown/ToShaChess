import { useEffect, useRef, useState } from "react";
import {
  Settings,
  KeyRound,
  Download,
  Upload,
  Save,
  HardDrive,
  ShieldCheck,
  UserRound,
  Volume2,
} from "lucide-react";
import { useApp } from "../ui/context";
import type { Database, SkillLevel } from "../shared/contracts";
import { playSound, previewSoundSettings } from "../audio/sounds";
import { saveSettingsPatch } from "../audio/settings";
import "./settings-audio.css";
export function SettingsScreen() {
  const { snapshot, profile, locale, l, refresh, fail } = useApp();
  const [name, setName] = useState(profile.name),
    [nickname, setNickname] = useState(profile.nickname ?? ""),
    [skillLevel, setSkillLevel] = useState<SkillLevel>(
      profile.skillLevel ?? profile.level,
    ),
    [rating, setRating] = useState(
      profile.rating === undefined ? "" : String(profile.rating),
    ),
    [key, setKey] = useState(""),
    [status, setStatus] = useState(""),
    [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(snapshot.database.settings);
  const settingsRef = useRef(settings),
    pendingWrites = useRef(0),
    volumeDirty = useRef(false),
    volumeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    lastPreview = useRef(0);
  function savePreference(patch: Partial<Database["settings"]>) {
    pendingWrites.current++;
    void saveSettingsPatch(patch)
      .then(refresh)
      .catch(fail)
      .finally(() => {
        pendingWrites.current--;
      });
  }
  function changePreference(patch: Partial<Database["settings"]>) {
    settingsRef.current = { ...settingsRef.current, ...patch };
    setSettings(settingsRef.current);
    previewSoundSettings(settingsRef.current);
    savePreference(patch);
  }
  function commitVolume() {
    clearTimeout(volumeTimer.current);
    if (!volumeDirty.current) return;
    volumeDirty.current = false;
    savePreference({ volume: settingsRef.current.volume });
  }
  const commitVolumeRef = useRef(commitVolume);
  commitVolumeRef.current = commitVolume;
  useEffect(() => {
    if (!pendingWrites.current && !volumeDirty.current) {
      settingsRef.current = snapshot.database.settings;
      setSettings(snapshot.database.settings);
      previewSoundSettings(snapshot.database.settings);
    }
  }, [snapshot.database.settings]);
  useEffect(() => {
    previewSoundSettings(settingsRef.current);
    return () => {
      commitVolumeRef.current();
      previewSoundSettings();
    };
  }, []);
  const now = new Date(),
    month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    usage = snapshot.database.usage.filter((x) => x.month === month),
    spent = usage.reduce((s, x) => s + (x.actual ?? 0), 0),
    reserved = usage
      .filter((x) => x.actual === null)
      .reduce((s, x) => s + x.reserved, 0),
    total = spent + reserved;
  async function keySave() {
    setSaving(true);
    try {
      await window.chessApp.saveKey(key);
      setKey("");
      await refresh();
      setStatus(
        l(
          "Ключ сохранён в защищённом хранилище Windows.",
          "Key saved using Windows secure storage.",
        ),
      );
    } catch (e) {
      fail(e);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{l("Твоя игра, твои настройки", "Make yourself at home")}</h1>
          <p>
            {l(
              "Настрой профиль, тренера и перенос на другой компьютер.",
              "Manage your profile, coach and transfer to another computer.",
            )}
          </p>
        </div>
        <Settings size={30} />
      </div>
      <div className="settings-layout">
        <section className="settings-section">
          <div className="section-title">
            <UserRound size={24} />
            <h2>{l("Профиль", "Profile")}</h2>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void window.chessApp
                .updateProfile({
                  ...profile,
                  name: name.trim(),
                  nickname: nickname.trim() || undefined,
                  skillLevel,
                  rating: rating === "" ? undefined : Number(rating),
                })
                .then(refresh)
                .then(() => setStatus(l("Профиль сохранён.", "Profile saved.")))
                .catch(fail);
            }}
          >
            <label>
              {l("Имя", "Name")}
              <input
                value={name}
                required
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              {l("Никнейм", "Nickname")}
              <input
                value={nickname}
                minLength={2}
                maxLength={24}
                autoComplete="nickname"
                onChange={(event) => setNickname(event.target.value)}
              />
            </label>
            <label>
              {l("Уровень игры", "Chess experience")}
              <select
                value={skillLevel}
                onChange={(event) =>
                  setSkillLevel(event.target.value as SkillLevel)
                }
              >
                <option value="new">
                  {l(
                    "С нуля — изучаю правила",
                    "From zero — learning the rules",
                  )}
                </option>
                <option value="beginner">
                  {l(
                    "Начинающий — знаю основы",
                    "Beginner — I know the basics",
                  )}
                </option>
                <option value="intermediate">
                  {l(
                    "Средний — регулярно играю",
                    "Intermediate — I play regularly",
                  )}
                </option>
                <option value="advanced">
                  {l(
                    "Продвинутый — играю уверенно",
                    "Advanced — confident player",
                  )}
                </option>
              </select>
            </label>
            <label>
              {l("Мой рейтинг · необязательно", "My rating · optional")}
              <input
                type="number"
                min={0}
                max={3000}
                step={1}
                value={rating}
                onChange={(event) => setRating(event.target.value)}
              />
            </label>
            <p className="field-help">
              {l(
                "Укажи свой рейтинг, если знаешь. 0 — рейтинга пока нет.",
                "Enter your rating if you know it. 0 means no rating yet.",
              )}
            </p>
            <button className="secondary" type="submit" disabled={!name.trim()}>
              <Save size={17} />
              {l("Сохранить профиль", "Save profile")}
            </button>
          </form>
          <fieldset className="theme-picker">
            <legend>{l("Тема приложения", "App theme")}</legend>
            {(
              [
                ["green", "Зелёная", "Green"],
                ["purple", "Тёмно-фиолетовая", "Dark purple"],
                ["blue", "Тёмно-синяя", "Dark blue"],
                ["red", "Тёмно-красная", "Dark red"],
              ] as const
            ).map(([id, ru, en]) => (
              <button
                key={id}
                className={`theme-choice theme-${id}`}
                aria-pressed={(profile.theme ?? "green") === id}
                onClick={() =>
                  void window.chessApp
                    .updateProfile({ ...profile, theme: id })
                    .then(refresh)
                    .catch(fail)
                }
              >
                <span aria-hidden="true" className="theme-swatch" />
                {l(ru, en)}
              </button>
            ))}
          </fieldset>
          <label>
            {l("Начальный маршрут", "Starting path")}
            <select
              value={profile.level}
              onChange={(e) =>
                void window.chessApp
                  .updateProfile({
                    ...profile,
                    level: e.target.value as "new" | "beginner",
                  })
                  .then(refresh)
                  .catch(fail)
              }
            >
              <option value="new">
                {l("С нуля — правила и фигуры", "From zero — rules and pieces")}
              </option>
              <option value="beginner">
                {l(
                  "Знаю основы — тактика и дебюты",
                  "I know the basics — tactics and openings",
                )}
              </option>
            </select>
          </label>
          <p className="field-help">
            {l(
              "Изменение маршрута не удаляет прогресс. Язык переключается в правом верхнем углу.",
              "Changing your path does not erase progress. Switch languages in the top-right corner.",
            )}
          </p>
        </section>
        <section className="settings-section">
          <div className="section-title">
            <ShieldCheck size={24} />
            <h2>Stockfish 19</h2>
          </div>
          <label>
            {l("Подробность локального анализа", "Local analysis detail")}
            <select
              value={settings.engineMs}
              onChange={(e) => changePreference({ engineMs: +e.target.value })}
            >
              <option value={100}>
                {l("Быстро — первый обзор", "Fast — first overview")}
              </option>
              <option value={300}>{l("Сбалансированно", "Balanced")}</option>
              <option value={800}>
                {l(
                  "Тщательно — больше времени на ход",
                  "Thorough — more time per move",
                )}
              </option>
              <option value={1500}>
                {l(
                  "Глубоко — для сложных позиций",
                  "Deep — for complex positions",
                )}
              </option>
            </select>
          </label>
          <p>
            {l(
              "Работает локально и бесплатно, без API-ключа. Позиции с крупными ошибками проверяются повторно.",
              "Runs locally for free, without an API key. Major mistakes are checked again at greater depth.",
            )}
          </p>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.sound}
              onChange={(e) => changePreference({ sound: e.target.checked })}
            />
            {l("Звуки игры", "Game sounds")}
          </label>
          <div className="sound-settings">
            <div className="volume-heading">
              <label htmlFor="game-volume">{l("Громкость", "Volume")}</label>
              <output htmlFor="game-volume">{settings.volume}%</output>
            </div>
            <input
              id="game-volume"
              className="volume-slider"
              type="range"
              min={0}
              max={100}
              step={1}
              value={settings.volume}
              aria-valuetext={`${settings.volume}%`}
              onChange={(event) => {
                settingsRef.current = {
                  ...settingsRef.current,
                  volume: Number(event.target.value),
                };
                setSettings(settingsRef.current);
                previewSoundSettings(settingsRef.current);
                volumeDirty.current = true;
                clearTimeout(volumeTimer.current);
                volumeTimer.current = setTimeout(
                  () => commitVolumeRef.current(),
                  250,
                );
                if (Date.now() - lastPreview.current >= 100) {
                  lastPreview.current = Date.now();
                  playSound("move");
                }
              }}
              onPointerUp={commitVolume}
              onPointerCancel={commitVolume}
              onKeyUp={commitVolume}
              onBlur={commitVolume}
            />
            <button
              type="button"
              className="secondary sound-preview"
              disabled={!settings.sound || settings.volume === 0}
              onClick={() => playSound("move")}
            >
              <Volume2 size={17} />
              {l("Проверить звук", "Preview sound")}
            </button>
            <p className="field-help">
              {l(
                "Ходы, взятия и сигналы тренировок. 0% — без звука. Настройка общая для всех профилей.",
                "Moves, captures and training cues. 0% is silent. This setting is shared by all profiles.",
              )}
            </p>
          </div>
        </section>
        <section className="settings-section coach-settings">
          <div className="section-title">
            <KeyRound size={24} />
            <h2>{l("Разговорный тренер", "Conversational coach")}</h2>
            <span
              className={`connection-badge ${snapshot.hasKey ? "connected" : ""}`}
            >
              {snapshot.hasKey
                ? l("Ключ добавлен", "Key added")
                : l("Локальный режим", "Local mode")}
            </span>
          </div>
          <p>
            {l(
              "Stockfish считает варианты. OpenAI объясняет их словами. После партии объяснения создаются автоматически, пока доступен бюджет.",
              "Stockfish calculates. OpenAI explains. Explanations are generated automatically after a game while the budget allows.",
            )}
          </p>
          <label>
            {l("API-ключ OpenAI", "OpenAI API key")}
            <div className="input-action">
              <input
                type="password"
                autoComplete="off"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="sk-…"
                aria-label="API key"
              />
              <button
                className="secondary"
                disabled={!key.trim() || saving}
                onClick={() => void keySave()}
              >
                {l("Сохранить ключ", "Save key")}
              </button>
            </div>
          </label>
          {snapshot.hasKey && (
            <button
              className="text-button"
              onClick={() =>
                void window.chessApp.saveKey("").then(refresh).catch(fail)
              }
            >
              {l("Удалить ключ с этого ПК", "Remove key from this PC")}
            </button>
          )}
          {snapshot.keyIssue && (
            <p className="warning-text">
              {l(
                "Сохранённый ключ нельзя расшифровать на этом ПК. Введи его заново.",
                "The saved key cannot be decrypted on this PC. Enter it again.",
              )}
            </p>
          )}
          <div className="budget-heading">
            <strong>
              {l("Общий месячный бюджет", "Shared monthly budget")}
            </strong>
            <span>
              ${(total / 1000000).toFixed(3)} / $
              {(settings.budget / 1000000).toFixed(2)}
            </span>
          </div>
          <div className="progress-track">
            <span
              style={{
                width: `${Math.min(100, settings.budget ? (total / settings.budget) * 100 : 0)}%`,
              }}
            />
          </div>
          <p className="field-help">
            {l(
              `Из них в резерве: $${(reserved / 1000000).toFixed(3)}. Общий лимит для всех профилей, не баланс аккаунта OpenAI.`,
              `Reserved: $${(reserved / 1000000).toFixed(3)}. Shared across profiles; this is not your OpenAI account balance.`,
            )}
          </p>
          <label>
            {l("Лимит в месяц, USD (до $5)", "Monthly limit, USD (up to $5)")}
            <select
              value={settings.budget}
              onChange={(e) => changePreference({ budget: +e.target.value })}
            >
              {[0, 1000000, 2000000, 3000000, 5000000].map((v) => (
                <option key={v} value={v}>
                  {v === 0
                    ? l("Только бесплатный режим", "Free mode only")
                    : `$${v / 1000000}`}
                </option>
              ))}
            </select>
          </label>
          <small className="muted">
            {l(
              "GPT-4.1 mini · учёт по тарифу $0.40 / $1.60 за миллион входных / выходных токенов, проверен 25.09.2026. Расходы других приложений не учитываются.",
              "GPT-4.1 mini · $0.40 / $1.60 per million input / output tokens, checked 2026-09-25. Other apps’ spending is not included.",
            )}
          </small>
        </section>
        <section className="settings-section transfer-settings">
          <div className="section-title">
            <HardDrive size={24} />
            <h2>{l("Переезд на другой ПК", "Move to another PC")}</h2>
          </div>
          <p>
            {l(
              "Скопируй всю папку ToShaChess, включая data, на основной ПК и запусти ToShaChess.exe. Для объединения с другой копией используй резервную копию ниже.",
              "Copy the entire ToShaChess folder, including data, to your desktop PC and run ToShaChess.exe. To merge with another copy, use a backup below.",
            )}
          </p>
          <ol>
            <li>
              {l(
                "Закрой приложение перед копированием папки.",
                "Close the app before copying its folder.",
              )}
            </li>
            <li>
              {l(
                "Все профили, партии и занятия находятся в data.",
                "All profiles, games and learning progress are in data.",
              )}
            </li>
            <li>
              {l(
                "API-ключ на новом ПК вводится заново.",
                "Re-enter your API key on the new PC.",
              )}
            </li>
          </ol>
          <div className="transfer-actions">
            <button
              className="secondary"
              onClick={() =>
                void window.chessApp
                  .exportBackup()
                  .then((ok) => {
                    if (ok)
                      setStatus(
                        l(
                          "Резервная копия сохранена без API-ключа.",
                          "Backup saved without the API key.",
                        ),
                      );
                  })
                  .catch(fail)
              }
            >
              <Download size={18} />
              {l("Экспорт всех профилей", "Export all profiles")}
            </button>
            <button
              className="secondary"
              onClick={() =>
                void window.chessApp
                  .importBackup()
                  .then(async (result) => {
                    if (result) {
                      await refresh();
                      setStatus(
                        l(
                          "Данные объединены. Предыдущая версия сохранена в .bak.",
                          "Data merged. The previous version is saved in .bak.",
                        ),
                      );
                    }
                  })
                  .catch(fail)
              }
            >
              <Upload size={18} />
              {l("Импорт копии", "Import backup")}
            </button>
          </div>
          <p className="field-help">
            {l(
              "Две копии на разных ПК не синхронизируются автоматически. Для единого бюджета переноси актуальную data и используй одну копию.",
              "Two copies on different PCs do not sync automatically. Transfer the latest data and use one copy to keep a single budget.",
            )}
          </p>
          <details>
            <summary>{l("Где находятся данные?", "Where is my data?")}</summary>
            <code className="data-path">{snapshot.dataPath}</code>
          </details>
        </section>
      </div>
      {status && (
        <div className="notice good-text" role="status">
          {status}
          <button className="text-button" onClick={() => setStatus("")}>
            {l("Закрыть", "Close")}
          </button>
        </div>
      )}
    </>
  );
}
