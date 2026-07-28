import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/PhoneFrame";
import { TopBar } from "@/components/TopBar";
import { FloatingNav } from "@/components/FloatingNav";
import { getEvents, getRecentMedia, rateMedia } from "@/api/events.server";
import { getGroupInfo } from "@/api/groups.server"; 
import { getStoredGroupCode, getStoredMemberId } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Play, X } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/album")({
  head: () => ({
    meta: [
      { title: "Bounty · Álbum" },
      { name: "description", content: "Toda la locura de tus noches, ordenada por evento." },
    ],
  }),
  component: Album,
});

// Función mejorada para detectar vídeos incluso si vienen en Base64 o de servidores como Cloudinary
const isVideo = (url?: string) => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('.mp4') || 
         lowerUrl.includes('.webm') || 
         lowerUrl.includes('.mov') || 
         lowerUrl.includes('data:video') || 
         lowerUrl.includes('/video/');
};
const getVideoPoster = (url?: string) => {
  if (!url) return "";
  // Si detectamos que es un vídeo de Cloudinary, cambiamos la extensión a .jpg
  if (url.includes("/video/upload/")) {
    return url.replace(/\.[^/.]+$/, ".jpg");
  }
  return url;
};

function Album() {
  const navigate = useNavigate();
  const groupCode = getStoredGroupCode();
  const memberId = getStoredMemberId();
  const queryClient = useQueryClient();
  
  const { data: groupInfo } = useQuery({
    queryKey: ["groupInfo", groupCode],
    queryFn: () => getGroupInfo({ data: { code: groupCode! } }),
    enabled: !!groupCode,
  });

  const seasonName = groupInfo?.group.season || "la temporada actual";

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["events", groupCode],
    queryFn: () => getEvents({ data: { groupCode: groupCode! } }),
    enabled: !!groupCode,
  });

  const { data: recentPhotos = [], isLoading: loadingPhotos } = useQuery({
    queryKey: ["recentMedia", groupCode],
    queryFn: () => getRecentMedia({ data: { groupCode: groupCode!, limit: 6 } }),
    enabled: !!groupCode,
  });

  const rateMutation = useMutation({
    mutationFn: ({ mediaId, stars }: { mediaId: string; stars: number }) => 
      rateMedia({ data: { mediaId, memberId: memberId!, stars } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recentMedia", groupCode] });
    }
  });

  const [featured, ...rest] = events;
  const isLoading = loadingEvents || loadingPhotos;

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [slideDir, setSlideDir] = useState<"left" | "right">("right");

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null || viewerIndex === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchStart - touchEnd;
    
    if (distance > 50 && viewerIndex < recentPhotos.length - 1) {
      setSlideDir("right");
      setViewerIndex(viewerIndex + 1);
    }
    if (distance < -50 && viewerIndex > 0) {
      setSlideDir("left");
      setViewerIndex(viewerIndex - 1);
    }
    setTouchStart(null);
  };

  if (isLoading) {
    return (
      <PhoneFrame>
        <TopBar title="Álbum" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Cargando álbum...</div>
        </div>
        <FloatingNav />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <TopBar title="Álbum" />
      <div className="px-5 pb-40">
        <h1 className="mt-2 text-4xl leading-tight">Recuerdos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {events.length > 0 ? `${events.length} eventos · ` : ''}
          <span className="text-foreground">{seasonName}</span>
        </p>

        {events.length === 0 ? (
          <div className="mt-8 text-center text-sm text-muted-foreground py-8">
            Aún no hay eventos. ¡Empieza una noche para llenar el álbum!
          </div>
        ) : (
          <>
            <Link to="/album-event" search={{ eventId: featured.id }} className="mt-6 block overflow-hidden rounded-[32px] hairline">
              <div className="relative aspect-[4/5]">
                <img src={getVideoPoster(featured.cover)} alt={featured.name} loading="lazy" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <div className="text-xs uppercase tracking-widest text-white/70">{featured.date}</div>
                  <div className="mt-1 text-3xl font-medium text-white">{featured.name}</div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-white/80">
                    <span>{featured.photos} momentos</span>
                    <span className="flex items-center gap-1">
                      <Star size={12} className="fill-current text-yellow-400" /> {featured.stars}
                    </span>
                  </div>
                </div>
                <button
                onClick={(e) => {
                  e.preventDefault();
                  navigate({ to: "/recap", search: { eventId: featured.id } });
                }}
                className="absolute right-5 top-5 glass flex items-center gap-2 rounded-full px-3 py-1.5 text-xs z-10 text-white border border-white/10 transition active:scale-95"
              >
                <Play size={12} className="fill-current" /> Recap
              </button>
              </div>
            </Link>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {rest.map((e) => (
                <Link key={e.id} to="/album-event" search={{ eventId: e.id }} className="overflow-hidden rounded-3xl hairline block transition active:scale-95">
                  <div className="relative aspect-[3/4]">
                    <img src={getVideoPoster(e.cover)} alt={e.name} loading="lazy" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <div className="text-[10px] uppercase tracking-widest text-white/60">{e.date}</div>
                      <div className="mt-0.5 text-base font-medium text-white">{e.name}</div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-white/70">
                        <span>{e.photos} fotos</span>
                        <span className="flex items-center gap-1"><Star size={10} className="fill-current text-yellow-400" /> {e.stars}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="mt-6 glass rounded-3xl p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Fin de temporada</div>
          <div className="mt-1 text-lg font-medium">Las mejores fotos de la temporada</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Se generan al terminar {seasonName}.
          </div>
        </div>

        {recentPhotos.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-medium mb-4">Últimos momentos</h2>
            <div className="columns-3 gap-2 space-y-2">
              {recentPhotos.map((photo: any, index: number) => (
                <div 
                  key={photo.id} 
                  onClick={() => setViewerIndex(index)}
                  className="relative break-inside-avoid overflow-hidden rounded-[16px] hairline cursor-pointer group"
                >
                  {/* --- RENDERIZADO PARA LA GALERÍA (FOTOGRAMA DE VÍDEO CON ICONO O IMAGEN) --- */}
                  {isVideo(photo.url) ? (
                    <>
                      <video 
                        src={photo.url.startsWith('data:') ? photo.url : `${photo.url}#t=0.001`} 
                        preload="metadata" 
                        muted 
                        playsInline 
                        className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      <div className="absolute inset-0 grid place-items-center pointer-events-none z-10">
                        <div className="bg-black/40 backdrop-blur-md rounded-full p-2 text-white shadow-lg">
                          <Play size={16} className="fill-current ml-0.5" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <img src={photo.url} alt={photo.caption || "Foto reciente"} className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500" />
                  )}
                  
                  {photo.type === "reto" ? (
                     <div className="absolute top-1.5 left-1.5 bg-[#a33333]/90 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-sm backdrop-blur-sm shadow-sm z-20">RETO</div>
                  ) : (
                     <div className="absolute top-1.5 left-1.5 bg-[#3355a3]/90 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-sm backdrop-blur-sm shadow-sm z-20">FREE</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      <FloatingNav />

      {/* VISOR A PANTALLA COMPLETA */}
      {viewerIndex !== null && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black h-[100dvh] w-full touch-none overflow-hidden">
          <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between p-5 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <button onClick={() => setViewerIndex(null)} className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur text-white transition active:scale-95">
              <X size={18} />
            </button>
            <div className="text-xs text-white/70 font-medium drop-shadow-md">
              {viewerIndex + 1} / {recentPhotos.length}
            </div>
          </div>

          <div 
            className="flex-1 w-full h-full flex items-center justify-center relative overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* --- VISUALIZADOR PARA CUANDO SE ABRE EL VÍDEO (CON CONTROLES NATIVOS) --- */}
            {isVideo(recentPhotos[viewerIndex].url) ? (
              <video 
                key={`vid-${viewerIndex}`}
                src={recentPhotos[viewerIndex].url} 
                controls
                playsInline
                className={`w-full max-h-[75vh] object-contain animate-in fade-in duration-300 ${slideDir === "right" ? "slide-in-from-right-[100px]" : "slide-in-from-left-[100px]"}`} 
              />
            ) : (
              <img 
                key={`img-${viewerIndex}`}
                src={recentPhotos[viewerIndex].url} 
                className={`w-full max-h-full object-contain animate-in fade-in duration-300 ${slideDir === "right" ? "slide-in-from-right-[100px]" : "slide-in-from-left-[100px]"}`} 
                alt="Visualizador" 
              />
            )}
          </div>

          <div className="absolute bottom-0 inset-x-0 p-6 pt-12 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
            
            <div className="flex items-center justify-between mb-3 pointer-events-auto">
              <div className="flex flex-col gap-2">
                {recentPhotos[viewerIndex].type === "reto" ? (
                  <span className="bg-[#a33333] px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest text-white w-fit shadow-md">RETO</span>
                ) : (
                  <span className="bg-[#3355a3] px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest text-white w-fit shadow-md">FREE</span>
                )}
                
                <div className="text-xl font-medium text-white leading-tight drop-shadow-md">
                  {recentPhotos[viewerIndex].caption || "Sin título"}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <div className="text-[9px] uppercase tracking-widest text-white/50">Valorar</div>
                <div className="flex items-center glass rounded-full px-2 py-1 border border-white/10">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={(e) => {
                        e.stopPropagation();
                        rateMutation.mutate({ mediaId: recentPhotos[viewerIndex].id, stars: star });
                      }}
                      disabled={rateMutation.isPending}
                      className="p-1 transition active:scale-75"
                    >
                      <Star
                        size={18}
                        className={
                          star <= Math.round(recentPhotos[viewerIndex].averageStars || 0)
                            ? "fill-yellow-400 text-yellow-400 drop-shadow-md"
                            : "text-white/30"
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-xs text-white/60 flex items-center gap-2">
              <img src={recentPhotos[viewerIndex].memberAvatar} alt="" className="w-5 h-5 rounded-full bg-white/20 object-cover" />
              Subido por {recentPhotos[viewerIndex].member}
            </div>
            
          </div>
        </div>
      )}
    </PhoneFrame>
  );
}