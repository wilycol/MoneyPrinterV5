import { Elysia, t } from "elysia";
import Cloudflare from "../classes/cloudflare";

// Instancia de Cloudflare para usar la lógica centralizada de generación y fallback (Groq)
const cld = new Cloudflare({ endpoint: process.env.CLOUDFLARE_ENDPOINT || "" });

export const chatRoutes = new Elysia({ prefix: "/chat" })
    .post("/", async ({ body }) => {
        // @ts-ignore
        const { message } = body;
        console.log("Enviando mensaje a Ollama/Groq:", message);

        try {
            // Usar la clase Cloudflare que ya tiene fallback a Groq
            const response = await cld.generateResponse(message);

            if (!response) {
                return { error: "Fallo al generar respuesta (Ollama y Groq fallaron)." };
            }

            return { response: response };
        } catch (error) {
            console.error("Error en chat:", error);
            return { error: "Error interno del servidor." };
        }
    }, {
        body: t.Object({
            message: t.String()
        })
    });