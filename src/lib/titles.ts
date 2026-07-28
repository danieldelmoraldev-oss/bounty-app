// Sistema de títulos y marcos basado en rendimiento

export interface TitleDefinition {
  id: string;
  name: string;
  description: string;
  condition: "rank" | "points" | "events" | "challenges";
  threshold: number;
  frame?: "gold" | "violet" | "electric" | "ember";
}

export const titleDefinitions: TitleDefinition[] = [
  // Títulos por ranking
  {
    id: "leader",
    name: "Líder de Temporada",
    description: "Estás en primer lugar",
    condition: "rank",
    threshold: 1,
    frame: "gold",
  },
  {
    id: "top3",
    name: "Élite",
    description: "Top 3 de la temporada",
    condition: "rank",
    threshold: 3,
    frame: "violet",
  },
  {
    id: "top5",
    name: "Destacado",
    description: "Top 5 de la temporada",
    condition: "rank",
    threshold: 5,
    frame: "electric",
  },
  // Títulos por puntos
  {
    id: "veteran",
    name: "Veterano",
    description: "1000+ puntos acumulados",
    condition: "points",
    threshold: 1000,
    frame: "ember",
  },
  {
    id: "rookie",
    name: "Novato",
    description: "100+ puntos acumulados",
    condition: "points",
    threshold: 100,
  },
  // Títulos por eventos
  {
    id: "social",
    name: "Alma de la Fiesta",
    description: "10 eventos completados",
    condition: "events",
    threshold: 10,
    frame: "gold",
  },
  // Títulos por retos
  {
    id: "challenger",
    name: "Retador",
    description: "50 retos completados",
    condition: "challenges",
    threshold: 50,
    frame: "violet",
  },
];

export function getTitleForMember(rank: number, points: number, eventsCount: number, challengesCount: number): TitleDefinition | null {
  // Prioridad: rank > points > events > challenges
  if (rank === 1) return titleDefinitions.find(t => t.id === "leader")!;
  if (rank <= 3) return titleDefinitions.find(t => t.id === "top3")!;
  if (rank <= 5) return titleDefinitions.find(t => t.id === "top5")!;
  if (points >= 1000) return titleDefinitions.find(t => t.id === "veteran")!;
  if (points >= 100) return titleDefinitions.find(t => t.id === "rookie")!;
  if (eventsCount >= 10) return titleDefinitions.find(t => t.id === "social")!;
  if (challengesCount >= 50) return titleDefinitions.find(t => t.id === "challenger")!;
  return null;
}