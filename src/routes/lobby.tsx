import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/PhoneFrame";
import { Plus, ScanLine, LogOut, ChevronRight, Loader2 } from "lucide-react";
import { setAuth, clearAuth, getStoredUserId } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getUserGroups } from "@/api/groups.server"; // Ajusta esta ruta si es diferente en tu proyecto

export const Route = createFileRoute("/lobby")({
  head: () => ({
    meta: [
      { title: "Bounty · Tus Grupos" },
      { name: "description", content: "Elige una sala para entrar." },
    ],
  }),
  component: LobbyPage,
});

function LobbyPage() {
  const navigate = useNavigate();
  const userId = getStoredUserId(); // Sacamos la ID de la cuenta global

  // PETICIÓN REAL A LA BASE DE DATOS
  const { data: misGrupos, isLoading } = useQuery({
    queryKey: ["userGroups", userId],
    queryFn: () => getUserGroups({ data: { userId: userId! } }),
    enabled: !!userId, // Solo busca si estamos logueados
  });

  const handleEnterGroup = (groupCode: string, memberId: string, memberName: string, memberAvatar: string) => {
    // 1. Nos ponemos la pulsera de la sala
    setAuth(memberId, groupCode, memberName, memberAvatar);
    // 2. Al inicio (el guardia nos mandará directos al Dashboard de esa sala)
    navigate({ to: "/" });
  };

  const handleLogout = () => {
    clearAuth();
    navigate({ to: "/" });
  };

  return (
    <PhoneFrame>
      <div className="flex min-h-dvh flex-col bg-[#0f0f16] px-6 pb-8 pt-20 relative overflow-hidden">
        
        {/* Fondo sutil */}
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-purple-600/10 blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          <h1 className="text-[34px] leading-tight text-white font-medium">Tus Grupos</h1>
          <p className="mt-2 text-sm text-white/60">Elige a qué sala quieres entrar hoy.</p>
        </div>

        {/* LISTA DE GRUPOS */}
        <div className="mt-8 flex-1 space-y-3 relative z-10">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
            </div>
          ) : misGrupos && misGrupos.length > 0 ? (
            misGrupos.map((group) => (
              <button
                key={group.groupCode}
                onClick={() => handleEnterGroup(group.groupCode, group.memberId, group.memberName, group.memberAvatar)}
                className="w-full flex items-center justify-between rounded-[24px] bg-white/5 p-4 text-left hairline transition hover:bg-white/10 active:scale-95"
              >
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-2xl">
                    {group.memberAvatar}
                  </div>
                  <div>
                    <div className="text-base font-medium text-white">{group.groupName}</div>
                    <div className="text-xs text-white/50 tracking-widest uppercase mt-0.5">
                      Sala: {group.groupCode}
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-white/30" />
              </button>
            ))
          ) : (
            <div className="py-8 text-center text-sm text-white/50">
              Aún no perteneces a ningún grupo.
            </div>
          )}
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="mt-auto flex flex-col gap-3 pt-6 relative z-10">
          <Link
            to="/join"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white/5 py-4 text-sm font-medium text-white transition hover:bg-white/10 active:scale-95 hairline"
          >
            <ScanLine size={18} /> Unirse con código o QR
          </Link>
          
          <Link
            to="/join"
            className="flex w-full items-center justify-center gap-2 rounded-full py-4 text-sm font-medium text-white transition active:scale-95 shadow-[0_10px_40px_-10px_rgba(124,58,237,0.5)]"
            style={{ background: "var(--gradient-party)" }}
          >
            <Plus size={18} /> Crear una sala nueva
          </Link>

          <button
            onClick={handleLogout}
            className="mt-6 flex w-full items-center justify-center gap-2 py-2 text-xs font-medium text-white/30 transition hover:text-red-400 active:scale-95"
          >
            <LogOut size={14} /> Cerrar sesión de la cuenta
          </button>
        </div>

      </div>
    </PhoneFrame>
  );
}