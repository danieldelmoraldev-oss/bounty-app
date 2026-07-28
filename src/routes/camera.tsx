import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/PhoneFrame";
import { X, Zap, Type, Timer, RefreshCw, Sparkles, Send, ChevronDown, FolderPlus, FolderSearch, Globe, Loader2, Lock } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { getStoredGroupCode, getStoredMemberId } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getGroupInfo } from "@/api/groups.server";
import { getEvents, uploadPhoto, createAlbum } from "@/api/events.server";
import { submitChallenge } from "@/api/challenges.server"; 
import { getActiveEffects } from "@/api/sabotage.server"; 

export const Route = createFileRoute("/camera")({
  head: () => ({
    meta: [
      { title: "Bounty · Cámara" },
      { name: "description", content: "Documenta la noche. Añade texto y comparte con el grupo." },
    ],
  }),
  validateSearch: (search: Record<string, string | undefined>) => ({
    challengeId: search.challengeId || undefined,
    challengeTitle: search.challengeTitle || undefined,
  }),
  component: CameraRoute,
});

type DrawerView = "hidden" | "menu" | "select" | "create";

function CameraRoute() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { challengeId, challengeTitle } = Route.useSearch();
  const groupCode = getStoredGroupCode();
  const memberId = getStoredMemberId();

  const isChallengeMode = !!challengeId; 

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const [caption, setCaption] = useState<string>("");
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  
  const [drawerView, setDrawerView] = useState<DrawerView>("hidden");
  const [newAlbumName, setNewAlbumName] = useState("");

  const [captureMode, setCaptureMode] = useState<"photo" | "video">("photo");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 10>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | null>(null);

  const [flashMode, setFlashMode] = useState<"off" | "on" | "auto">("off");

  const [isFlashing, setIsFlashing] = useState(false);

  const { data: groupInfo } = useQuery({
    queryKey: ["groupInfo", groupCode],
    queryFn: () => getGroupInfo({ data: { code: groupCode! } }),
    enabled: !!groupCode,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events", groupCode],
    queryFn: () => getEvents({ data: { groupCode: groupCode! } }),
    enabled: !!groupCode,
  });

  const { data: effects } = useQuery({
    queryKey: ["activeEffects", memberId],
    queryFn: () => getActiveEffects({ data: { memberId: memberId! } }),
    refetchInterval: 5000, 
  });

  const uploadMutation = useMutation({
    mutationFn: (eventId?: string) => 
      uploadPhoto({
        data: {
          eventId: eventId || undefined,
          memberId: memberId!,
          type: "free",
          caption: caption.trim(),
          imageBase64: capturedImage!,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["recentMedia"] });
      navigate({ to: "/album" });
    },
    onError: (err) => {
      console.error("Error al subir la imagen:", err);
      alert("Error al subir. Revisa la consola.");
    }
  });

  const challengeMutation = useMutation({
    mutationFn: () => 
      submitChallenge({ data: { challengeId: challengeId!, memberId: memberId!, imageBase64: capturedImage! } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      queryClient.invalidateQueries({ queryKey: ["challengeDetail"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      navigate({ to: "/challenges" }); 
    },
    onError: (err) => {
      console.error("Error al completar el reto:", err);
      alert("Error al validar el reto. Revisa la consola.");
    }
  });

  const createAlbumMutation = useMutation({
    mutationFn: (name: string) => createAlbum({ data: { groupCode: groupCode!, name } }),
    onSuccess: (newAlbum) => {
      uploadMutation.mutate(newAlbum.id);
    }
  });

  const startCamera = async (mode: "environment" | "user") => {
  if (stream) stream.getTracks().forEach((track) => track.stop());
  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: mode },
      audio: true,
    });
    setStream(mediaStream);
    setVideoTrack(mediaStream.getVideoTracks()[0]); // <-- AÑADIMOS ESTO
    if (videoRef.current) videoRef.current.srcObject = mediaStream;
  } catch (err) {
    console.warn("Sin permisos de audio. Intentando solo vídeo...", err);
    try {
      const videoOnlyStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false,
      });
      setStream(videoOnlyStream);
      setVideoTrack(videoOnlyStream.getVideoTracks()[0]); // <-- AÑADIMOS ESTO
      if (videoRef.current) videoRef.current.srcObject = videoOnlyStream;
    } catch (fallbackErr) {
      console.error("Error accediendo a la cámara", fallbackErr);
    }
  }
};

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [facingMode]);

  // 👇 1. EL NUEVO USEEFFECT FUERA, TOTALMENTE INDEPENDIENTE 👇
  useEffect(() => {
    if (captureMode === "video" && flashMode === "auto") {
      setFlashMode("off");
    }
  }, [captureMode, flashMode]);
  
  // 👇 2. EL USEEFFECT DEL FLASH FÍSICO LIMPIO 👇
  useEffect(() => {
    if (!videoTrack) return;
  
    const applyFlash = async () => {
      try {
        const capabilities = videoTrack.getCapabilities() as any;
        
        if (capabilities.torch) {
          if (facingMode === "environment" && flashMode === "on") {
            await videoTrack.applyConstraints({ advanced: [{ torch: true }] } as any);
          } else {
            await videoTrack.applyConstraints({ advanced: [{ torch: false }] } as any);
          }
        }
      } catch (err) {
        console.warn("El navegador no permitió controlar el flash físico", err);
      }
    };
    
    applyFlash();
  }, [flashMode, facingMode, videoTrack]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const takePhoto = async () => {
    let isDark = false;

    // 1. Algoritmo de luz ultra-rápido para el modo Auto
    if (flashMode === "auto" && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      
      if (imageData) {
        let totalBrightness = 0;
        for (let i = 0; i < imageData.data.length; i += 40) {
          totalBrightness += (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
        }
        const avgBrightness = totalBrightness / (imageData.data.length / 40);
        isDark = avgBrightness < 120; 
      }
    }

    // 2. Decidir si disparamos flash
    const shouldFlashScreen = facingMode === "user" && (flashMode === "on" || (flashMode === "auto" && isDark));
    const shouldFlashTorch = facingMode === "environment" && (flashMode === "on" || (flashMode === "auto" && isDark));

    // 3. SECUENCIA PROFESIONAL: Pre-flash rápido -> Apagón -> Flash Largo (1s)
    if (shouldFlashScreen) {
      setIsFlashing(true);
      await new Promise(resolve => setTimeout(resolve, 50)); // Pre-flash
      setIsFlashing(false);
      await new Promise(resolve => setTimeout(resolve, 200)); // Pausa
      setIsFlashing(true);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Flash largo para enfocar
    }
    
    if (shouldFlashTorch && videoTrack) {
      try {
        await videoTrack.applyConstraints({ advanced: [{ torch: true }] } as any);
        await new Promise(resolve => setTimeout(resolve, 50)); // Pre-flash
        await videoTrack.applyConstraints({ advanced: [{ torch: false }] } as any);
        await new Promise(resolve => setTimeout(resolve, 200)); // Pausa
        await videoTrack.applyConstraints({ advanced: [{ torch: true }] } as any);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Flash largo para enfocar
      } catch (err) { console.warn("No se pudo encender la linterna", err); }
    }

    // --- 4. CAPTURAMOS LA FOTO REAL ---
    if (videoRef.current && canvasRef.current && !effects?.isBlocked) { 
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      
      if (facingMode === "user" && ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      
      if (effects?.isBlurred && ctx) {
        ctx.filter = "blur(15px)";
      }

      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL("image/jpeg", 0.8);
      
      setPreviewUrl(base64); 
      setCapturedImage(base64); 
      
      if (stream) stream.getTracks().forEach((t) => t.stop());
    }

    // --- 5. APAGAMOS LAS LUCES ---
    if (shouldFlashScreen) {
      setIsFlashing(false);
    }
    
    if (shouldFlashTorch && videoTrack) {
      try {
        await videoTrack.applyConstraints({ advanced: [{ torch: false }] } as any);
      } catch (err) {}
    }
  };

  const startRecording = () => {
    if (!stream || effects?.isBlocked) return;
    chunksRef.current = [];
    
    try {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        // Mejoramos la detección del formato para máxima compatibilidad móvil
        let fallbackMime = MediaRecorder.isTypeSupported("video/mp4") ? "video/mp4" : "video/webm";
        let chunkType = chunksRef.current.length > 0 ? (chunksRef.current[0] as Blob).type : fallbackMime;
        
        const blob = new Blob(chunksRef.current, { type: chunkType || fallbackMime });
        
        const objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
        
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          setCapturedImage(reader.result as string); 
        };
        
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
        
        if (stream) stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 14) {
            stopRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Error al grabar vídeo", err);
      alert("Tu navegador actual no soporta grabación de vídeo en vivo.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleCaptureClick = () => {
  if (isRecording) {
    stopRecording();
    return;
  }

  if (timerSeconds > 0) {
    setCountdown(timerSeconds);
    let time = timerSeconds;
    const interval = setInterval(() => {
      time -= 1;
      setCountdown(time);
      if (time === 0) {
        clearInterval(interval);
        setCountdown(null);
        if (captureMode === "photo") takePhoto();
        else startRecording();
      }
    }, 1000);
  } else {
    if (captureMode === "photo") takePhoto();
    else startRecording();
  }
};

  const handleRetake = () => {
    setPreviewUrl(null);
    setCapturedImage(null);
    setCaption("");
    setDrawerView("hidden");
    startCamera(facingMode);
  };

  const handleSendClick = () => {
    if (isChallengeMode) {
      challengeMutation.mutate();
    } else if (groupInfo?.isLiveMode && groupInfo.activeEvent) {
      uploadMutation.mutate(groupInfo.activeEvent.id);
    } else {
      setDrawerView("menu");
    }
  };

  const handleCreateAndUpload = () => {
    if (!newAlbumName.trim()) return;
    createAlbumMutation.mutate(newAlbumName.trim());
  };

  const isWorking = uploadMutation.isPending || createAlbumMutation.isPending || challengeMutation.isPending;

  return (
    <PhoneFrame>
      <div className="relative min-h-dvh bg-black overflow-hidden">
        
        {isRecording && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black/60 px-4 py-2 rounded-full backdrop-blur-md">
            <div className="h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
            <span className="text-white font-mono text-sm font-medium">00:{recordingTime.toString().padStart(2, '0')}</span>
          </div>
        )}

        <div className="absolute inset-0">
          {/* Se han añadido keys a los reproductores para que no se congele al parar el vídeo */}
          {!previewUrl ? (
            <video
              key="live-camera"
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover transition-all duration-1000 ${facingMode === "user" ? "-scale-x-100" : ""} ${effects?.isBlurred ? "blur-[25px] scale-125" : ""}`}
            />
          ) : (
            captureMode === "video" ? (
              <video 
                key="preview-video"
                src={previewUrl} 
                autoPlay 
                loop 
                muted 
                playsInline
                ref={(el) => {
                  if (el) {
                    el.defaultMuted = true;
                    el.muted = true;
                    el.play().catch(e => console.log("Autoplay bloqueado:", e));
                  }
                }}
                
                className={`h-full w-full object-cover transition-all duration-1000 ${facingMode === "user" ? "-scale-x-100" : ""} ${effects?.isBlurred ? "blur-[25px] scale-125" : ""}`} 
              />
            ) : (
              /* Y hemos quitado el '-scale-x-100' de aquí también */
              <img key="preview-img" src={previewUrl} alt="Captura" className={`h-full w-full object-cover transition-all duration-1000 ${effects?.isBlurred ? "blur-[25px] scale-125" : ""}`} />
            )
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
          
          {/* 1. Máscara blanca con hueco de píldora para selfies */}
          {facingMode === "user" && flashMode === "on" && !previewUrl && (
            <div className="absolute inset-0 z-30 overflow-hidden pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-[28rem] rounded-full shadow-[0_0_0_9999px_rgba(255,255,255,0.85)] transition-all duration-300" />
            </div>
          )}

          {/* 2. Pantallazo blanco real al pulsar el botón de capturar */}
          <div className={`absolute inset-0 bg-white z-40 pointer-events-none transition-opacity duration-100 ${isFlashing ? "opacity-100" : "opacity-0"}`} />
        </div>

        {!isRecording && (
          <div className="relative flex items-center justify-between px-5 pt-6 z-10 animate-in fade-in">
            <button
              onClick={() => previewUrl ? handleRetake() : navigate({ to: isChallengeMode ? "/challenge-detail" : "/party", search: { challengeId } })}
              className="grid h-10 w-10 place-items-center rounded-full bg-black/40 backdrop-blur text-white"
            >
              <X size={18} />
            </button>
            
            <div className={`glass rounded-full px-3 py-1 text-[11px] uppercase tracking-widest text-white ${isChallengeMode ? "!bg-destructive/80 border border-destructive/50" : ""}`}>
              {isChallengeMode ? `Reto: ${challengeTitle?.slice(0, 15) || "Activo"}...` : groupInfo?.isLiveMode ? "Freestyle - Live" : "Freestyle"}
            </div>

            {/* Si NO hay previsualización, mostramos el botón. Si la hay, dejamos un espaciador */}
            {!previewUrl ? (
              <button 
                onClick={() => setFlashMode(prev => {
                  if (captureMode === "video") return prev === "off" ? "on" : "off";
                  return prev === "off" ? "on" : prev === "on" ? "auto" : "off";
                })}
                className="grid h-10 w-10 place-items-center rounded-full bg-black/40 backdrop-blur text-white transition active:scale-95"
              >
                {flashMode === "off" && <Zap size={18} className="opacity-50" />}
                {flashMode === "on" && <Zap size={18} className="fill-yellow-400 text-yellow-400" />}
                {flashMode === "auto" && (
                  <div className="relative">
                    <Zap size={18} />
                    <span className="absolute -bottom-1 -right-1 text-[8px] font-bold">A</span>
                  </div>
                )}
              </button>
            ) : (
              <div className="w-10" /> 
            )}
          </div> // <-- ESTE DIV FALTABA
        )} 

        {!isChallengeMode && !isRecording && (
          <div className="relative mt-32 px-8 text-center z-10 animate-in fade-in">
            {previewUrl ? (
              <div 
                className="inline-block rounded-2xl bg-black/40 px-4 py-3 backdrop-blur cursor-pointer"
                onClick={() => setIsEditingCaption(true)}
              >
                {isEditingCaption ? (
                  <input
                    autoFocus
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    onBlur={() => setIsEditingCaption(false)}
                    placeholder="Añade un texto..."
                    className="bg-transparent font-display text-3xl italic text-white outline-none text-center placeholder:text-white/40 w-full"
                  />
                ) : (
                  <>
                    {!caption && <div className="text-[11px] uppercase tracking-[0.3em] text-white/60 mb-1">Toca para añadir texto</div>}
                    <div className="font-display text-3xl italic text-white">
                      {caption ? `"${caption}"` : `"Un clásico"`}
                    </div>
                  </>
                )}
              </div>
            ) : (
               <div className="inline-block rounded-2xl bg-black/20 px-4 py-3 backdrop-blur opacity-50">
                 <div className="text-[11px] uppercase tracking-[0.3em] text-white/60">
                   {captureMode === "photo" ? "Haz la foto primero" : "Graba un vídeo primero"}
                 </div>
               </div>
            )}
          </div>
        )}

        {/* Cuenta atrás gigante en el centro */}
{countdown !== null && (
  <div className="absolute inset-0 z-40 flex items-center justify-center">
    <div className="text-9xl font-bold text-white drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] animate-pulse">
      {countdown}
    </div>
  </div>
)}

{/* Temporizador centrado arriba */}
{!previewUrl && !isRecording && (
  <div className="absolute top-20 inset-x-0 flex justify-center z-10 animate-in fade-in">
    <button 
      onClick={() => setTimerSeconds(prev => prev === 0 ? 3 : prev === 3 ? 10 : 0)}
      className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-1.5 backdrop-blur text-white transition active:scale-95"
    >
      <Timer size={16} />
      <span className="text-xs font-bold uppercase tracking-widest">
        {timerSeconds === 0 ? "Off" : `${timerSeconds}s`}
      </span>
    </button>
  </div>
)}

        

        <div className="absolute inset-x-0 bottom-0 pb-8 z-10">
          {!previewUrl ? (
            effects?.isBlocked ? (
              <div className="flex flex-col items-center justify-center pb-6 animate-in slide-in-from-bottom-8">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-destructive/80 text-white backdrop-blur-md shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                  <Lock size={28} />
                </div>
                <div className="mt-3 font-bold text-destructive tracking-widest uppercase text-xs">Cámara Bloqueada</div>
              </div>
            ) : (
              <>
                {!isRecording && (
                  <div className="mb-5 flex justify-center gap-6 text-[11px] uppercase tracking-widest text-white/60">
                    <button 
                      onClick={() => setCaptureMode("photo")} 
                      className={`transition ${captureMode === "photo" ? "text-white font-bold drop-shadow-md scale-110" : ""}`}
                    >
                      Foto
                    </button>
                    <button 
                      onClick={() => setCaptureMode("video")} 
                      className={`transition ${captureMode === "video" ? "text-white font-bold drop-shadow-md scale-110" : ""}`}
                    >
                      Vídeo
                    </button>
                  </div>
                )}
                
                <div className="flex items-center justify-around px-8">
                  <label className={`grid h-12 w-12 place-items-center rounded-2xl bg-white/10 backdrop-blur cursor-pointer transition active:scale-95 ${isRecording ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
                    <input 
                      type="file" 
                      accept="image/*,video/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        const isVideoFile = file.type.startsWith('video/');
                        setCaptureMode(isVideoFile ? 'video' : 'photo');
                        
                        const objectUrl = URL.createObjectURL(file);
                        setPreviewUrl(objectUrl);
                        
                        const reader = new FileReader();
                        reader.readAsDataURL(file);
                        reader.onloadend = () => {
                          setCapturedImage(reader.result as string);
                        };
                      }}
                    />
                    <div className="h-6 w-6 rounded-md bg-white/30 border border-white/50 flex items-center justify-center overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-tr from-white/40 to-transparent" />
                    </div>
                  </label>
                  
                  <button 
                    onClick={handleCaptureClick}
                    className={`grid h-20 w-20 place-items-center rounded-full ring-4 ring-white/80 transition-all duration-300 active:scale-95 ${isRecording ? "ring-red-500 scale-110" : ""}`}
                  >
                    <div 
                      className={`transition-all duration-300 ${captureMode === "video" ? (isRecording ? "h-8 w-8 rounded-lg bg-red-500" : "h-16 w-16 rounded-full bg-red-500") : "h-16 w-16 rounded-full"}`} 
                      style={{ background: captureMode === "photo" ? "var(--gradient-party)" : undefined }} 
                    />
                  </button>
                  
                  <button 
                  onClick={toggleCamera} 
                  className={`grid h-12 w-12 place-items-center rounded-2xl bg-white/10 backdrop-blur text-white transition active:scale-90 ${isRecording ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                >
                  <RefreshCw size={18} />
                </button>
                </div>
              </>
            )
          ) : (
            <div className="flex flex-col items-center justify-center px-8 animate-in slide-in-from-bottom-8">
              <button
                onClick={handleSendClick}
                disabled={isWorking || !capturedImage}
                className="flex items-center justify-center gap-3 w-full rounded-full py-4 text-white font-medium text-lg shadow-lg disabled:opacity-50 transition active:scale-95"
                style={{ background: isChallengeMode ? "#a33333" : "var(--gradient-party)" }}
              >
                {isWorking || !capturedImage ? "Procesando..." : isChallengeMode ? "Enviar Prueba" : "Enviar"} <Send size={20} />
              </button>
            </div>
          )}
        </div>

        {drawerView !== "hidden" && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDrawerView("hidden")} />
            <div className="relative bg-card rounded-t-[32px] p-6 pb-12 w-full animate-in slide-in-from-bottom-full duration-300 hairline">
              
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-medium">
                    {drawerView === "menu" ? "¿Qué hacemos con esto?" : 
                     drawerView === "select" ? "Elegir álbum" : "Nuevo álbum"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {drawerView === "menu" ? "No hay ninguna noche activa." : ""}
                  </p>
                </div>
                <button 
                  onClick={() => drawerView === "menu" ? setDrawerView("hidden") : setDrawerView("menu")} 
                  className="grid h-8 w-8 place-items-center rounded-full bg-white/10"
                >
                  <ChevronDown size={18} />
                </button>
              </div>
              
              {drawerView === "menu" && (
                <div className="space-y-3">
                  <button
                    onClick={() => setDrawerView("create")}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-primary text-primary-foreground font-medium transition active:scale-95"
                  >
                    <FolderPlus size={20} />
                    Crear nuevo álbum
                  </button>
                  
                  <button
                    onClick={() => setDrawerView("select")}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition active:scale-95"
                  >
                    <FolderSearch size={20} />
                    Añadir a un álbum existente
                  </button>

                  <button
                    onClick={() => uploadMutation.mutate(undefined)}
                    disabled={uploadMutation.isPending || !capturedImage} 
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition ${
                      uploadMutation.isPending && uploadMutation.variables === undefined
                        ? "bg-primary/20 scale-95 opacity-90 text-white" 
                        : "bg-white/5 hover:bg-white/10 active:scale-95" 
                    } disabled:opacity-60`}
                  >
                    {uploadMutation.isPending && uploadMutation.variables === undefined ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Globe size={20} />
                    )}
                    
                    <span className="font-medium">
                      {uploadMutation.isPending && uploadMutation.variables === undefined 
                        ? "Subiendo..." 
                        : "Subir por libre (Sin álbum)"}
                    </span>
                  </button>
                </div>
              )}

              {drawerView === "select" && (
                <div className="space-y-3 max-h-[40vh] overflow-y-auto no-scrollbar">
                  {events.map((ev) => {
                    const isUploadingThis = uploadMutation.isPending && uploadMutation.variables === ev.id;
                    return (
                      <button
                        key={ev.id}
                        onClick={() => uploadMutation.mutate(ev.id)}
                        disabled={uploadMutation.isPending || !capturedImage}
                        className={`w-full flex items-center gap-4 p-3 rounded-2xl text-left transition ${
                          isUploadingThis 
                            ? "bg-primary/20 scale-95 opacity-90" 
                            : "bg-white/5 hover:bg-white/10 active:scale-95" 
                        } disabled:opacity-60`}
                      >
                        <div className="relative w-12 h-12 shrink-0">
                          <img 
                            src={ev.cover} 
                            alt="" 
                            className={`w-full h-full rounded-xl object-cover transition ${isUploadingThis ? "opacity-40 blur-[2px]" : ""}`} 
                          />
                          {isUploadingThis && (
                            <div className="absolute inset-0 grid place-items-center">
                              <Loader2 size={20} className="animate-spin text-white drop-shadow-md" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-base truncate text-white">
                            {isUploadingThis ? "Subiendo..." : ev.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {isUploadingThis ? "No cierres la app" : ev.date}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {events.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-4">
                      No hay álbumes creados aún.
                    </div>
                  )}
                </div>
              )}

              {drawerView === "create" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
                      Nombre del evento
                    </label>
                    <input
                      autoFocus
                      type="text"
                      value={newAlbumName}
                      onChange={(e) => setNewAlbumName(e.target.value)}
                      placeholder="Ej: Tardeo en el centro"
                      className="w-full rounded-2xl bg-white/10 px-5 py-4 text-white outline-none backdrop-blur placeholder:text-white/30"
                    />
                  </div>
                  <button
                    onClick={handleCreateAndUpload}
                    disabled={!newAlbumName.trim() || createAlbumMutation.isPending || !capturedImage}
                    className="w-full rounded-full py-4 text-sm font-medium text-white disabled:opacity-50 transition active:scale-95"
                    style={{ background: "var(--gradient-party)" }}
                  >
                    {createAlbumMutation.isPending ? "Creando..." : "Crear y Enviar"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </PhoneFrame>
  );
}