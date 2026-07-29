import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/PhoneFrame";
import { getEventDetail, rateMedia } from "@/api/events.server";
import { dislikeChallenge } from "@/api/challenges.server";
import { getStoredMemberId } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Share2, Star, ThumbsDown, Volume2, VolumeX } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/night-recap")({
  head: () => ({
    meta: [
      { title: "Bounty · El Juicio" },
      { name: "description", content: "Juzga la noche anterior." },
    ],
  }),
  validateSearch: (search: Record<string, string | undefined>) => ({
    eventId: search.eventId || "",
  }),
  component: NightRecap,
});

const isVideo = (url?: string) => {
  if (!url) return false;
  return url.includes('.mp4') || url.includes('.webm') || url.startsWith('data:video');
};

function NightRecap() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { eventId } = Route.useSearch();
  const memberId = getStoredMemberId();

  useEffect(() => {
    if (eventId) {
      localStorage.setItem(`recap_watched_${eventId}`, "true");
    }
  }, [eventId]);
  

  const { data: detail, isLoading } = useQuery({
    queryKey: ["eventDetail", eventId],
    queryFn: () => getEventDetail({ data: { eventId } }),
    enabled: !!eventId,
  });

  const mediaList = detail?.media ? [...detail.media].reverse() : [];
  const totalSlides = Math.max(mediaList.length, 1);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hideUI, setHideUI] = useState(false);
  const [isMuted, setIsMuted] = useState(true); 

  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  // --- NUEVO: Referencia para controlar el vídeo ---
  const videoRef = useRef<HTMLVideoElement>(null);

  const rateMutation = useMutation({
    mutationFn: ({ mediaId, stars }: { mediaId: string; stars: number }) => 
      rateMedia({ data: { mediaId, memberId: memberId!, stars } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventDetail", eventId] });
    }
  });

  const dislikeMutation = useMutation({
    mutationFn: ({ challengeId }: { challengeId: string }) =>
      dislikeChallenge({ data: { challengeId, memberId: memberId! } }),
    onSuccess: (data) => {
      if (data.revoked) toast.error("¡Mayoría! Reto tumbado y puntos restados.");
      else toast.success("Voto negativo registrado.");
      queryClient.invalidateQueries({ queryKey: ["eventDetail", eventId] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const currentPhoto = mediaList[currentIndex];
  // --- NUEVO: Si no hay media, lo mandamos fuera directamente ---
  useEffect(() => {
    if (!isLoading && detail && mediaList.length === 0) {
      toast.info("La noche acabó sin contenido para juzgar.");
      navigate({ to: "/dashboard" });
    }
  }, [isLoading, detail, mediaList.length, navigate]);

  // --- NUEVO: Controlar la pausa del vídeo al mantener pulsado ---
  useEffect(() => {
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isPaused]);

  // --- MODIFICADO: Temporizador SOLO para fotos ---
  useEffect(() => {
    if (isPaused || isLoading || mediaList.length === 0) return;
    if (isVideo(currentPhoto?.url)) return; // Si es vídeo, ignoramos este temporizador

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
        navigate({ to: "/dashboard" });
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
    if (isLongPress.current) return; 
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width * 0.35) {
      if (currentIndex > 0) { setCurrentIndex((c) => c - 1); setProgress(0); }
      else navigate({ to: "/dashboard" });
    } else {
      if (currentIndex < totalSlides - 1) { setCurrentIndex((c) => c + 1); setProgress(0); }
      else navigate({ to: "/dashboard" });
    }
  };

  if (isLoading) return <PhoneFrame><div className="flex min-h-dvh items-center justify-center bg-black text-sm text-white">Preparando el juicio...</div></PhoneFrame>;

  return (
    <PhoneFrame>
      <div 
        className="relative min-h-dvh select-none overflow-hidden bg-black cursor-pointer"
        onMouseDown={handlePressStart} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart} onTouchEnd={handlePressEnd}
        onClick={handleScreenClick}
      >
        {currentPhoto && currentPhoto.url ? (
          isVideo(currentPhoto.url) ? (
            <video
              ref={videoRef}
              key={`vid-${currentPhoto.id || currentIndex}`}
              src={currentPhoto.url}
              autoPlay 
              // Quitamos el 'loop' para que pueda terminar
              muted={isMuted} 
              playsInline
              // --- NUEVO: El vídeo controla su propia barra de progreso ---
              onTimeUpdate={(e) => {
                if (isPaused) return;
                const vid = e.currentTarget;
                const current = vid.currentTime;
                const max = Math.min(vid.duration || 15, 15); // Límite de 15 segundos
                
                if (current >= 15) {
                  setProgress(100);
                } else {
                  setProgress((current / max) * 100);
                }
              }}
              // --- NUEVO: Cuando acabe (si dura menos de 15s), pasamos de slide ---
              onEnded={() => setProgress(100)}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover animate-in fade-in duration-200"
            />
          ) : (
            <img 
              key={`img-${currentPhoto.id || currentIndex}`} 
              src={currentPhoto.url} 
              alt="Recap" 
              className="pointer-events-none absolute inset-0 h-full w-full object-cover animate-in fade-in duration-200" 
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-sm text-white/50">Cargando momento...</div>
        )}
        
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90 transition-opacity duration-300 ease-out ${hideUI ? 'opacity-0' : 'opacity-100'}`} />

        <div className={`relative z-20 flex items-center justify-between px-5 pt-6 transition-opacity duration-300 ease-out ${hideUI ? 'opacity-0' : 'opacity-100'}`}>
          <button onClick={(e) => { e.stopPropagation(); navigate({ to: "/dashboard" }); }} className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur">
            <X size={18} />
          </button>
          
          <div className="rounded-full border border-white/10 bg-black/40 backdrop-blur px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-destructive">
            Juzgando la noche
          </div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} 
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/40 backdrop-blur text-white pointer-events-auto transition active:scale-95"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>

        <div className={`relative z-20 mt-3 flex gap-1 px-5 pointer-events-none transition-opacity duration-300 ease-out ${hideUI ? 'opacity-0' : 'opacity-100'}`}>
          {Array.from({ length: totalSlides }).map((_, i) => {
            let barWidth = i < currentIndex ? 100 : i === currentIndex ? progress : 0;
            return (
              <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-white transition-all duration-75 ease-linear" style={{ width: `${barWidth}%` }} />
              </div>
            );
          })}
        </div>

        <div className={`absolute bottom-8 inset-x-4 z-20 pointer-events-none transition-opacity duration-300 ease-out ${hideUI ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
          <div className="mb-4 flex items-center gap-3">
            <img src={currentPhoto?.memberAvatar} className="h-10 w-10 rounded-full bg-white/10 object-cover border border-white/20" alt="Avatar" />
            <div>
              <div className="text-xs uppercase tracking-widest text-white/70">
                {currentPhoto?.member || "Anónimo"}
              </div>
              <div className="text-lg font-medium text-white drop-shadow-md leading-tight">
                {currentPhoto?.caption || "Momento freestyle"}
              </div>
            </div>
            {currentPhoto?.type === "reto" && (
              <div className="ml-auto rounded-full bg-[#a33333] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white shadow-sm">
                RETO
              </div>
            )}
          </div>

          <div className="glass-strong pointer-events-auto rounded-[28px] p-5 border border-white/15 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1.5">
                <div className="text-[9px] uppercase tracking-widest text-white/60 font-medium">Juzgar momento</div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={(e) => {
                        e.stopPropagation();
                        rateMutation.mutate({ mediaId: currentPhoto.id, stars: star });
                      }}
                      className="p-1.5 transition active:scale-75"
                    >
                      <Star
                        size={22}
                        className={
                          star <= Math.round(currentPhoto?.averageStars || 0)
                            ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]"
                            : "text-white/20"
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>

              {currentPhoto?.type === "reto" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("¿Tumbar reto? Si la mayoría vota igual, perderá los puntos.")) {
                      dislikeMutation.mutate({ challengeId: currentPhoto.challengeId || currentPhoto.id });
                    }
                  }}
                  disabled={dislikeMutation.isPending}
                  className="flex items-center gap-2 rounded-full bg-destructive/15 border border-destructive/30 px-5 py-3 text-xs font-bold text-destructive uppercase tracking-widest transition active:scale-95"
                >
                  <ThumbsDown size={16} /> Fake
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}