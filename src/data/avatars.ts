// Avatares animados usando emojis + CSS animations
// Cada avatar tiene un emoji principal, nombre y gradiente de fondo

export interface AvatarOption {
  emoji: string;
  name: string;
  color: string;
  animation: string;
}

export const avatarOptions: AvatarOption[] = [
  { emoji: "🦁", name: "León", color: "from-orange-400 to-red-500", animation: "animate-bounce" },
  { emoji: "🐉", name: "Dragón", color: "from-purple-400 to-pink-500", animation: "animate-pulse" },
  { emoji: "🦊", name: "Zorro", color: "from-orange-300 to-orange-500", animation: "animate-spin-slow" },
  { emoji: "🐸", name: "Rana", color: "from-green-400 to-emerald-500", animation: "animate-bounce" },
  { emoji: "🦄", name: "Unicornio", color: "from-pink-300 to-purple-500", animation: "animate-pulse" },
  { emoji: "🐺", name: "Lobo", color: "from-gray-400 to-gray-600", animation: "animate-spin-slow" },
  { emoji: "🦋", name: "Mariposa", color: "from-blue-300 to-cyan-500", animation: "animate-bounce" },
  { emoji: "🐙", name: "Pulpo", color: "from-red-400 to-pink-500", animation: "animate-pulse" },
  { emoji: "🦈", name: "Tiburón", color: "from-blue-500 to-blue-700", animation: "animate-spin-slow" },
  { emoji: "🦜", name: "Loro", color: "from-green-400 to-yellow-400", animation: "animate-bounce" },
  { emoji: "🐝", name: "Abeja", color: "from-yellow-300 to-orange-400", animation: "animate-pulse" },
  { emoji: "🦇", name: "Murciélago", color: "from-purple-600 to-gray-800", animation: "animate-spin-slow" },
];

export function getRandomAvatar(): string {
  const avatar = avatarOptions[Math.floor(Math.random() * avatarOptions.length)];
  return avatar.emoji;
}

export function getRandomAvatarWithColor(): AvatarOption {
  return avatarOptions[Math.floor(Math.random() * avatarOptions.length)];
}