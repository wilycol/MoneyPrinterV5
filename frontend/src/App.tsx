import CreateVideo from "./components/forms/createVideo";
import "./App.css";
import { useEffect, useState } from "react";
import { Moon, Sun, Palette, Loader2 } from "lucide-react";
import { Button } from "./components/ui/button";

function App() {
    const [theme, setTheme] = useState<"light" | "dark" | "blue">("dark");
    const [statusMessage, setStatusMessage] = useState<string>("");

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark", "blue");
        root.classList.add(theme);
    }, [theme]);

    return (
        <div className="flex flex-col items-center">
            <div className="xl:container flex flex-col border border-t-0">
                <div className="sticky top-0 z-50 flex flex-row items-center justify-between py-4 border-b px-5 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">ARA Auto Publisher</h1>
                        {statusMessage && (
                            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm border border-blue-200 dark:border-blue-800">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span className="font-medium truncate max-w-[300px]">{statusMessage}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={theme === "light" ? "default" : "outline"}
                            size="icon"
                            onClick={() => setTheme("light")}
                            title="Light Mode"
                        >
                            <Sun className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={theme === "dark" ? "default" : "outline"}
                            size="icon"
                            onClick={() => setTheme("dark")}
                            title="Dark Mode"
                        >
                            <Moon className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={theme === "blue" ? "default" : "outline"}
                            size="icon"
                            onClick={() => setTheme("blue")}
                            title="Blue Mode"
                        >
                            <Palette className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                {/* Mobile Status Bar */}
                {statusMessage && (
                    <div className="md:hidden flex items-center gap-2 px-5 py-2 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs border-b border-blue-100 dark:border-blue-900">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="font-medium truncate">{statusMessage}</span>
                    </div>
                )}
                <CreateVideo onStatusChange={setStatusMessage} />
            </div>
        </div>
    );
}

export default App;
