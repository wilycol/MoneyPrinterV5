import sys
import time
import os
from selenium import webdriver
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.firefox.options import Options
from webdriver_manager.firefox import GeckoDriverManager

def verify_firefox(profile_path):
    print(f"--- VERIFICACIÓN DE PERFIL DE FIREFOX ---")
    print(f"Ruta del perfil: {profile_path}")
    
    if not os.path.exists(profile_path):
        print(f"❌ ERROR: La ruta del perfil no existe: {profile_path}")
        return

    print("⚠️  IMPORTANTE: Asegúrate de que TODAS las ventanas de Firefox estén CERRADAS antes de continuar.")
    print("   Si Firefox está abierto, este script podría no cargar tu perfil correctamente.")
    print("   Esperando 5 segundos antes de lanzar el navegador...")
    time.sleep(5)

    options = Options()
    # Usar el argumento -profile obliga a Firefox a usar este directorio específico
    options.add_argument("-profile")
    options.add_argument(profile_path)
    
    # INTENTO DE EVASIÓN DE DETECCIÓN DE BOT
    options.set_preference("dom.webdriver.enabled", False)
    options.set_preference('useAutomationExtension', False)
    options.set_preference("general.useragent.override", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    try:
        print("Lanzando Firefox con Selenium (Modo Stealth)...")
        service = Service(GeckoDriverManager().install())
        driver = webdriver.Firefox(service=service, options=options)
        
        print("Navegador iniciado. Yendo a YouTube Studio...")
        driver.get("https://studio.youtube.com")
        
        time.sleep(5)
        
        current_url = driver.current_url
        print(f"URL actual: {current_url}")
        
        if "google.com/signin" in current_url or "accounts.google.com" in current_url:
            print("\n❌ NO ESTÁS LOGUEADO (Google detectó el navegador automatizado).")
            print("   INTENTO DE SOLUCIÓN MANUAL:")
            print("   1. Cierra esta ventana de navegador y el script.")
            print("   2. Ejecuta el siguiente comando en una nueva terminal (PowerShell) para abrir Firefox con tu perfil SIN automatización:")
            print(f'\n      & "C:\\Program Files\\Mozilla Firefox\\firefox.exe" -profile "{profile_path}"\n')
            print("   3. Inicia sesión en YouTube/Google en esa ventana normal.")
            print("   4. Cierra el navegador.")
            print("   5. Vuelve a ejecutar este script para verificar.")
            
            # Esperar más tiempo para que el usuario pueda leer
            print("\n   El script se cerrará en 60 segundos...")
            time.sleep(60)
            
        elif "studio.youtube.com" in current_url:
            print("\n✅ ¡ÉXITO! Ya estás logueado en YouTube Studio.")
            print("   El sistema de auto-publicación debería funcionar correctamente.")
            print("   Cerrando navegador en 10 segundos...")
            time.sleep(10)
        else:
            print(f"\n⚠️ ESTADO DESCONOCIDO. La URL es {current_url}.")
            print("   Revisa la ventana del navegador.")
            time.sleep(20)
        
        driver.quit()
        
    except Exception as e:
        print(f"\n❌ ERROR CRÍTICO: {e}")
        print("   Asegúrate de tener instalado Firefox y que la ruta del perfil sea correcta.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        verify_firefox(sys.argv[1])
    else:
        print("Por favor proporciona la ruta del perfil como argumento.")