import path from "path";
import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import Elysia, { t } from "elysia";
import { AssemblyAI } from "assemblyai";
import { randomUUIDv7 } from "bun";
import Cloudflare from "../classes/cloudflare";
import {
    createImagePrompts,
    createScript,
    createScriptToSpeech,
    createTopic,
} from "../models/project.models";

import { scrapeUrl } from "../services/scraper";

const cld = new Cloudflare({ endpoint: process.env.CLOUDFLARE_ENDPOINT || "" });
const assemblyAi = new AssemblyAI({ apiKey: process.env.ASSEMBLY_AI_KEY || "" });

const profile = process.env.FIREFOX_PROFILE;

type VoiceOption = {
    id: string;
    label: string;
    locale: string;
    gender?: "Male" | "Female";
    provider: "edge-tts";
};

type SubtitlePosition = "bottom" | "center" | "top" | "custom";

const EDGE_TTS_VOICES: VoiceOption[] = [
    { id: "es-ES-AlvaroNeural", label: "Español (ES) - Álvaro", locale: "es-ES", gender: "Male", provider: "edge-tts" },
    { id: "es-ES-ElviraNeural", label: "Español (ES) - Elvira", locale: "es-ES", gender: "Female", provider: "edge-tts" },
    { id: "en-US-ChristopherNeural", label: "English (US) - Christopher", locale: "en-US", gender: "Male", provider: "edge-tts" },
    { id: "en-US-JennyNeural", label: "English (US) - Jenny", locale: "en-US", gender: "Female", provider: "edge-tts" },
    { id: "fr-FR-DeniseNeural", label: "Français (FR) - Denise", locale: "fr-FR", gender: "Female", provider: "edge-tts" },
    { id: "fr-FR-HenriNeural", label: "Français (FR) - Henri", locale: "fr-FR", gender: "Male", provider: "edge-tts" },
    { id: "de-DE-KatjaNeural", label: "Deutsch (DE) - Katja", locale: "de-DE", gender: "Female", provider: "edge-tts" },
    { id: "de-DE-ConradNeural", label: "Deutsch (DE) - Conrad", locale: "de-DE", gender: "Male", provider: "edge-tts" },
    { id: "it-IT-DiegoNeural", label: "Italiano (IT) - Diego", locale: "it-IT", gender: "Male", provider: "edge-tts" },
    { id: "it-IT-ElsaNeural", label: "Italiano (IT) - Elsa", locale: "it-IT", gender: "Female", provider: "edge-tts" },
    { id: "pt-BR-FranciscaNeural", label: "Português (BR) - Francisca", locale: "pt-BR", gender: "Female", provider: "edge-tts" },
    { id: "pt-BR-AntonioNeural", label: "Português (BR) - Antonio", locale: "pt-BR", gender: "Male", provider: "edge-tts" },
    { id: "ru-RU-SvetlanaNeural", label: "Русский (RU) - Svetlana", locale: "ru-RU", gender: "Female", provider: "edge-tts" },
    { id: "ja-JP-NanamiNeural", label: "日本語 (JP) - Nanami", locale: "ja-JP", gender: "Female", provider: "edge-tts" },
    { id: "zh-CN-XiaoxiaoNeural", label: "中文 (CN) - Xiaoxiao", locale: "zh-CN", gender: "Female", provider: "edge-tts" },
];

const DEFAULT_VOICE_BY_LANGUAGE: Record<string, string> = {
    english: "en-US-ChristopherNeural",
    spanish: "es-ES-AlvaroNeural",
    french: "fr-FR-DeniseNeural",
    german: "de-DE-KatjaNeural",
    italian: "it-IT-DiegoNeural",
    portuguese: "pt-BR-FranciscaNeural",
    russian: "ru-RU-SvetlanaNeural",
    japanese: "ja-JP-NanamiNeural",
    chinese: "zh-CN-XiaoxiaoNeural",
};

export type Metadata = {
    timestamp: number;
    argument: string;
    topic: string;
    script: string;
    language: string;
    sentences: number;
    images: number;
    imagesPath: string[];
    audio: boolean;
    str: boolean;
    video: boolean;
    faceClip: string;
    publish: false | string;
    imagesPrompts: string[];
    title: string;
    description: string;
    kbContext: string;
    kbAttachments: KbAttachment[];
    subtitleFont: string;
    subtitleEnabled: boolean;
    subtitleFontSize: number;
    subtitleColor: string;
    subtitleStrokeColor: string;
    subtitleStrokeWidth: number;
    subtitlePosition: SubtitlePosition;
    subtitlePositionY: number;
    subtitleMaxChars: number;
    ctaEnabled: boolean;
    ctaUrl: string;
    ctaText: string;
};

export type KbAttachment = {
    id: string;
    storedName: string;
    originalName: string;
    mime: string;
    size: number;
    createdAt: number;
    extractedText: string;
    extractionProvider: "none" | "md" | "docx" | "groq-vision";
    extractionModel: string;
};

const defaultMetdata: Metadata = {
    argument: "",
    audio: false,
    images: 0,
    imagesPath: [],
    language: "",
    publish: false,
    script: "",
    sentences: 0,
    str: false,
    timestamp: 0,
    topic: "",
    video: false,
    faceClip: "therock.mp4",
    imagesPrompts: [],
    title: "",
    description: "",
    kbContext: "",
    kbAttachments: [],
    subtitleFont: "badabb.ttf",
    subtitleEnabled: true,
    subtitleFontSize: 100,
    subtitleColor: "#FFFF00",
    subtitleStrokeColor: "black",
    subtitleStrokeWidth: 5,
    subtitlePosition: "center",
    subtitlePositionY: 0.85,
    subtitleMaxChars: 18,
    ctaEnabled: false,
    ctaUrl: "",
    ctaText: "Abrir enlace",
};

const readMetadata = async (videoId: string) => {
    const metadataPath = path.join(
        __dirname,
        "../..",
        "videos",
        videoId,
        "metadata.json"
    );
    if (await Bun.file(metadataPath).exists()) {
        return await Bun.file(metadataPath).json();
    } else return { ...defaultMetdata };
};

const updateMetadata = async (videoId: string, metadata: Partial<Metadata>) => {
    let readMetadata: Partial<Metadata> = {};
    const metadataPath = path.join(
        __dirname,
        "../..",
        "videos",
        videoId,
        "metadata.json"
    );
    if (await Bun.file(metadataPath).exists()) {
        readMetadata = await Bun.file(metadataPath).json();
    } else {
        readMetadata = { ...defaultMetdata };
        readMetadata.timestamp = new Date().getTime();
        await Bun.write(
            Bun.file(metadataPath),
            JSON.stringify(defaultMetdata, null, 2)
        );
    }

    Object.keys(metadata).forEach((key) => {
        const existing = (readMetadata as Record<string, unknown>)[key];
        const incoming = (metadata as Record<string, unknown>)[key];

        if (key === "imagesPath" || key === "kbAttachments") {
            if (Array.isArray(existing) && Array.isArray(incoming)) {
                const first = incoming.at(0);
                if (typeof first !== "undefined") existing.push(first);
                return;
            }
        }

        (readMetadata as Record<string, unknown>)[key] = incoming;
    });

    await Bun.write(
        Bun.file(metadataPath),
        JSON.stringify(readMetadata, null, 2)
    );
};

const getProjectDir = (id: string) => path.join(__dirname, "../..", "videos", id);
const getKbDir = (id: string) => path.join(getProjectDir(id), "kb");

const clampText = (text: string, maxChars: number) => {
    if (text.length <= maxChars) return text;
    return text.slice(-maxChars);
};

const extractDocxText = async (docxPath: string) => {
    const pythonPath = path.resolve(process.cwd(), "venv", "Scripts", "python.exe");
    const scriptPath = path.resolve(process.cwd(), "python", "extract_docx_text.py");

    const proc = Bun.spawn([pythonPath, scriptPath, docxPath], {
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    if (proc.exitCode !== 0) {
        throw new Error(stderr || "DOCX extraction failed");
    }

    const parsed = JSON.parse(stdout) as unknown;
    const text =
        parsed && typeof parsed === "object" && "text" in parsed
            ? String((parsed as { text?: unknown }).text ?? "")
            : "";
    return text;
};

const isTruthyString = (value: unknown) => {
    if (typeof value !== "string") return false;
    const v = value.trim().toLowerCase();
    return v === "1" || v === "true" || v === "yes" || v === "on";
};

const extractImageTextGroqOnce = async (file: File, model: string) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return { text: "", provider: "none" as const, model: "" };

    const buf = Buffer.from(await file.arrayBuffer());
    const base64 = buf.toString("base64");
    const mime = file.type || "image/jpeg";
    const dataUrl = `data:${mime};base64,${base64}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model,
            temperature: 0.2,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Extrae el texto visible de la imagen. Devuelve solo el texto, sin explicaciones.",
                        },
                        {
                            type: "image_url",
                            image_url: { url: dataUrl },
                        },
                    ],
                },
            ],
        }),
    });

    if (response.status !== 200) {
        const errText = await response.text().catch(() => "");
        throw new Error(`Groq vision error ${response.status}: ${errText}`);
    }

    const data = (await response.json()) as unknown;
    const content =
        data &&
        typeof data === "object" &&
        "choices" in data &&
        Array.isArray((data as { choices?: unknown }).choices)
            ? (data as { choices: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message
                  ?.content
            : "";

    return { text: String(content || ""), provider: "groq-vision" as const, model };
};

const extractImageTextGroq = async (
    file: File,
    opts: { visionMode: "auto" | "force" | "off"; visionModel?: string }
) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return { text: "", provider: "none" as const, model: "" };

    const envEnabled = (process.env.ENABLE_REMOTE_VISION || "false").toLowerCase() === "true";
    const shouldRun =
        opts.visionMode === "force" ? true : opts.visionMode === "off" ? false : envEnabled;
    if (!shouldRun) return { text: "", provider: "none" as const, model: "" };

    const envModel = process.env.GROQ_VISION_MODEL || "";
    const candidates = [
        opts.visionModel && opts.visionModel !== "auto" ? opts.visionModel : "",
        envModel,
        "llama-3.2-11b-vision-preview",
        "llama-3.2-90b-vision-preview",
    ].filter((m) => typeof m === "string" && m.trim().length > 0);

    let lastError: unknown = null;
    for (const model of candidates) {
        try {
            return await extractImageTextGroqOnce(file, model);
        } catch (e) {
            lastError = e;
        }
    }

    if (lastError) throw lastError;
    return { text: "", provider: "none" as const, model: "" };
};

export const projectRoutes = new Elysia({
    prefix: "/project",
})
    .get("/fonts", async () => {
        try {
            const fontsPath = path.join(process.cwd(), "fonts");
            const files = await readdir(fontsPath, { withFileTypes: true });
            const allowedExt = new Set([".ttf", ".otf", ".ttc"]);
            return files
                .filter((d) => d.isFile())
                .map((d) => d.name)
                .filter((name) => allowedExt.has(path.extname(name).toLowerCase()));
        } catch (e) {
            console.error("Failed to list fonts", e);
            return [];
        }
    })
    .get(
        "/voices",
        ({ query }) => {
            const q = typeof query.q === "string" ? query.q.trim().toLowerCase() : "";
            const language =
                typeof query.language === "string" ? query.language.trim().toLowerCase() : "";

            const filteredByLanguage = language
                ? EDGE_TTS_VOICES.filter((v) => v.locale.toLowerCase().startsWith(language))
                : EDGE_TTS_VOICES;

            const filtered = q
                ? filteredByLanguage.filter((v) => {
                      const haystack = `${v.id} ${v.label} ${v.locale} ${v.gender ?? ""}`.toLowerCase();
                      return haystack.includes(q);
                  })
                : filteredByLanguage;

            return {
                provider: "edge-tts",
                voices: filtered,
                defaults: DEFAULT_VOICE_BY_LANGUAGE,
            };
        },
        {
            query: t.Object({
                q: t.Optional(t.String()),
                language: t.Optional(t.String()),
            }),
        }
    )
    .post(
        "/tts/preview",
        async ({ body }) => {
            const { text, voice, voiceRate } = body;

            const previewDir = path.join(process.cwd(), "videos", "_preview");
            await mkdir(previewDir, { recursive: true });

            const fileName = `${randomUUIDv7()}.mp3`;
            const outputPath = path.join(previewDir, fileName);

            const previewText =
                (text && text.trim()) ||
                "Hola, esta es una prueba de voz para MoneyPrinterV5.";

            const pythonPath = path.resolve(process.cwd(), "venv", "Scripts", "python.exe");
            const scriptPath = path.resolve(process.cwd(), "python", "generate_free_tts.py");

            const args = [pythonPath, scriptPath, previewText, outputPath, voice];
            if (typeof voiceRate === "number" && Number.isFinite(voiceRate)) {
                args.push(String(voiceRate));
            }

            const proc = Bun.spawn(args, {
                cwd: process.cwd(),
                stdout: "pipe",
                stderr: "pipe",
            });

            const [stdoutStr, stderrStr] = await Promise.all([
                new Response(proc.stdout).text(),
                new Response(proc.stderr).text(),
            ]);
            await proc.exited;

            if (proc.exitCode !== 0) {
                const errorMsg = stderrStr || stdoutStr || "Unknown error";
                return new Response(JSON.stringify({ error: "Preview TTS failed", details: errorMsg }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                });
            }

            try {
                const entries = await readdir(previewDir, { withFileTypes: true });
                const mp3Files = entries
                    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".mp3"))
                    .map((e) => e.name);

                const fileStats = await Promise.all(
                    mp3Files.map(async (name) => {
                        const fullPath = path.join(previewDir, name);
                        const s = await stat(fullPath);
                        return { name, mtimeMs: s.mtimeMs };
                    })
                );

                fileStats.sort((a, b) => b.mtimeMs - a.mtimeMs);
                const toDelete = fileStats.slice(10);
                await Promise.all(
                    toDelete.map(async (f) => {
                        const fullPath = path.join(previewDir, f.name);
                        await unlink(fullPath).catch(() => undefined);
                    })
                );
            } catch (e) {
                console.warn("Preview cleanup failed:", e);
            }

            return { fileName, voice };
        },
        {
            body: t.Object({
                voice: t.String(),
                text: t.Optional(t.String()),
                voiceRate: t.Optional(t.Number()),
            }),
        }
    )
    .get("/preview/audio/:file", ({ params: { file } }) => {
        const safeFile = path.basename(file);
        if (safeFile !== file) {
            return new Response(JSON.stringify({ error: "Invalid file" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
        const audioPath = path.join(process.cwd(), "videos", "_preview", safeFile);
        return Bun.file(audioPath);
    })
    .get("/list-ids", async () => {
        const videosPath = path.join(process.cwd(), "videos");
        console.log("[DEBUG] /project/list called. Path:", videosPath);
        try {
            if (!(await Bun.file(videosPath).exists()) && !(await Bun.file(videosPath + "/").exists())) {
                 console.log("[DEBUG] Videos directory does not exist (checked with Bun.file). Trying readdir anyway.");
            }
            const files = await readdir(videosPath, { withFileTypes: true });
            const dirs = files
                .filter((dirent) => dirent.isDirectory())
                .map((dirent) => dirent.name);
            
            console.log("[DEBUG] Found video directories:", dirs);
            return dirs;
        } catch (error) {
            console.error("[DEBUG] Error reading videos directory:", error);
            return [];
        }
    })
    .get("/face-clips", async () => {
        try {
            const facesPath = path.join(process.cwd(), "faces");
            const files = await readdir(facesPath, { withFileTypes: true });
            const allowedExt = new Set([".mp4", ".webm", ".mov", ".gif"]);
            return files
                .filter((dirent) => dirent.isFile())
                .map((dirent) => dirent.name)
                .filter((name) => allowedExt.has(path.extname(name).toLowerCase()));
        } catch (error) {
            console.error("[DEBUG] Error reading faces directory:", error);
            return [];
        }
    })
    .post(
        "/:id/face-clip",
        async ({ params: { id }, body: { faceClip } }) => {
            try {
                const facesPath = path.join(process.cwd(), "faces");
                const files = await readdir(facesPath, { withFileTypes: true });
                const allowedExt = new Set([".mp4", ".webm", ".mov", ".gif"]);
                const allowedNames = files
                    .filter((dirent) => dirent.isFile())
                    .map((dirent) => dirent.name)
                    .filter((name) => allowedExt.has(path.extname(name).toLowerCase()));

                if (faceClip !== "none" && !allowedNames.includes(faceClip)) {
                    return new Response(JSON.stringify({ error: "faceClip inválido" }), {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                    });
                }

                await updateMetadata(id, { faceClip });
                return { success: true, faceClip };
            } catch (e) {
                console.error("Error updating face clip:", e);
                return new Response(JSON.stringify({ error: "Update failed", details: String(e) }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                });
            }
        },
        {
            body: t.Object({
                faceClip: t.String(),
            }),
        }
    )
    .post(
        "/:id/subtitles",
        async ({ params: { id }, body }) => {
            try {
                await updateMetadata(id, {
                    subtitleEnabled: body.subtitleEnabled,
                    subtitleFont: body.subtitleFont,
                    subtitleFontSize: body.subtitleFontSize,
                    subtitleColor: body.subtitleColor,
                    subtitleStrokeColor: body.subtitleStrokeColor,
                    subtitleStrokeWidth: body.subtitleStrokeWidth,
                    subtitlePosition: body.subtitlePosition,
                    subtitlePositionY: body.subtitlePositionY,
                    subtitleMaxChars: body.subtitleMaxChars,
                });
                return { success: true };
            } catch (e) {
                console.error("Error updating subtitle settings:", e);
                return new Response(JSON.stringify({ error: "Update failed", details: String(e) }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                });
            }
        },
        {
            body: t.Object({
                subtitleEnabled: t.Boolean(),
                subtitleFont: t.String(),
                subtitleFontSize: t.Number(),
                subtitleColor: t.String(),
                subtitleStrokeColor: t.String(),
                subtitleStrokeWidth: t.Number(),
                subtitlePosition: t.Union([
                    t.Literal("bottom"),
                    t.Literal("center"),
                    t.Literal("top"),
                    t.Literal("custom"),
                ]),
                subtitlePositionY: t.Number(),
                subtitleMaxChars: t.Number(),
            }),
        }
    )
    .post(
        "/:id/cta",
        async ({ params: { id }, body }) => {
            const enabled = body.enabled;
            const url = enabled ? body.url.trim() : "";
            const text = enabled ? body.text.trim() : "Abrir enlace";

            if (enabled) {
                const isHttp = url.startsWith("https://") || url.startsWith("http://");
                if (!isHttp) {
                    return new Response(JSON.stringify({ error: "Invalid URL", details: "La URL debe iniciar con http:// o https://." }), {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                    });
                }
            }

            try {
                await updateMetadata(id, {
                    ctaEnabled: enabled,
                    ctaUrl: url,
                    ctaText: text || "Abrir enlace",
                });
                return { success: true };
            } catch (e) {
                console.error("Error updating CTA settings:", e);
                return new Response(JSON.stringify({ error: "Update failed", details: String(e) }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                });
            }
        },
        {
            body: t.Object({
                enabled: t.Boolean(),
                url: t.String(),
                text: t.String(),
            }),
        }
    )
    .get("/:id", async ({ params: { id } }) => {
        const metadata = await readMetadata(id);
        
        // Self-healing: Check if video file exists even if metadata says false
        if (!metadata.video) {
            const videoPath = path.join(process.cwd(), "videos", id, "combined.mp4");
            if (await Bun.file(videoPath).exists()) {
                console.log(`[Self-Healing] Video file found for ${id}, updating metadata...`);
                await updateMetadata(id, { video: true });
                metadata.video = true;
            }
        }
        
        return metadata;
    })
    .post(
        "/:id/kb/upload",
        async ({ params: { id }, body: { file, visionMode, visionModel } }) => {
            try {
                if (!file) throw new Error("No file provided");

                const originalName = typeof file.name === "string" ? file.name : "attachment";
                const ext = path.extname(originalName).toLowerCase();
                const allowedExt = new Set([".md", ".docx", ".png", ".jpg", ".jpeg"]);
                if (!allowedExt.has(ext)) {
                    return new Response(
                        JSON.stringify({
                            error: "Unsupported file type",
                            details: `Solo se permiten: ${Array.from(allowedExt).join(", ")}`,
                        }),
                        { status: 400, headers: { "Content-Type": "application/json" } }
                    );
                }

                const maxBytes = Number(process.env.KB_MAX_UPLOAD_BYTES || String(15 * 1024 * 1024));
                if (typeof file.size === "number" && file.size > maxBytes) {
                    return new Response(
                        JSON.stringify({
                            error: "File too large",
                            details: `Tamaño máximo permitido: ${maxBytes} bytes`,
                        }),
                        { status: 413, headers: { "Content-Type": "application/json" } }
                    );
                }

                const kbDir = getKbDir(id);
                await mkdir(kbDir, { recursive: true });

                const storedName = `${randomUUIDv7()}${ext}`;
                const storedPath = path.join(kbDir, storedName);
                await Bun.write(storedPath, file);

                let extractedText = "";
                let extractionProvider: KbAttachment["extractionProvider"] = "none";
                let extractionModel = "";
                const normalizedVisionMode: "auto" | "force" | "off" =
                    visionMode === "force" || isTruthyString(visionMode)
                        ? "force"
                        : visionMode === "off"
                          ? "off"
                          : "auto";

                try {
                    if (ext === ".md") {
                        extractedText = await file.text();
                        extractionProvider = "md";
                    } else if (ext === ".docx") {
                        extractedText = await extractDocxText(storedPath);
                        extractionProvider = "docx";
                    } else if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
                        const extracted = await extractImageTextGroq(file, {
                            visionMode: normalizedVisionMode,
                            visionModel: typeof visionModel === "string" ? visionModel : undefined,
                        });
                        extractedText = extracted.text;
                        extractionProvider = extracted.provider;
                        extractionModel = extracted.model;
                    }
                } catch (e) {
                    console.error("KB extraction failed, continuing without extracted text:", e);
                    extractedText = "";
                    extractionProvider = "none";
                    extractionModel = "";
                }

                const attachment: KbAttachment = {
                    id: randomUUIDv7(),
                    storedName,
                    originalName,
                    mime: typeof file.type === "string" ? file.type : "",
                    size: typeof file.size === "number" ? file.size : 0,
                    createdAt: Date.now(),
                    extractedText: clampText(String(extractedText || ""), Number(process.env.KB_MAX_EXTRACTED_CHARS || "12000")),
                    extractionProvider,
                    extractionModel,
                };

                const metadata = (await readMetadata(id)) as Partial<Metadata>;
                const prevKbContext = typeof metadata.kbContext === "string" ? metadata.kbContext : "";
                const chunk =
                    attachment.extractedText.trim().length > 0
                        ? `\n\n[KB:${attachment.originalName}]\n${attachment.extractedText}`
                        : "";
                const kbContext = clampText(
                    `${prevKbContext}${chunk}`,
                    Number(process.env.KB_MAX_CHARS || "20000")
                );

                await updateMetadata(id, {
                    // @ts-ignore
                    kbAttachments: [attachment],
                    kbContext,
                });

                return { success: true, attachment };
            } catch (e) {
                console.error("Error uploading KB attachment:", e);
                return new Response(
                    JSON.stringify({ error: "Upload failed", details: e instanceof Error ? e.message : String(e) }),
                    { status: 500, headers: { "Content-Type": "application/json" } }
                );
            }
        },
        {
            body: t.Object({
                file: t.File(),
                visionMode: t.Optional(t.String()),
                visionModel: t.Optional(t.String()),
            }),
        }
    )
    .get("/:id/kb/list", async ({ params: { id } }) => {
        const metadata = (await readMetadata(id)) as Partial<Metadata>;
        const kbAttachments = Array.isArray(metadata.kbAttachments) ? metadata.kbAttachments : [];
        return kbAttachments;
    })
    .get("/:id/kb/file/:storedName", async ({ params: { id, storedName } }) => {
        const filePath = path.join(getKbDir(id), storedName);
        const file = Bun.file(filePath);
        if (!(await file.exists())) {
            return new Response("Not Found", { status: 404 });
        }
        return file;
    })
    .get("/:id/images/:image", ({ params: { id, image } }) => {
        const imagePath = path.join(__dirname, "../..", "videos", id, image);
        return Bun.file(imagePath);
    })
    .get("/:id/audio", ({ params: { id } }) => {
        const audioPath = path.join(
            __dirname,
            "../..",
            "videos",
            id,
            "tts.mp3"
        );
        return Bun.file(audioPath);
    })
    .get("/:id/video/", ({ params: { id } }) => {
        const videoPath = path.join(
            __dirname,
            "../..",
            "videos",
            id,
            "combined.mp4"
        );
        return Bun.file(videoPath);
    })

    .get("/:id/metadata", async ({ params: { id } }) => {
        const metadata = await readMetadata(id);

        const title = await cld.generateResponse(`
            Please generate a YouTube Video Title for the following topic, including 2 hashtags : ${metadata.topic}. Only return the title, nothing else. LIMIT the max 99 characters.
        `);
        const description = await cld.generateResponse(`
            Please generate a YouTube Video Description for the following script: ${metadata.script}. Only return the description, nothing else.
        `);

        await updateMetadata(id, {
            title: title,
            description: description,
        });

        return {
            title,
            description,
        };
    })

    .get("/:id/publish", async ({ params: { id } }) => {
        const metadata = await readMetadata(id);
        try {
            // Corregir la ruta al ejecutable de Python en Windows
            // Bun.spawn necesita la ruta exacta, a veces con barras invertidas en Windows o normalizada
            const pythonPath = path.resolve(process.cwd(), "venv", "Scripts", "python.exe");
            const scriptPath = path.resolve(process.cwd(), "python", "publish.py");
            
            console.log("----------------------------------------------------------------");
            console.log("🚀 STARTING PUBLISH PROCESS");
            console.log("----------------------------------------------------------------");
            console.log("📂 Current Working Directory (process.cwd()):", process.cwd());
            console.log("📂 Python Executable Path:", pythonPath);
            console.log("📂 Script Path:", scriptPath);
            
            const args = [
                pythonPath,
                scriptPath,
                `--profile=${profile}`,
                `--id=${id}`,
                `--title="${metadata?.title}"`,
                `--description="${metadata?.description}"`,
            ];
            
            console.log("🔧 Command:", args.join(" "));
            
            // Usar Bun.spawn con pipes para capturar stdout y stderr en tiempo real
            const proc = Bun.spawn(args, { 
                cwd: process.cwd(),
                stdout: "pipe",
                stderr: "pipe",
                env: { ...process.env }, // Heredar variables de entorno para asegurar compatibilidad
            });

            // Leer stdout y stderr
            const stdoutStr = await new Response(proc.stdout).text();
            const stderrStr = await new Response(proc.stderr).text();
            
            // Esperar a que el proceso termine
            await proc.exited;

            console.log("📄 PYTHON STDOUT:\n", stdoutStr);
            if (stderrStr) console.error("🛑 PYTHON STDERR:\n", stderrStr);
            console.log("✅ Publish Process Exit Code:", proc.exitCode);
            console.log("----------------------------------------------------------------");

            if (proc.exitCode !== 0) {
                 throw new Error(`Publish script failed with code ${proc.exitCode}. Error: ${stderrStr}`);
            }

            await updateMetadata(id, {
                publish: "true",
            });
            return { success: true, log: stdoutStr };
        } catch (e) {
            console.error("❌ ERROR IN PUBLISH ROUTE:", e);
            return { success: false, error: String(e) };
        }
    })

    // POST

    .post("/create/:id", async ({ params: { id } }) => {
        try {
            const audioPath = path.join(
                __dirname,
                "../..",
                "videos",
                id,
                "tts.mp3"
            );
            
            const subPath = path.join(__dirname, "../..", "videos", id, `sub.srt`);
            
            // Check if subtitles already exist to skip expensive transcription
            const subsExist = await Bun.file(subPath).exists();
            
            if (!subsExist) {
                console.log(`Transcribing audio for ${id} with model universal-2...`);
                const transcript = await assemblyAi.transcripts.transcribe({
                    audio: audioPath,
                    // @ts-ignore
                    speech_models: ["universal-2"],
                    language_code: "es",
                });
                
                if (transcript.status === 'error') {
                     throw new Error(`AssemblyAI Transcription failed: ${transcript.error}`);
                }
    
                const subtitles = await assemblyAi.transcripts.subtitles(
                    transcript.id,
                    "srt"
                );
                await Bun.write(subPath, subtitles);
            } else {
                console.log(`[INFO] Subtitles already exist for ${id}. Skipping transcription.`);
            }
            
            console.log(`Combining video for ${id}...`);
            const pythonPath = path.resolve(process.cwd(), "venv", "Scripts", "python.exe");
            const scriptPath = path.resolve(process.cwd(), "python", "combine_video.py");
            
            console.log(`[EXEC] Running: ${pythonPath} ${scriptPath} --id=${id}`);
            const metadata = await readMetadata(id);
            
            const proc = Bun.spawn(
                [pythonPath, scriptPath, `--id=${id}`],
                {
                    cwd: process.cwd(),
                    stdout: "pipe",
                    stderr: "pipe",
                    env: {
                        ...process.env,
                        FACE_CLIP: metadata.faceClip || "therock.mp4",
                        SUBTITLE_ENABLED: String(metadata.subtitleEnabled ?? true),
                        SUBTITLE_FONT: metadata.subtitleFont || "badabb.ttf",
                        SUBTITLE_FONT_SIZE: String(metadata.subtitleFontSize ?? 100),
                        SUBTITLE_COLOR: metadata.subtitleColor || "#FFFF00",
                        SUBTITLE_STROKE_COLOR: metadata.subtitleStrokeColor || "black",
                        SUBTITLE_STROKE_WIDTH: String(metadata.subtitleStrokeWidth ?? 5),
                        SUBTITLE_POSITION: metadata.subtitlePosition || "center",
                        SUBTITLE_POSITION_Y: String(metadata.subtitlePositionY ?? 0.85),
                        SUBTITLE_MAX_CHARS: String(metadata.subtitleMaxChars ?? 18),
                    },
                }
            );

            const stdout = await new Response(proc.stdout).text();
            const stderr = await new Response(proc.stderr).text();
            await proc.exited;

            if (proc.exitCode !== 0) {
                console.error("Python Error:", stderr);
                console.log("Python Output:", stdout);
                throw new Error(`Video combination failed: ${stderr || stdout}`);
            }
            
            console.log("Video generation completed:", stdout);

            await updateMetadata(id, {
                video: true,
            });
            return true;
        } catch (e) {
            console.error("Error generating video:", e);
            return new Response(JSON.stringify({ error: "Video generation failed", details: String(e) }), { 
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }
    })

// import { scrapeUrl } from "../services/scraper"; // Moved to top

// ... existing imports

    .post(
        "/create/:id/topic",
        async ({ params: { id }, body: { argument, prompt, sourceUrl, contextText } }) => {
            let context = "";

            const metadata = (await readMetadata(id)) as Partial<Metadata>;
            const kbContext = typeof metadata.kbContext === "string" ? metadata.kbContext.trim() : "";
            if (kbContext) {
                context += `\n\nBASE DE CONOCIMIENTO (ADJUNTOS):\n"${kbContext}"\n\n`;
            }
            
            if (sourceUrl) {
                console.log(`Scraping URL: ${sourceUrl}`);
                const scrapedContent = await scrapeUrl(sourceUrl);
                if (scrapedContent) {
                    context += `\n\nCONTEXTO EXTRAÍDO DE ${sourceUrl}:\n"${scrapedContent}"\n\n`;
                }
            }
            
            if (contextText) {
                context += `\n\nCONTEXTO ADICIONAL PROPORCIONADO POR EL USUARIO:\n"${contextText}"\n\n`;
            }
            
            let finalPrompt = prompt.replaceAll("%ARGUMENT%", argument);
            
            if (context) {
                finalPrompt += `\n\nINSTRUCCIONES ADICIONALES: Utiliza la siguiente información de contexto para generar el tema o idea del video. El tema debe estar basado en este contenido si es posible.\n${context}`;
            }

            const topic = await cld.generateResponse(finalPrompt);
            await updateMetadata(id, {
                argument: argument,
                topic: topic,
            });
            return topic;
        },
        {
            body: createTopic,
        }
    )

    .post(
        "/create/:id/script",
        async ({
            params: { id },
            body: { prompt, topic, language, sentences, sourceUrl, contextText },
        }) => {
            let context = "";

            const metadata = (await readMetadata(id)) as Partial<Metadata>;
            const kbContext = typeof metadata.kbContext === "string" ? metadata.kbContext.trim() : "";
            if (kbContext) {
                context += `\n\nBASE DE CONOCIMIENTO (ADJUNTOS):\n"${kbContext}"\n\n`;
            }

            if (sourceUrl) {
                console.log(`Scraping URL: ${sourceUrl}`);
                const scrapedContent = await scrapeUrl(sourceUrl);
                if (scrapedContent) {
                    context += `\n\nCONTEXTO EXTRAÍDO DE ${sourceUrl}:\n"${scrapedContent}"\n\n`;
                }
            }

            if (contextText) {
                context += `\n\nCONTEXTO ADICIONAL PROPORCIONADO POR EL USUARIO:\n"${contextText}"\n\n`;
            }

            let finalPrompt = prompt
                .replaceAll("%TOPIC%", topic)
                .replaceAll("%LANGUAGE%", language)
                .replaceAll("%SENTENCES%", sentences);

            if (context) {
                finalPrompt += `\n\nINSTRUCCIONES ADICIONALES: Utiliza la siguiente información de contexto para redactar el guion. El guion debe estar basado en este contenido si es posible.\n${context}`;
            }

            const script = await cld.generateResponse(finalPrompt);
            await updateMetadata(id, {
                script: script,
                language: language,
                sentences: Number(sentences),
            });
            return script;
        },
        {
            body: createScript,
        }
    )

    .post(
        "/create/:id/imagePrompts",
        async ({ params: { id }, body: { images, script, topic, prompt, sourceUrl, contextText } }) => {
            let context = "";

            const metadata = (await readMetadata(id)) as Partial<Metadata>;
            const kbContext = typeof metadata.kbContext === "string" ? metadata.kbContext.trim() : "";
            if (kbContext) {
                context += `\n\nBASE DE CONOCIMIENTO (ADJUNTOS):\n"${kbContext}"\n\n`;
            }

            if (sourceUrl) {
                console.log(`Scraping URL: ${sourceUrl}`);
                const scrapedContent = await scrapeUrl(sourceUrl);
                if (scrapedContent) {
                    context += `\n\nCONTEXTO EXTRAÍDO DE ${sourceUrl}:\n"${scrapedContent}"\n\n`;
                }
            }

            if (contextText) {
                context += `\n\nCONTEXTO ADICIONAL PROPORCIONADO POR EL USUARIO:\n"${contextText}"\n\n`;
            }

            let finalPrompt = prompt
                .replaceAll("%TOPIC%", topic)
                .replaceAll("%SCRIPT%", script)
                .replaceAll("%IMAGES%", images);

            if (context) {
                finalPrompt += `\n\nINSTRUCCIONES ADICIONALES: Utiliza la siguiente información de contexto para generar los prompts de imagen. Los prompts deben estar basados en este contenido si es posible.\n${context}`;
            }

            let imagePrompts = await cld.generateResponse(finalPrompt, true);

            // Fix for Groq/OpenAI wrapping arrays in objects (e.g. { "image_prompts": [...] })
            if (imagePrompts && !Array.isArray(imagePrompts) && typeof imagePrompts === 'object') {
                const values = Object.values(imagePrompts);
                const arrayVal = values.find(v => Array.isArray(v));
                if (arrayVal) {
                    // @ts-ignore
                    imagePrompts = arrayVal;
                }
            }

            if (!imagePrompts || !Array.isArray(imagePrompts)) {
                console.error("Failed to generate image prompts or invalid format:", imagePrompts);
                return []; // Return empty array to avoid frontend crash
            }

            await updateMetadata(id, {
                imagesPrompts: imagePrompts as string[],
            });
            return imagePrompts;
        },
        {
            body: createImagePrompts,
        }
    )

    .post(
        "/create/:id/image",
        async ({ params: { id }, body: { prompt, videoId } }) => {
            const image = await cld.generateImage(prompt, videoId);
            await updateMetadata(id, {
                // @ts-ignore
                imagesPath: [image],
            });

            return image;
        },
        {
            body: t.Object({
                prompt: t.String(),
                videoId: t.String(),
            }),
        }
    )

    .post(
        "/create/:id/sts",
        async ({ params: { id }, body: { script, language, voice, voiceRate } }) => {
            // Limpiar script de caracteres extraños si es necesario
            // script = script.replaceAll("[^\\w\\s.?!]", ""); 

            const audioFileName = "tts.mp3"; // Edge-TTS genera mp3 por defecto mejor
            const audioPath = path.join(__dirname, "../..", "videos", id, audioFileName);
            
            // Determinar idioma (simplificado, idealmente vendría del request)
            // Use provided voice, or fallback to language default, or default to Spanish Alvaro
            const selectedVoice =
                voice ||
                (language && DEFAULT_VOICE_BY_LANGUAGE[language.toLowerCase()]) ||
                "es-ES-AlvaroNeural";

            try {
                // Ensure directory exists
                const audioDir = path.dirname(audioPath);
                await mkdir(audioDir, { recursive: true });

                console.log(`Generating TTS for ID: ${id}`);
                console.log(`Audio Path: ${audioPath}`);
                console.log(`Script length: ${script.length}`);
                console.log(`Voice: ${selectedVoice}`);

                // Ejecutar script de Python para TTS Gratuito
                const args = [
                    "./venv/Scripts/python.exe",
                    "./python/generate_free_tts.py",
                    script,
                    audioPath,
                    selectedVoice,
                ];
                if (typeof voiceRate === "number" && Number.isFinite(voiceRate)) {
                    args.push(String(voiceRate));
                }

                const proc = Bun.spawn(args, {
                    cwd: process.cwd(), // Ejecutar desde la raíz del proyecto
                    stdout: "pipe",
                    stderr: "pipe",
                });

                const [output, error] = await Promise.all([
                    new Response(proc.stdout).text(),
                    new Response(proc.stderr).text()
                ]);
                
                await proc.exited;

                if (proc.exitCode !== 0) {
                    const errorMsg = error || output;
                    console.error("Error en TTS (Python):", errorMsg);
                    throw new Error(`Fallo al generar audio con Edge-TTS: ${errorMsg}`);
                }

                console.log("TTS Generation Output:", output);


                await updateMetadata(id, {
                    audio: true,
                });

                return audioFileName;

            } catch (e) {
                console.error(e);
                return new Response(JSON.stringify({ error: "Error generando audio", details: e instanceof Error ? e.message : String(e) }), { 
                    status: 500,
                    headers: { "Content-Type": "application/json" }
                });
            }
        },
        {
            body: createScriptToSpeech,
        }
    )

    .post("/:id/images/upload", async ({ params: { id }, body: { image } }) => {
        try {
            if (!image) throw new Error("No image provided");
            
            // Generar nombre único manteniendo la extensión original si es posible
            const ext = path.extname(image.name) || ".jpg";
            const imageName = `${randomUUIDv7()}${ext}`;
            const imagePath = path.join(__dirname, "../..", "videos", id, imageName);
            
            await Bun.write(imagePath, image);
            
            // Actualizar metadatos
            await updateMetadata(id, {
                // @ts-ignore
                imagesPath: [imageName]
            });
            
            return { success: true, imageName };
        } catch (e) {
             console.error("Error uploading image:", e);
             return new Response(JSON.stringify({ error: "Upload failed", details: String(e) }), { status: 500 });
        }
    }, {
        body: t.Object({
            image: t.File()
        })
    })

    .delete("/:id/images/:imageName", async ({ params: { id, imageName } }) => {
        try {
            const imagePath = path.join(__dirname, "../..", "videos", id, imageName);
            
            // Borrar archivo físico
            if (await Bun.file(imagePath).exists()) {
                await unlink(imagePath);
            }
            
            // Actualizar metadatos manualmente para eliminar del array (updateMetadata solo hace push)
            const metadataPath = path.join(__dirname, "../..", "videos", id, "metadata.json");
            if (await Bun.file(metadataPath).exists()) {
                const metadata = await Bun.file(metadataPath).json();
                if (metadata.imagesPath && Array.isArray(metadata.imagesPath)) {
                    metadata.imagesPath = metadata.imagesPath.filter((img: string) => img !== imageName);
                    await Bun.write(metadataPath, JSON.stringify(metadata, null, 2));
                }
            }
            
            return { success: true };
        } catch (e) {
             console.error("Error deleting image:", e);
             return new Response(JSON.stringify({ error: "Delete failed", details: String(e) }), { status: 500 });
        }
    });
