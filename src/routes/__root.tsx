import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner"; // <-- Importamos el componente de las burbujas

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-md rounded-3xl p-10 text-center">
        <h1 className="text-7xl font-semibold gradient-text">404</h1>
        <h2 className="mt-4 text-xl font-medium">Se perdió en la noche</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta página no existe o se fue de after.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-md rounded-3xl p-10 text-center">
        <h1 className="text-xl font-semibold">Algo se torció</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Prueba de nuevo o vuelve al inicio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Reintentar
          </button>
          <a
            href="/"
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-medium"
          >
            Inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      // BLOQUEAMOS EL ZOOM Y FORZAMOS PANTALLA COMPLETA
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" },
      { name: "theme-color", content: "#0A0A0F" },
      
      // --- ETIQUETAS MÁGICAS PWA (APP NATIVA) ---
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Bounty" },
      // ------------------------------------------

      { title: "Bounty — La liga secreta de tu grupo" },
      {
        name: "description",
        content:
          "Red social privada y gamificada para grupos de amigos. Retos, sabotajes y álbumes de tus mejores noches.",
      },
      { property: "og:title", content: "Bounty — La liga secreta de tu grupo" },
      {
        property: "og:description",
        content: "Retos, sabotajes y álbumes de tus mejores noches.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      
      // --- ENLACES AL MANIFEST Y AL ICONO (APP NATIVA) ---
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/icon-192x192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        {/* --- ETIQUETAS PWA FORZADAS PARA IOS --- */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Bounty" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
        {/* --------------------------------------- */}
        
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      {/* Añadimos el Toaster global aquí para que intercepte y renderice los avisos */}
      <Toaster position="top-center" theme="dark" closeButton /> 
    </QueryClientProvider>
  );
}