import sys
import os
from faster_whisper import WhisperModel

def generate_subtitles(audio_path, output_srt_path, model_size="base", language="es"):
    """
    Generates SRT subtitles from an audio file using faster-whisper.
    """
    print(f"Loading Whisper model: {model_size}...")
    # Run on CPU by default for compatibility, use GPU if available
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    
    print(f"Transcribing: {audio_path}")
    segments, info = model.transcribe(audio_path, beam_size=5, language=language, word_timestamps=True)
    
    print(f"Detected language '{info.language}' with probability {info.language_probability:.2f}")
    
    words_data = []
    with open(output_srt_path, "w", encoding="utf-8") as srt_file:
        for i, segment in enumerate(segments, start=1):
            start = format_timestamp(segment.start)
            end = format_timestamp(segment.end)
            content = segment.text.strip()
            
            srt_file.write(f"{i}\n")
            srt_file.write(f"{start} --> {end}\n")
            srt_file.write(f"{content}\n\n")

            if segment.words:
                for word in segment.words:
                    words_data.append({
                        "word": word.word.strip(),
                        "start": word.start,
                        "end": word.end,
                        "probability": word.probability
                    })
    
    # Save word-level data to JSON
    json_path = output_srt_path.replace(".srt", ".json")
    import json
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(words_data, f, indent=4)
            
    print(f"Subtitles saved to: {output_srt_path}")
    print(f"Word data saved to: {json_path}")

def format_timestamp(seconds: float):
    """
    Formats seconds into HH:MM:SS,mmm for SRT.
    """
    td_hours = int(seconds // 3600)
    td_minutes = int((seconds % 3600) // 60)
    td_seconds = int(seconds % 60)
    td_milliseconds = int((seconds - int(seconds)) * 1000)
    return f"{td_hours:02}:{td_minutes:02}:{td_seconds:02},{td_milliseconds:03}"

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python generate_local_subtitles.py <audio_path> <output_srt_path> [model_size] [language]")
        sys.exit(1)
        
    audio_path = sys.argv[1]
    output_srt_path = sys.argv[2]
    model_size = sys.argv[3] if len(sys.argv) > 3 else "base"
    language = sys.argv[4] if len(sys.argv) > 4 else "es"
    
    generate_subtitles(audio_path, output_srt_path, model_size, language)
