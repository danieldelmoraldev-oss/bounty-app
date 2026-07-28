// Mock store en memoria para desarrollo sin MongoDB
// Cuando configures MongoDB, este archivo se deja de usar automáticamente
import { getRandomAvatar } from "@/data/avatars";

export interface MockGroup {
  id: string;
  name: string;
  code: string;
  adminId: string;
  createdAt: Date;
}

export interface MockMember {
  id: string;
  groupId: string;
  name: string;
  avatar: string;
  points: number;
  balance: number;
  title: string;
  frame: "gold" | "violet" | "electric" | "ember" | "none";
  isAdmin: boolean;
  createdAt: Date;
}

export interface MockChallenge {
  id: string;
  groupId: string;
  memberId: string;
  level: 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
  points: number;
  status: "locked" | "available" | "pending" | "done";
  createdAt: Date;
}

export interface MockShopItem {
  id: string;
  groupId: string;
  name: string;
  description: string;
  price: number;
  tag: "Buff" | "Sabotaje" | "Cosmético";
  icon: string;
}

export interface MockNotification {
  id: string;
  groupId: string;
  memberId: string;
  type: "success" | "sabotage" | "info";
  who: string;
  action: string;
  target: string;
  read: boolean;
  createdAt: Date;
}

// Almacenamiento en memoria
const groups: MockGroup[] = [];
const members: MockMember[] = [];
const challenges: MockChallenge[] = [];
const shopItems: MockShopItem[] = [];
const notifications: MockNotification[] = [];

// Generar IDs
let idCounter = 0;
function genId(): string {
  return `mock_${++idCounter}_${Date.now()}`;
}

// Generar código de 5 letras
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Seed inicial
function ensureSeedData() {
  if (groups.length > 0) return;

  const groupId = genId();
  const adminId = genId();

  groups.push({
    id: groupId,
    name: "Los Descarriados",
    code: "NX7QA",
    adminId,
    createdAt: new Date(),
  });

  const memberData = [
    { name: "Marta", points: 1284, balance: 1284, title: "La Reina de la Pista", frame: "gold" as const, isAdmin: true },
    { name: "Álex", points: 1120, balance: 1120, title: "El Estratega", frame: "violet" as const, isAdmin: false },
    { name: "Clara", points: 984, balance: 984, title: "Corazón Salvaje", frame: "electric" as const, isAdmin: false },
    { name: "Rodri", points: 872, balance: 872, title: "El Cronista", frame: "none" as const, isAdmin: false },
    { name: "Javi", points: 640, balance: 640, title: "Mr. Playlist", frame: "none" as const, isAdmin: false },
    { name: "Nuria", points: 512, balance: 512, title: "La Infiltrada", frame: "ember" as const, isAdmin: false },
    { name: "Dani", points: 214, balance: 214, title: "El Que Paga", frame: "none" as const, isAdmin: false },
  ];

  // El admin es Marta (primer miembro)
  memberData[0].isAdmin = true;
  groups[0].adminId = adminId;

  memberData.forEach((m, i) => {
    members.push({
      id: i === 0 ? adminId : genId(),
      groupId,
      ...m,
      avatar: "",
      createdAt: new Date(),
    });
  });

  // Retos
  const challengeDefs = [
    { level: 1 as const, title: "Brindis fantasma", description: "Haz un brindis con un desconocido y sácate una foto con él.", points: 50 },
    { level: 2 as const, title: "Doble mirada", description: "Fotografía a alguien que se parezca a un famoso.", points: 120 },
    { level: 3 as const, title: "El maestro de ceremonias", description: "Graba a alguien pidiéndole una canción concreta al DJ.", points: 220 },
    { level: 4 as const, title: "Cambio de rol", description: "Consigue que alguien del grupo baile con tu chaqueta puesta durante 3 min.", points: 380 },
    { level: 5 as const, title: "La leyenda", description: "Consigue el número de teléfono del bartender. Vídeo obligatorio.", points: 700 },
  ];

  // Asignar retos a Álex (segundo miembro) para demo
  const alexMember = members[1];
  challengeDefs.forEach((c, i) => {
    challenges.push({
      id: genId(),
      groupId,
      memberId: alexMember.id,
      level: c.level,
      title: c.title,
      description: c.description,
      points: c.points,
      status: i === 0 ? "available" : "locked",
      createdAt: new Date(),
    });
  });

  // Tienda
  const shopDefs = [
    { name: "Multiplicador x2", description: "Duplica tus puntos durante 30 min.", price: 300, tag: "Buff" as const, icon: "Zap" },
    { name: "Cámara Rota", description: "Filtro borroso a un amigo durante 15 min.", price: 250, tag: "Sabotaje" as const, icon: "CameraOff" },
    { name: "Bloqueo Nivel 1", description: "Le impides hacer retos fáciles.", price: 400, tag: "Sabotaje" as const, icon: "Lock" },
    { name: "Marco Dorado", description: "Un halo dorado para tu avatar.", price: 500, tag: "Cosmético" as const, icon: "Crown" },
    { name: "Multiplicador x1.5", description: "1.5x puntos durante 45 min.", price: 180, tag: "Buff" as const, icon: "Sparkles" },
    { name: "Título: 'Leyenda'", description: "Título permanente bajo tu nombre.", price: 900, tag: "Cosmético" as const, icon: "Award" },
  ];

  shopDefs.forEach((item) => {
    shopItems.push({ id: genId(), groupId, ...item });
  });

  // Notificaciones
  notifications.push(
    { id: genId(), groupId, memberId: alexMember.id, type: "success", who: "Marta", action: "validó tu reto", target: "Brindis fantasma", read: false, createdAt: new Date(Date.now() - 3 * 60000) },
    { id: genId(), groupId, memberId: alexMember.id, type: "sabotage", who: "Álex", action: "te ha saboteado con", target: "Cámara Rota", read: false, createdAt: new Date(Date.now() - 12 * 60000) },
    { id: genId(), groupId, memberId: alexMember.id, type: "info", who: "Sistema", action: "nuevo reto de nivel 3 disponible", target: "", read: false, createdAt: new Date(Date.now() - 40 * 60000) },
  );
}

// ===== API Mock =====

export function mockCreateGroup(name: string, adminName: string) {
  ensureSeedData();
  const groupId = genId();
  const adminId = genId();
  const code = generateCode();
  const avatar = getRandomAvatar();

  groups.push({
    id: groupId,
    name,
    code,
    adminId,
    createdAt: new Date(),
  });

  members.push({
    id: adminId,
    groupId,
    name: adminName,
    avatar,
    points: 0,
    balance: 0,
    title: "El Fundador",
    frame: "gold",
    isAdmin: true,
    createdAt: new Date(),
  });

  return {
    group: { id: groupId, name, code },
    member: { id: adminId, name: adminName, isAdmin: true, avatar },
  };
}

export function mockJoinGroup(code: string, name: string) {
  ensureSeedData();
  const group = groups.find((g) => g.code === code.toUpperCase());
  if (!group) throw new Error("Código de grupo no válido");

  const memberId = genId();
  const avatar = getRandomAvatar();
  members.push({
    id: memberId,
    groupId: group.id,
    name,
    avatar,
    points: 0,
    balance: 0,
    title: "",
    frame: "none",
    isAdmin: false,
    createdAt: new Date(),
  });

  return {
    group: { id: group.id, name: group.name, code: group.code },
    member: { id: memberId, name, isAdmin: false, avatar },
  };
}

export function mockGetGroupInfo(code: string) {
  ensureSeedData();
  const group = groups.find((g) => g.code === code.toUpperCase());
  if (!group) throw new Error("Grupo no encontrado");

  const groupMembers = members
    .filter((m) => m.groupId === group.id)
    .sort((a, b) => b.points - a.points);

  return {
    group: {
      id: group.id,
      name: group.name,
      code: group.code,
      season: "Temporada 3 · Verano 2026",
      members: groupMembers.length,
    },
    members: groupMembers.map((m) => ({
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      points: m.points,
      title: m.title,
      frame: m.frame,
      isAdmin: m.isAdmin,
    })),
    isLiveMode: false,
    activeEvent: null,
  };
}

export function mockGetMemberChallenges(memberId: string, groupCode: string) {
  ensureSeedData();
  const group = groups.find((g) => g.code === groupCode.toUpperCase());
  if (!group) throw new Error("Grupo no encontrado");

  return challenges
    .filter((c) => c.groupId === group.id && c.memberId === memberId)
    .sort((a, b) => a.level - b.level)
    .map((c) => ({
      id: c.id,
      level: c.level,
      title: c.title,
      description: c.description,
      points: c.points,
      status: c.status,
    }));
}

export function mockGetChallengeDetail(challengeId: string) {
  ensureSeedData();
  const challenge = challenges.find((c) => c.id === challengeId);
  if (!challenge) throw new Error("Reto no encontrado");

  return {
    id: challenge.id,
    level: challenge.level,
    title: challenge.title,
    description: challenge.description,
    points: challenge.points,
    status: challenge.status,
  };
}

export function mockSubmitChallenge(challengeId: string, memberId: string) {
  ensureSeedData();
  const challenge = challenges.find((c) => c.id === challengeId);
  if (!challenge) throw new Error("Reto no encontrado");
  if (challenge.status !== "available") throw new Error("Este reto no está disponible");

  challenge.status = "pending";
  return { success: true, status: "pending" };
}

export function mockRerollChallenge(challengeId: string, memberId: string) {
  ensureSeedData();
  const member = members.find((m) => m.id === memberId);
  if (!member) throw new Error("Miembro no encontrado");
  if (member.balance < 80) throw new Error("No tienes suficientes puntos. Necesitas 80 pts.");

  const challenge = challenges.find((c) => c.id === challengeId);
  if (!challenge) throw new Error("Reto no encontrado");

  const alternatives: Record<number, { title: string; description: string }[]> = {
    1: [
      { title: "Selfie grupal", description: "Hazte una selfie con al menos 3 desconocidos." },
      { title: "El camarero", description: "Pídele al camarero que te recomiende su trago favorito." },
    ],
    2: [
      { title: "Parecido razonable", description: "Señala a alguien que se parezca a un personaje famoso." },
      { title: "Cambio de look", description: "Ponte una prenda de otro miembro del grupo." },
    ],
    3: [
      { title: "Dedicatoria musical", description: "Convence al DJ para que dedique una canción a alguien." },
      { title: "El entrevistador", description: "Graba una entrevista de 30s a un desconocido." },
    ],
    4: [
      { title: "Baile improvisado", description: "Baila durante 1 minuto en medio de la pista." },
      { title: "El imitador", description: "Imita a otro miembro del grupo durante 2 minutos." },
    ],
    5: [
      { title: "El trofeo", description: "Consigue algo del bar firmado por el bartender." },
      { title: "Foto VIP", description: "Foto con el dueño del local o el DJ famoso." },
    ],
  };

  const alts = alternatives[challenge.level] || [];
  const randomAlt = alts[Math.floor(Math.random() * alts.length)];

  challenge.title = randomAlt.title;
  challenge.description = randomAlt.description;
  challenge.status = "available";

  member.balance -= 80;

  return {
    success: true,
    challenge: {
      id: challenge.id,
      level: challenge.level,
      title: challenge.title,
      description: challenge.description,
      points: challenge.points,
      status: challenge.status,
    },
    newBalance: member.balance,
  };
}

export function mockGetShopItems(groupCode: string) {
  ensureSeedData();
  const group = groups.find((g) => g.code === groupCode.toUpperCase());
  if (!group) throw new Error("Grupo no encontrado");

  return shopItems
    .filter((item) => item.groupId === group.id)
    .map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      tag: item.tag,
      icon: item.icon,
    }));
}

export function mockGetMemberProfile(memberId: string, groupCode: string) {
  ensureSeedData();
  const group = groups.find((g) => g.code === groupCode.toUpperCase());
  if (!group) throw new Error("Grupo no encontrado");

  const member = members.find((m) => m.id === memberId && m.groupId === group.id);
  if (!member) throw new Error("Miembro no encontrado");

  const sorted = members.filter((m) => m.groupId === group.id).sort((a, b) => b.points - a.points);
  const rank = sorted.findIndex((m) => m.id === memberId) + 1;

  return {
    id: member.id,
    name: member.name,
    avatar: member.avatar,
    points: member.points,
    balance: member.balance,
    title: member.title,
    frame: member.frame,
    isAdmin: member.isAdmin,
    rank,
    totalMembers: sorted.length,
  };
}

export function mockGetNotifications(memberId: string, groupCode: string) {
  ensureSeedData();
  const group = groups.find((g) => g.code === groupCode.toUpperCase());
  if (!group) throw new Error("Grupo no encontrado");

  return notifications
    .filter((n) => n.memberId === memberId && n.groupId === group.id)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((n) => ({
      id: n.id,
      who: n.who,
      action: n.action,
      target: n.target,
      time: getRelativeTime(n.createdAt),
      type: n.type,
      read: n.read,
    }));
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return "ahora mismo";
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHrs < 24) return `hace ${diffHrs} h`;
  return `hace ${Math.floor(diffHrs / 24)} d`;
}