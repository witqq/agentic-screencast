#!/usr/bin/env python3
"""Silero как ВНЕШНЯЯ реализация договора о движке голоса.

Это не часть инструмента. Инструмент вызывает движок как обычную
программу и о её устройстве ничего не знает; здесь показано, что
договор исполним вне узла и без чтения исходников инструмента.

Почему Silero остался снаружи: он держится за torch, а torch тянет
окружение примерно на шестьсот мегабайт. Платить их должен только тот,
кому нужен локальный бесплатный синтез.

Подкоманды договора:

  voice.py voices
  voice.py synth --voice-json '{"name":"baya"}' --text "…" --out a.wav
  voice.py probe --voice-json '{"name":"baya"}' --text "…"
  voice.py paths

Ответ — JSON в стандартный вывод и ничего кроме него. Отказ — ненулевой
код возврата и причина словами в поток ошибок. Звук — WAV 48 кГц моно:
из его длины инструмент выводит длительность сцены.

Как подключить:

  agentic-screencast build --source story.md --voice-json \\
    '{"engine":"external/.venv/bin/python external/silero/voice.py","name":"baya","rules":"silero"}'

Поле "rules" обязательно: правила чтения выбираются по имени, названному
данными голоса, а у внешней реализации имя движка — путь к программе.
Без него латиница будет проглочена молча.

Имя движка может нести и то, чем его запускать, — тогда файлу не нужно
право на исполнение.

Установка окружения описана в external/README.md; оно общее со шлюзом
разборчивости.
"""
import argparse, json, os, sys, wave

SAMPLE_RATE = 48000
VOICES = ["aidar", "baya", "kseniya", "eugene", "xenia"]

# Модель Silero v5 (145 МБ). Путь задаётся переменной окружения; умолчание —
# рядом с этим файлом, чтобы движок не лез в чужие каталоги.
MODEL = os.environ.get("SILERO_MODEL") or os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "v5_ru.pt")

_model = None


def ffmpeg_path():
    """ffmpeg берётся из окружения либо из PATH: у внешнего движка нет
    доступа к зависимостям инструмента, и полагаться на них он не вправе."""
    return os.environ.get("FFMPEG", "ffmpeg")


def load():
    global _model
    if _model is None:
        if not os.path.exists(MODEL):
            raise SystemExit(f"нет файла модели: {MODEL} (задаётся SILERO_MODEL)")
        import torch
        _model = torch.package.PackageImporter(MODEL).load_pickle("tts_models", "model")
        _model.to(torch.device("cpu"))
    return _model


def synth(text, voice, out):
    name = voice.get("name") or "baya"
    if name not in VOICES:
        raise SystemExit(f"движок silero не знает голоса {name}")
    m = load()
    audio = m.apply_tts(text=text, speaker=name, sample_rate=SAMPLE_RATE,
                        put_accent=True, put_yo=True)
    import scipy.io.wavfile as wav
    wav.write(out, SAMPLE_RATE, (audio.numpy() * 32767).astype("int16"))
    return name


def duration(path):
    with wave.open(path) as w:
        return round(w.getnframes() / w.getframerate(), 3)


def main():
    ap = argparse.ArgumentParser(add_help=False)
    ap.add_argument("cmd", choices=["voices", "synth", "probe", "paths"])
    ap.add_argument("--voice-json", default="{}")
    ap.add_argument("--text", default="")
    ap.add_argument("--out", default="")
    a = ap.parse_args()
    voice = json.loads(a.voice_json) if a.voice_json else {}

    if a.cmd == "voices":
        print(json.dumps(VOICES, ensure_ascii=False))
        return

    if a.cmd == "paths":
        print(json.dumps({"model": MODEL, "ffmpeg": ffmpeg_path()}, ensure_ascii=False))
        return

    if a.cmd == "probe":
        # Синтез детерминирован: те же текст и данные голоса дают тот же
        # звук, поэтому отпечатка нет. Пустая строка — это и значит
        # «звук зависит только от текста и данных голоса».
        print(json.dumps({"fingerprint": ""}, ensure_ascii=False))
        return

    if not a.text or not a.out:
        raise SystemExit("synth требует --text и --out")
    name = synth(a.text, voice, a.out)
    print(json.dumps({"file": a.out, "duration": duration(a.out),
                      "engine": "silero", "voice": name}, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:                      # наружу идёт причина, а не трасса
        print(str(e), file=sys.stderr)
        sys.exit(1)
