import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages deploy uses a subpath; local dev should stay at `/`.
  base: command === "serve" ? "/" : "/GIG_Roster/",
}));
