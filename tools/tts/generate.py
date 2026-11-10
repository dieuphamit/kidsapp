"""Sinh mp3 vi/ja từ app/src/content/*.json bằng edge-tts.

Chạy từ thư mục gốc dự án:
  uv run --python C:/Users/tdqua/AppData/Local/Programs/Python/Python312/python.exe --with edge-tts tools/tts/generate.py

Từ ngắn (いち, に, Một, Ba...): edge-tts đôi khi trả NoAudioReceived cho đúng một cặp
(câu, tốc độ) và lặp lại lỗi đó một lúc, nên trước đây agent phải bóp méo chữ (いちー, さあん)
cho qua. Đừng sửa chữ trong JSON nữa. Script tự xử lý:
  1. Từ ngắn đọc chậm hơn (SHORT_RATE) cho rõ và đủ dài để bé nghe.
  2. Nếu bị từ chối, thử lại với biến thể chỉ dùng khi tổng hợp: thêm dấu câu cuối
     (。 cho ja, . cho vi) và/hoặc lệch tốc độ 1-2% (tai không phân biệt được).
     Chữ hiển thị trong JSON giữ nguyên.
"""
import asyncio
import hashlib
import json
import pathlib
import re
import sys

import edge_tts

sys.stdout.reconfigure(encoding="utf-8")  # console Windows có thể là cp932

VOICES = {"vi": "vi-VN-HoaiMyNeural", "ja": "ja-JP-NanamiNeural"}
RATE = "-10%"  # chậm hơn một chút cho bé
SHORT_RATE = "-30%"  # từ rất ngắn (số đếm) đọc chậm hơn nữa
SHORT_LEN = 4  # số ký tự (bỏ dấu câu, khoảng trắng) để coi là từ ngắn
END_PUNCT = {"vi": ".", "ja": "。"}
ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
CONTENT = ROOT / "app" / "src" / "content"
OUT = ROOT / "app" / "public" / "audio"
HASHES = OUT / ".hashes.json"


def rate_for(text: str) -> str:
    core = re.sub(r"[\W_]", "", text)
    return SHORT_RATE if len(core) <= SHORT_LEN else RATE


def digest(text: str, voice: str, rate: str) -> str:
    return hashlib.sha1(f"{voice}|{rate}|{text}".encode("utf-8")).hexdigest()


def shift(rate: str, delta: int) -> str:
    return f"{int(rate.rstrip('%')) + delta:+d}%"


def variants(text: str, lang: str, rate: str):
    """Các cách gọi edge-tts cho cùng một câu, chỉ khác dấu câu cuối hoặc tốc độ ±1-2%."""
    bare = re.sub(r"[!！.。、,?？\s]+$", "", text)
    extra = (bare + END_PUNCT[lang], bare + ("！" if lang == "ja" else "!"))
    texts = [text] + [t for t in extra if t != text]
    for d in (0, -1, 1, -2, 2):
        for t in texts:
            yield t, shift(rate, d)


async def synth(text: str, lang: str, voice: str, rate: str, dest: pathlib.Path) -> str:
    last = None
    for round_ in range(3):
        for t, r in variants(text, lang, rate):
            try:
                await edge_tts.Communicate(t, voice, rate=r).save(str(dest))
                return "" if (t, r) == (text, rate) else f"(biến thể {t!r} {r})"
            except edge_tts.exceptions.NoAudioReceived as e:
                last = e
        await asyncio.sleep(5 * (round_ + 1))
    raise RuntimeError(f"edge-tts không trả âm thanh cho {text!r} ({lang}): {last}")


async def main() -> None:
    hashes = json.loads(HASHES.read_text(encoding="utf-8")) if HASHES.exists() else {}
    made = 0
    for f in sorted(CONTENT.glob("*.json")):
        for item in json.loads(f.read_text(encoding="utf-8")):
            for lang, voice in VOICES.items():
                text = item[lang]
                rate = rate_for(text)
                dest = OUT / lang / f"{item['key']}.mp3"
                h = digest(text, voice, rate)
                rel = f"{lang}/{item['key']}"
                if dest.exists() and hashes.get(rel) == h:
                    continue
                dest.parent.mkdir(parents=True, exist_ok=True)
                note = await synth(text, lang, voice, rate, dest)
                hashes[rel] = h
                made += 1
                print("made", rel, rate, note)
    HASHES.parent.mkdir(parents=True, exist_ok=True)
    HASHES.write_text(json.dumps(hashes, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")
    print(f"done: {made} file mới")


asyncio.run(main())
