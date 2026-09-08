// Страница записи озвучки.
//
// Что человек видит по сцене: картинку, которую увидит зритель, и её речь
// ТАКТАМИ — по одному логическому куску в строке. Записывается каждый такт
// отдельно: его длина становится длиной этого куска сцены, а перезапись
// одного такта не трогает соседние. После записи ориентир сменяется
// НАСТОЯЩЕЙ длительностью: именно её сборка и возьмёт.
import { StrictMode, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { styles } from "./styles.js";
import { micReason } from "../mic-reason.js";
import { pageWords, type PageWords } from "./words.js";

interface BeatCard {
  n: number;
  text: string;
  slot: string;
  recorded: boolean;
  duration: number | null;
  estimate: number;
}

interface SceneCard {
  id: string;
  kind: string;
  beats: BeatCard[];
  caption: string;
  done: number;
  duration: number | null;
  estimate: number;
}

/**
 * Длительность словами языка ролика. Прежде здесь стояла замена точки
 * на запятую и русское «с»: язык интерфейса был свойством инструмента,
 * а не работы.
 */
const secsIn = (lang: string, w: PageWords) => (n: number): string =>
  `${new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n)} ${w.sec}`;

function App(): JSX.Element {
  const [scenes, setScenes] = useState<SceneCard[]>([]);
  const [store, setStore] = useState("");
  const [at, setAt] = useState(0);
  // Пишется ВСЕГДА конкретный такт, и его слепок хранится здесь же:
  // признака «идёт запись» мало — по нему не видно, куда уйдёт звук.
  const [recording, setRecording] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [mic, setMic] = useState("");
  const [granted, setGranted] = useState(false);
  const [lang, setLang] = useState("en");
  // Собранная сцена: адрес готового файла и признак того, что сборка идёт.
  const [preview, setPreview] = useState("");
  const [building, setBuilding] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const w = pageWords(lang);
  const secs = secsIn(lang, w);

  const load = useCallback(async () => {
    const r = await fetch("/api/scenes");
    const data = (await r.json()) as { scenes: SceneCard[]; store: string; lang?: string };
    setScenes(data.scenes);
    setStore(data.store);
    // Язык приходит от РОЛИКА: страница подписана на том же языке,
    // на котором написан сценарий, который человек будет читать вслух.
    if (data.lang) {
      setLang(data.lang);
      document.documentElement.lang = data.lang;
    }
  }, []);

  // Названия устройств браузер отдаёт только после разрешения, поэтому
  // список перечитывается и при старте, и после первой записи, и когда
  // устройство подключают или отключают на ходу.
  const loadMics = useCallback(async () => {
    const all = await navigator.mediaDevices.enumerateDevices();
    setMics(all.filter((d) => d.kind === "audioinput"));
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Разрешение спрашивается отдельно и заранее, а не в момент записи:
  // иначе первая реплика уходит в никуда — человек уже говорит, а браузер
  // ещё показывает своё окно. Названия входов до разрешения тоже скрыты,
  // то есть выбирать микрофон вслепую.
  const grant = async (): Promise<void> => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setGranted(true);
      await loadMics();
    } catch (e) {
      setError(micReason(e, window.isSecureContext));
    }
  };

  useEffect(() => {
    // Разрешение переживает перезагрузку страницы, поэтому спрашивать
    // его во второй раз незачем — но и полагаться на этот опрос нельзя:
    // старые браузеры имени "microphone" не знают, и отказ здесь просто
    // оставляет кнопку на месте.
    void navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((st) => setGranted(st.state === "granted"))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void loadMics();
    navigator.mediaDevices.addEventListener("devicechange", loadMics);
    return () => navigator.mediaDevices.removeEventListener("devicechange", loadMics);
  }, [loadMics]);

  const scene = scenes[at];

  const start = async (slot: string): Promise<void> => {
    setError("");
    try {
      // Выбранный вход называется точно: без этого браузер берёт устройство
      // по умолчанию, а оно у человека сплошь и рядом не то, в которое он
      // говорит, — и слышно это только в готовом ролике.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: mic ? { deviceId: { exact: mic } } : true,
      });
      await loadMics();
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setBusy(true);
        // Адрес замкнут на такт, выбранный при нажатии: он взят
        // из аргумента, а не из состояния страницы, поэтому звук уходит
        // именно туда, куда человек его направил.
        const res = await fetch(`/api/recording/${slot}`, {
          method: "PUT",
          body: new Blob(chunks, { type: rec.mimeType }),
        });
        if (!res.ok) {
          const said = (await res.json()) as { error?: string };
          setError(said.error ?? w.serverRefused);
        }
        await load();
        setBusy(false);
      };
      recRef.current = rec;
      rec.start();
      setRecording(slot);
    } catch (e) {
      setError(micReason(e, window.isSecureContext));
    }
  };

  const stop = (): void => {
    recRef.current?.stop();
    recRef.current = null;
    setRecording(null);
  };

  const drop = async (slot: string): Promise<void> => {
    setError("");
    const res = await fetch(`/api/recording/${slot}`, { method: "DELETE" });
    // Отказ разбирается так же, как на выгрузке: иначе кнопка «не
    // работает» без причины, и человек не знает, что делать.
    if (!res.ok) {
      const said = (await res.json().catch(() => ({}))) as { error?: string };
      setError(said.error ?? w.deleteRefused);
    }
    await load();
  };

  /**
   * Собрать показанную сцену и посмотреть, что вышло. Ровно тот же путь,
   * что и у готового ролика: та же озвучка, то же расписание, то же ядро
   * рендера, — но одна сцена, поэтому это секунды, а не минуты.
   * Платного синтеза здесь не бывает: звук берётся из записей.
   */
  const build = async (id: string): Promise<void> => {
    setError("");
    setPreview("");
    setBuilding(true);
    try {
      const res = await fetch(`/api/preview/${id}`);
      if (!res.ok) {
        const said = (await res.json().catch(() => ({}))) as { error?: string };
        setError(said.error ?? w.buildRefused);
        return;
      }
      // Адрес объекта, а не адрес запроса: так проигрыватель показывает
      // именно то, что сейчас собрано, и не берёт прежнее из кэша браузера.
      setPreview(URL.createObjectURL(await res.blob()));
    } finally {
      setBuilding(false);
    }
  };

  // Сцена сменилась — прежний предпросмотр к ней не относится.
  useEffect(() => { setPreview(""); }, [at]);

  const beatsDone = scenes.reduce((n, s) => n + s.done, 0);
  const beatsAll = scenes.reduce((n, s) => n + s.beats.length, 0);

  return (
    <div className="wrap">
      <style>{styles}</style>
      <header>
        <h1>{w.title}</h1>
        <p className="sub">
          {w.recordedOf(beatsDone, beatsAll)}
          {store ? <> · {w.store} <code>{store}</code></> : null}
        </p>
      </header>

      {scenes.length === 0 ? <p className="sub">{w.noScenes}</p> : null}

      {scene ? (
        <main>
          {/* Пока идёт запись, сцену переключать нельзя: звук уйдёт
              в выбранный при нажатии такт, а человек смотрел бы
              на другую сцену и считал записанной её. */}
          <nav aria-label={w.scenes}>
            {scenes.map((s, i) => (
              <button
                key={s.id}
                className={`chip${i === at ? " here" : ""}${s.done === s.beats.length ? " done" : ""}`}
                onClick={() => { setAt(i); setError(""); }}
                disabled={recording !== null}
                aria-current={i === at ? "true" : undefined}
              >
                {s.id}
              </button>
            ))}
          </nav>

          <figure>
            <img src={`/api/picture/${scene.id}`} alt={`${w.scene} ${scene.id}`} />
            <figcaption>
              {w.scene} <b>{scene.id}</b> · {scene.kind} · {w.beats(scene.beats.length)}
            </figcaption>
          </figure>

          <p className="pace">
            {scene.duration !== null
              ? <>{w.allBeatsDone} <b>{secs(scene.duration)}</b> {w.thatIsSceneLength}</>
              : <>{w.recordedOf(scene.done, scene.beats.length)}; {w.soFarAbout} <b>{secs(scene.estimate)}</b></>}
          </p>

          <div className="row preview">
            <button
              className="build"
              onClick={() => void build(scene.id)}
              disabled={building || recording !== null || scene.done === 0}
            >
              {w.buildScene}
            </button>
            {building ? <span className="sub">{w.building}</span> : null}
            {scene.done === 0 ? <span className="sub">{w.recordFirst}</span> : null}
          </div>
          {preview ? <video className="preview-video" controls src={preview} /> : null}

          <div className="row mics">
            {granted ? null : (
              <button className="grant" onClick={() => void grant()}>
                {w.allowMic}
              </button>
            )}
            <label htmlFor="mic">{w.mic}</label>
            <select id="mic" value={mic} onChange={(e) => setMic(e.target.value)} disabled={recording !== null}>
              <option value="">{w.micDefault}</option>
              {mics.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `${w.input} ${i + 1}`}
                </option>
              ))}
            </select>
          </div>

          <ol className="beats">
            {scene.beats.map((b) => (
              <li key={b.slot} className={`beat${b.recorded ? " done" : ""}${recording === b.slot ? " live" : ""}`}>
                <blockquote>{b.text}</blockquote>
                <p className="pace">
                  {b.recorded && b.duration !== null
                    ? <>{w.recorded} <b>{secs(b.duration)}</b></>
                    : <>{w.about} <b>{secs(b.estimate)}</b>; {w.realLengthFromTake}</>}
                </p>
                <div className="row">
                  {recording === b.slot
                    ? <button className="stop" onClick={stop}>{w.stop}</button>
                    : <button
                        className="rec"
                        onClick={() => void start(b.slot)}
                        disabled={busy || recording !== null}
                      >
                        {b.recorded ? w.again : w.rec}
                      </button>}
                  {b.recorded && recording !== b.slot
                    ? <>
                        <audio controls src={`/api/recording/${b.slot}?t=${b.duration ?? 0}`} />
                        <button className="drop" onClick={() => void drop(b.slot)}>{w.drop}</button>
                      </>
                    : null}
                </div>
              </li>
            ))}
          </ol>

          {busy ? <p className="sub">{w.saving}</p> : null}
          {error ? <p className="error" role="alert">{error}</p> : null}

          <div className="row nav">
            <button
              onClick={() => { setAt(Math.max(0, at - 1)); setError(""); }}
              disabled={at === 0 || recording !== null}
            >
              {w.prev}
            </button>
            <button
              onClick={() => { setAt(Math.min(scenes.length - 1, at + 1)); setError(""); }}
              disabled={at === scenes.length - 1 || recording !== null}
            >
              {w.next}
            </button>
          </div>
        </main>
      ) : null}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
