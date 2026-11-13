"""Sinh mp3 vi/ja/en từ app/src/content/*.json bằng edge-tts.

Chạy từ thư mục gốc dự án:
  uv run --python C:/Users/tdqua/AppData/Local/Programs/Python/Python312/python.exe --with edge-tts tools/tts/generate.py

Từ ngắn (いち, に, Một, Ba...): edge-tts đôi khi trả NoAudioReceived cho đúng một cặp
(câu, tốc độ) và lặp lại lỗi đó một lúc, nên trước đây agent phải bóp méo chữ (いちー, さあん)
cho qua. Đừng sửa chữ trong JSON nữa. Script tự xử lý:
  1. Từ ngắn đọc chậm hơn (SHORT_RATE) cho rõ và đủ dài để bé nghe.
  2. Nếu bị từ chối, thử lại với biến thể chỉ dùng khi tổng hợp: thêm dấu câu cuối
     (。 cho ja, . cho vi/en) và/hoặc lệch tốc độ 1-2% (tai không phân biệt được).
     Chữ hiển thị trong JSON giữ nguyên.

Tên bạn đồng hành: câu có mẫu {name} được sinh cho MỌI tên trong app/src/core/buddyNames.json.
Tên mặc định (phần tử đầu, "dau") giữ đường dẫn cũ <lang>/<key>.mp3 (được precache);
tên khác ở <lang>/<key>~<nameId>.mp3 (app chỉ tải khi bố mẹ chọn tên đó, xem src/core/buddyAudio.ts).
"""
import asyncio
import hashlib
import json
import pathlib
import re
import sys

import aiohttp
import edge_tts

sys.stdout.reconfigure(encoding="utf-8")  # console Windows có thể là cp932

VOICES = {"vi": "vi-VN-HoaiMyNeural", "ja": "ja-JP-NanamiNeural", "en": "en-US-AnaNeural"}
RATE = "-10%"  # chậm hơn một chút cho bé
SHORT_RATE = "-30%"  # từ rất ngắn (số đếm) đọc chậm hơn nữa
SHORT_LEN = 4  # số ký tự (bỏ dấu câu, khoảng trắng) để coi là từ ngắn
END_PUNCT = {"vi": ".", "ja": "。", "en": "."}
ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
CONTENT = ROOT / "app" / "src" / "content"
OUT = ROOT / "app" / "public" / "audio"
HASHES = OUT / ".hashes.json"
NAMES = json.loads((ROOT / "app" / "src" / "core" / "buddyNames.json").read_text(encoding="utf-8"))
NAME_TOKEN = "{name}"


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
            except aiohttp.ClientError as e:
                # dịch vụ thỉnh thoảng trả 503 khi gọi dồn: nghỉ rồi thử lại đúng câu đó
                last = e
                await asyncio.sleep(10)
        await asyncio.sleep(5 * (round_ + 1))
    raise RuntimeError(f"edge-tts không trả âm thanh cho {text!r} ({lang}): {last}")


def expand(item: dict):
    """(tên file không đuôi, câu theo ngôn ngữ) của một item; câu có {name} nhân theo mọi tên."""
    if not any(NAME_TOKEN in item[lang] for lang in VOICES):
        yield item["key"], item
        return
    for i, name in enumerate(NAMES):
        stem = item["key"] if i == 0 else f"{item['key']}~{name['id']}"
        yield stem, {lang: item[lang].replace(NAME_TOKEN, name[lang]) for lang in VOICES}


def save_hashes(hashes: dict) -> None:
    HASHES.parent.mkdir(parents=True, exist_ok=True)
    HASHES.write_text(json.dumps(hashes, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")


async def main() -> None:
    hashes = json.loads(HASHES.read_text(encoding="utf-8")) if HASHES.exists() else {}
    made = 0
    for f in sorted(CONTENT.glob("*.json")):
        for raw in json.loads(f.read_text(encoding="utf-8")):
            for stem, item in expand(raw):
                for lang, voice in VOICES.items():
                    text = item[lang]
                    rate = rate_for(text)
                    dest = OUT / lang / f"{stem}.mp3"
                    h = digest(text, voice, rate)
                    rel = f"{lang}/{stem}"
                    if dest.exists() and hashes.get(rel) == h:
                        continue
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    note = await synth(text, lang, voice, rate, dest)
                    hashes[rel] = h
                    made += 1
                    print("made", rel, rate, note)
                    save_hashes(hashes)  # lưu từng file để lỗi giữa chừng không phải sinh lại từ đầu
    save_hashes(hashes)
    print(f"done: {made} file mới")


asyncio.run(main())
