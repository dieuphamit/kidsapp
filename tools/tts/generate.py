"""Sinh mp3 vi/ja từ app/src/content/*.json bằng edge-tts.

Chạy từ thư mục gốc dự án:
  uv run --python C:/Users/tdqua/AppData/Local/Programs/Python/Python312/python.exe --with edge-tts tools/tts/generate.py
"""
import asyncio
import hashlib
import json
import pathlib
import sys

import edge_tts

sys.stdout.reconfigure(encoding="utf-8")  # console Windows có thể là cp932

VOICES = {"vi": "vi-VN-HoaiMyNeural", "ja": "ja-JP-NanamiNeural"}
RATE = "-10%"  # chậm hơn một chút cho bé
ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
CONTENT = ROOT / "app" / "src" / "content"
OUT = ROOT / "app" / "public" / "audio"
HASHES = OUT / ".hashes.json"


def digest(text: str, voice: str) -> str:
    return hashlib.sha1(f"{voice}|{RATE}|{text}".encode("utf-8")).hexdigest()


async def main() -> None:
    hashes = json.loads(HASHES.read_text(encoding="utf-8")) if HASHES.exists() else {}
    made = 0
    for f in sorted(CONTENT.glob("*.json")):
        for item in json.loads(f.read_text(encoding="utf-8")):
            for lang, voice in VOICES.items():
                dest = OUT / lang / f"{item['key']}.mp3"
                h = digest(item[lang], voice)
                rel = f"{lang}/{item['key']}"
                if dest.exists() and hashes.get(rel) == h:
                    continue
                dest.parent.mkdir(parents=True, exist_ok=True)
                await edge_tts.Communicate(item[lang], voice, rate=RATE).save(str(dest))
                hashes[rel] = h
                made += 1
                print("made", rel)
    HASHES.parent.mkdir(parents=True, exist_ok=True)
    HASHES.write_text(json.dumps(hashes, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")
    print(f"done: {made} file mới")


asyncio.run(main())
