import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/PhoneFrame";
import { TopBar } from "@/components/TopBar";
import { getRandomAvatarWithColor, avatarOptions, type AvatarOption } from "@/data/avatars";
import { useState } from "react";
import { Camera, ArrowRight, Users } from "lucide-react";
import { getStoredUserId, setAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { createGroup, joinGroup } from "@/api/groups.server";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Bounty · Unirse" },
      { name: "description", content: "Crea una sala nueva o únete a una con el código de tu amigo." },
    ],
  }),
  component: Join,
});

type Mode = "choose" | "create" | "join";

function Join() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("choose");
  const [groupName, setGroupName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [code, setCode] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarOption | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: any) => createGroup({ data }),
    onSuccess: (res: any) => {
      // Extraemos los datos con seguridad (formato nuevo o antiguo)
      const mId = res.memberId || res.member?.id;
      const gCode = res.groupCode || res.group?.code;
      const mName = res.memberName || res.member?.name;
      const mAvatar = res.memberAvatar || res.member?.avatar;
      
      setAuth(mId, gCode, mName, mAvatar);
      navigate({ to: "/dashboard" });
    },
    onError: (err: any) => alert(err.message)
  });

  const joinMutation = useMutation({
    mutationFn: (data: any) => joinGroup({ data }),
    onSuccess: (res: any) => {
      const mId = res.memberId || res.member?.id;
      const gCode = res.groupCode || res.group?.code;
      const mName = res.memberName || res.member?.name;
      const mAvatar = res.memberAvatar || res.member?.avatar;
      
      setAuth(mId, gCode, mName, mAvatar);
      navigate({ to: "/dashboard" });
    },
    onError: (err: any) => alert(err.message)
  });

  const handleCreate = () => {
    if (!groupName.trim() || !playerName.trim()) return;

    const userId = getStoredUserId();
    if (userId) {
      // MODO VIP: Ya está logueado, crea el grupo directo en la Base de Datos
      createMutation.mutate({
        name: groupName.trim(),
        adminName: playerName.trim(),
        userId: userId,
        avatar: selectedAvatar?.emoji
      });
    } else {
      // MODO INVITADO: No está logueado, lo mandamos a auth
      localStorage.setItem("bounty_temp_name", playerName.trim());
      if (selectedAvatar) localStorage.setItem("bounty_temp_avatar", selectedAvatar.emoji);
      navigate({
        to: "/auth",
        search: { groupName: groupName.trim(), action: "create", code: undefined }
      });
    }
  };

  const handleJoin = () => {
    if (!code.trim() || !playerName.trim()) return;

    const userId = getStoredUserId();
    if (userId) {
      // MODO VIP: Ya está logueado, se une directo a la sala
      joinMutation.mutate({
        code: code.trim(),
        name: playerName.trim(),
        userId: userId,
        avatar: selectedAvatar?.emoji
      });
    } else {
      // MODO INVITADO: No está logueado, lo mandamos a auth
      localStorage.setItem("bounty_temp_name", playerName.trim());
      if (selectedAvatar) localStorage.setItem("bounty_temp_avatar", selectedAvatar.emoji);
      navigate({
        to: "/auth",
        search: { action: "join", code: code.trim(), groupName: undefined }
      });
    }
  };

  const pickRandomAvatar = () => {
    setSelectedAvatar(getRandomAvatarWithColor());
  };

  return (
    <PhoneFrame>
      <TopBar
        back="/"
        right={
          <button onClick={() => navigate({ to: "/" })} className="glass grid h-10 w-10 place-items-center rounded-full">
            ✕
          </button>
        }
      />

      {mode === "choose" && (
        <div className="px-5 pb-40">
          <h1 className="mt-6 text-[44px] leading-[0.95]">
            ¿Qué haces <span className="italic gradient-text">esta noche</span>?
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Crea una sala nueva para tu grupo o únete a una ya existente con el código que te pasen.
          </p>

          <div className="mt-8 grid gap-3">
            <button
              onClick={() => setMode("create")}
              className="flex items-center justify-between rounded-[28px] p-5 hairline glass transition active:scale-95"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-white/5">
                  <Users size={18} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium">Crear una sala nueva</div>
                  <div className="text-xs text-muted-foreground">Tú eres el admin</div>
                </div>
              </div>
              <ArrowRight size={18} className="text-muted-foreground" />
            </button>

            <button
              onClick={() => setMode("join")}
              className="flex items-center justify-between rounded-[28px] p-5 hairline glass transition active:scale-95"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-white/5">
                  <Camera size={18} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium">Entrar con código</div>
                  <div className="text-xs text-muted-foreground">5 letras · rápido</div>
                </div>
              </div>
              <ArrowRight size={18} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {mode === "create" && (
        <div className="px-5 pb-40">
          <h1 className="mt-6 text-[34px] leading-tight">Nueva sala</h1>
          <p className="mt-2 text-sm text-muted-foreground">Crea el grupo y comparte el código con tus amigos.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Nombre del grupo</label>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ej: Los Descarriados"
                className="mt-2 w-full rounded-2xl bg-card px-4 py-3 text-sm hairline outline-none"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Tu nombre</label>
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Ej: Marta"
                className="mt-2 w-full rounded-2xl bg-card px-4 py-3 text-sm hairline outline-none"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Avatar</label>
              <div className="mt-2 flex items-center gap-3">
                <div className={`h-14 w-14 overflow-hidden rounded-full bg-gradient-to-br ${selectedAvatar?.color || "from-gray-400 to-gray-600"} flex items-center justify-center text-2xl`}>
                  {selectedAvatar ? selectedAvatar.emoji : "?"}
                </div>
                <button
                  type="button"
                  onClick={pickRandomAvatar}
                  className="rounded-full bg-white/5 px-4 py-2 text-xs hairline transition active:scale-95"
                >
                  Aleatorio
                </button>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {avatarOptions.map((option) => (
                  <button
                    key={option.emoji}
                    type="button"
                    onClick={() => setSelectedAvatar(option)}
                    className={`shrink-0 overflow-hidden rounded-full border-2 transition-all ${selectedAvatar?.emoji === option.emoji ? "border-primary scale-110" : "border-transparent"}`}
                  >
                    <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${option.color} flex items-center justify-center text-xl`}>
                      {option.emoji}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreate}
              className="mt-2 w-full rounded-full bg-primary py-3 text-sm font-medium transition active:scale-95"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {mode === "join" && (
        <div className="px-5 pb-40">
          <h1 className="mt-6 text-[34px] leading-tight">Unirse</h1>
          <p className="mt-2 text-sm text-muted-foreground">Pide el código a tu amigo y elige tu nombre.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Código</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ej: NX7QA"
                maxLength={5}
                className="mt-2 w-full rounded-2xl bg-card px-4 py-3 text-center text-lg tracking-[0.3em] hairline outline-none uppercase"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Tu nombre</label>
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Ej: Álex"
                className="mt-2 w-full rounded-2xl bg-card px-4 py-3 text-sm hairline outline-none"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Avatar</label>
              <div className="mt-2 flex items-center gap-3">
                <div className={`h-14 w-14 overflow-hidden rounded-full bg-gradient-to-br ${selectedAvatar?.color || "from-gray-400 to-gray-600"} flex items-center justify-center text-2xl`}>
                  {selectedAvatar ? selectedAvatar.emoji : "?"}
                </div>
                <button
                  type="button"
                  onClick={pickRandomAvatar}
                  className="rounded-full bg-white/5 px-4 py-2 text-xs hairline transition active:scale-95"
                >
                  Aleatorio
                </button>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {avatarOptions.map((option) => (
                  <button
                    key={option.emoji}
                    type="button"
                    onClick={() => setSelectedAvatar(option)}
                    className={`shrink-0 overflow-hidden rounded-full border-2 transition-all ${selectedAvatar?.emoji === option.emoji ? "border-primary scale-110" : "border-transparent"}`}
                  >
                    <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${option.color} flex items-center justify-center text-xl`}>
                      {option.emoji}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleJoin}
              className="mt-2 w-full rounded-full bg-primary py-3 text-sm font-medium transition active:scale-95"
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </PhoneFrame>
  );
}