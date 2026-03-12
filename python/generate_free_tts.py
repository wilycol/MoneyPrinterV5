import sys
import asyncio
import edge_tts


def to_edge_rate(value):
    if value is None:
        return None
    if isinstance(value, str):
        v = value.strip()
        if not v:
            return None
        if v.endswith("%") and (v.startswith("+") or v.startswith("-") or v[0].isdigit()):
            return v
        try:
            value = float(v)
        except Exception:
            return None
    try:
        rate = float(value)
    except Exception:
        return None

    percent = round((rate - 1.0) * 100)
    if percent == 0:
        return None
    if percent >= 0:
        return f"+{percent}%"
    return f"{percent}%"

async def main():
    if len(sys.argv) < 4:
        print("Usage: python generate_free_tts.py <text> <output_file> <voice> [voice_rate]")
        sys.exit(1)

    text = sys.argv[1]
    output_file = sys.argv[2]
    voice = sys.argv[3]
    voice_rate = sys.argv[4] if len(sys.argv) >= 5 else None
    edge_rate = to_edge_rate(voice_rate)

    print(f"Generating TTS with voice: {voice}")
    if edge_rate:
        communicate = edge_tts.Communicate(text, voice, rate=edge_rate)
    else:
        communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_file)
    print(f"Saved audio to: {output_file}")

if __name__ == "__main__":
    asyncio.run(main())
