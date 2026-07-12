#!/usr/bin/env python3
"""教材JSONの全チャンク・全単語のTTS音声を事前生成する。

- 対象: data/lessons/**/*.json の chunks[].en(チャンク全体と分割単語の両方)
- 出力: data/audio/<sha1先頭16桁>.mp3 と data/audio/manifest.json(text→ファイル名)
- 生成済みファイルはスキップするので、教材追加後に再実行すれば差分だけ生成される

使い方:
  python3 tools/generate_audio.py            # 全件生成
  python3 tools/generate_audio.py --limit 3  # 動作確認用に3件だけ
"""

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "data" / "audio"
MANIFEST_PATH = AUDIO_DIR / "manifest.json"
KEY_PATH = Path.home() / ".config" / "openai" / "key"

MODEL = "gpt-4o-mini-tts"
VOICE = "marin"
INSTRUCTIONS = (
    "Clear, friendly American English for Japanese junior-high students learning English. "
    "Read the given text exactly as written, at a natural pace. "
    "If the text is a single word, pronounce it as a word in a sentence context "
    "(e.g. 'I' as the pronoun, not the letter name)."
)


def collect_texts():
    texts = set()
    for path in sorted((ROOT / "data" / "lessons").rglob("*.json")):
        data = json.loads(path.read_text())
        for stage in data.get("stages", []):
            for chunk in stage.get("chunks", []):
                en = str(chunk.get("en", "")).strip()
                if not en:
                    continue
                texts.add(en)
                for word in en.split():
                    texts.add(word)
    return sorted(texts)


def filename_for(text):
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:16] + ".mp3"


def synthesize(api_key, text, out_path):
    body = json.dumps({
        "model": MODEL,
        "voice": VOICE,
        "input": text,
        "instructions": INSTRUCTIONS,
        "response_format": "mp3",
    }).encode("utf-8")
    request = urllib.request.Request(
        "https://api.openai.com/v1/audio/speech",
        data=body,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                audio = response.read()
            tmp = out_path.with_suffix(".tmp")
            tmp.write_bytes(audio)
            trim_leading_silence(tmp)
            tmp.rename(out_path)
            return
        except Exception as error:
            if attempt == 3:
                raise
            time.sleep(2 ** attempt * 2)
            last = error  # noqa: F841


def audio_duration(path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True,
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        return -1.0


def trim_leading_silence(path):
    """先頭無音を30ms残して除去。TTS出力は先頭に最大0.7秒の無音が入り、タップ→発音の体感遅延になる。

    静かな音声を丸ごと消してしまわないよう、トリム後が0.15秒未満なら元のまま残す。
    ffmpegが無い環境ではスキップ(無音付きでも動作はする)。
    """
    if shutil.which("ffmpeg") is None:
        return
    trimmed = path.with_name(path.name + ".trimmed.mp3")
    result = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(path),
         "-af", "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.03",
         "-c:a", "libmp3lame", "-b:a", "128k", "-ar", "24000", str(trimmed)],
        capture_output=True,
    )
    if result.returncode == 0 and audio_duration(trimmed) >= 0.15:
        trimmed.rename(path)
    else:
        trimmed.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="生成件数の上限(動作確認用)")
    parser.add_argument("--workers", type=int, default=6)
    args = parser.parse_args()

    api_key = KEY_PATH.read_text().strip()
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    texts = collect_texts()
    manifest = {text: filename_for(text) for text in texts}
    pending = [t for t in texts if not (AUDIO_DIR / manifest[t]).exists()]
    if args.limit:
        pending = pending[: args.limit]
    print(f"total texts: {len(texts)} / to generate: {len(pending)}", flush=True)

    failed = []
    done = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(synthesize, api_key, t, AUDIO_DIR / manifest[t]): t for t in pending}
        for future in as_completed(futures):
            text = futures[future]
            try:
                future.result()
            except Exception as error:
                failed.append(text)
                print(f"FAILED: {text!r}: {error}", flush=True)
            done += 1
            if done % 25 == 0:
                print(f"{done}/{len(pending)}", flush=True)

    generated = {t: f for t, f in manifest.items() if (AUDIO_DIR / f).exists()}
    MANIFEST_PATH.write_text(json.dumps(generated, ensure_ascii=False, indent=1, sort_keys=True))
    print(f"manifest written: {len(generated)} entries -> {MANIFEST_PATH}", flush=True)
    if failed:
        print(f"{len(failed)} failed. 再実行すれば失敗分のみリトライされます。", flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
