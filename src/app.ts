import Elysia from "elysia";
import { cors } from "@elysiajs/cors";
import { projectRoutes } from "./routes/project";
import { chatRoutes } from "./routes/chat";
import { ltxRoutes } from "./routes/ltx";
import chatHtml from "../frontend/chat.html"; // Importar directamente

export const App = new Elysia()
    .use(cors({
        origin: true,
        allowedHeaders: ["Content-Type", "Authorization", "ngrok-skip-browser-warning"],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        credentials: true,
    }))
    .get("/", () => {
        return new Response("Backend Ready. Open http://localhost:5174 to use the App.");
    })
    .get("/chat-ui", () => {
        return new Response(chatHtml);
    })
    .use(projectRoutes)
    .use(chatRoutes)
    .use(ltxRoutes);

export type App = typeof App;
