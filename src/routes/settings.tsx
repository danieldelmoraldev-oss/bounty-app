import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/PhoneFrame";
import { TopBar } from "@/components/TopBar";
import { FloatingNav } from "@/components/FloatingNav";
import { getStoredAvatar, getStoredMemberName, getStoredMemberId, getStoredGroupCode, setAuth, clearAuth, clearActiveGroup } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { User, Bell, Shield, LogOut, ChevronRight, Camera, Copy, Check, Crown, Award, Loader2, Users } from "lucide-react";
import QRCode from "react-qr-code";
import { avatarOptions, type AvatarOption } from "@/data/avatars";
import { getMemberProfile, updateProfile } from "@/api/members.server";
import { toast } from "sonner"; // Añadido para el feedback del botón

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Bounty · Ajustes" },
      { name: "description", content: "Cambia tu avatar, nombre y preferencias." },
    ],
  }),
  component: SettingsPage,
});

// Paleta de colores para los marcos
const frameStyles: Record<string, string> = {
  gold: "ring-2 ring-[#FFD700] ring-offset-2 ring-offset-[#0f0f16] shadow-[0_0_15px_rgba(255,215,0,0.6)]",
  violet: "ring-2 ring-[#8A2BE2] ring-offset-2 ring-offset-[#0f0f16] shadow-[0_0_15px_rgba(138,43,226,0.6)]",
  electric: "ring-2 ring-[#00FFFF] ring-offset-2 ring-offset-[#0f0f16] shadow-[0_0_15px_rgba(0,255,255,0.6)]",
  ember: "ring-2 ring-[#FF4500] ring-offset-2 ring-offset-[#0f0f16] shadow-[0_0_15px_rgba(255,69,0,0.6)]",
  none: "border border-white/10",
};

function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const memberId = getStoredMemberId();
  const groupCode = getStoredGroupCode();
  const currentAvatar = getStoredAvatar();
  const currentName = getStoredMemberName();

  // 1. Cargar el perfil para saber qué tiene desbloqueado
  const { data: profile, isLoading } = useQuery({
    queryKey: ["memberProfile", memberId, groupCode],
    queryFn: () => getMemberProfile({ data: { memberId: memberId!, groupCode: groupCode! } }),
    enabled: !!memberId && !!groupCode,
  });

  const [name, setName] = useState(currentName || "");
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarOption | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<string>("none");
  const [selectedTitle, setSelectedTitle] = useState<string>("");
  const [copied, setCopied] = useState(false);
  
  // --- NUEVO: Estado para OneSignal ---
  const [pushEnabled, setPushEnabled] = useState(false);

  // Efecto para leer el estado real de OneSignal
  useEffect(() => {
    const initOneSignalState = () => {
      const OneSignal = (window as any).OneSignal;
      if (OneSignal && OneSignal.User && OneSignal.User.PushSubscription) {
        // Leemos si el usuario tiene las notificaciones activadas
        setPushEnabled(OneSignal.User.PushSubscription.optedIn);
        
        // Escuchamos si las cambia desde otro sitio (ej: los ajustes del propio móvil)
        OneSignal.User.PushSubscription.addEventListener("change", (event: any) => {
          setPushEnabled(event.current.optedIn);
        });
      }
    };

    initOneSignalState();
    // Le damos un pequeño margen por si OneSignal tarda unos milisegundos más en inyectarse
    setTimeout(initOneSignalState, 500);
  }, []);

  // Función para apagar/encender notificaciones
  const toggleNotifications = async () => {
    const OneSignal = (window as any).OneSignal;
    if (!OneSignal || !OneSignal.User) {
      toast.error("El sistema de notificaciones está cargando, inténtalo en un segundo.");
      return;
    }

    try {
      if (pushEnabled) {
        await OneSignal.User.PushSubscription.optOut();
        setPushEnabled(false);
        toast.info("Notificaciones silenciadas");
      } else {
        await OneSignal.User.PushSubscription.optIn();
        setPushEnabled(true);
        toast.success("Notificaciones reactivadas");
      }
    } catch (error) {
      toast.error("No se ha podido cambiar el estado de las notificaciones.");
    }
  };

  // Cuando el perfil cargue, seteamos los cosméticos que ya lleva puestos
  useEffect(() => {
    if (profile) {
      if (profile.name) setName(profile.name);
      if (profile.frame) setSelectedFrame(profile.frame);
      if (profile.title) setSelectedTitle(profile.title);
      
      const matchedAvatar = avatarOptions.find(a => a.emoji === profile.avatar);
      if (matchedAvatar) setSelectedAvatar(matchedAvatar);
    }
  }, [profile]);

  // 2. Mutación real conectada al servidor
  const updateMutation = useMutation({
    mutationFn: async () => {
      return updateProfile({
        data: {
          memberId: memberId!,
          name,
          avatar: selectedAvatar?.emoji || currentAvatar || "",
          frame: selectedFrame,
          title: selectedTitle
        }
      });
    },
    onSuccess: () => {
      if (selectedAvatar) setAuth(memberId!, groupCode!, name, selectedAvatar.emoji);
      queryClient.invalidateQueries({ queryKey: ["memberProfile"] });
      queryClient.invalidateQueries({ queryKey: ["groupInfo"] });
      queryClient.invalidateQueries({ queryKey: ["ranking"] });
      navigate({ to: "/profile" });
    },
  });

  const joinUrl = `${window.location.origin}/auth?action=join&code=${groupCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(groupCode || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    updateMutation.mutate();
  };

  const handleLogout = () => {
    clearAuth();
    navigate({ to: "/" });
  };

  const handleSwitchGroup = () => {
    clearActiveGroup(); 
    navigate({ to: "/" }); 
  };

  // Limpiamos duplicados en los arrays por si acaso
  const unlockedFrames = ["none", ...((profile as any)?.unlockedFrames || [])].filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
  const unlockedTitles = ((profile as any)?.unlockedTitles || []).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

  if (isLoading) {
    return (
      <PhoneFrame>
        <TopBar back="/profile" right={<div className="h-10 w-10" />} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <TopBar back="/profile" right={<div className="h-10 w-10" />} />
      <div className="px-5 pb-40">
        <h1 className="mt-6 text-[34px] leading-tight">Ajustes</h1>
        <p className="mt-2 text-sm text-muted-foreground">Personaliza tu perfil y preferencias.</p>

        {/* --- Tarjeta de Invitación (QR) --- */}
        <div className="mt-6 flex flex-col items-center rounded-[28px] bg-card p-8 hairline text-center">
          <div className="mb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Invita a tus amigos
          </div>
          
          <div className="mb-5 rounded-2xl bg-white p-3">
            <QRCode value={joinUrl} size={150} />
          </div>

          <div className="font-display text-4xl font-bold tracking-[0.15em] gradient-text">
            {groupCode}
          </div>

          <button 
            onClick={handleCopy}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-white/5 py-3 text-sm transition active:scale-95 hairline"
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            {copied ? "Copiado al portapapeles" : "Copiar código de sala"}
          </button>
        </div>

        {/* --- Avatar selector --- */}
        <div className="mt-6 rounded-[28px] bg-card p-5 hairline">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Camera size={12} /> Avatar
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className={`h-20 w-20 overflow-visible flex items-center justify-center`}>
              {/* Le aplicamos el marco al avatar actual en la vista previa */}
              <div className={`h-16 w-16 rounded-full bg-gradient-to-br flex items-center justify-center text-4xl ${selectedAvatar?.color || "from-gray-400 to-gray-600"} ${frameStyles[selectedFrame]}`}>
                {selectedAvatar ? selectedAvatar.emoji : (profile?.avatar || name.charAt(0).toUpperCase())}
              </div>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">Elige tu avatar</div>
              <div className="mt-1 text-xs text-muted-foreground">Puedes cambiarlo cuando quieras</div>
            </div>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-2 pt-2">
            {avatarOptions.map((option) => (
              <button
                key={option.emoji}
                type="button"
                onClick={() => setSelectedAvatar(option)}
                className={`shrink-0 overflow-hidden rounded-full border-2 transition-all ${selectedAvatar?.emoji === option.emoji ? "border-primary scale-110" : "border-transparent opacity-70"}`}
              >
                <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${option.color} flex items-center justify-center text-2xl`}>
                  {option.emoji}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* --- Nombre --- */}
        <div className="mt-4 rounded-[28px] bg-card p-5 hairline">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <User size={12} /> Nombre
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-3 w-full rounded-2xl bg-white/5 px-4 py-3 text-sm hairline outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        {/* --- Selector de Marcos --- */}
        <div className="mt-4 rounded-[28px] bg-card p-5 hairline">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Crown size={12} /> Marcos de Avatar
          </div>
          
          {unlockedFrames.length <= 1 ? (
            <div className="mt-4 text-center text-xs text-muted-foreground">
              No tienes marcos. Cómpralos en la tienda.
            </div>
          ) : (
            <div className="mt-4 flex gap-4 overflow-x-auto no-scrollbar py-2 px-1">
              {unlockedFrames.map((frame) => (
                <button
                  key={frame}
                  onClick={() => setSelectedFrame(frame)}
                  className={`relative flex shrink-0 flex-col items-center gap-3 transition-all ${selectedFrame === frame ? "scale-110 opacity-100" : "opacity-50 hover:opacity-80"}`}
                >
                  <div className={`h-12 w-12 rounded-full bg-black/40 ${frameStyles[frame]}`} />
                  <span className="text-[10px] uppercase tracking-wider">{frame === "none" ? "Básico" : frame}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* --- Selector de Títulos --- */}
        <div className="mt-4 rounded-[28px] bg-card p-5 hairline">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Award size={12} /> Títulos de perfil
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTitle("")}
              className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${selectedTitle === "" ? "bg-primary text-primary-foreground shadow-md" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}
            >
              Sin título
            </button>
            {unlockedTitles.map((t: string) => (
              <button
                key={t}
                onClick={() => setSelectedTitle(t)}
                className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${selectedTitle === t ? "bg-[var(--gradient-party)] text-white shadow-lg" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}
              >
                "{t}"
              </button>
            ))}
          </div>
          {unlockedTitles.length === 0 && (
            <div className="mt-3 text-xs text-muted-foreground text-center">
              Aún no has desbloqueado títulos.
            </div>
          )}
        </div>

        {/* --- Options --- */}
        <div className="mt-4 space-y-2">
          
          {/* Botón interactivo de notificaciones */}
          <button 
            onClick={toggleNotifications}
            className="flex w-full items-center justify-between rounded-[28px] bg-card p-5 hairline transition active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className={`grid h-10 w-10 place-items-center rounded-full transition-colors duration-300 ${pushEnabled ? 'bg-primary/20 text-primary' : 'bg-white/5 text-muted-foreground'}`}>
                <Bell size={18} className={pushEnabled ? "animate-pulse" : ""} />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">Notificaciones</div>
                <div className="text-xs text-muted-foreground">
                  {pushEnabled ? "Activadas" : "Desactivadas (Pulsa para activar)"}
                </div>
              </div>
            </div>
            
            {/* Interruptor (Toggle) */}
            <div className={`h-6 w-11 rounded-full p-1 transition-colors duration-300 ${pushEnabled ? 'bg-primary' : 'bg-white/10'}`}>
              <div className={`h-4 w-4 rounded-full bg-white transition-transform duration-300 ${pushEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </button>

        </div>

        {/* --- Save --- */}
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="mt-8 w-full rounded-[24px] py-4 text-sm font-medium text-white shadow-[0_10px_40px_-10px_rgba(124,58,237,0.5)] transition active:scale-95 disabled:opacity-50 disabled:scale-100"
          style={{ background: "var(--gradient-party)" }}
        >
          {updateMutation.isPending ? "Guardando equipo..." : "Guardar cambios"}
        </button>

        {/* --- Cambiar de Grupo --- */}
        <button
          onClick={handleSwitchGroup}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-white/5 py-4 text-sm font-medium text-white transition hover:bg-white/10 active:scale-95 hairline"
        >
          <Users size={16} /> Cambiar de grupo
        </button>

        {/* --- Logout --- */}
        <button
          onClick={handleLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-destructive/10 py-4 text-sm font-medium text-destructive transition active:scale-95"
        >
          <LogOut size={16} /> Cerrar sesión total
        </button>
      </div>
      <FloatingNav />
    </PhoneFrame>
  );
}