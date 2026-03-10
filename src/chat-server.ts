import Elysia from "elysia";
import { resolve } from "path";

const chatPath = resolve(process.cwd(), "frontend/chat.html");

// Ruta al archivo de Drive (ajusta la letra de la unidad si no es G:)
const DRIVE_URL_FILE = "G:/Mi unidad/MoneyPrinterV5/ngrok_url.txt";

const app = new Elysia()
    .get("/", async () => {
        // Leer el archivo como texto explícitamente cada vez
        const htmlContent = await Bun.file(chatPath).text();
        return new Response(htmlContent, {
            headers: { "Content-Type": "text/html" }
        });
    })
    .post("/chat", async ({ body }) => {
        // @ts-ignore
        const { message } = body;
        console.log("Mensaje recibido:", message);
        
        try {
            // LEER URL AUTOMÁTICAMENTE DE GOOGLE DRIVE
            let OLLAMA_URL = "";
            try {
                OLLAMA_URL = await Bun.file(DRIVE_URL_FILE).text();
                OLLAMA_URL = OLLAMA_URL.trim(); // Limpiar espacios/saltos de línea
                console.log("🔗 URL leída de Drive:", OLLAMA_URL);
            } catch (e) {
                console.error("❌ No se pudo leer el archivo de URL de Drive:", e);
                return { error: "No se encontró el archivo de conexión en Google Drive (ngrok_url.txt)" };
            }
            
            if (!OLLAMA_URL.startsWith("http")) {
                 return { error: "La URL en el archivo de Drive no es válida." };
            }

            const response = await fetch(`${OLLAMA_URL}/api/generate`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "69420", // Valor aleatorio para saltar filtro
                    "User-Agent": "MoneyPrinterV5-Client/1.0", // User-Agent personalizado
                    "Origin": OLLAMA_URL // Simular que venimos del mismo origen
                },
                body: JSON.stringify({
                    model: "llama3",
                    prompt: message,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                return { error: `Error remoto: ${response.status} - ${errorText}` };
            }

            const data = await response.json();
            // @ts-ignore
            return { response: data.response };
            
        } catch (error) {
            console.error("Error conectando a Ngrok:", error);
            return { error: "No se pudo conectar con Colab. Verifica que la URL de Ngrok siga activa." };
        }
    })
    .listen(3001);

console.log(`🦊 Chat Server corriendo en http://localhost:3001`);