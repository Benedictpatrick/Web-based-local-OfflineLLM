import type { PyodideAPI, loadPyodide as LoadPyodideFn } from "pyodide";

declare global {
  interface Window {
    loadPyodide?: typeof LoadPyodideFn;
  }
}

let pyodidePromise: Promise<PyodideAPI> | null = null;

function loadPyodideScript(): Promise<void> {
  if (window.loadPyodide) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/pyodide/pyodide.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load the Python runtime."));
    document.head.appendChild(script);
  });
}

async function getPyodide(): Promise<PyodideAPI> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      await loadPyodideScript();
      if (!window.loadPyodide) throw new Error("Python runtime failed to initialize.");
      return window.loadPyodide({ indexURL: "/pyodide/" });
    })().catch((err) => {
      pyodidePromise = null;
      throw err;
    });
  }
  return pyodidePromise;
}

export interface PythonRunResult {
  output: string;
  ok: boolean;
}

export async function runPython(code: string): Promise<PythonRunResult> {
  const pyodide = await getPyodide();
  const lines: string[] = [];
  pyodide.setStdout({ batched: (line) => lines.push(line) });
  pyodide.setStderr({ batched: (line) => lines.push(line) });
  pyodide.setStdin({ stdin: () => null });

  try {
    const result = await pyodide.runPythonAsync(code);
    if (result !== undefined && result !== null) {
      lines.push(String(result));
    }
    return { output: lines.join("\n").trim() || "(no output)", ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    lines.push(message);
    return { output: lines.join("\n").trim(), ok: false };
  }
}
