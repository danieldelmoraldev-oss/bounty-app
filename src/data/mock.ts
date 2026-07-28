import alex from "@/assets/avatar-alex.jpg";
import marta from "@/assets/avatar-marta.jpg";
import rodri from "@/assets/avatar-rodri.jpg";
import nuria from "@/assets/avatar-nuria.jpg";
import javi from "@/assets/avatar-javi.jpg";
import clara from "@/assets/avatar-clara.jpg";
import dani from "@/assets/avatar-dani.jpg";

import event1 from "@/assets/event-1.jpg";
import event2 from "@/assets/event-2.jpg";
import event3 from "@/assets/event-3.jpg";
import album1 from "@/assets/album-1.jpg";
import album2 from "@/assets/album-2.jpg";
import album3 from "@/assets/album-3.jpg";
import album4 from "@/assets/album-4.jpg";

export const images = {
  event1,
  event2,
  event3,
  album1,
  album2,
  album3,
  album4,
};

export type Member = {
  id: string;
  name: string;
  avatar: string;
  points: number;
  title: string;
  frame: "gold" | "violet" | "electric" | "ember" | "none";
};

export const members: Member[] = [
  { id: "marta", name: "Marta", avatar: marta, points: 1284, title: "La Reina de la Pista", frame: "gold" },
  { id: "alex", name: "Álex", avatar: alex, points: 1120, title: "El Estratega", frame: "violet" },
  { id: "clara", name: "Clara", avatar: clara, points: 984, title: "Corazón Salvaje", frame: "electric" },
  { id: "rodri", name: "Rodri", avatar: rodri, points: 872, title: "El Cronista", frame: "none" },
  { id: "javi", name: "Javi", avatar: javi, points: 640, title: "Mr. Playlist", frame: "none" },
  { id: "nuria", name: "Nuria", avatar: nuria, points: 512, title: "La Infiltrada", frame: "ember" },
  { id: "dani", name: "Dani", avatar: dani, points: 214, title: "El Que Paga", frame: "none" },
];

export const group = {
  name: "Los Descarriados",
  code: "NX7QA",
  season: "Temporada 3 · Verano 2026",
  members: 7,
};

export type Challenge = {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
  points: number;
  status: "locked" | "available" | "pending" | "done";
};

export const challenges: Challenge[] = [
  {
    id: "c1",
    level: 1,
    title: "Brindis fantasma",
    description: "Haz un brindis con un desconocido y sácate una foto con él.",
    points: 50,
    status: "available",
  },
  {
    id: "c2",
    level: 2,
    title: "Doble mirada",
    description: "Fotografía a alguien que se parezca a un famoso. Mínimo 60% de parecido.",
    points: 120,
    status: "locked",
  },
  {
    id: "c3",
    level: 3,
    title: "El maestro de ceremonias",
    description: "Graba a alguien pidiéndole una canción concreta al DJ.",
    points: 220,
    status: "locked",
  },
  {
    id: "c4",
    level: 4,
    title: "Cambio de rol",
    description: "Consigue que alguien del grupo baile con tu chaqueta puesta durante 3 min.",
    points: 380,
    status: "locked",
  },
  {
    id: "c5",
    level: 5,
    title: "La leyenda",
    description: "Consigue el número de teléfono del bartender. Vídeo obligatorio.",
    points: 700,
    status: "locked",
  },
];

export type ShopItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  tag: "Buff" | "Sabotaje" | "Cosmético";
  icon: string;
};

export const shopItems: ShopItem[] = [
  { id: "s1", name: "Multiplicador x2", description: "Duplica tus puntos durante 30 min.", price: 300, tag: "Buff", icon: "Zap" },
  { id: "s2", name: "Cámara Rota", description: "Filtro borroso a un amigo durante 15 min.", price: 250, tag: "Sabotaje", icon: "CameraOff" },
  { id: "s3", name: "Bloqueo Nivel 1", description: "Le impides hacer retos fáciles.", price: 400, tag: "Sabotaje", icon: "Lock" },
  { id: "s4", name: "Marco Dorado", description: "Un halo dorado para tu avatar.", price: 500, tag: "Cosmético", icon: "Crown" },
  { id: "s5", name: "Multiplicador x1.5", description: "1.5x puntos durante 45 min.", price: 180, tag: "Buff", icon: "Sparkles" },
  { id: "s6", name: "Título: 'Leyenda'", description: "Título permanente bajo tu nombre.", price: 900, tag: "Cosmético", icon: "Award" },
];

export type EventEntry = {
  id: string;
  name: string;
  date: string;
  cover: string;
  photos: number;
  stars: number;
};

export const events: EventEntry[] = [
  { id: "e1", name: "Fiesta 22 Julio", date: "22 Jul 2026", cover: event1, photos: 84, stars: 4.6 },
  { id: "e2", name: "Escapada a Ibiza", date: "12 Jun 2026", cover: event2, photos: 231, stars: 4.9 },
  { id: "e3", name: "Cumple Rodri", date: "3 May 2026", cover: event3, photos: 62, stars: 4.2 },
];

export const notifications = [
  { id: "n1", who: "Marta", action: "validó tu reto", target: "Brindis fantasma", time: "hace 3 min", type: "success" as const },
  { id: "n2", who: "Álex", action: "te ha saboteado con", target: "Cámara Rota", time: "hace 12 min", type: "sabotage" as const },
  { id: "n3", who: "Sistema", action: "nuevo reto de nivel 3 disponible", target: "", time: "hace 40 min", type: "info" as const },
  { id: "n4", who: "Clara", action: "puntuó tu foto con", target: "5 estrellas", time: "hace 1 h", type: "success" as const },
  { id: "n5", who: "Javi", action: "compró un multiplicador", target: "x2", time: "hace 2 h", type: "info" as const },
];
