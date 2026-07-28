# Diseño de la app "Bounty" (nombre ficticio)

Solo diseño visual. Todo el contenido (nombres, grupos, fotos, puntos, retos) será ficticio y hardcodeado. Sin backend, sin lógica real, sin autenticación. Cada ruta es una pantalla navegable para mostrar el diseño.

## Estética base (design system)

- Dark mode por defecto, fondo `#0A0A0F` con capas `#12121A` / `#1A1A24`.
- Acentos: violeta eléctrico (`#8B5CF6` → `#6D28D9`), azul eléctrico (`#3B82F6`), naranja sutil (`#FB923C`) como highlight puntual.
- Glassmorphism suave (blur 24px + saturate 140%) solo en nav flotante, modales y bottom sheets.
- Bordes redondeados 24–32px en cards, 16–20px en botones.
- Tipografía: display grande (Instrument Serif o similar mezclado con Geist/Inter para body). Headings 32–48px, tracking ajustado.
- Iconografía line-icons (lucide) finos, 1.5px stroke.
- Bento layout: grid asimétrico de cards de distintos tamaños en dashboard/álbum.
- Gradientes dinámicos suaves en hero de temporada, botón "Empezar la Noche" y perfil.
- Micro-interacciones: fade-in, scale-in, hover-scale ya disponibles en tailwind.

## Tokens que se añaden a `src/styles.css`

- Sobrescribir `:root` y `.dark` con la paleta oscura premium (violeta/azul/naranja).
- Añadir tokens de gradientes: `--gradient-hero`, `--gradient-party`, `--gradient-sabotage`.
- Añadir `--shadow-glass`, `--shadow-glow-violet`, `--shadow-elevated`.
- Añadir `--surface-glass`, `--surface-elevated`.
- Aplicar `dark` class por defecto en `<html>` desde `__root.tsx`.

## Pantallas (rutas TanStack)

Todas mobile-first (390px), diseñadas para verse premium también en desktop centrado con max-width.

```text
src/routes/
  index.tsx                    → Landing / Onboarding hero (join con código o QR)
  join.tsx                     → Pantalla de entrar código de 5 letras + escaneo QR mock
  dashboard.tsx                → "La Liga": ranking de la temporada, líder y perdedor destacados, botón "Empezar la Noche"
  party.tsx                    → Modo Fiesta activo: hub con acceso a retos y cámara libre, timer de la noche
  challenges.tsx               → Menú de retos, 5 niveles (bloqueados/desbloqueados), re-roll
  challenge-detail.tsx         → Reto individual con instrucciones, subir prueba, estado de validación
  camera.tsx                   → Cámara libre freestyle (mock UI de cámara con overlay de texto)
  shop.tsx                     → Tienda: buffs, sabotajes, cosméticos con tabs
  sabotage.tsx                 → Selector de amigo al que sabotear + confirmación con animación
  album.tsx                    → Galería histórica: carpetas por evento (bento grid)
  album-event.tsx              → Detalle de un evento con fotos mezcladas (retos + freestyle), etiquetas de dificultad
  recap.tsx                    → Recap estilo Reels vertical con stats de la noche
  profile.tsx                  → Perfil del usuario: marco, título, stats, historial
  notifications.tsx            → Feed de notificaciones (retos validados, sabotajes recibidos, etc.)
```

Nav: bottom nav glassmorphism flotante con 5 iconos (Liga, Retos, Cámara central FAB, Álbum, Perfil) presente en las pantallas principales.

## Contenido ficticio a inventar

- Grupo: "Los Descarriados" (7 miembros con avatares generados).
- Miembros: Álex, Marta, Rodri, Nuria, Javi, Clara, Dani — con puntos, marcos y títulos.
- Temporada: "Temporada 3 · Verano 2026".
- Retos de ejemplo por nivel (1 al 5), con copy en español divertido.
- 3 eventos pasados: "Fiesta 22 Julio", "Escapada Ibiza", "Cumple Rodri".
- Fotos: generar 8–12 imágenes con `imagegen` (fiesta nocturna, luces neón, siluetas, cámara analógica) para hero, álbum y recap. Placeholder mientras tanto.

## Componentes reutilizables

- `GlassCard`, `BentoTile`, `RankBadge`, `ChallengeCard` (con lock overlay), `LevelPill`, `FloatingNav`, `BottomSheet`, `GradientButton`, `AvatarStack`, `StatChip`, `SabotageIcon`, `StarRating`.

## Fuera de alcance

- Sin lógica de puntos real, sin persistencia, sin auth, sin cámara real (solo UI mock), sin subida de imágenes real.
- Todos los botones que "harían algo" navegan a la pantalla correspondiente o abren un bottom sheet decorativo.

## Metadata

- Cada ruta con `head()` propio (título + descripción en español acorde a la pantalla).
- `__root.tsx` con título general "Nightleague — La liga secreta de tu grupo".