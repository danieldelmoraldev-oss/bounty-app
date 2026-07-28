import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/PhoneFrame";
import { TopBar } from "@/components/TopBar";
import { FloatingNav } from "@/components/FloatingNav";
import { Avatar } from "@/components/Avatar";
import { getMemberProfile, getMemberMedia } from "@/api/members.server";
import { getStoredGroupCode, getStoredMemberId, getStoredAvatar, isAuthenticated } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Settings, Crown, Trophy, Flame, Gem, Star, X, Play } from "lucide-react"; // <-- AÑADIDO Play
import { avatarOptions } from "@/data/avatars";
import { getTitleForMember, titleDefinitions } from "@/lib/titles";
import { useState } from "react";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Bounty · Perfil" },
      { name: "description", content: "Tu historial, marco, título y estadísticas dentro del grupo." },
    ],
  }),
  component: Profile,
});

// --- NUEVO: Funciones helper para vídeos ---
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

function Profile() {
  const navigate = useNavigate();
  const groupCode = getStoredGroupCode();
  const memberId = getStoredMemberId();

  if (!isAuthenticated() || !groupCode || !memberId) {
    navigate({ to: "/" });
    return null;
  }

  const storedAvatar = getStoredAvatar();
  const avatarOption = avatarOptions.find(a => a.emoji === storedAvatar);
  
  // Query del perfil
  const { data: me, isLoading: loadingProfile } = useQuery({
    queryKey: ["memberProfile", memberId, groupCode],
    queryFn: () => getMemberProfile({ data: { memberId: memberId!, groupCode: groupCode! } }),
  });

  // Query del historial de fotos del usuario
  const { data: myMedia = [], isLoading: loadingMedia } = useQuery({
    queryKey: ["memberMedia", memberId],
    queryFn: () => getMemberMedia({ data: { memberId: memberId!, groupCode: groupCode! } }),
    enabled: !!memberId && !!groupCode,
  });

  // Estados para el visor de imágenes (Lightbox)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [slideDir, setSlideDir] = useState<"left" | "right">("right");

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null || viewerIndex === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchStart - touchEnd;
    
    if (distance > 50 && viewerIndex < myMedia.length - 1) {
      setSlideDir("right");
      setViewerIndex(viewerIndex + 1);
    }
    if (distance < -50 && viewerIndex > 0) {
      setSlideDir("left");
      setViewerIndex(viewerIndex - 1);
    }
    setTouchStart(null);
  };

  
  const unlockedFrames = (me as any)?.unlockedFrames || ["none"];
  const unlockedTitles = (me as any)?.unlockedTitles || [];

  if (loadingProfile || loadingMedia) {
    return (
      <PhoneFrame>
        <TopBar/>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Cargando perfil...</div>
        </div>
        <FloatingNav />
      </PhoneFrame>
    );
  }

  if (!me) {
    return (
      <PhoneFrame>
        <TopBar/>
        <div className="text-center text-destructive mt-10">Perfil no encontrado</div>
        <FloatingNav />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <TopBar />
      <div className="pb-40">
        
        {/* Cabecera del Perfil */}
        <div className="relative mx-5 overflow-hidden rounded-[32px]">
          <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
          <div className="relative flex flex-col items-center px-6 pb-6 pt-8 text-center">
            {avatarOption ? (
              <div className={`h-24 w-24 rounded-full bg-gradient-to-br ${avatarOption.color} flex items-center justify-center text-5xl`}>
                {avatarOption.emoji}
              </div>
            ) : (
              <Avatar src={storedAvatar || me.avatar} name={me.name} size={104} frame={me.frame} />
            )}
            <div className="mt-4 text-3xl font-medium">{me.name}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-white/90 bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
            <Crown size={12} className="text-amber-400" /> {me.title || "Fiestero Novato"}
          </div>
            <div className="mt-4 flex gap-6">
              <Stat label="Puntos" value={me.points.toString()} />
              <Stat label="Rank" value={`#${me.rank}`} />
              <Stat label="Miembros" value={me.totalMembers.toString()} />
            </div>
          </div>
        </div>

        {/* Tarjetas de Estadísticas */}
<div className="mt-5 px-5">
  <div className="grid grid-cols-6 gap-3">
    
    <div className="col-span-3 rounded-3xl bg-card p-4 hairline">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Gem size={12} /> Saldo
      </div>
      <div className="mt-2 text-3xl font-light gradient-text">{me.balance.toLocaleString()}</div>
    </div>
    
    <div className="col-span-3 rounded-3xl bg-card p-4 hairline">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Flame size={12} /> Racha
      </div>
      <div className="mt-2 text-3xl font-light">0 <span className="text-sm text-muted-foreground">noches</span></div>
    </div>

    {/* Marcos y Títulos con datos reales */}
    <div className="col-span-6 rounded-3xl bg-card p-4 hairline">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Trophy size={12} /> Marcos y títulos
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-muted-foreground">
            Marcos: {unlockedFrames.filter((f: string) => f !== "none").length} / 4
          </span>
          <span className="text-[10px] text-muted-foreground">
            Títulos: {unlockedTitles.length} / {titleDefinitions.length}
          </span>
        </div>
      </div>
      
      <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar">
        {titleDefinitions
          .filter((t) => unlockedTitles.includes(t.id))
          .map((t) => (
            <div key={t.id} className="shrink-0 text-center">
              <Avatar src="" name={me.name} size={54} frame={t.frame || "none"} />
              <div className="mt-1 text-[10px] capitalize text-muted-foreground">{t.name}</div>
            </div>
          ))}
      </div>
      
      {unlockedTitles.length === 0 && (
        <div className="mt-2 text-center text-xs text-muted-foreground py-2">
          Aún no has desbloqueado títulos.
        </div>
      )}
    </div>

  </div>
</div>

        {/* Sección Dinámica: Tus Momentos */}
        <div className="mt-8 px-5">
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="text-xl font-medium">Tus momentos</h2>
            <div className="text-xs text-muted-foreground">
              {myMedia.length > 0 ? `${myMedia.length} fotos` : "Sin fotos aún"}
            </div>
          </div>
          
          {myMedia.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              Aún no hay fotos. ¡Supera un reto o sube un momento para empezar tu historial!
            </div>
          ) : (
            <div className="columns-3 gap-2 space-y-2">
              {myMedia.map((photo: any, index: number) => (
                <div 
                  key={photo.id} 
                  onClick={() => setViewerIndex(index)}
                  className="relative break-inside-avoid overflow-hidden rounded-[16px] hairline cursor-pointer group"
                >
                  {/* --- MODIFICADO: RENDERIZADO PARA LA GALERÍA DEL PERFIL --- */}
                  {isVideo(photo.url) ? (
                    <>
                      <img 
                        src={getVideoPoster(photo.url)} 
                        alt={photo.caption || "Mi video"} 
                        className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      <div className="absolute inset-0 grid place-items-center pointer-events-none z-10">
                        <div className="bg-black/40 backdrop-blur-md rounded-full p-2 text-white shadow-lg">
                          <Play size={16} className="fill-current ml-0.5" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <img 
                      src={photo.url} 
                      alt={photo.caption || "Mi foto"} 
                      className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  )}
                  
                  {photo.type === "reto" ? (
                     <div className="absolute top-1.5 left-1.5 bg-[#a33333]/90 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-sm backdrop-blur-sm shadow-sm z-20">RETO</div>
                  ) : (
                     <div className="absolute top-1.5 left-1.5 bg-[#3355a3]/90 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-sm backdrop-blur-sm shadow-sm z-20">FREE</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <FloatingNav />

      {/* VISOR DE IMÁGENES (Lightbox) */}
      {viewerIndex !== null && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black h-[100dvh] w-full touch-none overflow-hidden">
          <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between p-5 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <button onClick={() => setViewerIndex(null)} className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur text-white transition active:scale-95">
              <X size={18} />
            </button>
            <div className="text-xs text-white/70 font-medium drop-shadow-md">
              {viewerIndex + 1} / {myMedia.length}
            </div>
          </div>

          <div 
            className="flex-1 w-full h-full flex items-center justify-center relative overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* --- MODIFICADO: VISUALIZADOR PARA VÍDEOS EN EL PERFIL --- */}
            {isVideo(myMedia[viewerIndex].url) ? (
              <video 
                key={`vid-${viewerIndex}`}
                src={myMedia[viewerIndex].url} 
                poster={getVideoPoster(myMedia[viewerIndex].url)}
                controls
                playsInline
                className={`w-full max-h-[75vh] object-contain animate-in fade-in duration-300 ${slideDir === "right" ? "slide-in-from-right-[100px]" : "slide-in-from-left-[100px]"}`} 
              />
            ) : (
              <img 
                key={`img-${viewerIndex}`}
                src={myMedia[viewerIndex].url} 
                className={`w-full max-h-full object-contain animate-in fade-in duration-300 ${slideDir === "right" ? "slide-in-from-right-[100px]" : "slide-in-from-left-[100px]"}`} 
                alt="Visualizador" 
              />
            )}
          </div>

          <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
            <div className="flex items-center gap-2 mb-2 pointer-events-auto">
              {myMedia[viewerIndex].type === "reto" ? (
                <span className="bg-[#a33333] px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest text-white shadow-md">RETO</span>
              ) : (
                <span className="bg-[#3355a3] px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest text-white shadow-md">FREE</span>
              )}
              {myMedia[viewerIndex].averageStars > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] text-yellow-400 backdrop-blur-md shadow-md">
                  <Star size={10} className="fill-current" /> {myMedia[viewerIndex].averageStars}
                </span>
              )}
            </div>
            <div className="text-xl font-medium text-white leading-tight drop-shadow-md pointer-events-auto">
              {myMedia[viewerIndex].caption || "Sin título"}
            </div>
          </div>
        </div>
      )}
    </PhoneFrame>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-light">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-white/60">{label}</div>
    </div>
  );
}