import { useQuery } from "@tanstack/react-query";
import { getActiveEffects } from "@/api/sabotage.server";
import { getStoredMemberId } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { ShieldAlert, Zap } from "lucide-react";

export function ActiveTimers() {
  const memberId = getStoredMemberId();

  const { data: effects } = useQuery({
    queryKey: ["activeEffects", memberId],
    queryFn: () => getActiveEffects({ data: { memberId: memberId! } }),
    enabled: !!memberId,
    refetchInterval: 5000, 
  });

  const [now, setNow] = useState(Date.now());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!effects?.activeTimers || effects.activeTimers.length === 0) return null;

  return (
    // CAMBIO AQUÍ: Usamos fixed, lo centramos y le damos el mismo ancho que al PhoneFrame
    // Añadimos pointer-events-none al contenedor para que no bloquee los clics en la pantalla
    <div className="fixed top-24 left-1/2 z-[100] flex w-full max-w-[440px] -translate-x-1/2 flex-col items-end gap-2 px-5 pointer-events-none">
      {effects.activeTimers.map((timer: any) => {
        const timeLeft = new Date(timer.expiresAt).getTime() - now;
        
        if (timeLeft <= 0) return null;

        const mins = Math.floor(timeLeft / 60000);
        const secs = Math.floor((timeLeft % 60000) / 1000);
        
        const isBuff = timer.type === "buff";
        const isExpanded = expandedId === timer.id;

        return (
          <button 
            key={timer.id}
            onClick={() => setExpandedId(isExpanded ? null : timer.id)}
            // CAMBIO AQUÍ: Recuperamos los clics en los botones con pointer-events-auto
            className="pointer-events-auto flex items-center gap-1.5 rounded-full px-2.5 py-1.5 shadow-lg transition-all duration-300 active:scale-95"
            style={{ 
              background: isBuff ? "linear-gradient(135deg, #3b82f6, #1d4ed8)" : "var(--gradient-sabotage)" 
            }}
          >
            {isBuff ? <Zap size={12} className="text-white" /> : <ShieldAlert size={12} className="text-white" />}
            
            {isExpanded && (
              <span className="text-[10px] font-semibold text-white drop-shadow-md px-1 whitespace-nowrap animate-in fade-in">
                {timer.name}
              </span>
            )}
            
            <span className="text-xs font-mono font-bold text-white tabular-nums drop-shadow-md">
              {mins}:{secs.toString().padStart(2, '0')}
            </span>
          </button>
        );
      })}
    </div>
  );
}