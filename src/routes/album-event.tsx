import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/PhoneFrame";
import { TopBar } from "@/components/TopBar";
import { getEventDetail, rateMedia } from "@/api/events.server";
import { dislikeChallenge } from "@/api/challenges.server";
import { getStoredGroupCode, getStoredMemberId } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Filter, Play, Bell, X, ThumbsDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/album-event")({
  head: () => ({
    meta: [
      { title: "Bounty · Evento" },
      { name: "description", content: "Detalle del evento con todas las fotos y retos." },
    ],
  }),
  validateSearch: (search: Record<string, string | undefined>) => ({
    eventId: search.eventId || "",
  }),
  component: AlbumEvent,
});

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

function AlbumEvent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { eventId } = Route.useSearch();
  const memberId = getStoredMemberId();

  const { data: detail, isLoading } = useQuery({
    queryKey: ["eventDetail", eventId],
    queryFn: () => getEventDetail({ data: { eventId } }),
    enabled: !!eventId,
  });

  const rateMutation = useMutation({
    mutationFn: ({ mediaId, stars }: { mediaId: string; stars: number }) => 
      rateMedia({ data: { mediaId, memberId: memberId!, stars } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventDetail", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    }
  });

  const dislikeMutation = useMutation({
    mutationFn: ({ challengeId }: { challengeId: string }) =>
      dislikeChallenge({ data: { challengeId, memberId: memberId! } }),
    onSuccess: (data) => {
      if (data.revoked) toast.error("¡Mayoría! Reto tumbado y puntos restados.");
      else toast.success("No me gusta registrado.");
      queryClient.invalidateQueries({ queryKey: ["eventDetail", eventId] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [slideDir, setSlideDir] = useState<"left" | "right">("right");
  const [activeFilter, setActiveFilter] = useState<"Todo" | "Retos" | "Freestyle" | "5★">("Todo");

  if (isLoading) return <PhoneFrame><TopBar back="/album" /><div className="flex h-[60vh] items-center justify-center text-muted-foreground">Cargando...</div></PhoneFrame>;
  if (!detail) return <PhoneFrame><TopBar back="/album" /><div className="mt-10 text-center text-destructive">Evento no encontrado</div></PhoneFrame>;

  const mediaChallengesIds = detail.media.filter((m: any) => m.type === "reto").map((m: any) => m.challengeId);
  const standaloneChallenges = detail.challenges
     .filter((c: any) => c.status === "done" && !mediaChallengesIds.includes(c.id))
     .map((c: any) => ({ ...c, source: "challenge", type: "reto", url: c.submittedMedia, caption: `Nivel ${c.level}: ${c.title}` }));

  const allMedia = [
    ...detail.media.map((m: any) => ({ ...m, source: m.type === "reto" ? "challenge" : "media" })),
    ...standaloneChallenges
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredMedia = allMedia.filter(item => {
    if (activeFilter === "Retos") return item.type === "reto";
    if (activeFilter === "Freestyle") return item.type === "free";
    if (activeFilter === "5★") return (item.averageStars || 0) >= 4.5;
    return true;
  });

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null || viewerIndex === null) return;
    const distance = touchStart - e.changedTouches[0].clientX;
    if (distance > 50 && viewerIndex < filteredMedia.length - 1) { setSlideDir("right"); setViewerIndex(viewerIndex + 1); }
    if (distance < -50 && viewerIndex > 0) { setSlideDir("left"); setViewerIndex(viewerIndex - 1); }
    setTouchStart(null);
  };

  return (
    <PhoneFrame>
      <TopBar back="/album" right={<button className="grid h-10 w-10 place-items-center rounded-full bg-white/5 border border-white/10"><Bell size={16} /></button>} />
      <div className="px-5 pb-40">
        <div className="mt-2 flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{detail.event.date}</div>
            <h1 className="mt-1 text-4xl leading-tight font-display">{detail.event.name}</h1>
          </div>
          <button 
            onClick={() => navigate({ 
              to: detail.event.isNight ? "/night-recap" : "/recap", 
              search: { eventId } 
            })} 
            className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium border border-white/10 text-white mt-1 transition active:scale-95 shadow-md"
          >
            <Play size={12} className="fill-current" /> Recap
          </button>
        </div>
        
        <div className="mt-5 flex items-center gap-2">
          <div className="flex flex-1 gap-2 overflow-x-auto no-scrollbar py-1">
            {(["Todo", "Retos", "Freestyle", "5★"] as const).map((filter) => (
              <button key={filter} onClick={() => { setActiveFilter(filter); setViewerIndex(null); }} className={`shrink-0 rounded-full px-4 py-1.5 text-[11px] font-medium hairline transition ${activeFilter === filter ? "bg-white text-black shadow-md" : "bg-card text-muted-foreground"}`}>{filter}</button>
            ))}
          </div>
          <button className="glass grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 text-muted-foreground transition active:scale-95"><Filter size={12} /></button>
        </div>

        {detail.childEvents && detail.childEvents.length > 1 && activeFilter === "Todo" ? (
          <div className="mt-6 grid grid-cols-2 gap-3 animate-in fade-in">
            {detail.childEvents.map((night: any) => (
              <Link key={night.id} to="/album-event" search={{ eventId: night.id }} className="overflow-hidden rounded-3xl hairline block transition active:scale-95">
                <div className="relative aspect-[3/4]">
                  <img src={getVideoPoster(night.cover)} alt={night.name} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="text-[10px] uppercase tracking-widest text-white/60">{night.date}</div>
                    <div className="mt-0.5 text-base font-medium text-white">{night.name}</div>
                    <div className="mt-1 text-[10px] text-white/70">{night.photos} momentos</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="mt-16 text-center text-sm text-muted-foreground">Aún no hay fotos en esta carpeta.</div>
        ) : (
          <div className="mt-6 columns-2 gap-3 space-y-3 animate-in fade-in">
            {filteredMedia.map((item: any, index: number) => (
              <div key={`${item.id}`} onClick={() => setViewerIndex(index)} className="break-inside-avoid relative overflow-hidden rounded-[24px] hairline cursor-pointer group">
                
                {isVideo(item.url || item.cover) ? (
                  <>
                    <video 
                      src={(item.url || item.cover).startsWith('data:') ? (item.url || item.cover) : `${item.url || item.cover}#t=0.001`} 
                        preload="metadata" 
                        muted 
                        playsInline 
                        className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    <div className="absolute inset-0 grid place-items-center pointer-events-none z-10">
                      <div className="bg-black/40 backdrop-blur-md rounded-full p-2.5 text-white shadow-lg">
                        <Play size={16} className="fill-current ml-0.5" />
                      </div>
                    </div>
                  </>
                ) : (
                  <img src={item.url || item.cover} alt="Momento" className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none z-10" />
                <div className="absolute top-2.5 left-2.5 z-20">
                  <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest text-white backdrop-blur-sm shadow-sm ${item.type === "reto" ? "bg-[#a33333]/90" : "bg-[#3355a3]/90"}`}>
                    {item.type === "reto" ? "RETO" : "FREE"}
                  </div>
                </div>
                {item.averageStars > 0 && (
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] text-yellow-400 backdrop-blur-md z-20">
                    <Star size={8} className="fill-current" /> {item.averageStars}
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-3 z-20">
                  <div className="text-[11px] font-medium text-white leading-tight drop-shadow-md">{item.caption || "Sin título"}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewerIndex !== null && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black h-[100dvh] w-full touch-none overflow-hidden">
          <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between p-5 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <button onClick={() => setViewerIndex(null)} className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur text-white transition active:scale-95"><X size={18} /></button>
            <div className="text-xs text-white/70 font-medium drop-shadow-md">{viewerIndex + 1} / {filteredMedia.length}</div>
          </div>

          <div className="flex-1 w-full h-full flex items-center justify-center relative overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {isVideo(filteredMedia[viewerIndex].url || filteredMedia[viewerIndex].cover) ? (
              <video 
                key={`vid-${viewerIndex}`}
                src={filteredMedia[viewerIndex].url || filteredMedia[viewerIndex].cover} 
                controls
                playsInline
                className={`w-full max-h-[75vh] object-contain animate-in fade-in duration-300 ${slideDir === "right" ? "slide-in-from-right-[100px]" : "slide-in-from-left-[100px]"}`} 
              />
            ) : (
              <img 
                key={`img-${viewerIndex}`}
                src={filteredMedia[viewerIndex].url || filteredMedia[viewerIndex].cover} 
                className={`w-full max-h-full object-contain animate-in fade-in duration-300 ${slideDir === "right" ? "slide-in-from-right-[100px]" : "slide-in-from-left-[100px]"}`} 
                alt="Visualizador" 
              />
            )}
          </div>

          <div className="absolute bottom-0 inset-x-0 p-6 pt-12 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
            <div className="flex items-center justify-between mb-3 pointer-events-auto">
              <div className="flex flex-col gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest text-white w-fit shadow-md ${filteredMedia[viewerIndex].type === "reto" ? "bg-[#a33333]" : "bg-[#3355a3]"}`}>
                  {filteredMedia[viewerIndex].type === "reto" ? "RETO" : "FREE"}
                </span>
                <div className="text-xl font-medium text-white leading-tight drop-shadow-md">{filteredMedia[viewerIndex].caption || "Sin título"}</div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <div className="text-[9px] uppercase tracking-widest text-white/50">Valorar</div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center glass rounded-full px-2 py-1 border border-white/10">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={(e) => { e.stopPropagation(); rateMutation.mutate({ mediaId: filteredMedia[viewerIndex].id, stars: star }); }} disabled={rateMutation.isPending} className="p-1 transition active:scale-75">
                        <Star size={18} className={star <= Math.round(filteredMedia[viewerIndex].averageStars || 0) ? "fill-yellow-400 text-yellow-400 drop-shadow-md" : "text-white/30"} />
                      </button>
                    ))}
                  </div>

                  {filteredMedia[viewerIndex].type === "reto" && (
                    <button onClick={(e) => { e.stopPropagation(); dislikeMutation.mutate({ challengeId: filteredMedia[viewerIndex].challengeId || filteredMedia[viewerIndex].id }); }} disabled={dislikeMutation.isPending} className="grid h-8 w-8 place-items-center rounded-full bg-destructive/20 text-destructive border border-destructive/30 transition active:scale-90">
                      <ThumbsDown size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="text-xs text-white/60 flex items-center gap-2">
              <img src={filteredMedia[viewerIndex].memberAvatar} alt="" className="w-5 h-5 rounded-full bg-white/20 object-cover" />
              Subido por {filteredMedia[viewerIndex].member || "Alguien"}
            </div>
          </div>
        </div>
      )}
    </PhoneFrame>
  );
}