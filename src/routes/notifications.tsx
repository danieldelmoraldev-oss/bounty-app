import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/PhoneFrame";
import { TopBar } from "@/components/TopBar";
import { getNotifications, markNotificationsRead } from "@/api/notifications.server";
import { getStoredGroupCode, getStoredMemberId, isAuthenticated } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Skull, Info, Sparkles } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Bounty · Notificaciones" },
      { name: "description", content: "Retos validados, sabotajes recibidos y movimientos del grupo." },
    ],
  }),
  component: Notifs,
});

const icons = {
  success: { Icon: CheckCircle2, tint: "oklch(0.75 0.16 155)" },
  sabotage: { Icon: Skull, tint: "oklch(0.65 0.24 25)" },
  info: { Icon: Info, tint: "oklch(0.7 0.18 250)" },
};

function Notifs() {
  const navigate = useNavigate();
  const groupCode = getStoredGroupCode();
  const memberId = getStoredMemberId();
  const queryClient = useQueryClient();

  if (!isAuthenticated() || !groupCode || !memberId) {
    navigate({ to: "/" });
    return null;
  }

  // Cargar notificaciones
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", memberId, groupCode],
    queryFn: () => getNotifications({ data: { memberId: memberId!, groupCode: groupCode! } }),
  });

  // Mutación para marcar como leídas
  const { mutate: markAsRead } = useMutation({
    mutationFn: () => markNotificationsRead({ data: { memberId: memberId! } }),
    onSuccess: () => {
      // Recargar las notificaciones en caché para limpiar los puntos rojos
      queryClient.invalidateQueries({ queryKey: ["notifications", memberId, groupCode] });
    },
  });

  // Efecto limpio y a prueba de fallos para marcarlas como leídas tras entrar
  useEffect(() => {
    const hasUnread = notifications?.some((n) => !n.read);
    
    if (hasUnread) {
      // Si hay notificaciones sin leer, disparamos la lectura al cabo de 1 segundo
      const timer = setTimeout(() => {
        markAsRead();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [notifications, markAsRead]);

  return (
    <PhoneFrame>
      <TopBar back="/dashboard" title="Inbox" right={<div />} />
      <div className="px-5 pb-24">
        <h1 className="mt-2 text-4xl leading-tight">Notificaciones</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Lo que pasa mientras no miras el teléfono.
        </p>

        

        {isLoading ? (
          <div className="mt-5 text-center text-sm text-muted-foreground">Cargando...</div>
        ) : (
          <div className="mt-5 space-y-2">
            {notifications?.map((n) => {
              const conf = icons[n.type as keyof typeof icons] || icons.info;
              return (
                <div 
                  key={n.id} 
                  className={`relative flex items-start gap-3 rounded-2xl p-4 hairline transition-all duration-700 ${!n.read ? 'bg-white/5 border-white/15' : 'bg-card'}`}
                >
                  {/* Punto indicador de no leída dentro de la lista */}
                  {!n.read && (
                    <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse transition-opacity duration-500" />
                  )}

                  <div
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors"
                    style={{ background: `color-mix(in oklab, ${conf.tint} 18%, transparent)`, color: conf.tint }}
                  >
                    <conf.Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1 pr-6">
                    <div className="text-sm text-white/90">
                      <span className="font-medium text-white">{n.who}</span>{" "}
                      <span className="text-muted-foreground">{n.action}</span>{" "}
                      {n.target && <span className="font-medium text-white">{n.target}</span>}
                    </div>
                    <div className="mt-0.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                      {n.time}
                    </div>
                  </div>
                </div>
              );
            })}
            {notifications?.length === 0 && (
              <div className="text-center text-sm text-muted-foreground mt-8">
                No hay notificaciones aún
              </div>
            )}
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}