import { fetch, randomUUIDv7 } from "bun";
import path from "path";

type CloudflareProps = {
    endpoint: string;
};

class Cloudflare {
    private endpoint: string;

    constructor({ endpoint }: CloudflareProps) {
        this.endpoint = endpoint;
    }

    public async generateResponse(prompt: string, json: boolean = false) {
        try {
            const attemptedProviders = new Set<string>();
            const primaryProvider = (process.env.LLM_PRIMARY || "ollama").toLowerCase();

            if (primaryProvider === "groq") {
                attemptedProviders.add("groq");
                const groqResponse = await this.callGroq(prompt, json);
                if (groqResponse) return groqResponse;
            }

            if (primaryProvider === "nvidia") {
                attemptedProviders.add("nvidia");
                const nvidiaResponse = await this.callNvidiaChat(prompt, json);
                if (nvidiaResponse) return nvidiaResponse;
            }

            // 1. Intentar leer la URL dinámica de Google Drive
            let endpoint = this.endpoint;
            const DRIVE_URL_FILE = "G:/Mi unidad/MoneyPrinterV5/ngrok_url.txt";
            
            try {
                const driveUrl = await Bun.file(DRIVE_URL_FILE).text();
                if (driveUrl && driveUrl.trim().startsWith("http")) {
                    endpoint = driveUrl.trim();
                }
            } catch (e) {
                // Si falla, seguimos usando this.endpoint (fallback)
            }

            // Usar Ollama API en lugar de Cloudflare Worker
            try {
                const response = await fetch(`${endpoint}/api/generate`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "ngrok-skip-browser-warning": "69420", // Bypass ngrok warning
                        "User-Agent": "MoneyPrinterV5-Backend/1.0",
                        "Origin": endpoint
                    },
                    body: JSON.stringify({
                        model: process.env.OLLAMA_MODEL || "llama3",
                        prompt: prompt,
                        stream: false,
                        format: json ? "json" : undefined,
                    }),
                });

                if (response.status === 200) {
                    const data = await response.json();
                    const text = data.response;

                    if (json) {
                        try {
                            // A veces Ollama devuelve el JSON dentro del string 'response'
                            return typeof text === "object" ? text : JSON.parse(text);
                        } catch (e) {
                            console.error("Error parsing JSON from Ollama:", e);
                            return text;
                        }
                    }
                    return text.replaceAll('"', "");
                } else {
                    throw new Error(`Ollama API Error: ${response.status}`);
                }
            } catch (ollamaError) {
                console.warn("⚠️ Local Ollama failed, trying Groq fallback...", ollamaError);
                if (!attemptedProviders.has("groq")) {
                    attemptedProviders.add("groq");
                    const groqResponse = await this.callGroq(prompt, json);
                    if (groqResponse) return groqResponse;
                }

                console.warn("⚠️ Groq fallback failed, trying NVIDIA NIM fallback...");
                if (!attemptedProviders.has("nvidia")) {
                    attemptedProviders.add("nvidia");
                    return await this.callNvidiaChat(prompt, json);
                }

                return false;
            }
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    private async callGroq(prompt: string, json: boolean) {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            console.error("❌ Groq API Key missing. Cannot use fallback.");
            return false;
        }

        console.log("🔄 Switching to Groq API (Fallback)...");
        
        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    messages: [{ role: "user", content: prompt }],
                    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
                    temperature: 0.7,
                    response_format: json ? { type: "json_object" } : undefined 
                })
            });

            if (response.status === 200) {
                const data = await response.json();
                const content = data.choices[0]?.message?.content;
                
                if (json) {
                     try {
                        return JSON.parse(content);
                    } catch (e) {
                        console.error("Error parsing JSON from Groq:", e);
                        return content;
                    }
                }
                return content.replaceAll('"', "");
            } else {
                 console.error("Groq API Error:", response.status, await response.text());
                 return false;
            }
        } catch (e) {
            console.error("Groq API Exception:", e);
            return false;
        }
    }

    private async callNvidiaChat(prompt: string, json: boolean) {
        const apiKey = process.env.NVIDIA_CHAT_API_KEY || process.env.NVIDIA_API_KEY;
        if (!apiKey) {
            console.error("❌ NVIDIA API Key missing. Cannot use fallback.");
            return false;
        }

        const invokeUrl =
            process.env.NVIDIA_CHAT_ENDPOINT ||
            "https://integrate.api.nvidia.com/v1/chat/completions";

        const model = process.env.NVIDIA_CHAT_MODEL || "qwen/qwen3.5-122b-a10b";

        try {
            const response = await fetch(invokeUrl, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: Number(process.env.NVIDIA_CHAT_MAX_TOKENS || "4096"),
                    temperature: Number(process.env.NVIDIA_CHAT_TEMPERATURE || "0.6"),
                    top_p: Number(process.env.NVIDIA_CHAT_TOP_P || "0.95"),
                    stream: false,
                    chat_template_kwargs: {
                        enable_thinking:
                            (process.env.NVIDIA_CHAT_ENABLE_THINKING || "true").toLowerCase() ===
                            "true",
                    },
                }),
            });

            if (response.status !== 200) {
                console.error(
                    "NVIDIA Chat API Error:",
                    response.status,
                    await response.text()
                );
                return false;
            }

            const data = await response.json();
            const content = data?.choices?.[0]?.message?.content;
            if (!content) return false;

            if (json) {
                try {
                    return JSON.parse(content);
                } catch (e) {
                    console.error("Error parsing JSON from NVIDIA:", e);
                    return content;
                }
            }

            return String(content).replaceAll('"', "");
        } catch (e) {
            console.error("NVIDIA Chat API Exception:", e);
            return false;
        }
    }

    // Public

    public async generateTopic(argument: string) {
        return await this.generateResponse(
            `Please generate a specific video idea that takes about the following topic: ${argument}. Make it exactly one sentence. Only return the topic, nothing else.`
        );
    }

    public async generateScript(
        topic: string,
        language: string,
        sentences: number
    ): Promise<false | string> {
        const script = await this.generateResponse(`
            Generate a super engaging script for a video in ${sentences} sentences, depending on the topic of the video.

            The script is to be returned as a string with the specified number of paragraphs.

            The script must talk about a fact that actually exist, talk about the fact and not over-introduce it. Go straight to the point without adding useless details.

            Here is an example of a string:
            "This is an example string."

            Do not under any circumstance reference this prompt in your response.

            Get straight to the point, don't start with unnecessary things like, "welcome to this video".

            Obviously, the script should be related to the topic of the video.
            
            YOU MUST NOT EXCEED THE ${sentences} SENTENCES LIMIT. MAKE SURE THE {sentences} SENTENCES ARE SHORT.
            YOU MUST NOT INCLUDE ANY TYPE OF MARKDOWN OR FORMATTING IN THE SCRIPT, NEVER USE A TITLE.
            YOU MUST WRITE THE SCRIPT IN THE LANGUAGE SPECIFIED IN [LANGUAGE].
            ONLY RETURN THE RAW CONTENT OF THE SCRIPT. DO NOT INCLUDE "VOICEOVER", "NARRATOR" OR SIMILAR INDICATORS OF WHAT SHOULD BE SPOKEN AT THE BEGINNING OF EACH PARAGRAPH OR LINE. YOU MUST NOT MENTION THE PROMPT, OR ANYTHING ABOUT THE SCRIPT ITSELF. ALSO, NEVER TALK ABOUT THE AMOUNT OF PARAGRAPHS OR LINES. JUST WRITE THE SCRIPT
            
            topic: ${topic}
            Language: ${language}
        `);
        if (script) {
            if (script.length > 5000) {
                console.log("Script is too long, regenerating");
                return (await this.generateScript(
                    topic,
                    language,
                    sentences
                )) as string;
            } else {
                return script;
            }
        } else {
            console.error("Unable to create script");
            return script;
        }
    }

    public async generateMetadata(topic: string, script: string) {
        const title = await this.generateResponse(`
            Please generate a YouTube Video Title for the following topic, including 2 hashtags : ${topic}. Only return the title, nothing else. LIMIT the max 99 characters.
        `);
        const description = await this.generateResponse(`
            Please generate a YouTube Video Description for the following script: ${script}. Only return the description, nothing else.
        `);
        return {
            title,
            description,
        };
    }

    public async generateImagePrompts(
        topic: string,
        script: string,
        images: number = 1
    ) {
        const prompt = `Generate ${images} Image Prompts for AI Image Generation,
            depending on the topic of a video.
            topic: ${topic}

            The image prompts are to be returned as
            a JSON-Array of strings.

            Each search term should consist of a full sentence,
            always add the main topic of the video.

            Be emotional and use interesting adjectives to make the
            Image Prompt as detailed as possible.
            
            YOU MUST ONLY RETURN THE JSON-ARRAY OF STRINGS.
            YOU MUST NOT RETURN ANYTHING ELSE. 
            YOU MUST NOT RETURN THE SCRIPT.
            
            The search terms must be related to the topic of the video.
            Here is an example of a JSON-Array of strings:
            ["image prompt 1", "image prompt 2", "image prompt 3"]

            Avoid pure reference to the "topic" or reference to texts

            For context, here is the full text:
            ${script}`;
        let response = await this.generateResponse(prompt, true);
        if (response) {
            // Fix for Groq/OpenAI wrapping arrays in objects
            if (!Array.isArray(response) && typeof response === "object") {
                const values = Object.values(response);
                const arrayVal = values.find(v => Array.isArray(v));
                if (arrayVal) {
                    response = arrayVal;
                }
            }
            console.log(response);
            return response;
        } else {
            return false;
        }
    }

    public async generateImage(prompt: string, videoId: string) {
        // 1. Intentar con NVIDIA Stable Diffusion (Prioridad)
        try {
            const nvidiaKey = process.env.NVIDIA_API_KEY;
            if (nvidiaKey) {
                console.log("🎨 Trying NVIDIA Stable Diffusion...");
                // Endpoint validado en pruebas: stable-diffusion-3-medium
                const invokeUrl = "https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium";
                
                const payload = {
                    "prompt": prompt,
                    "cfg_scale": 5,
                    "aspect_ratio": "16:9",
                    "output_format": "jpeg"
                };

                const response = await fetch(invokeUrl, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${nvidiaKey}`,
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                if (response.status === 200) {
                    const data = await response.json();
                    // La respuesta de NVIDIA es { "image": "base64..." } o { "artifacts": [...] } dependiendo del endpoint
                    // Para stable-diffusion-3-medium suele ser "image": "base64string" en algunos endpoints de NVIDIA NIM,
                    // pero la documentación estándar de stability dice artifacts.
                    // Voy a verificar la respuesta del script de prueba si es posible, pero como no vi el body...
                    // Asumiré formato estándar de NVIDIA NIM: { "image": "<base64_string>" } o { "artifacts": ... }
                    // Mejor logueo y verifico ambas estructuras.
                    
                    let base64Image = null;
                    if (data.image) {
                        base64Image = data.image;
                    } else if (data.artifacts && data.artifacts.length > 0) {
                        base64Image = data.artifacts[0].base64;
                    }

                    if (base64Image) {
                        const buffer = Buffer.from(base64Image, 'base64');
                        const imageName = `${randomUUIDv7()}.jpg`; 
                        const imagePath = path.join("./", "videos", videoId, imageName);
                        await Bun.write(imagePath, new Uint8Array(buffer));
                        console.log("✅ Image generated with NVIDIA");
                        return imageName;
                    } else {
                         console.warn("⚠️ NVIDIA response format unexpected:", JSON.stringify(data).substring(0, 200));
                    }
                } else {
                    console.warn(`⚠️ NVIDIA API failed with status ${response.status}. Falling back to Pollinations.`);
                }
            }
        } catch (e) {
            console.error("❌ NVIDIA Generation Error:", e);
        }

        // 2. Fallback a Pollinations.ai
        try {
            console.log("🎨 Generating with Pollinations (Fallback)...");
            const encodedPrompt = encodeURIComponent(prompt);
            const url = `https://image.pollinations.ai/prompt/${encodedPrompt}`;
            
            const response = await fetch(url);
            
            if (
                response.status === 200 &&
                response.headers.get("content-type")?.includes("image")
            ) {
                const blob = await response.blob();
                // Pollinations suele devolver JPG, pero guardamos como PNG o mantenemos extensión
                const imageName = `${randomUUIDv7()}.jpg`; 
                const imagePath = path.join("./", "videos", videoId, imageName);
                await Bun.write(imagePath, blob);
                return imageName;
            } else return false;
        } catch (e) {
            console.error(e);
            return false;
        }
    }
}

export default Cloudflare;
