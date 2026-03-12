import { spawn, type SpawnOptions } from "bun";
import path from "node:path";

export class PythonOrchestrator {
    private pythonPath: string;

    constructor() {
        // Resolve absolute path to the virtual environment python
        this.pythonPath = path.resolve(process.cwd(), "venv", "Scripts", "python.exe");
    }

    /**
     * Executes a python script with given arguments and environment variables.
     */
    public async runScript(scriptName: string, args: string[] = [], env: Record<string, string> = {}) {
        const scriptPath = path.resolve(process.cwd(), "python", scriptName);
        
        console.log(`[PythonOrchestrator] Executing: ${scriptName} with args: ${args.join(" ")}`);

        const proc = spawn([this.pythonPath, scriptPath, ...args], {
            cwd: process.cwd(),
            stdout: "pipe",
            stderr: "pipe",
            env: {
                ...process.env,
                ...env
            }
        });

        const stdoutStr = await new Response(proc.stdout).text();
        const stderrStr = await new Response(proc.stderr).text();
        
        await proc.exited;

        if (proc.exitCode !== 0) {
            console.error(`[PythonOrchestrator] ${scriptName} failed with code ${proc.exitCode}`);
            console.error(`[PythonOrchestrator] STDERR: ${stderrStr}`);
            throw new Error(`${scriptName} failed: ${stderrStr || stdoutStr}`);
        }

        console.log(`[PythonOrchestrator] ${scriptName} completed successfully.`);
        return stdoutStr;
    }
}
