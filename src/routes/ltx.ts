import { t, Elysia } from "elysia";
import path from "path";
import { mkdir } from "node:fs/promises";
import { randomUUIDv7 } from "bun";

const LTX_API_KEY = process.env.LTX_API_KEY;

export const ltxRoutes = new Elysia({ prefix: "/ltx" })
    .get("/test", () => "LTX Module Working")
    .post("/generate", async ({ body }) => {
        const { prompt, image_url, type } = body as { prompt: string, image_url?: string, type: "text-to-video" | "image-to-video" };
        
        console.log(`[LTX] Request received: ${type}`);
        console.log(`[LTX] Body keys: ${Object.keys(body)}`);
        
        if (!LTX_API_KEY) {
            return new Response(JSON.stringify({ error: "Falta LTX_API_KEY en variables de entorno." }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        let endpoint = "https://api.ltx.video/v1/text-to-video";
        let payload: any = {
            prompt: prompt,
            model: "ltx-2-3-pro",
            duration: 6,
            resolution: "1920x1080",
            fps: 24,
            generate_audio: true
        };

        console.log(`[LTX] Initial Payload:`, JSON.stringify(payload));

        if (type === "image-to-video") {
            endpoint = "https://api.ltx.video/v1/image-to-video";

            if (!image_url) {
                return new Response(JSON.stringify({ error: "LTX requiere image_url para Image-to-Video. Sube la imagen a una URL pública y envíala como image_url." }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }

            payload = {
                ...payload,
                image_url
            };
        }

        try {
            console.log(`[LTX] Calling API: ${endpoint}`);
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${LTX_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[LTX] API Error: ${response.status} - ${errorText}`);
                throw new Error(`LTX API Error: ${errorText}`);
            }

            // LTX returns the video binary directly or a JSON with URL?
            // Search results said "returns MP4 directly".
            // Let's check Content-Type.
            const contentType = response.headers.get("Content-Type");
            console.log(`[LTX] Response Content-Type: ${contentType}`);

            if (contentType?.includes("video/mp4") || contentType?.includes("application/octet-stream")) {
                // It's a binary video file
                const videoBuffer = await response.arrayBuffer();
                const videoId = randomUUIDv7();
                const videoFileName = `${videoId}.mp4`;
                const videoPath = path.join(process.cwd(), "videos", "ltx_generations", videoFileName);
                
                // Ensure directory exists
                await mkdir(path.dirname(videoPath), { recursive: true });
                
                await Bun.write(videoPath, videoBuffer);
                console.log(`[LTX] Video saved to: ${videoPath}`);
                
                // Return a URL to access this video (served by our backend)
                // We need to make sure we have a route to serve static files from "videos/ltx_generations"
                // or just "videos" which seems to be served.
                // In project.ts, audio is served? I don't see a static serve route in app.ts.
                // Wait, how are videos served in the current app?
                // Frontend accesses `http://localhost:3000/project/${videoId}/audio`?
                // I might need to add a static route or a specific download route.
                
                return { 
                    success: true, 
                    videoUrl: `/ltx/video/${videoFileName}`,
                    videoId: videoId,
                    filename: videoFileName,
                    savedTo: `videos/ltx_generations/${videoFileName}`
                };
            } else {
                // JSON response (maybe task ID or error)
                const json = await response.json();
                console.log("[LTX] JSON Response:", json);
                return { success: true, data: json };
            }

        } catch (error) {
            console.error("[LTX] Internal Error:", error);
            return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
        }
    }, {
        body: t.Object({
            prompt: t.String(),
            image_url: t.Optional(t.String()),
            type: t.Union([t.Literal("text-to-video"), t.Literal("image-to-video")])
        })
    })
    .get("/video/:filename", async ({ params: { filename } }) => {
        const videoPath = path.join(process.cwd(), "videos", "ltx_generations", filename);
        const file = Bun.file(videoPath);
        if (await file.exists()) {
            return new Response(file);
        }
        return new Response("Not Found", { status: 404 });
    });
