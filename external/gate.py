#!/usr/bin/env python3
"""Шлюз пригодности синтеза: обратная расшифровка и сравнение с исходником.

ВАЖНО, что этот шлюз НЕ делает: он не измеряет качество голоса. Измерено,
что два диктора Silero и забракованный системный голос дают одинаковое
совпадение. Шлюз отсекает только сломанный синтез (чужой язык, каша).
Выбор голоса на слух остаётся человеку.

Запуск: gate.py --ref "исходный текст" файл.wav [файл.wav …]
"""
import argparse, difflib, json, os, re, sys
import shutil
from pathlib import Path


def ensure_ffmpeg():
    """whisper зовёт ffmpeg как внешнюю команду.

    Берём его из окружения либо из PATH — как всякая ВНЕШНЯЯ реализация:
    доступа к зависимостям инструмента у неё нет и быть не должно.
    Прежний вариант отсчитывал путь от собственного каталога и после
    переезда в external/ указывал в несуществующее место, а шлюз падал
    с советом сделать то, что уже сделано."""
    ff = os.environ.get("FFMPEG")
    if ff and Path(ff).exists():
        os.environ["PATH"] = str(Path(ff).parent) + os.pathsep + os.environ.get("PATH", "")
        return ff
    found = shutil.which("ffmpeg")
    if found:
        return found
    raise SystemExit("не найден ffmpeg: поставьте его в PATH или задайте FFMPEG")


def norm(s: str):
    s = s.lower().replace("ё", "е")
    return re.sub(r"[^а-яa-z0-9 ]", " ", s).split()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ref", required=True)
    ap.add_argument("--model", default="base")
    ap.add_argument("files", nargs="+")
    a = ap.parse_args()

    # Отказ приходит из самой ensure_ffmpeg причиной, а не проверкой
    # результата здесь: два ответа на один вопрос в одном файле
    # расходятся молча, и один из них однажды становится ложью.
    ensure_ffmpeg()
    import whisper
    m = whisper.load_model(a.model)
    ref = norm(a.ref)
    out = {}
    for f in a.files:
        text = m.transcribe(f, language="ru", fp16=False)["text"].strip()
        ratio = difflib.SequenceMatcher(None, ref, norm(text)).ratio()
        out[f] = {"ratio": round(ratio, 3), "heard": text[:110]}
        print(f"{f}: {out[f]['ratio']}", file=sys.stderr)
    print(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
