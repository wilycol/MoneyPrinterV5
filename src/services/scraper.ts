import { load } from "cheerio";

export async function scrapeUrl(url: string): Promise<string | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Failed to fetch URL: ${url}, Status: ${response.status}`);
            return null;
        }

        const html = await response.text();
        const $ = load(html);

        // Eliminar scripts, estilos y comentarios
        $("script").remove();
        $("style").remove();
        $("nav").remove();
        $("footer").remove();
        $("header").remove();
        $("aside").remove();

        // Extraer texto principal
        // Intentamos obtener el contenido de etiquetas semánticas primero
        let content = $("main").text() || $("article").text() || $("body").text();

        // Limpiar espacios en blanco excesivos
        content = content.replace(/\s+/g, " ").trim();
        
        // Limitar a una cantidad razonable de caracteres para el prompt (ej. 8000 chars ~ 2000 tokens)
        return content.substring(0, 8000);
    } catch (error) {
        console.error("Error scraping URL:", error);
        return null;
    }
}