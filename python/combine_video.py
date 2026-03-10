import os
import sys
import PIL.Image

# Configure ImageMagick path for MoviePy
# Try to find ImageMagick in Program Files
program_files = os.environ.get("ProgramFiles", "C:\\Program Files")
imagemagick_dirs = [d for d in os.listdir(program_files) if d.startswith("ImageMagick")]
if imagemagick_dirs:
    # Use the first found ImageMagick directory
    imagemagick_path = os.path.join(program_files, imagemagick_dirs[0], "magick.exe")
    if os.path.exists(imagemagick_path):
        os.environ["IMAGEMAGICK_BINARY"] = imagemagick_path
    else:
        # Try convert.exe for older versions
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
from config import *
from utils import choose_random_song

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

def get_verbose():
    return False

def get_image_files(folder_path):
    """
    Returns a list of all image files (.png, .jpg, .jpeg) in the specified folder.

    Args:
        folder_path (str): The path to the folder to search for image files.

    Returns:
        list: A list of paths to image files.
    """
    image_files = []
    for file_name in os.listdir(folder_path):
        if file_name.lower().endswith(('.png', '.jpg', '.jpeg')):
            image_files.append(os.path.join(folder_path, file_name))
    return image_files



def combine() -> str:
        """
        Combines everything into the final video.

        Returns:
            path (str): The path to the generated MP4 File.
        """
        folder_path = os.path.join(ROOT_DIR, "videos", videoId)
        combined_image_path = os.path.join(ROOT_DIR, "videos", videoId, "combined.mp4")
        tts_path = os.path.join(ROOT_DIR, "videos", videoId, "tts.mp3")
        subtitles_path = os.path.join( folder_path, "sub.srt" )

        images = get_image_files(folder_path)
        if not images:
            raise Exception(f"No images found in {folder_path}. Please generate images first.")
        
        tts_clip = AudioFileClip(tts_path)
        max_duration = tts_clip.duration
        req_dur = max_duration / len(images)

        # Make a generator that returns a TextClip when called with consecutive
        generator = lambda txt: TextClip(
            txt,
            font=os.path.join(get_fonts_dir(), "badabb.ttf"),
            fontsize=100,
            color="#FFFF00",
            stroke_color="black",
            stroke_width=5,
            size=(1080, 1920),
            method="caption",
        )

        print("[+] Combining images...")

        clips = []
        tot_dur = 0

        # Add downloaded clips over and over until the duration of the audio (max_duration) has been reached
        while tot_dur < max_duration:
            for image_path in images:
                if os.path.exists(image_path):
                    try:
                        print(f"Processing image: {image_path}")
                        clip = ImageClip(image_path, transparent=False)
                        
                        # Ensure RGB (remove alpha channel if present) to prevent broadcast errors
                        if hasattr(clip, 'img') and clip.img is not None and clip.img.shape[2] == 4:
                             print(f" => Converting RGBA image to RGB: {image_path}")
                             clip.img = clip.img[:,:,:3]

                        clip.duration = req_dur
                        clip = clip.set_fps(30)
    
                        # Not all images are same size,
                        # so we need to resize them
                        if round((clip.w/clip.h), 4) < 0.5625:
                            if get_verbose():
                                print(f" => Resizing Image: {image_path} to 1080x1920")
                            clip = crop(clip, width=clip.w, height=round(clip.w/0.5625), \
                                        x_center=clip.w / 2, \
                                        y_center=clip.h / 2)
                        else:
                            if get_verbose():
                                print(f" => Resizing Image: {image_path} to 1920x1080")
                            clip = crop(clip, width=round(0.5625*clip.h), height=clip.h, \
                                        x_center=clip.w / 2, \
                                        y_center=clip.h / 2)
                        clip = clip.resize((1080, 1920))
    
                        clip = clip.fx(vfx.resize, lambda t: 1 + 0.02 * t)
    
                        clips.append(clip)
                        tot_dur += clip.duration
                    except Exception as e:
                        print(f"Error processing image {image_path}: {e}")
                        continue


        final_clip = concatenate_videoclips(clips)
        random_song = choose_random_song()
        equalize_subtitles(subtitles_path, 10)
        
        # Read subtitles with explicit UTF-8 encoding to support accents
        subs_data = read_subtitles_utf8(subtitles_path)
        subtitles = SubtitlesClip(subs_data, generator)
        subtitles.set_pos(("center", "center"))
        random_song_clip = AudioFileClip(random_song).set_fps(44100)

        # Turn down volume
        random_song_clip = random_song_clip.fx(afx.volumex, 0.1)
        comp_audio = CompositeAudioClip([
            tts_clip,
            random_song_clip
        ])

        # Add audio and set the duration based on tts
        final_clip = final_clip.set_audio(comp_audio)
        final_clip = final_clip.set_duration(tts_clip.duration)
        
        face_filename = os.environ.get("FACE_CLIP", "therock.mp4")
        masked_clip = None
        if face_filename and face_filename.lower() != "none":
            face_path = os.path.join(ROOT_DIR, "faces", face_filename)
            if os.path.exists(face_path):
                face_clip = VideoFileClip(face_path)
                face_clip.set_fps(30)
                face_clip = face_clip.resize((1080/3, 1920/3))
                masked_clip = face_clip.fx(vfx.mask_color, color=[0,154,62], s=5, thr=100)
                masked_clip = masked_clip.set_duration(max_duration)
                masked_clip = masked_clip.set_position(("left", "bottom"))

        # Compose final clip
        clips_to_compose = [final_clip, subtitles]
        if masked_clip is not None:
            clips_to_compose.insert(1, masked_clip)
        final_clip = CompositeVideoClip(clips_to_compose)

        final_clip.write_videofile(combined_image_path, codec="libx264", fps=30 )

        print(f"Wrote Video to \"{combined_image_path}\"")

        return combined_image_path


combine()
