import "dotenv/config";
import { connectDB } from "./client";
import { Group } from "./models/Group";
import { Season } from "./models/Season";
import { Member } from "./models/Member";
import { Challenge } from "./models/Challenge";
import { Event } from "./models/Event";
import { ShopItem } from "./models/ShopItem";
import { Notification } from "./models/Notification";

const challengesData = [
  { level: 1, title: "Brindis fantasma", description: "Haz un brindis con un desconocido y sácate una foto con él.", points: 50 },
  { level: 2, title: "Doble mirada", description: "Fotografía a alguien que se parezca a un famoso. Mínimo 60% de parecido.", points: 120 },
  { level: 3, title: "El maestro de ceremonias", description: "Graba a alguien pidiéndole una canción concreta al DJ.", points: 220 },
  { level: 4, title: "Cambio de rol", description: "Consigue que alguien del grupo baile con tu chaqueta puesta durante 3 min.", points: 380 },
  { level: 5, title: "La leyenda", description: "Consigue el número de teléfono del bartender. Vídeo obligatorio.", points: 700 },
];

const shopItemsData = [
  { name: "Multiplicador x2", description: "Duplica tus puntos durante 30 min.", price: 300, tag: "Buff" as const, icon: "Zap" },
  { name: "Cámara Rota", description: "Filtro borroso a un amigo durante 15 min.", price: 250, tag: "Sabotaje" as const, icon: "CameraOff" },
  { name: "Bloqueo Nivel 1", description: "Le impides hacer retos fáciles.", price: 400, tag: "Sabotaje" as const, icon: "Lock" },
  { name: "Marco Dorado", description: "Un halo dorado para tu avatar.", price: 500, tag: "Cosmético" as const, icon: "Crown" },
  { name: "Multiplicador x1.5", description: "1.5x puntos durante 45 min.", price: 180, tag: "Buff" as const, icon: "Sparkles" },
  { name: "Título: 'Leyenda'", description: "Título permanente bajo tu nombre.", price: 900, tag: "Cosmético" as const, icon: "Award" },
];

const membersData = [
  { name: "Marta", points: 1284, balance: 1284, title: "La Reina de la Pista", frame: "gold" as const, isAdmin: true },
  { name: "Álex", points: 1120, balance: 1120, title: "El Estratega", frame: "violet" as const, isAdmin: false },
  { name: "Clara", points: 984, balance: 984, title: "Corazón Salvaje", frame: "electric" as const, isAdmin: false },
  { name: "Rodri", points: 872, balance: 872, title: "El Cronista", frame: "none" as const, isAdmin: false },
  { name: "Javi", points: 640, balance: 640, title: "Mr. Playlist", frame: "none" as const, isAdmin: false },
  { name: "Nuria", points: 512, balance: 512, title: "La Infiltrada", frame: "ember" as const, isAdmin: false },
  { name: "Dani", points: 214, balance: 214, title: "El Que Paga", frame: "none" as const, isAdmin: false },
];

export async function seedDatabase() {
  console.log("[Seed] Iniciando seed de la base de datos...");
  await connectDB();

  // Limpiar datos existentes
  await Promise.all([
    Group.deleteMany({}),
    Season.deleteMany({}),
    Member.deleteMany({}),
    Challenge.deleteMany({}),
    Event.deleteMany({}),
    ShopItem.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  // Crear grupo
  const group = await Group.create({
    name: "Los Descarriados",
    code: "NX7QA",
  });

  // Crear temporada
  const season = await Season.create({
    groupId: group._id,
    name: "Temporada 3 · Verano 2026",
    isActive: true,
    startDate: new Date("2026-06-01"),
  });

  // Crear miembros
  const createdMembers = await Member.create(
    membersData.map((m) => ({ 
      ...m, 
      groupId: group._id,
      unlockedFrames: ["none", "gold", "violet", "electric", "ember"],
      unlockedTitles: ["leader", "top3", "top5", "veteran", "rookie"],
    }))
  );

  // Asignar títulos según ranking
  const sortedMembers = createdMembers.sort((a: any, b: any) => b.points - a.points);
  for (let i = 0; i < sortedMembers.length; i++) {
    const member = sortedMembers[i];
    let titleId = "rookie";
    let frame = "none";
    
    if (i === 0) { titleId = "leader"; frame = "gold"; }
    else if (i <= 3) { titleId = "top3"; frame = "violet"; }
    else if (i <= 5) { titleId = "top5"; frame = "electric"; }
    
    if (member.points >= 1000) titleId = "veteran";
    
    member.title = titleId;
    member.frame = frame as any;
    await member.save();
  }

  // Asignar admin
  const admin = createdMembers[0];
  group.adminId = admin._id;
  await group.save();

  // Crear retos (asignados al segundo miembro para demo)
  await Challenge.create(
    challengesData.map((c, i) => ({
      groupId: group._id,
      seasonId: season._id,
      level: c.level,
      title: c.title,
      description: c.description,
      points: c.points,
      status: i === 0 ? "available" : "locked",
      assignedTo: createdMembers[1]._id,
    }))
  );

  // Crear items de tienda
  await ShopItem.create(
    shopItemsData.map((item) => ({ ...item, groupId: group._id }))
  );

  // Crear evento de ejemplo
  await Event.create({
    groupId: group._id,
    seasonId: season._id,
    name: "Fiesta 22 Julio",
    date: new Date("2026-07-22"),
    isActive: false,
  });

  // Crear notificaciones de ejemplo
  await Notification.create([
    { groupId: group._id, memberId: createdMembers[1]._id, type: "success", who: "Marta", action: "validó tu reto", target: "Brindis fantasma" },
    { groupId: group._id, memberId: createdMembers[1]._id, type: "sabotage", who: "Álex", action: "te ha saboteado con", target: "Cámara Rota" },
    { groupId: group._id, memberId: createdMembers[1]._id, type: "info", who: "Sistema", action: "nuevo reto de nivel 3 disponible", target: "" },
  ]);

  console.log("[Seed] ✅ Base de datos poblada correctamente");
  console.log(`  - Grupo: ${group.name} (código: ${group.code})`);
  console.log(`  - Miembros: ${createdMembers.length}`);
  console.log(`  - Retos: ${challengesData.length}`);
  console.log(`  - Items tienda: ${shopItemsData.length}`);

  return { group, season, members: createdMembers };
}

// Ejecutar directamente si se llama como script
if (process.argv[1]?.includes("seed")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}