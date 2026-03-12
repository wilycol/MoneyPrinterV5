import os
import sys
import PIL.Image
import json
import random

# Configure ImageMagick path for MoviePy
program_files = os.environ.get("ProgramFiles", "C:\\Program Files")
imagemagick_dirs = [d for d in os.listdir(program_files) if d.startswith("ImageMagick")]
if imagemagick_dirs:
    imagemagick_path = os.path.join(program_files, imagemagick_dirs[0], "magick.exe")
    if os.path.exists(imagemagick_path):
        os.environ["IMAGEMAGICK_BINARY"] = imagemagick_path
    else:
        convert_path = os.path.join(program_files, imagemagick_dirs[0], "convert.exe")
        if os.path.exists(convert_path):
            os.environ["IMAGEMAGICK_BINARY"] = convert_path

if not hasattr(PIL.Image, 'ANTIALIAS'):
    PIL.Image.ANTIALIAS = PIL.Image.LANCZOS

from moviepy.config import change_settings
if "IMAGEMAGICK_BINARY" in os.environ:
    change_settings({"IMAGEMAGICK_BINARY": os.environ["IMAGEMAGICK_BINARY"]})

from moviepy.video.tools.subtitles import SubtitlesClip
from moviepy.editor import *
from moviepy.video.fx.all import crop
from moviepy.tools import cvsecs
import re
import qrcode
from config import *
from utils import choose_random_song, equalize_subtitles

def env_str(name, default):
    v = os.environ.get(name)
    if v is None: return default
    s = str(v).strip()
    return s if s else default

def env_int(name, default):
    v = os.environ.get(name)
    if v is None: return default
    try: return int(float(v))
    except: return default

def env_float(name, default):
    v = os.environ.get(name)
    if v is None: return default
    try: return float(v)
    except: return default

def env_bool(name, default):
    v = os.environ.get(name)
    if v is None: return default
    s = str(v).strip().lower()
    return s in ("1", "true", "yes", "y", "on")

def clamp(x, lo, hi):
    return max(lo, min(hi, x))

def get_contrast_color(hex_color):
    """Returns white or black depending on the brightness of the hex_color."""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) != 6: return "white"
    r, g, b = int(hex_color[:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255
    return "black" if brightness > 0.5 else "white"

def read_subtitles_utf8(filename):
    times_texts = []
    current_times = None
    current_text = ""
    with open(filename, 'r', encoding='utf-8') as f:
        for line in f:
            times = re.findall("([0-9]*:[0-9]*:[0-9]*,[0-9]*)", line)
            if times:
                current_times = [cvsecs(t) for t in times]
            elif line.strip() == '':
                if current_times:
                    times_texts.append([current_times, current_text.strip('\n')])
                current_times, current_text = None, ""
            elif current_times:
                current_text += line
    if current_times:
        times_texts.append([current_times, current_text.strip('\n')])
    return times_texts

args = sys.argv
videoId = args[1].replace("--id=", "")
ROOT_DIR = os.path.dirname(sys.path[0])

def get_image_files(folder_path):
    image_files = []
    for file_name in os.listdir(folder_path):
        if file_name.lower().endswith(('.png', '.jpg', '.jpeg')):
            image_files.append(os.path.join(folder_path, file_name))
    return image_files

def combine() -> str:
    folder_path = os.path.join(ROOT_DIR, "videos", videoId)
    combined_image_path = os.path.join(ROOT_DIR, "videos", videoId, "combined.mp4")
    tts_path = os.path.join(ROOT_DIR, "videos", videoId, "tts.mp3")
    subtitles_path = os.path.join(folder_path, "sub.srt")

    images = get_image_files(folder_path)
    if not images:
        raise Exception(f"No images found in {folder_path}.")
    
    tts_clip = AudioFileClip(tts_path)
    max_duration = tts_clip.duration
    req_dur = max_duration / len(images)

    subtitle_font_name = env_str("SUBTITLE_FONT", "badabb.ttf")
    subtitle_font_path = os.path.join(get_fonts_dir(), subtitle_font_name)
    if not os.path.exists(subtitle_font_path):
        subtitle_font_path = os.path.join(get_fonts_dir(), "badabb.ttf")

    subtitle_font_size = clamp(env_int("SUBTITLE_FONT_SIZE", 100), 10, 300)
    subtitle_color = env_str("SUBTITLE_COLOR", "#FFFF00")
    subtitle_stroke_color = env_str("SUBTITLE_STROKE_COLOR", "black")
    subtitle_stroke_width = clamp(env_int("SUBTITLE_STROKE_WIDTH", 5), 0, 20)
    subtitle_position = env_str("SUBTITLE_POSITION", "center").lower()
    subtitle_position_y = clamp(env_float("SUBTITLE_POSITION_Y", 0.85), 0.0, 1.0)
    subtitle_max_chars = clamp(env_int("SUBTITLE_MAX_CHARS", 18), 5, 60)
    subtitle_enabled = env_bool("SUBTITLE_ENABLED", True)

    generator = lambda txt: TextClip(
        txt,
        font=subtitle_font_path,
        fontsize=subtitle_font_size,
        color=subtitle_color,
        stroke_color=subtitle_stroke_color,
        stroke_width=subtitle_stroke_width,
        size=(1080, 1920),
        method="caption",
    )

    print("[+] Combining images...")
    transition_dur = clamp(env_float("TRANSITION_DURATION", 0.0), 0.0, 2.0)
    
    clips = []
    tot_dur = 0
    while tot_dur < max_duration:
        for image_path in images:
            if os.path.exists(image_path):
                try:
                    clip = ImageClip(image_path, transparent=False)
                    if hasattr(clip, 'img') and clip.img is not None and clip.img.shape[2] == 4:
                        clip.img = clip.img[:,:,:3]
                    
                    clip.duration = req_dur
                    clip = clip.set_fps(30)
                    
                    # Resize to aspect ratio
                    if round((clip.w/clip.h), 4) < 0.5625:
                        clip = crop(clip, width=clip.w, height=round(clip.w/0.5625), x_center=clip.w/2, y_center=clip.h/2)
                    else:
                        clip = crop(clip, width=round(0.5625*clip.h), height=clip.h, x_center=clip.w/2, y_center=clip.h/2)
                    clip = clip.resize((1080, 1920))
                    
                    # Randomize Ken Burns
                    zoom_factor = 1 + 0.05 * random.uniform(0.5, 1.5)
                    if random.choice([True, False]):
                        clip = clip.fx(vfx.resize, lambda t: 1 + (zoom_factor - 1) * (t/clip.duration))
                    else:
                        clip = clip.fx(vfx.resize, lambda t: zoom_factor - (zoom_factor - 1) * (t/clip.duration))

                    if transition_dur > 0 and len(clips) > 0:
                        clip = clip.crossfadein(transition_dur)
                    
                    clips.append(clip)
                    tot_dur += clip.duration
                except Exception as e:
                    print(f"Error processing {image_path}: {e}")
                    continue

    final_clip = concatenate_videoclips(clips, method="compose") if transition_dur > 0 else concatenate_videoclips(clips)
    
    # Music
    bg_music_name = env_str("BACKGROUND_MUSIC", "")
    if bg_music_name and bg_music_name.lower() != "none":
        random_song = os.path.join(ROOT_DIR, "songs", bg_music_name)
        if not os.path.exists(random_song): random_song = choose_random_song()
    else:
        random_song = choose_random_song()

    # Subtitles
    subtitles = None
    karaoke_enabled = env_bool("KARAOKE_ENABLED", False)
    json_sub_path = subtitles_path.replace(".srt", ".json")

    if karaoke_enabled and os.path.exists(json_sub_path):
        print("[+] Karaoke Mode...")
        with open(json_sub_path, 'r', encoding='utf-8') as f:
            words_data = json.load(f)
        word_clips = []
        for word_info in words_data:
            txt = word_info["word"].upper()
            start, end = word_info["start"], word_info["end"]
            if end - start <= 0: continue
            w_clip = TextClip(txt, font=subtitle_font_path, fontsize=subtitle_font_size*1.3, color=subtitle_color,
                             stroke_color=subtitle_stroke_color, stroke_width=subtitle_stroke_width,
                             size=(1080, 1920), method="caption").set_start(start).set_duration(end-start)
            pos = ("center", 0.85) if subtitle_position == "bottom" else ("center", 0.05) if subtitle_position == "top" else ("center", subtitle_position_y) if subtitle_position == "custom" else ("center", "center")
            w_clip = w_clip.set_pos(pos, relative=True if isinstance(pos[1], float) else False)
            word_clips.append(w_clip)
        if word_clips: subtitles = CompositeVideoClip(word_clips, size=(1080, 1920))
    elif subtitle_enabled and os.path.exists(subtitles_path):
        print("[+] Standard Subtitles...")
        equalize_subtitles(subtitles_path, subtitle_max_chars)
        subs_data = read_subtitles_utf8(subtitles_path)
        subtitles = SubtitlesClip(subs_data, generator)
        pos = ("center", 0.85) if subtitle_position == "bottom" else ("center", 0.05) if subtitle_position == "top" else ("center", subtitle_position_y) if subtitle_position == "custom" else ("center", "center")
        subtitles = subtitles.set_pos(pos, relative=True if isinstance(pos[1], float) else False)

    # Audio
    song_clip = AudioFileClip(random_song).set_fps(44100).fx(afx.volumex, 0.1)
    comp_audio = CompositeAudioClip([tts_clip, song_clip.set_duration(tts_clip.duration)])
    final_clip = final_clip.set_audio(comp_audio).set_duration(tts_clip.duration)
    
    # Overlays list
    overlays = [final_clip]

    # Face Clip
    face_filename = env_str("FACE_CLIP", "none")
    if face_filename.lower() != "none":
        face_path = os.path.join(ROOT_DIR, "faces", face_filename)
        if os.path.exists(face_path):
            face_clip = VideoFileClip(face_path).resize((1080/3, 1920/3)).set_duration(max_duration).set_position(("left", "bottom"))
            face_clip = face_clip.fx(vfx.mask_color, color=[0,154,62], s=5, thr=100)
            overlays.append(face_clip)

    # Marketing Features
    ad_url = env_str("AD_URL", "")
    show_qr = env_bool("SHOW_QR", False)
    show_banner = env_bool("SHOW_BANNER", False)
    ad_banner_color = env_str("AD_BANNER_COLOR", "#FFD700")

    if ad_url:
        if show_banner:
            print(f"[+] Adding Branding Banner: {ad_url}")
            banner_bg = ColorClip(size=(1080, 100), color=PIL.ImageColor.getrgb(ad_banner_color)).set_duration(max_duration).set_opacity(0.9)
            text_color = get_contrast_color(ad_banner_color)
            banner_text = TextClip(ad_url, font=subtitle_font_path, fontsize=50, color=text_color, size=(1080, 100), method="caption").set_duration(max_duration)
            banner = CompositeVideoClip([banner_bg, banner_text]).set_position(("center", "top"))
            overlays.append(banner)

        if show_qr:
            print("[+] Adding QR Code...")
            qr = qrcode.QRCode(version=1, border=1)
            qr.add_data(ad_url)
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color="black", back_color="white")
            qr_path = os.path.join(folder_path, "qr.png")
            qr_img.save(qr_path)
            
            qr_clip = ImageClip(qr_path).resize(width=200).set_duration(max_duration).set_position(("right", 120 if show_banner else "top")).set_opacity(0.9)
            overlays.append(qr_clip)

    if subtitles:
        overlays.append(subtitles)

    final_video = CompositeVideoClip(overlays, size=(1080, 1920)).set_duration(max_duration)

    final_video.write_videofile(combined_image_path, codec="libx264", fps=30)
    return combined_image_path

combine()
