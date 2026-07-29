import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/PhoneFrame";
import { TopBar } from "@/components/TopBar";
import { FloatingNav } from "@/components/FloatingNav";
import { getShopItems, purchaseShopItem } from "@/api/shop.server";
import { getGroupInfo } from "@/api/groups.server";
import { getStoredGroupCode, getStoredMemberId, isAuthenticated } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Zap, CameraOff, Lock, Crown, Sparkles, Award, Gem, Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Bounty · Tienda" },
      { name: "description", content: "Buffs, sabotajes y cosméticos. Gasta tus puntos con cabeza." },
    ],
  }),
  component: Shop,
});

const iconMap: Record<string, React.ComponentType<any>> = { Zap, CameraOff, Lock, Crown, Sparkles, Award };
const tabs = ["Todo", "Buffs", "Sabotajes", "Cosméticos"];

function Shop() {
  const navigate = useNavigate();
  const groupCode = getStoredGroupCode();
  const memberId = getStoredMemberId();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("Todo");
  const [selectedItem, setSelectedItem] = useState<any | null>(null); // Para el modal de confirmación

  if (!isAuthenticated() || !groupCode || !memberId) {
    navigate({ to: "/" });
    return null;
  }

  const { data: items, isLoading } = useQuery({
    queryKey: ["shopItems", groupCode],
    queryFn: () => getShopItems({ data: { groupCode: groupCode! } }),
  });

  const { data: groupData } = useQuery({
    queryKey: ["groupInfo", groupCode],
    queryFn: () => getGroupInfo({ data: { code: groupCode! } }),
  });

// Buscamos el saldo del usuario conectado
  const currentMember = groupData?.members?.find((m: any) => m.id === memberId);
  const memberBalance = (currentMember as any)?.balance || 0;

  const purchaseMutation = useMutation({
    mutationFn: (itemId: string) => purchaseShopItem({ data: { groupCode: groupCode!, memberId: memberId!, itemId } }),
    onSuccess: (res: any) => {
      if (res.success) {
        toast.success(`✨ ¡Has comprado "${res.itemName}" con éxito!`);
        queryClient.invalidateQueries({ queryKey: ["shopItems"] });
        queryClient.invalidateQueries({ queryKey: ["groupInfo"] });
      } else {
        toast.error(res.error || "No se ha podido procesar la compra");
      }
      setSelectedItem(null);
    },
    onError: () => {
      toast.error("Error de conexión al comprar");
      setSelectedItem(null);
    }
  });

  const filteredItems = items?.filter((it: any) => {
    if (activeTab === "Todo") return true;
    if (activeTab === "Buffs") return it.tag === "Buff";
    if (activeTab === "Sabotajes") return it.tag === "Sabotaje";
    if (activeTab === "Cosméticos") return it.tag === "Cosmético";
    return true;
  });

  return (
    <PhoneFrame>
      <TopBar back={true} />
      <div className="px-5 pb-40">
        <div className="mt-2 flex items-end justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Mercado negro</div>
            <h1 className="text-4xl leading-tight">Tienda</h1>
          </div>
          <div className="glass flex items-center gap-2 rounded-full px-3.5 py-2 border border-white/10">
            <Gem size={14} className="text-primary animate-pulse" />
            <span className="text-sm font-medium tabular-nums">{memberBalance} cr</span>
          </div>
        </div>

        {/* Pestañas de filtrado */}
        <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition ${
                activeTab === t ? "bg-white text-black" : "bg-card text-muted-foreground hairline"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="mt-12 text-center text-sm text-muted-foreground">Cargando tienda...</div>
        ) : (
          <div className="mt-5 space-y-3">
            {filteredItems?.map((it: any) => {
              const Icon = iconMap[it.icon] ?? Sparkles;
              const tint =
                it.tag === "Buff"
                  ? "var(--gradient-party)"
                  : it.tag === "Sabotaje"
                    ? "var(--gradient-sabotage)"
                    : "var(--gradient-ember)";

              const isLocked = it.tag === "Buff" && !(groupData as any)?.isLiveMode;

              return (
                <div
                  key={it.id}
                  onClick={() => {
                    if (isLocked) {
                      toast.error("🔒 Bloqueado: Los modificadores de tiempo solo se pueden comprar si hay una noche activa.");
                      return;
                    }
                    setSelectedItem(it);
                  }}
                  className={`flex w-full items-center gap-4 rounded-[24px] bg-card p-4 hairline text-left transition ${
                    isLocked ? "opacity-50 grayscale" : "cursor-pointer active:scale-[0.98]"
                  }`}
                >
                  <div
                    className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white shadow-md"
                    style={{ background: tint }}
                  >
                    {/* Si está bloqueado, ponemos el icono de un candado */}
                    {isLocked ? <Lock size={22} className="opacity-80" /> : <Icon size={22} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-white">{it.name}</span>
                      <span className="rounded-full border border-white/5 bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">
                        {it.tag}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {/* Cambiamos la descripción para que quede clarísimo */}
                      {isLocked ? "Solo disponible en Modo Fiesta" : it.description}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold tabular-nums ${isLocked ? "text-muted-foreground" : "text-primary"}`}>
                      {it.price}
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground">cr</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <FloatingNav />

      {/* --- MODAL DE CONFIRMACIÓN DE COMPRA --- */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm animate-in fade-in">
          <div 
            className="w-full max-w-sm rounded-[32px] border border-white/10 bg-[#0f0f16] p-6 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Confirmar adquisición</div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-muted-foreground hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-2 text-center">
              <h3 className="text-xl font-bold text-white">{selectedItem.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{selectedItem.description}</p>
              
              <div className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-white/5 bg-white/5 px-4 py-2">
                <span className="text-xs text-muted-foreground">Precio:</span>
                <span className="text-base font-bold text-primary">{selectedItem.price} cr</span>
              </div>
            </div>

            {/* AVISO DE BLOQUEO SI ES BUFF Y NO HAY FIESTA */}
            {selectedItem.tag === "Buff" && !(groupData as any)?.isLiveMode && (
              <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-center text-xs font-medium text-destructive">
                Los modificadores temporales solo se pueden comprar si el Modo Fiesta está activo.
              </div>
            )}

            <div className="mt-8 grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedItem(null)}
                className="rounded-2xl border border-white/5 bg-white/5 py-3.5 text-xs font-medium text-muted-foreground transition hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={() => purchaseMutation.mutate(selectedItem.id)}
                disabled={purchaseMutation.isPending || (selectedItem.tag === "Buff" && !(groupData as any)?.isLiveMode)}
                className="flex items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-medium text-white shadow-lg transition active:scale-95 disabled:scale-100 disabled:opacity-50"
                style={{ background: (selectedItem.tag === "Buff" && !(groupData as any)?.isLiveMode) ? "var(--muted)" : "var(--gradient-party)" }}
              >
                {purchaseMutation.isPending ? "Procesando..." : (
                  <>
                    <Check size={16} /> Comprar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </PhoneFrame>
  );
}