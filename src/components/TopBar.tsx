import { Link, useRouter } from "@tanstack/react-router"; // <-- Añadimos useRouter
import { ArrowLeft, Bell, Settings, Store, ShieldOff } from "lucide-react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "@/api/notifications.server";
import { getStoredGroupCode, getStoredMemberId } from "@/hooks/use-auth";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function TopBar({
  title,
  back,
  right,
}: {
  title?: string;
  back?: string | boolean; // <-- Ahora acepta 'true' para volver atrás automáticamente
  right?: ReactNode;
}) {
  const router = useRouter(); // <-- Inicializamos el router
  const memberId = getStoredMemberId();
  const groupCode = getStoredGroupCode();

  const prevNotifsRef = useRef<string[]>([]);

  const { data: notifications } = useQuery({
    queryKey: ["notifications", memberId, groupCode],
    queryFn: () => getNotifications({ data: { memberId: memberId!, groupCode: groupCode! } }),
    enabled: !!memberId && !!groupCode,
    refetchInterval: 3000, 
  });

  useEffect(() => {
    if (notifications) {
      const currentIds = notifications.map(n => n.id);
      const prevIds = prevNotifsRef.current;

      if (prevIds.length > 0) {
        const newNotifs = notifications.filter(n => !prevIds.includes(n.id) && !n.read);
        
        newNotifs.forEach(n => {
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          
          toast(n.who, {
            description: `${n.action} ${n.target || ""}`,
            duration: 2500,
          });
        });
      }
      
      prevNotifsRef.current = currentIds;
    }
  }, [notifications]);

  const hasUnread = notifications?.some((n) => !n.read);

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between px-5 pb-3 pt-6 backdrop-blur-xl transition-all">
      <div className="flex items-center gap-3">
        {/* --- BOTÓN DE ATRÁS INTELIGENTE --- */}
        {back ? (
          <button
            onClick={() => {
              if (typeof back === "string") {
                router.navigate({ to: back as never }); // Si le pasas una ruta (ej: "/album")
              } else {
                window.history.back(); // Si le pasas 'true', vuelve al historial anterior
              }
            }}
            className="glass grid h-10 w-10 place-items-center rounded-full transition active:scale-95"
            aria-label="Volver"
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
          </button>
        ) : null}
        
        {title ? (
          <div className="text-sm font-medium text-muted-foreground">{title}</div>
        ) : null}
      </div>
      
      {/* Contenedor de botones (Si hay `right` lo usa, si no, pone los 4 globales) */}
      <div className="flex items-center gap-2">
        {right ?? (
          <>
            {/* 1. Tienda */}
            <Link
              to="/shop"
              className="glass grid h-10 w-10 shrink-0 place-items-center rounded-full transition-transform active:scale-95"
              aria-label="Tienda"
            >
              <Store size={18} strokeWidth={1.75} />
            </Link>

            {/* 2. Sabotaje (Tono destructivo) */}
            <Link
              to="/sabotage"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-destructive/10 border border-destructive/20 text-destructive transition-transform hover:bg-destructive/20 active:scale-95"
              aria-label="Sabotear"
            >
              <ShieldOff size={18} strokeWidth={1.75} />
            </Link>

            {/* 3. Notificaciones */}
            <Link
              to="/notifications"
              className="glass relative grid h-10 w-10 shrink-0 place-items-center rounded-full transition-transform active:scale-95"
              aria-label="Notificaciones"
            >
              <Bell size={18} strokeWidth={1.75} />
              
              {hasUnread && (
                <span className="absolute right-[11px] top-[11px] h-2 w-2 rounded-full bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />
              )}
            </Link>

            {/* 4. Ajustes */}
            <Link
              to="/settings"
              className="glass grid h-10 w-10 shrink-0 place-items-center rounded-full transition-transform active:scale-95"
              aria-label="Ajustes"
            >
              <Settings size={18} strokeWidth={1.75} />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}