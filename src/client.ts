import { treaty } from "@elysiajs/eden";
import type { App } from "./app";

const readFrontendEnv = (key: string): string | undefined => {
    const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
    return meta?.env?.[key];
};

const baseUrl =
    typeof window === "undefined"
        ? process.env.API_BASE_URL || "http://localhost:3001"
        : readFrontendEnv("VITE_API_BASE_URL") || "http://localhost:3001";

export const API = treaty<App>(baseUrl);
