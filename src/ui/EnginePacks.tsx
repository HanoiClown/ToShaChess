import { useEffect, useState } from "react";
import { Download, Check, X, Trash2, HardDrive } from "lucide-react";
import type { PackId, PackState } from "../shared/packs";
import type { Locale } from "../shared/contracts";
import "./engine-packs.css";
export function useEnginePacks() {
  const [packs, setPacks] = useState<PackState[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const refresh = () =>
      void window.chessApp
        .packs()
        .then((result) => {
          if (alive) setPacks(result);
        })
        .catch((e) => {
          if (alive) setError(String(e.message));
        });
    refresh();
    const unsubscribe = window.chessApp.onPacks(refresh);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);
  return { packs, error };
}
export function EnginePacks({ locale }: { locale: Locale }) {
  const ru = locale === "ru",
    { packs, error } = useEnginePacks();
  const [notice, setNotice] = useState(""),
    [confirm, setConfirm] = useState<PackId | null>(null);
  const busy = packs.some((p) => p.status === "installing");
  const labels = {
    missing: ru ? "Не установлен" : "Not installed",
    installing: ru ? "Установка…" : "Installing…",
    ready: ru ? "Готов · офлайн" : "Ready · offline",
    error: ru ? "Ошибка установки" : "Installation failed",
    cancelled: ru ? "Загрузка приостановлена" : "Download paused",
  };
  const mb = (bytes: number) =>
    `${Math.ceil(bytes / 1048576)} ${ru ? "МБ" : "MB"}`;
  const act = (task: Promise<unknown>) => {
    setNotice("");
    void task.catch((e) =>
      setNotice(String(e.message).replace(/^Error invoking[^:]+: Error: /, "")),
    );
  };
  return (
    <section className="settings-section engine-packs">
      <div className="section-title">
        <HardDrive size={24} />
        <h2>{ru ? "Движки и модели" : "Engines & models"}</h2>
      </div>
      <p>
        {ru
          ? "Stockfish уже установлен. Maia добавляет вероятные человеческие ответы. Все вычисления выполняются на этом ПК без API-ключа."
          : "Stockfish is included. Maia adds likely human replies. Both run on this computer without an API key."}
      </p>
      {(error || notice) && (
        <p role="alert" className="warning-text">
          {ru
            ? "Не удалось завершить действие. Можно повторить: "
            : "Could not finish. You can retry: "}
          {error || notice}
        </p>
      )}
      {!packs.length && !error && (
        <p role="status">
          {ru ? "Проверяем установленные пакеты…" : "Checking installed packs…"}
        </p>
      )}
      <div className="pack-list">
        {packs.map((pack) => (
          <article className="pack-row" key={pack.id}>
            <div className="pack-heading">
              <h3>{pack.title}</h3>
              <span
                className={pack.status === "ready" ? "success-text" : "muted"}
              >
                {labels[pack.status]}
              </span>
            </div>
            <p>{pack.description[locale]}</p>
            <p className="field-help">
              {ru ? "Загрузка" : "Download"}: {mb(pack.downloadBytes)} ·{" "}
              {ru ? "На диске" : "On disk"}:{" "}
              {pack.installedBytes
                ? mb(pack.installedBytes)
                : pack.id === "maia-cpu"
                  ? `≈730 ${ru ? "МБ" : "MB"}`
                  : mb(pack.downloadBytes)}
            </p>
            {pack.status === "installing" && (
              <>
                <progress
                  aria-label={ru ? "Загрузка пакета" : "Pack download"}
                  value={Math.min(pack.bytes, pack.downloadBytes)}
                  max={pack.downloadBytes}
                />
                <p className="field-help" role="status">
                  {pack.message === "download"
                    ? `${mb(pack.bytes)} / ${mb(pack.downloadBytes)}`
                    : ru
                      ? "Распаковка и проверка файлов…"
                      : "Unpacking and verifying files…"}
                </p>
              </>
            )}
            {pack.status === "error" && (
              <p className="warning-text">{pack.message}</p>
            )}
            <div className="pack-actions">
              {pack.status === "installing" ? (
                <button
                  className="secondary"
                  onClick={() => act(window.chessApp.cancelPack(pack.id))}
                >
                  <X size={16} />
                  {ru ? "Отменить" : "Cancel"}
                </button>
              ) : pack.status === "ready" ? (
                <>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => act(window.chessApp.verifyPack(pack.id))}
                  >
                    <Check size={16} />
                    {ru ? "Проверить" : "Verify"}
                  </button>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => setConfirm(pack.id)}
                  >
                    <Trash2 size={16} />
                    {ru ? "Удалить пакет" : "Remove pack"}
                  </button>
                </>
              ) : (
                <button
                  className="secondary"
                  disabled={
                    busy ||
                    (!!pack.requires &&
                      packs.find((p) => p.id === pack.requires)?.status !==
                        "ready")
                  }
                  onClick={() => act(window.chessApp.installPack(pack.id))}
                >
                  <Download size={16} />
                  {ru ? "Установить / продолжить" : "Install / resume"}
                </button>
              )}
              <a href={pack.source} target="_blank" rel="noreferrer">
                {ru ? "Исходный код и лицензия" : "Source & license"}
              </a>
            </div>
            {pack.requires &&
              packs.find((p) => p.id === pack.requires)?.status !== "ready" && (
                <p className="field-help">
                  {ru
                    ? "Сначала установи пакет Maia-3 5M с runtime."
                    : "Install the Maia-3 5M runtime pack first."}
                </p>
              )}
            {confirm === pack.id && (
              <div
                className="pack-confirm"
                role="group"
                aria-label={ru ? "Удаление пакета" : "Remove pack"}
              >
                <p>
                  {ru
                    ? "Удалить файлы пакета? Для Maia-3 5M также удалятся зависимые модели. Партии и прогресс сохранятся."
                    : "Remove these pack files? Removing Maia-3 5M also removes dependent models. Your games and progress are preserved."}
                </p>
                <button
                  className="secondary"
                  onClick={() => {
                    act(window.chessApp.removePack(pack.id));
                    setConfirm(null);
                  }}
                >
                  {ru ? "Удалить" : "Remove"}
                </button>
                <button
                  className="text-button"
                  onClick={() => setConfirm(null)}
                >
                  {ru ? "Оставить" : "Keep"}
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      <p className="field-help">
        {ru
          ? "5M — стартовая модель для CPU. 23M и 79M требуют больше памяти и времени; больший размер не означает более высокий игровой рейтинг. Пакет хранится рядом с приложением в engine-packs. Временный кэш загрузок занимает дополнительное место."
          : "5M is the starting CPU model. 23M and 79M use more memory and time; size does not mean a higher playing rating. Packs live beside the app in engine-packs. The download cache uses additional disk space."}
      </p>
    </section>
  );
}
