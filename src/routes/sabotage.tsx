import { createFileRoute } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/PhoneFrame";
import { TopBar } from "@/components/TopBar";
import { Avatar } from "@/components/Avatar";
import { CameraOff, Lock, Bomb, Skull, Sparkles } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getGroupInfo } from "@/api/groups.server";
import { getUserSabotages, launchSabotage } from "@/api/sabotage.server";
import { getStoredGroupCode, getStoredMemberId } from "@/hooks/use-auth";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/sabotage")({
  head: () => ({
    meta: [
      { title: "Bounty · Sabotear" },
      { name: "description", content: "Elige a quién le vas a fastidiar la noche." },
    ],
  }),
  component: Sabotage,
});

const iconMap: Record<string, React.ComponentType<any>> = { CameraOff, Lock, Bomb, Sparkles };

function Sabotage() {
  const groupCode = getStoredGroupCode();
  const memberId = getStoredMemberId();
  const queryClient = useQueryClient();

  // Estados de selección
  const [selectedVictimId, setSelectedVictimId] = useState<string | null>(null);
  const [selectedAttackId, setSelectedAttackId] = useState<string | null>(null);

  // Cargar lista de miembros
  const { data: groupData } = useQuery({
    queryKey: ["groupInfo", groupCode],
    queryFn: () => getGroupInfo({ data: { code: groupCode! } }),
    enabled: !!groupCode,
  });

  // Cargar inventario del usuario
  const { data: inventory } = useQuery({
    queryKey: ["inventory", memberId],
    queryFn: () => getUserSabotages({ data: { memberId: memberId! } }),
    enabled: !!memberId,
  });

  const sabotageMutation = useMutation({
    mutationFn: (purchaseId: string) => 
      launchSabotage({ 
        data: { 
          purchaseId, 
          attackerId: memberId!, 
          victimId: selectedVictimId!, 
          groupId: groupData!.group.id 
        } 
      }),
    onSuccess: (res: any) => {
      if (res.success) {
        toast.success(`☠️ ¡Has lanzado ${res.itemName} contra ${res.victimName}!`);
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
        queryClient.invalidateQueries({ queryKey: ["groupInfo"] });
        setSelectedAttackId(null);
        setSelectedVictimId(null);
      } else {
        toast.error(res.error);
      }
    }
  });

  // Excluimos al propio usuario de la lista de víctimas (¡no te sabotees a ti mismo!)
  const victims = groupData?.members?.filter((m: any) => m.id !== memberId) || [];
  const target = victims.find((m: any) => m.id === selectedVictimId);
  const attack = inventory?.find((a: any) => a.purchaseId === selectedAttackId);

  return (
    <PhoneFrame>
      <TopBar back={true} title="Sabotaje" />
      <div className="px-5 pb-24">
        <div className="mt-2 flex items-center gap-2">
          <Skull size={14} className="text-destructive" />
          <span className="text-xs uppercase tracking-[0.25em] text-destructive">Modo villano</span>
        </div>
        <h1 className="mt-3 text-[40px] leading-tight">
          Elige a tu <span className="italic gradient-text">víctima</span>.
        </h1>

      {/* --- SELECTOR DE VÍCTIMAS --- */}
        <div className="no-scrollbar mt-6 flex gap-3 overflow-x-auto pb-2">
          {victims.map((m: any) => {
            const isSelected = m.id === selectedVictimId;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedVictimId(m.id)}
                className={`flex shrink-0 flex-col items-center gap-2 rounded-3xl p-3 transition active:scale-95 ${
                  isSelected ? "bg-destructive/15 ring-1 ring-destructive/40" : "bg-card hairline opacity-60 hover:opacity-100"
                }`}
              >
                <Avatar src={m.avatar} name={m.name} size={56} frame={m.frame} />
                <div className="text-xs font-medium">{m.name}</div>
              </button>
            );
          })}
        </div>

        {/* --- TARJETA DE OBJETIVO --- */}
        <div
          className={`mt-6 overflow-hidden rounded-[28px] p-5 text-white transition-all duration-300 ${
            target ? "opacity-100 scale-100" : "opacity-50 scale-[0.98] grayscale"
          }`}
          style={{ background: "var(--gradient-sabotage)" }}
        >
          <div className="flex items-center gap-4">
            <Avatar 
              src={target?.avatar || ""} 
              name={target?.name || "?"} 
              size={64} 
              frame={target?.frame || "none"} 
            />
            <div>
              <div className="text-xs uppercase tracking-widest text-white/70">Objetivo</div>
              <div className="text-2xl font-medium">{target?.name || "Selecciona..."}</div>
              <div className="text-xs text-white/70 italic">
                {target?.title ? `"${target.title}"` : "Ningún título"}
              </div>
            </div>
          </div>
        </div>

        {/* --- INVENTARIO DE ATAQUES --- */}
        <div className="mt-6 space-y-3">
          <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
            Arsenal disponible
          </div>
          
          {inventory?.length === 0 ? (
            <div className="text-center rounded-3xl bg-card p-6 hairline text-sm text-muted-foreground">
              No tienes tácticas sucias. Ve a la tienda a comprar sabotajes.
            </div>
          ) : (
            inventory?.map((a: any) => {
              const Icon = iconMap[a.icon] ?? Sparkles;
              const isSelected = a.purchaseId === selectedAttackId;
              
              // 1. Buscamos palabras clave
              const searchText = `${a.name} ${a.description}`.toLowerCase();
              const requiresParty = searchText.includes("cámar") || searchText.includes("camar") || searchText.includes("bloque") || searchText.includes("min");
              
              const isLocked = requiresParty && !(groupData as any)?.isLiveMode;
              
              return (
                <div
                  key={a.purchaseId}
                  onClick={() => {
                    if (isLocked) {
                      toast.error("🔒 Este sabotaje tiene duración de tiempo. Solo puedes usarlo durante el Modo Fiesta.");
                      return;
                    }
                    setSelectedAttackId(a.purchaseId);
                  }}
                  className={`flex w-full items-center gap-4 rounded-3xl p-4 hairline transition ${
                    isLocked 
                      ? "bg-card/50 opacity-50 grayscale" 
                      : isSelected 
                        ? "bg-destructive/10 ring-1 ring-destructive/30 cursor-pointer active:scale-[0.98]" 
                        : "bg-card cursor-pointer active:scale-[0.98]"
                  }`}
                >
                  <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${isLocked ? 'bg-muted text-muted-foreground' : 'bg-destructive/15 text-destructive'}`}>
                    {isLocked ? <Lock size={20} /> : <Icon size={20} />}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium truncate">{a.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {isLocked ? "Solo en Modo Fiesta" : a.description}
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${isLocked ? 'text-muted-foreground' : 'text-destructive'}`}>
                    x{a.count}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* --- BOTÓN DE LANZAMIENTO --- */}
        <button
          onClick={() => sabotageMutation.mutate(selectedAttackId!)}
          disabled={!selectedVictimId || !selectedAttackId || sabotageMutation.isPending}
          className="mt-6 w-full rounded-3xl py-4 text-sm font-medium text-white shadow-[0_10px_30px_-10px_rgba(239,68,68,0.6)] transition active:scale-95 disabled:opacity-30 disabled:scale-100"
          style={{ background: "var(--gradient-sabotage)" }}
        >
          {sabotageMutation.isPending ? "Ejecutando..." : "Confirmar sabotaje"}
        </button>
      </div>
    </PhoneFrame>
  );
}