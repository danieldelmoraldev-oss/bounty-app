type Frame = "gold" | "violet" | "electric" | "ember" | "none";

const frames: Record<Frame, string> = {
  gold: "shadow-[0_0_0_2px_oklch(0.85_0.16_85),0_0_24px_oklch(0.75_0.18_85_/_0.6)]",
  violet: "shadow-[0_0_0_2px_oklch(0.7_0.22_295),0_0_24px_oklch(0.65_0.22_295_/_0.6)]",
  electric: "shadow-[0_0_0_2px_oklch(0.7_0.2_250),0_0_24px_oklch(0.65_0.2_250_/_0.6)]",
  ember: "shadow-[0_0_0_2px_oklch(0.78_0.18_55),0_0_24px_oklch(0.75_0.18_55_/_0.55)]",
  none: "ring-1 ring-white/10",
};

export function Avatar({
  src,
  name,
  size = 40,
  frame = "none",
}: {
  src: string;
  name: string;
  size?: number;
  frame?: Frame;
}) {
  const isEmoji = src && !src.startsWith("http") && !src.startsWith("/") && !src.startsWith("data:");

  if (isEmoji) {
    return (
      <div
        className={`shrink-0 overflow-hidden rounded-full ${frames[frame]} flex items-center justify-center bg-gradient-to-br from-gray-400 to-gray-600`}
        style={{ width: size, height: size }}
      >
        <span style={{ fontSize: size * 0.6 }}>{src}</span>
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-full ${frames[frame]}`}
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </div>
  );
}
