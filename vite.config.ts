// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import basicSsl from "@vitejs/plugin-basic-ssl"; // 1. Añade esta importación aquí arriba

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
    vite: {
    plugins: [
      basicSsl() // 2. Añade el plugin dentro de la sección vite
    ],
    server: {
      allowedHosts: true, // Esto permite cualquier host externo como el de localtunnel
      host: true,         // 3. Añade esto para exponer el proyecto a tu IP local
      https: {}           // <- CAMBIA ESTO: Pon llaves {} en lugar de true
    },
  },

});
