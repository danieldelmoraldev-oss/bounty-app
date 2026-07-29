import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/PhoneFrame";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { loginUser, registerUser } from "@/api/auth.server";
import { createGroup, joinGroup } from "@/api/groups.server"; 
import { setGlobalAuth, setAuth, clearActiveGroup } from "@/hooks/use-auth"; 
import { ArrowLeft, Mail, Lock, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Bounty · Acceso" }],
  }),
  // Añadimos "login" a las acciones posibles
  validateSearch: (search: Record<string, string | undefined>) => ({
    code: search.code || undefined,
    groupName: search.groupName || undefined,
    action: (search.action as "join" | "create" | "login") || "join",
  }),
  component: AuthRoute,
});

function AuthRoute() {
  const navigate = useNavigate();
  const { code, groupName, action } = Route.useSearch();

  // Si vienes de "login", obligamos a que el estado sea login.
  const [isLogin, setIsLogin] = useState(action === "login" ? true : true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

 const handleAuthSuccess = async (data: any) => {
    setIsProcessing(true);
    setGlobalAuth(data.token, data.user.id);

    const tempName = localStorage.getItem("bounty_temp_name") || data.user.name;
    const tempAvatar = localStorage.getItem("bounty_temp_avatar") || undefined;
    
    try {
      if (action === "login") {
        // NUEVO: Si tiene exactamente 1 grupo, entramos directo (Efecto Instagram)
        if (data.groupsList && data.groupsList.length === 1) {
          const group = data.groupsList[0];
          setAuth(group.memberId, group.groupCode, group.memberName, group.memberAvatar);
          navigate({ to: "/dashboard" });
        } else {
          // NUEVO: Si tiene varios grupos (o ninguno), borramos el grupo activo y vamos al Lobby
          clearActiveGroup();
          navigate({ to: "/lobby" });
        }
      } 
      else if (action === "create" && groupName) {
        // Ponemos ': any' para que TypeScript no se queje por el cambio de estructura
        const res: any = await createGroup({ 
          data: { name: groupName, adminName: tempName, userId: data.user.id, avatar: tempAvatar } 
        });
        
        // Saca los datos buscando primero la estructura nueva, y si no, la antigua
        const mId = res.memberId || res.member?.id;
        const gCode = res.groupCode || res.group?.code;
        const mName = res.memberName || res.member?.name;
        const mAvatar = res.memberAvatar || res.member?.avatar;

        setAuth(mId, gCode, mName, mAvatar);
        navigate({ to: "/dashboard" });
      } 
      else if (action === "join" && code) {
        // Lo mismo aquí para unirse
        const res: any = await joinGroup({ 
          data: { code, name: tempName, userId: data.user.id, avatar: tempAvatar } 
        });
        
        const mId = res.memberId || res.member?.id;
        const gCode = res.groupCode || res.group?.code;
        const mName = res.memberName || res.member?.name;
        const mAvatar = res.memberAvatar || res.member?.avatar;

        setAuth(mId, gCode, mName, mAvatar);
        navigate({ to: "/dashboard" });
      }
    } catch (e: any) {
      setError(e.message || "Error al conectar con la sala");
      setIsProcessing(false);
    }
  };

  const loginMutation = useMutation({
    mutationFn: () => loginUser({ data: { email, password } }),
    onSuccess: handleAuthSuccess,
    onError: (err: any) => setError(err.message),
  });

  const registerMutation = useMutation({
    mutationFn: () => registerUser({ data: { email, password, name } }),
    onSuccess: handleAuthSuccess,
    onError: (err: any) => setError(err.message),
  });

  const handleSubmit = () => {
    setError("");
    if (isLogin) {
      if (!email || !password) return setError("Rellena todos los campos");
      loginMutation.mutate();
    } else {
      if (!email || !password || !name) return setError("Rellena todos los campos");
      registerMutation.mutate();
    }
  };

  const isWorking = loginMutation.isPending || registerMutation.isPending || isProcessing;

  return (
    <PhoneFrame>
      <div className="relative min-h-dvh flex flex-col bg-[#0a0a0f] px-6 pb-8 pt-12">
        <div className="mb-8 flex items-center gap-3">
          <button 
            onClick={() => navigate({ to: "/" })} 
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white transition active:scale-95"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-sm font-medium text-white/80">Acceso</span>
        </div>

        <div className="mt-2">
          {code && (
            <div className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">
              CÓDIGO VERIFICADO · <span className="text-white/80">{code}</span>
            </div>
          )}
          <h1 className="mb-4 font-display text-[44px] leading-none">
            {action === "login" ? "Hola de nuevo" : isLogin ? "Inicia sesión" : "Crea tu cuenta"}
          </h1>
          <p className="max-w-[280px] text-sm leading-relaxed text-muted-foreground">
            {action === "login" ? (
              "Accede a tu cuenta para volver a la liga de tu grupo."
            ) : action === "join" && groupName ? (
              <>Un paso más para entrar en <span className="font-medium text-white">{groupName}</span> y competir esta temporada.</>
            ) : action === "create" && groupName ? (
              <>Crea tu cuenta para fundar <span className="font-medium text-white">{groupName}</span> y empezar la liga.</>
            ) : (
              "Un paso más para entrar y competir esta temporada."
            )}
          </p>
        </div>

        <button className="mt-8 flex w-full items-center justify-between rounded-[24px] border border-white/10 bg-white/5 p-4 transition active:scale-95">
          <div className="flex items-center gap-4">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-white">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="text-[15px] font-medium text-white">Continuar con Google</div>
              <div className="text-[11px] text-muted-foreground">Un toque y dentro</div>
            </div>
          </div>
          <ArrowLeft size={18} className="rotate-180 text-white/50" />
        </button>

        <div className="mt-8 flex items-center gap-4">
          <div className="h-[1px] flex-1 bg-white/10"></div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">O CON TU CORREO</div>
          <div className="h-[1px] flex-1 bg-white/10"></div>
        </div>

        <div className="mt-8 space-y-3">
          {!isLogin && (
             <div className="relative animate-in fade-in slide-in-from-top-2">
               <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40">
                 <UserIcon size={18} />
               </div>
               <label className="absolute left-12 top-3 text-[9px] uppercase tracking-widest text-white/40">NOMBRE</label>
               <input
                 type="text"
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 placeholder="Ej: Daniel"
                 className="w-full rounded-[24px] border border-white/10 bg-transparent pb-3 pl-12 pr-5 pt-7 text-sm text-white placeholder:text-white/20 outline-none transition focus:border-white/30"
               />
             </div>
          )}
          
          <div className="relative">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40">
              <Mail size={18} />
            </div>
            <label className="absolute left-12 top-3 text-[9px] uppercase tracking-widest text-white/40">CORREO</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full rounded-[24px] border border-white/10 bg-transparent pb-3 pl-12 pr-5 pt-7 text-sm text-white placeholder:text-white/20 outline-none transition focus:border-white/30"
            />
          </div>

          <div className="relative">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40">
              <Lock size={18} />
            </div>
            <label className="absolute left-12 top-3 text-[9px] uppercase tracking-widest text-white/40">CONTRASEÑA</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-[24px] border border-white/10 bg-transparent pb-3 pl-12 pr-5 pt-7 text-sm text-white placeholder:text-white/20 outline-none transition focus:border-white/30"
            />
          </div>
        </div>

        {error && <div className="mt-4 animate-in fade-in text-center text-sm text-destructive">{error}</div>}

        {isLogin && (
          <div className="mt-4 text-right">
            <button className="text-[11px] text-muted-foreground transition hover:text-white">
              ¿Olvidaste la contraseña?
            </button>
          </div>
        )}

        <div className="mt-auto pt-6">
          <button
            onClick={handleSubmit}
            disabled={isWorking}
            className="w-full rounded-full py-4 text-[15px] font-medium text-white shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)] transition disabled:opacity-50 active:scale-95"
            style={{ background: "linear-gradient(to right, #8B5CF6, #3B82F6)" }}
          >
            {isWorking ? "Conectando..." : isLogin ? "Entrar a la liga" : "Crear cuenta y entrar"}
          </button>

          <div className="mt-6 text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(""); }}
              className="text-[12px] text-muted-foreground transition"
            >
              {isLogin ? "¿Nuevo por aquí? " : "¿Ya tienes cuenta? "} 
              <span className="font-medium text-white hover:underline">
                {isLogin ? "Crear cuenta" : "Inicia sesión"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}