import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/PhoneFrame";
import { getEventDetail } from "@/api/events.server";
import { useQuery } from "@tanstack/react-query";
import { X, Volume2, VolumeX, Share2 } from "lucide-react"; 
import { useState, useEffect, useRef } from "react";

export const Route = createFileRoute("/recap")({
  head: () => ({
    meta: [
      { title: "Bounty · Recap de la noche" },
      { name: "description", content: "Tu noche en formato historia. Mejores momentos y estadísticas." },
    ],
  }),
  validateSearch: (search: Record<string, string | undefined>) => ({
    eventId: search.eventId || "",
  }),
  component: Recap,
});

const isVideo = (url?: string) => {
  if (!url) return false;
  return url.includes('.mp4') || url.includes('.webm') || url.startsWith('data:video');
};

function Recap() {
  const navigate = useNavigate();
  const { eventId } = Route.useSearch();

  const { data: detail, isLoading } = useQuery({
    queryKey: ["eventDetail", eventId],
    queryFn: () => getEventDetail({ data: { eventId } }),
    enabled: !!eventId,
  });

  const mediaList = detail?.media || [];
  const challengesList = detail?.challenges || [];
  const totalSlides = Math.max(mediaList.length, 1);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hideUI, setHideUI] = useState(false);
  const [isMuted, setIsMuted] = useState(true); 

  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  // --- NUEVO: Referencia para el vídeo ---
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentPhoto = mediaList[currentIndex];

  // --- NUEVO: Pausar vídeo al pulsar la pantalla ---
  useEffect(() => {
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isPaused]);

  // --- MODIFICADO: Temporizador SOLO para imágenes ---
  useEffect(() => {
    if (isPaused || isLoading || mediaList.length === 0) return;
    if (isVideo(currentPhoto?.url)) return; 

    const interval = 50;
    const step = (interval / 5000) * 100; 
    const timer = setInterval(() => {
      setProgress((prev) => (prev + step >= 100 ? 100 : prev + step));
    }, interval);
    return () => clearInterval(timer);
  }, [isPaused, isLoading, mediaList.length, currentIndex, currentPhoto]);

  useEffect(() => {
    if (progress >= 100) {
      if (currentIndex < totalSlides - 1) {
        setCurrentIndex((c) => c + 1);
        setProgress(0);
      } else {
        setIsPaused(true);
      }
    }
  }, [progress, currentIndex, totalSlides]);

  const handlePressStart = () => {
    if (pressTimer.current) return; 
    setIsPaused(true);
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setHideUI(true); 
    }, 400); 
  };

  const handlePressEnd = () => {
    setIsPaused(false);
    setHideUI(false);
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLongPress.current) {
      return; 
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    if (clickX < width * 0.35) {
      if (currentIndex > 0) {
        setCurrentIndex((c) => c - 1);
        setProgress(0);
      } else {
        navigate({ to: "/album-event", search: { eventId } });
      }
    } else {
      if (currentIndex < totalSlides - 1) {
        setCurrentIndex((c) => c + 1);
        setProgress(0);
      } else {
        navigate({ to: "/album-event", search: { eventId } });
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bounty · ${detail?.event.name}`,
          text: currentPhoto?.caption ? `"${currentPhoto.caption}"` : "¡Mirad este momento!",
          url: currentPhoto?.url || window.location.href,
        });
      } catch (err) {
        console.log("Error al compartir:", err);
      }
    } else {
      alert("Enlace copiado");
    }
  };

  if (isLoading) {
    return (
      <PhoneFrame>
        <div className="flex items-center justify-center min-h-dvh bg-black text-white text-sm">
          Cargando recap...
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div 
        className="relative min-h-dvh bg-black overflow-hidden select-none cursor-pointer"
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onClick={handleScreenClick}
      >
        
        {mediaList.length === 0 ? (
          <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center px-8 text-center text-white/50">
            <span className="mb-3 text-4xl">📸</span>
            <span className="text-sm">Aún no hay fotos ni vídeos en este álbum.</span>
          </div>
        ) : currentPhoto && currentPhoto.url ? (
          isVideo(currentPhoto.url) ? (
            <video
              ref={videoRef}
              key={`vid-${currentPhoto.id || currentIndex}`}
              src={currentPhoto.url}
              autoPlay 
              muted={isMuted} 
              playsInline
              onTimeUpdate={(e) => {
                if (isPaused) return;
                const vid = e.currentTarget;
                const current = vid.currentTime;
                const max = Math.min(vid.duration || 15, 15);
                
                if (current >= 15) {
                  setProgress(100);
                } else {
                  setProgress((current / max) * 100);
                }
              }}
              onEnded={() => setProgress(100)}
              className="absolute inset-0 h-full w-full object-cover animate-in fade-in duration-200 pointer-events-none"
            />
          ) : (
            <img
              key={`img-${currentPhoto.id || currentIndex}`}
              src={currentPhoto.url}
              alt="Recap slide"
              className="absolute inset-0 h-full w-full object-cover animate-in fade-in duration-200 pointer-events-none"
            />
          )
        ) : (
          <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center text-white/50 text-sm">
            Cargando momento...
          </div>
        )}
        
        <div className={`absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/85 pointer-events-none transition-opacity duration-300 ease-out ${hideUI ? 'opacity-0' : 'opacity-100'}`} />

        <div className={`relative flex items-center justify-between px-5 pt-6 z-20 transition-opacity duration-300 ease-out ${hideUI ? 'opacity-0' : 'opacity-100'}`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate({ to: "/album-event", search: { eventId } });
            }}
            className="grid h-10 w-10 place-items-center rounded-full bg-black/40 backdrop-blur text-white pointer-events-auto"
          >
            <X size={18} />
          </button>
          
          <div className="glass rounded-full px-3 py-1 text-[11px] uppercase tracking-widest text-white border border-white/10">
            Recap · {currentIndex + 1}/{totalSlides}
          </div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} 
            className="grid h-10 w-10 place-items-center rounded-full bg-black/40 backdrop-blur text-white pointer-events-auto transition active:scale-95"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>

        <div className={`relative mt-3 flex gap-1 px-5 z-20 pointer-events-none transition-opacity duration-300 ease-out ${hideUI ? 'opacity-0' : 'opacity-100'}`}>
          {Array.from({ length: totalSlides }).map((_, i) => {
            let barWidth = 0;
            if (i < currentIndex) barWidth = 100;
            else if (i === currentIndex) barWidth = progress;

            return (
              <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                <div 
                  className="h-full rounded-full bg-white transition-all duration-75 ease-linear" 
                  style={{ width: `${barWidth}%` }} 
                />
              </div>
            );
          })}
        </div>

        <div className={`absolute inset-x-4 bottom-10 z-20 pointer-events-none transition-opacity duration-300 ease-out ${hideUI ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
          <div className="glass-strong rounded-[28px] p-5 text-white border border-white/10 shadow-2xl">
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/70">
              {detail?.event.name} · Highlights
            </div>
            <div className="mt-1.5 font-display text-2xl leading-tight italic truncate">
              {currentPhoto?.caption ? `"${currentPhoto.caption}"` : "La noche en directo"}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <Stat label="Retos" value={challengesList.filter((c: any) => c.status === "done").length.toString()} />
              <Stat label="Fotos" value={mediaList.length.toString()} />
              <Stat label="Momentos" value={totalSlides.toString()} />
            </div>
          </div>
        </div>

        <div className={`absolute bottom-28 right-5 flex flex-col items-center gap-4 z-20 transition-opacity duration-300 ease-out ${hideUI ? 'opacity-0' : 'opacity-100'}`}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className="grid h-11 w-11 place-items-center rounded-full bg-black/50 backdrop-blur border border-white/15 text-white active:scale-95 transition shadow-md pointer-events-auto"
            aria-label="Compartir"
          >
            <Share2 size={18} />
          </button>
        </div>

      </div>
    </PhoneFrame>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-2.5 text-center border border-white/5">
      <div className="text-[9px] uppercase tracking-widest text-white/60">{label}</div>
      <div className="mt-0.5 text-lg font-light">{value}</div>
    </div>
  );
}