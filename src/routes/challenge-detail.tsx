import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/PhoneFrame";
import { TopBar } from "@/components/TopBar";
import { getChallengeDetail, submitChallenge } from "@/api/challenges.server";
import { getActiveEffects } from "@/api/sabotage.server"; // <-- IMPORTAMOS EL CHIVATO
import { getStoredMemberId, isAuthenticated } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Upload, ShieldCheck, X, Loader2, Lock } from "lucide-react";
import { useState, useRef } from "react";

export const Route = createFileRoute("/challenge-detail")({
  head: () => ({
    meta: [
      { title: "Bounty · Reto activo" },
      { name: "description", content: "Sube la prueba y espera la validación del admin." },
    ],
  }),
  validateSearch: (search: Record<string, string | undefined>) => ({
    challengeId: search.challengeId || "",
  }),
  component: ChallengeDetail,
});

function ChallengeDetail() {
  const navigate = useNavigate();
  const { challengeId } = Route.useSearch();
  const memberId = getStoredMemberId();
  const queryClient = useQueryClient();

  if (!isAuthenticated() || !memberId || !challengeId) {
    navigate({ to: "/" });
    return null;
  }

  const { data: challenge, isLoading } = useQuery({
    queryKey: ["challengeDetail", challengeId],
    queryFn: () => getChallengeDetail({ data: { challengeId } }),
  });

  // --- NUEVO: PREGUNTAMOS SI ESTÁ SABOTEADO (SE ACTUALIZA CADA 5 SEGUNDOS) ---
  const { data: effects } = useQuery({
    queryKey: ["activeEffects", memberId],
    queryFn: () => getActiveEffects({ data: { memberId: memberId! } }),
    refetchInterval: 5000, 
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const reader = new FileReader();
      reader.readAsDataURL(selected);
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
      };
    }
  };

  const clearFile = () => setImageBase64(null);

  const handleSubmit = async () => {
    if (!imageBase64) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await submitChallenge({ data: { challengeId, memberId: memberId!, imageBase64 } });
      queryClient.invalidateQueries({ queryKey: ["challengeDetail", challengeId] });
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      navigate({ to: "/challenges" });
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <PhoneFrame>
        <TopBar back="/challenges" title="Reto" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground animate-pulse">Cargando...</div>
        </div>
      </PhoneFrame>
    );
  }

  if (!challenge) {
    return (
      <PhoneFrame>
        <TopBar back="/challenges" title="Reto" />
        <div className="text-center text-destructive mt-10">Reto no encontrado</div>
      </PhoneFrame>
    );
  }

  const isVideo = imageBase64?.startsWith("data:video/");

  return (
    <PhoneFrame>
      <TopBar back="/challenges" title={`Nivel ${challenge.level}`} />
      <div className="px-5 pb-24">
        <div className="mt-2 flex items-center gap-2">
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-white"
            style={{ background: challenge.status === "pending" ? "oklch(0.68 0.2 25)" : challenge.status === "done" ? "oklch(0.75 0.16 155)" : "var(--gradient-party)" }}
          >
            {challenge.status === "pending" ? "Pendiente de validación" : challenge.status === "done" ? "Completado" : "Reto activo"}
          </span>
          <span className="text-xs text-muted-foreground">+{challenge.points} pts</span>
        </div>
        <h1 className="mt-4 text-[38px] leading-tight">{challenge.title}</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">{challenge.description}</p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-card p-4 hairline">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Dificultad</div>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="h-1.5 flex-1 rounded-full transition-all"
                  style={{ background: n <= challenge.level ? "var(--gradient-party)" : "oklch(1 0 0 / 0.08)" }}
                />
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-card p-4 hairline">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Estado</div>
            <div className="mt-1 text-xl font-light capitalize">{challenge.status === "pending" ? "Pendiente" : challenge.status === "done" ? "Completado" : "Disponible"}</div>
          </div>
        </div>

        {challenge.status === "available" && (
          <div className="mt-8">
            <div className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
              {effects?.isBlocked ? "Sistema hackeado" : imageBase64 ? "Previsualización" : "Subir prueba"}
            </div>
            
            <input type="file" accept="image/*,video/*" ref={galleryInputRef} onChange={handleFileChange} className="hidden" />

            {/* --- SI ESTÁ BLOQUEADO, MOSTRAMOS EL CASTIGO --- */}
            {effects?.isBlocked ? (
              <div className="flex flex-col items-center justify-center rounded-3xl bg-destructive/10 p-8 text-center border border-destructive/20 animate-in zoom-in-95">
                <Lock size={40} className="text-destructive mb-4 animate-pulse" />
                <h3 className="font-bold text-destructive text-xl tracking-wide uppercase">Parálisis Activa</h3>
                <p className="text-sm text-destructive/80 mt-2 leading-relaxed">
                  Has sido saboteado. Tienes bloqueada la subida de pruebas hasta que pase el efecto.
                </p>
              </div>
            ) : !imageBase64 ? (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-4">
                <Link
                  to="/camera"
                  search={{ challengeId: challenge.id, challengeTitle: challenge.title }}
                  className="flex flex-col items-start gap-4 rounded-3xl p-5 text-left text-white transition active:scale-95"
                  style={{ background: "var(--gradient-party)" }}
                >
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
                    <Camera size={20} />
                  </div>
                  <div>
                    <div className="text-base font-medium">Hacer foto</div>
                    <div className="text-xs text-white/70">Cámara en vivo</div>
                  </div>
                </Link>
                
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex flex-col items-start gap-4 rounded-3xl bg-card p-5 text-left hairline transition active:scale-95"
                >
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5">
                    <Upload size={20} />
                  </div>
                  <div>
                    <div className="text-base font-medium">Subir de galería</div>
                    <div className="text-xs text-muted-foreground">Vídeo o foto</div>
                  </div>
                </button>
              </div>
            ) : (
              <div className="animate-in fade-in zoom-in-95 duration-300">
                <div className="relative overflow-hidden rounded-[24px] bg-black/50 hairline aspect-[3/4]">
                  {/* --- SI TIENE CÁMARA ROTA, DESENFOCAMOS LA PREVIEW --- */}
                  {isVideo ? (
                    <video src={imageBase64} controls className={`h-full w-full object-cover transition-all duration-1000 ${effects?.isBlurred ? 'blur-2xl scale-125' : ''}`} />
                  ) : (
                    <img src={imageBase64} alt="Preview" className={`h-full w-full object-cover transition-all duration-1000 ${effects?.isBlurred ? 'blur-2xl scale-125' : ''}`} />
                  )}
                  
                  {!submitting && (
                    <button 
                      onClick={clearFile}
                      className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button onClick={clearFile} disabled={submitting} className="rounded-2xl bg-card py-3.5 text-sm font-medium hairline disabled:opacity-50">
                    Repetir
                  </button>
                  <button onClick={handleSubmit} disabled={submitting} className="flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-medium text-white disabled:opacity-80" style={{ background: "var(--gradient-party)" }}>
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <>Enviar prueba <span>›</span></>}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {challenge.status === "pending" && (
          <div className="mt-6 glass flex items-center gap-3 rounded-2xl p-4 animate-in fade-in">
            <ShieldCheck size={18} className="text-primary" />
            <div className="min-w-0 flex-1 text-sm text-muted-foreground">Reto enviado. Esperando validación del admin.</div>
          </div>
        )}

        {challenge.status === "done" && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-green-500/10 p-4 border border-green-500/20 animate-in fade-in">
            <ShieldCheck size={18} className="text-green-500" />
            <div className="min-w-0 flex-1 text-sm text-green-500 font-medium">¡Reto completado! +{challenge.points} pts</div>
          </div>
        )}

        {submitError && <div className="mt-4 text-center text-sm text-destructive">{submitError}</div>}
      </div>
    </PhoneFrame>
  );
}