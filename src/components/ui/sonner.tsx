import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group font-sans"
      toastOptions={{
        classNames: {
          // El diseño de Bounty: Degradado cristalino con brillo violeta y resplandor
          toast:
            "group toast !bg-gradient-to-br !from-[#4f46e5]/25 !to-[#0a0a0f]/95 !backdrop-blur-2xl !text-white !border !border-[#7c3aed]/40 !shadow-[0_20px_50px_-10px_rgba(124,58,237,0.3)] !rounded-[28px] !p-5",
          
          title: "!text-[15px] !font-medium !tracking-wide !text-white",
          
          description: "!text-[13px] !text-white/70 !mt-1",
          
          actionButton: "!bg-[#7c3aed] !text-white !font-medium !rounded-xl",
          cancelButton: "!bg-white/10 !text-white !backdrop-blur-md !font-medium !rounded-xl",
          
          closeButton: "!bg-white/10 !text-white !border-white/10 !backdrop-blur-xl hover:!bg-white/20 transition-colors !rounded-full",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };