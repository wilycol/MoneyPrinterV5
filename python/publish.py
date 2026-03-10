import os
import sys
import time
import shutil
from config import ROOT_DIR
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.firefox.options import Options
from webdriver_manager.firefox import GeckoDriverManager
from constants import *

argv = sys.argv

fp_profile_path = argv[1].replace("--profile=", "")
source_video_id = argv[2].replace("--id=", "")
title = argv[3].replace("--title=", "")
description = argv[4].replace("--description=", "")


def create_temp_profile(original_path):
    """
    Crea una copia temporal del perfil de Firefox para evitar problemas de bloqueo (SessionNotCreatedException).
    Copia solo los archivos esenciales para mantener la sesión (cookies, logins).
    """
    print(f"--- PREPARANDO PERFIL TEMPORAL DE FIREFOX ---")
    # Define temp path in project root
    temp_path = os.path.join(ROOT_DIR, "temp_firefox_profile")
    
    # Clean previous temp profile if exists
    if os.path.exists(temp_path):
        try:
            shutil.rmtree(temp_path)
            print(f"[OK] Perfil temporal anterior eliminado: {temp_path}")
        except Exception as e:
            print(f"[WARN] No se pudo eliminar perfil anterior completamente: {e}")

    if not os.path.exists(temp_path):
        os.makedirs(temp_path)

    # Essential files to copy for session persistence
    # cookies.sqlite: Sesiones activas
    # key4.db + logins.json: Contraseñas guardadas
    # cert9.db: Certificados SSL
    # prefs.js: Preferencias de usuario (OJO: Puede causar conflictos si tiene rutas absolutas o settings corruptos)
    # Intentamos copiarlo, pero si falla la carga del perfil, podríamos excluirlo.
    files_to_copy = [
        "cookies.sqlite", "cookies.sqlite-shm", "cookies.sqlite-wal",
        "key4.db", "logins.json", 
        "places.sqlite", "places.sqlite-shm", "places.sqlite-wal",
        "cert9.db"
        # "prefs.js" # EXCLUIDO TEMPORALMENTE PARA EVITAR CRASHES POR SETTINGS CORRUPTOS
    ]
    
    print(f"Clonando desde: {original_path}")
    print(f"Hacia: {temp_path}")
    
    for file_name in files_to_copy:
        src = os.path.join(original_path, file_name)
        dst = os.path.join(temp_path, file_name)
        if os.path.exists(src):
            try:
                shutil.copy2(src, dst)
                print(f"  -> Copiado: {file_name}")
            except Exception as e:
                print(f"  -> [WARN] Error copiando {file_name}: {e}")
        else:
             # print(f"  -> (No existe): {file_name}")
             pass
             
    return temp_path

# Usar el perfil clonado
fp_profile_path = create_temp_profile(fp_profile_path)

options: Options = Options()
# if get_headless():
# options.add_argument("--headless")
# Set the profile path
options.add_argument("-profile")
options.add_argument(fp_profile_path)
options.add_argument("--width=1280")
options.add_argument("--height=720")

# --- STEALTH MODE ---
# Evitar detección de bot por parte de Google
options.set_preference("dom.webdriver.enabled", False)
options.set_preference('useAutomationExtension', False)
options.set_preference("general.useragent.override", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
# --------------------

service: Service = Service(GeckoDriverManager().install())
try:
    print("Iniciando WebDriver con perfil temporal...")
    browser = webdriver.Firefox(service=service, options=options)
    print("WebDriver iniciado correctamente.")
except Exception as e:
    print(f"❌ ERROR FATAL al iniciar WebDriver: {e}")
    sys.exit(1)

def upload_video() -> bool:
    """
    Uploads the video to YouTube.

    Returns:
        print (bool): Whether the upload was printful or not.
    """
    verbose = True
    print("--- INICIANDO SCRIPT DE PUBLICACIÓN ---")

    # Initialize the browser
    
    driver = browser
    print("Navegando a YouTube Studio...")
    driver.get("https://studio.youtube.com")
    time.sleep(5)
    
    current_url = driver.current_url
    print(f"URL actual: {current_url}")

    if "google.com/signin" in current_url or "accounts.google.com" in current_url:
        print("❌ ERROR CRÍTICO: No se detectó sesión iniciada en YouTube.")
        print("   Google ha redirigido al login, lo que significa que el perfil no cargó la sesión o fue bloqueado.")
        driver.quit()
        sys.exit(1)
        
    channel_id = driver.current_url.split("/")[-1]
    print(f"Canal detectado ID: {channel_id}")

    # Go to youtube.com/upload
    print("Navegando a la página de subida...")
    driver.get("https://www.youtube.com/upload")
    time.sleep(5)

    video_path = os.path.join(ROOT_DIR, "videos", source_video_id, "combined.mp4")
    print(f"Ruta del video: {video_path}")
    
    if not os.path.exists(video_path):
        print(f"❌ ERROR: El archivo de video no existe en: {video_path}")
        driver.quit()
        sys.exit(1)

    # Set video file
    print("Seleccionando archivo de video...")
    try:
        FILE_PICKER_TAG = "ytcp-uploads-file-picker"
        file_picker = driver.find_element(By.TAG_NAME, FILE_PICKER_TAG)
        INPUT_TAG = "input"
        file_input = file_picker.find_element(By.TAG_NAME, INPUT_TAG)
        file_input.send_keys(video_path)
    except Exception as e:
        print(f"❌ Error al seleccionar el archivo: {e}")
        driver.quit()
        sys.exit(1)

    # Wait for upload to finish
    print("Esperando subida inicial (10s)...")
    time.sleep(10)

    # Set title
    try:
        print("Configurando título y descripción...")
        textboxes = driver.find_elements(By.ID, YOUTUBE_TEXTBOX_ID)

        title_el = textboxes[0]
        description_el = textboxes[-1]

        if verbose:
            print("\t=> Setting title...")

        title_el.click()
        time.sleep(1)
        title_el.clear()
        title_el.send_keys(title.replace('"', "", 2))

        if verbose:
            print("\t=> Setting description...")

        # Set description
        time.sleep(2)
        description_el.click()
        time.sleep(0.5)
        description_el.clear()
        description_el.send_keys(description.replace('"', "", 2))
    except Exception as e:
        print(f"⚠️ Advertencia al llenar campos de texto: {e}")
        # Continuar, a veces falla pero ya se llenó

    time.sleep(2)

    time.sleep(0.5)

    if verbose:
        print("\t=> Setting `made for kids` option...")

    # Set `made for kids` option
    try:
        is_kids_checkbox = driver.find_elements(By.NAME, YOUTUBE_MADE_FOR_KIDS_NAME)[1]
        is_kids_checkbox.click()
    except Exception as e:
        print(f"⚠️ Error al seleccionar 'No es para niños': {e}")

    time.sleep(2)
    
    # Avanzar por las pantallas
    print("Avanzando en el wizard de subida...")
    for i in range(3):
        try:
            next_button = driver.find_element(By.ID, YOUTUBE_NEXT_BUTTON_ID)
            next_button.click()
            print(f"  -> Click Next {i+1}")
            time.sleep(5)
        except Exception as e:
             print(f"⚠️ Error al clickear Next {i+1}: {e}")

    # Set visibility to public
    print("Configurando visibilidad a PÚBLICO...")
    try:
        public_radio_button = driver.find_elements(By.NAME, YOUTUBE_PUBLIC_BUTTON_NAME)[0]
        public_radio_button.click()
    except Exception as e:
         print(f"⚠️ Error al seleccionar visibilidad: {e}")

    time.sleep(2)

    if verbose:
        print("\t=> Publishing video...")
    
    print("Publicando video final...")
    try:
        done_button = driver.find_element(By.ID, YOUTUBE_DONE_BUTTON_ID)
        done_button.click()
        print("✅ Click en botón PUBLISH/DONE realizado.")
    except Exception as e:
        print(f"❌ Error al clickear botón final: {e}")
        driver.quit()
        sys.exit(1)

    # Wait for the toast to appear
    print("Esperando confirmación (sleep 10s)...")
    time.sleep(10)
    
    driver.quit()
    print("🎉 Proceso de publicación finalizado con éxito.")
    return True
    
    
upload_video()