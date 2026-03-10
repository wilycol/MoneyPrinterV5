import sys
import asyncio
import edge_tts

async def main():
    if len(sys.argv) < 4:
        print("Usage: python generate_free_tts.py <text> <output_file> <voice>")
        sys.exit(1)

    text = sys.argv[1]
    output_file = sys.argv[2]
    voice = sys.argv[3]

    print(f"Generating TTS with voice: {voice}")
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_file)
    print(f"Saved audio to: {output_file}")

if __name__ == "__main__":
    asyncio.run(main())
