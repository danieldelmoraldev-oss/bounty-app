import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/PhoneFrame";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useState, useRef } from "react";
import { getGroupInfo } from "@/api/groups.server";
import { ArrowLeft, Check, Image as ImageIcon, Zap, ArrowRight, XCircle, Loader2 } from "lucide-react";
import jsQR from "jsqr";

export const Route = createFileRoute("/scan")({
  component: ScanRoute,
});

function ScanRoute() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"scanning" | "loading" | "success" | "error">("scanning");
  
  // 1. Ampliamos el estado para guardar la temporada, total de miembros y avatares reales
  const [groupData, setGroupData] = useState({ 
    name: "", 
    code: "",
    season: "",
    totalMembers: 0,
    avatars: [] as string[]
  });
  
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processQRCode = async (text: string) => {
    let extractedCode = text.includes("code=") 
      ? text.split("code=")[1].substring(0, 5).toUpperCase() 
      : text.substring(0, 5).toUpperCase();

    setStatus("loading");
    setIsTorchOn(false);

    try {
      const info = await getGroupInfo({ data: { code: extractedCode } });
      
      // 2. Guardamos todos los datos reales que nos devuelve tu backend
      setGroupData({ 
        name: info.group.name, 
        code: info.group.code,
        season: info.group.season,
        totalMembers: info.group.members,
        avatars: info.members.map((m: any) => m.avatar).filter(Boolean) // Extraemos los avatares
      });
      
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setTimeout(() => {
        setStatus("scanning");
        setUploadedImage(null);
      }, 2500);
    }
  };

  const handleScan = async (result: any) => {
    if (status !== "scanning") return;
    let text = typeof result === "string" ? result : result[0]?.rawValue || "";
    if (!text) return;
    await processQRCode(text);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);
    setStatus("loading");

    setTimeout(() => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const scale = Math.min(MAX_WIDTH / img.width, 1);
        
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code && code.data) {
          processQRCode(code.data);
        } else {
          setStatus("error");
          setTimeout(() => {
            setStatus("scanning");
            setUploadedImage(null);
          }, 2500);
        }
      };
      img.src = imageUrl;
    }, 150);
    
    e.target.value = "";
  };

  const handleContinue = () => {
    navigate({ 
      to: "/auth", 
      search: { code: groupData.code, action: "join", groupName: groupData.name } 
    });
  };

  const isSuccess = status === "success";

  return (
    <PhoneFrame>
      <div className="flex h-full min-h-dvh flex-col bg-gradient-to-b from-[#0f0822] via-[#0a0f26] to-[#04112b] text-white font-sans overflow-hidden">
        
        <div className="flex items-center gap-4 px-6 pt-12 pb-4 z-20">
          <button 
            onClick={() => navigate({ to: "/" })}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/5 border border-white/10 text-white/80 active:scale-95 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-sm font-medium text-white/80">Escanear QR</span>
        </div>

        <div className="flex flex-col items-center flex-1 mt-12 px-6">
          
          <div className="relative w-72 h-72">
            <div className={`absolute -top-1 -left-1 w-12 h-12 border-t-[2.5px] border-l-[2.5px] rounded-tl-[1.8rem] transition-colors duration-500 z-20 ${isSuccess ? 'border-green-400' : 'border-white/60'}`} />
            <div className={`absolute -top-1 -right-1 w-12 h-12 border-t-[2.5px] border-r-[2.5px] rounded-tr-[1.8rem] transition-colors duration-500 z-20 ${isSuccess ? 'border-green-400' : 'border-white/60'}`} />
            <div className={`absolute -bottom-1 -left-1 w-12 h-12 border-b-[2.5px] border-l-[2.5px] rounded-bl-[1.8rem] transition-colors duration-500 z-20 ${isSuccess ? 'border-green-400' : 'border-white/60'}`} />
            <div className={`absolute -bottom-1 -right-1 w-12 h-12 border-b-[2.5px] border-r-[2.5px] rounded-br-[1.8rem] transition-colors duration-500 z-20 ${isSuccess ? 'border-green-400' : 'border-white/60'}`} />
            
            <div className={`absolute inset-3 overflow-hidden rounded-[1.5rem] bg-[#1a1438]/50 transition-all duration-700 ${isSuccess ? 'shadow-[0_0_40px_rgba(74,222,128,0.2)]' : 'shadow-none'}`}>
              
              <div className="absolute top-0 left-0 right-0 h-24 bg-purple-500/20 blur-2xl pointer-events-none z-10" />

              {status === "scanning" && !uploadedImage && (
                <div className="relative w-full h-full [&>div]:!h-full [&>div>video]:!object-cover">
                  <Scanner 
                    onScan={handleScan}
                    onError={(err) => console.log("Cámara:", err)}
                    formats={["qr_code"]}
                    components={{
                      finder: false,
                      torch: false,
                    }}
                    constraints={{
                      facingMode: "environment",
                      advanced: [{ torch: isTorchOn } as any],
                    }}
                  />
                  <div className="absolute inset-0 bg-black/10 pointer-events-none z-10" />
                </div>
              )}

              {uploadedImage && (
                <img 
                  src={uploadedImage} 
                  alt="QR de Galería" 
                  className="absolute inset-0 h-full w-full object-cover opacity-50 z-0" 
                />
              )}

              {status === "loading" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1c223a]/60 backdrop-blur-sm z-20 animate-in fade-in duration-300">
                  <div className="bg-[#7a57ff]/20 rounded-full p-4 mb-3">
                    <Loader2 size={32} className="text-[#7a57ff] animate-spin" />
                  </div>
                </div>
              )}

              {isSuccess && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#1c223a]/80 backdrop-blur-sm z-20">
                  <div className="bg-[#22c55e] rounded-full p-4 shadow-[0_0_30px_rgba(34,197,94,0.4)] animate-in zoom-in-50 spin-in-12 duration-500 ease-out">
                    <Check strokeWidth={3} size={40} className="text-[#0d1424]" />
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#2a131e]/90 backdrop-blur-md z-20 animate-in fade-in duration-300">
                  <div className="bg-red-500/20 rounded-full p-4 mb-3">
                    <XCircle size={32} className="text-red-500" />
                  </div>
                  <div className="text-sm text-red-400 font-medium">Código no válido</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-10 text-center px-4 h-10">
            <p className="text-[13px] text-white/60 transition-opacity duration-300">
              {status === "loading" && "Procesando código..."}
              {(status === "scanning" || status === "error") && "Encuadra el QR del grupo dentro del marco. Se detecta solo."}
              {status === "success" && "QR reconocido. Preparando tu entrada..."}
            </p>
          </div>
        </div>

        <div className="relative h-64 w-full px-5 pb-8 flex flex-col justify-end z-20">
          
          {status === "scanning" && (
            <div className="flex items-center justify-between bg-white/5 backdrop-blur-md border border-white/10 rounded-full p-2 animate-in slide-in-from-bottom-4 fade-in duration-500">
              
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 px-3 py-1.5 active:scale-95 transition-transform"
              >
                <div className="bg-white/10 p-2.5 rounded-full">
                  <ImageIcon size={18} className="text-white/80" />
                </div>
                <div className="text-left">
                  <div className="text-[13px] font-semibold text-white">Desde la galería</div>
                  <div className="text-[11px] text-white/50">Sube una captura</div>
                </div>
              </button>
              
              <div className="flex items-center gap-2 pr-2">
                <button 
                  onClick={() => setIsTorchOn(!isTorchOn)}
                  className={`grid h-10 w-10 place-items-center rounded-full transition active:scale-95 ${
                    isTorchOn 
                      ? 'bg-white/20 text-yellow-400' 
                      : 'bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  <Zap size={18} className={isTorchOn ? 'fill-yellow-400' : ''} />
                </button>
              </div>
            </div>
          )}

          {isSuccess && (
            <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-8 fade-in duration-700 ease-out">
              <div className="bg-[#121935]/80 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-5 shadow-xl flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#34d399] mb-1.5">
                    Grupo Encontrado
                  </div>
                  <div className="text-xl font-semibold text-white mb-0.5">
                    {groupData.name}
                  </div>
                  {/* 3. Imprimimos el código y la temporada real */}
                  <div className="text-[11px] text-white/50">
                    Código {groupData.code} · {groupData.season}
                  </div>
                </div>
                
                {/* 4. Renderizamos los avatares dinámicamente con control de errores */}
                <div className="flex -space-x-2.5">
                  {groupData.avatars.slice(0, 4).map((avatar, i) => (
                    <img 
                      key={i} 
                      src={avatar} 
                      alt="User" 
                      className="w-8 h-8 rounded-full border-2 border-[#121935] object-cover bg-[#1c223a]" 
                      onError={(e) => {
                        // Si la imagen de la base de datos da 404, salta esto y le ponemos un avatar genérico bonito
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/avataaars/svg?seed=${groupData.name}${i}&backgroundColor=7a57ff`;
                      }}
                    />
                  ))}
                  
                  {groupData.totalMembers > 4 && (
                    <div className="w-8 h-8 rounded-full border-2 border-[#121935] bg-white/10 flex items-center justify-center text-[10px] font-medium text-white backdrop-blur-sm">
                      +{groupData.totalMembers - 4}
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={handleContinue} 
                className="w-full relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#7a57ff] to-[#4076ff] p-4 flex items-center justify-between shadow-[0_8px_30px_rgba(64,118,255,0.3)] transition-transform active:scale-[0.98]"
              >
                <div className="text-left px-2">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-white/70 mb-0.5">Siguiente</div>
                  <div className="text-lg font-medium text-white leading-none">Continuar</div>
                </div>
                <div className="bg-white/20 p-2.5 rounded-full backdrop-blur-md">
                  <ArrowRight size={20} className="text-white" />
                </div>
              </button>

              <button 
                onClick={() => {
                  setStatus("scanning");
                  setUploadedImage(null);
                }} 
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 text-center mt-3 active:scale-95 transition-transform"
              >
                Escanear otro QR
              </button>

            </div>
          )}
        </div>

      </div>
    </PhoneFrame>
  );
}