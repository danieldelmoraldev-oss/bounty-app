import { createServerFn } from "@tanstack/react-start";
import { connectDB } from "@/db/client";
import { Group } from "@/db/models/Group";
import { Season } from "@/db/models/Season";
import { Member } from "@/db/models/Member";
import { Challenge } from "@/db/models/Challenge";
import { Event } from "@/db/models/Event";
import { ShopItem } from "@/db/models/ShopItem";
import { Notification } from "@/db/models/Notification";
import { sendPushNotification } from "@/api/onesignal.server";
import {
  mockCreateGroup,
  mockJoinGroup,
  mockGetGroupInfo,
} from "@/db/mock-store";
import { getRandomAvatar } from "@/data/avatars";

// Detectar si MongoDB está disponible
let mongoAvailable: boolean | null = null;
async function isMongoAvailable(): Promise<boolean> {
  if (mongoAvailable !== null) return mongoAvailable;
  try {
    await connectDB();
    mongoAvailable = true;
  } catch {
    console.log("[DB] MongoDB no disponible, usando mock store en memoria");
    mongoAvailable = false;
  }
  return mongoAvailable;
}

// Generar código aleatorio de 5 letras
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Crear un grupo nuevo
export const createGroup = createServerFn({ method: "POST" })
  .validator((data: { name: string; adminName: string; userId: string; avatar?: string }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) {
      return mockCreateGroup(data.name, data.adminName);
    }

    await connectDB();

    let code = generateCode();
    while (await Group.findOne({ code })) {
      code = generateCode();
    }

    const group = await Group.create({ name: data.name, code });

    const season = await Season.create({
      groupId: group._id,
      name: "Temporada 1",
      isActive: true,
    });

    const admin = await Member.create({
      userId: data.userId,
      groupId: group._id,
      name: data.adminName,
      avatar: data.avatar || getRandomAvatar(),
      points: 0,
      balance: 0,
      isAdmin: true,
      frame: "gold",
      title: "El Fundador",
    });

    group.adminId = admin._id;
    await group.save();

    const defaultChallenges = [
      { level: 1, title: "Brindis fantasma", description: "Haz un brindis con un desconocido y sácate una foto con él.", points: 50 },
      { level: 2, title: "Doble mirada", description: "Fotografía a alguien que se parezca a un famoso.", points: 120 },
      { level: 3, title: "El maestro de ceremonias", description: "Graba a alguien pidiéndole una canción concreta al DJ.", points: 220 },
      { level: 4, title: "Cambio de rol", description: "Consigue que alguien del grupo baile con tu chaqueta puesta durante 3 min.", points: 380 },
      { level: 5, title: "La leyenda", description: "Consigue el número de teléfono del bartender. Vídeo obligatorio.", points: 700 },
    ];

    await Challenge.create(
      defaultChallenges.map((c) => ({
        groupId: group._id,
        seasonId: season._id,
        level: c.level,
        title: c.title,
        description: c.description,
        points: c.points,
        status: c.level === 1 ? "available" : "locked",
        assignedTo: admin._id,
      }))
    );

    const defaultShopItems = [
      { name: "Multiplicador x2", description: "Duplica tus puntos durante 30 min.", price: 300, tag: "Buff" as const, icon: "Zap" },
      { name: "Cámara Rota", description: "Filtro borroso a un amigo durante 15 min.", price: 250, tag: "Sabotaje" as const, icon: "CameraOff" },
      { name: "Bloqueo Nivel 1", description: "Le impides hacer retos fáciles.", price: 400, tag: "Sabotaje" as const, icon: "Lock" },
      { name: "Marco Dorado", description: "Un halo dorado para tu avatar.", price: 500, tag: "Cosmético" as const, icon: "Crown" },
      { name: "Multiplicador x1.5", description: "1.5x puntos durante 45 min.", price: 180, tag: "Buff" as const, icon: "Sparkles" },
      { name: "Título: 'Leyenda'", description: "Título permanente bajo tu nombre.", price: 900, tag: "Cosmético" as const, icon: "Award" },
    ];

    await ShopItem.create(
      defaultShopItems.map((item) => ({ ...item, groupId: group._id }))
    );

    return {
      group: { id: group._id.toString(), name: group.name, code: group.code },
      member: { id: admin._id.toString(), name: admin.name, isAdmin: true, avatar: admin.avatar },
      season: { id: season._id.toString(), name: season.name },
    };
  });

// Unirse a un grupo con código
export const joinGroup = createServerFn({ method: "POST" })
  .validator((data: { code: string; name: string; userId: string; avatar?: string }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) {
      return mockJoinGroup(data.code, data.name);
    }

    await connectDB();

    const group = await Group.findOne({ code: data.code.toUpperCase() });
    if (!group) {
      throw new Error("Código de grupo no válido");
    }
    // SI EL USUARIO YA ESTÁ LOGUEADO: comprobamos si ya estaba en esta sala
      if (data.userId) {
        const existingMember = await Member.findOne({
          groupId: group._id,
          userId: data.userId,
        });

        // Si ya existía, devolvemos su entrada sin duplicar el perfil
        if (existingMember) {
          return {
            success: true,
            groupId: group._id.toString(),
            groupCode: group.code,
            memberId: existingMember._id.toString(),
            memberName: existingMember.name,
            memberAvatar: existingMember.avatar,
          };
        }
      }

    const season = await Season.findOne({ groupId: group._id, isActive: true });
    if (!season) {
      throw new Error("No hay temporada activa en este grupo");
    }

    // Lógica Anti-Duplicados
    let member = await Member.findOne({ groupId: group._id, userId: data.userId });
    
    if (!member) {
      member = await Member.create({
        userId: data.userId,
        groupId: group._id,
        name: data.name,
        avatar: data.avatar || getRandomAvatar(),
        points: 0,
        balance: 0,
      });
    }

    return {
      group: { id: group._id.toString(), name: group.name, code: group.code },
      member: { id: member._id.toString(), name: member.name, isAdmin: member.isAdmin, avatar: member.avatar },
      season: { id: season._id.toString(), name: season.name },
    };
  });

export const getGroupInfo = createServerFn({ method: "GET" })
  .validator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) {
      return mockGetGroupInfo(data.code);
    }

    await connectDB();

    const group = await Group.findOne({ code: data.code.toUpperCase() });
    if (!group) throw new Error("Grupo no encontrado");

    const season = await Season.findOne({ groupId: group._id, isActive: true });
    const members = await Member.find({ groupId: group._id }).sort({ points: -1 });
    
    // Cambiamos "const" por "let" para poder vaciarlo si la noche caduca
    let activeEvent = await Event.findOne({ groupId: group._id, isActive: true });

    // --- NUEVO: VALIDACIÓN PEREZOSA (LAZY CHECK) ---
    if (activeEvent && activeEvent.startedAt) {
      const horasMaxima = 12; // Cierra automáticamente tras 12 horas
      const limiteTiempo = activeEvent.startedAt.getTime() + (horasMaxima * 60 * 60 * 1000);

      // Si la fecha actual supera el límite de tiempo...
      if (Date.now() > limiteTiempo) {
        // 1. Apagamos el evento
        activeEvent.isActive = false;
        activeEvent.endedAt = new Date();
        await activeEvent.save();

        // 2. Pasamos todos los retos completados a estado de "votación"
        await Challenge.updateMany(
          { eventId: activeEvent._id, status: "done" },
          { $set: { status: "voting" } }
        );

        // 3. Enviamos notificación al grupo informando del cierre automático
        const allMembers = await Member.find({ groupId: group._id });
        const notificationsToInsert = allMembers.map(m => ({
          groupId: group._id,
          memberId: m._id,
          type: "info",
          who: "El Sistema",
          action: "ha cerrado la noche automáticamente. ¡Toca juzgar los retos!",
          target: activeEvent!.name,
          read: false
        }));
        await Notification.insertMany(notificationsToInsert);

        // --- NUEVO ONESIGNAL: Push Masivo por cierre automático ---
        for (const m of allMembers) {
          await sendPushNotification(
            m._id.toString(),
            "Noche cerrada automáticamente 🌙",
            "El sistema ha cerrado la noche por límite de tiempo. ¡Entra para juzgar los retos de los demás!"
          );
        }

        // 4. Anulamos el evento activo para que la UI sepa que ya terminó
        activeEvent = null;
      }
    }
    // ------------------------------------------------

    // --- Buscar si la noche terminó hace menos de 14 horas ---
    const fourteenHoursAgo = new Date(Date.now() - 14 * 60 * 60 * 1000);
    const lastEndedEvent = await Event.findOne({ 
      groupId: group._id, 
      isActive: false,
      endedAt: { $gte: fourteenHoursAgo }
    }).sort({ endedAt: -1 });

    const pendingRecapEventId = lastEndedEvent ? lastEndedEvent._id.toString() : null;
    // ----------------------------------------------------------------

    return {
      group: {
        id: group._id.toString(),
        name: group.name,
        code: group.code,
        season: season?.name || "Sin temporada",
        members: members.length,
      },
      members: members.map((m) => ({
        id: m._id.toString(),
        name: m.name,
        avatar: m.avatar,
        points: m.points,
        balance: m.balance, 
        title: m.title,
        frame: m.frame,
        isAdmin: m.isAdmin,
      })),
      isLiveMode: !!activeEvent,
      pendingRecapEventId, 
      activeEvent: activeEvent
        ? { 
            id: activeEvent._id.toString(), 
            name: activeEvent.name,
            startedAt: activeEvent.startedAt
          }
        : null,
    };
  });

// --- PREPARACIÓN PARA OPENAI ---
async function generateNightChallenges(members: any[]) {
  const baseChallenges = [
    { level: 1, title: "Brindis fantasma", description: "Haz un brindis con un desconocido y sácate una foto con él.", points: 50 },
    { level: 2, title: "Doble mirada", description: "Fotografía a alguien que se parezca a un famoso.", points: 120 },
    { level: 3, title: "El maestro de ceremonias", description: "Graba a alguien pidiéndole una canción concreta al DJ.", points: 220 },
    { level: 4, title: "Cambio de rol", description: "Consigue que alguien del grupo baile con tu chaqueta puesta durante 3 min.", points: 380 },
    { level: 5, title: "La leyenda", description: "Consigue el número de teléfono del bartender. Vídeo obligatorio.", points: 700 },
  ];

  const newChallenges = [];
  
  for (const m of members) {
    for (const c of baseChallenges) {
      newChallenges.push({
        level: c.level,
        title: c.title,
        description: c.description,
        points: c.points,
        status: c.level === 1 ? "available" : "locked",
        assignedTo: m._id,
      });
    }
  }
  
  return newChallenges;
}

// Empezar la noche (modo fiesta con carpetas)
export const startNight = createServerFn({ method: "POST" })
  .validator((data: { groupCode: string; memberId: string; eventId?: string; eventName?: string }) => data)
  .handler(async ({ data }) => {
    await connectDB();

    const group = await Group.findOne({ code: data.groupCode.toUpperCase() });
    if (!group) throw new Error("Grupo no encontrado");

    const member = await Member.findById(data.memberId);
    if (!member || !member.isAdmin) throw new Error("Solo el admin puede empezar la noche");

    const season = await Season.findOne({ groupId: group._id, isActive: true });
    if (!season) throw new Error("No hay temporada activa");

    // 1. Gestionar la CARPETA PADRE (El Álbum principal)
    let parentEvent;
    if (data.eventId) {
      parentEvent = await Event.findById(data.eventId);
      if (!parentEvent) throw new Error("Álbum no encontrado");
    } else {
      parentEvent = await Event.create({
        groupId: group._id,
        seasonId: season._id,
        name: data.eventName || `Fiestas ${new Date().toLocaleDateString("es-ES", { month: "long" })}`,
        isActive: false, // Las carpetas padre no están "activas", solo contienen noches
        date: new Date(),
      });
    }

    // 2. Crear LA NOCHE DE HOY dentro de esa carpeta
    const tonight = await Event.create({
      groupId: group._id,
      seasonId: season._id,
      parentEventId: parentEvent._id,
      name: `Noche ${new Date().toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`,
      isActive: true,
      startedAt: new Date(),
    });

    await Challenge.deleteMany({ groupId: group._id });
    const members = await Member.find({ groupId: group._id });
    const generatedChallenges = await generateNightChallenges(members);
    
    const challengesToInsert = generatedChallenges.map(c => ({
      ...c,
      groupId: group._id,
      seasonId: season._id,
      eventId: tonight._id, // Los retos se asignan a la noche concreta
    }));

    await Challenge.insertMany(challengesToInsert);

    return { event: { id: tonight._id.toString(), name: tonight.name, isActive: true } };
  });
// Acabar la noche manualmente y pasar retos a votación
export const endNight = createServerFn({ method: "POST" })
  .validator((data: { groupCode: string; memberId: string }) => data)
  .handler(async ({ data }) => {
    await connectDB();
    const group = await Group.findOne({ code: data.groupCode.toUpperCase() });
    const member = await Member.findById(data.memberId);
    
    if (!member || !member.isAdmin) throw new Error("Solo el admin puede acabar la noche");

    const activeEvent = await Event.findOne({ groupId: group?._id, isActive: true });
    if (!activeEvent) throw new Error("No hay ninguna noche activa ahora mismo");

    // 1. Apagar el evento
    activeEvent.isActive = false;
    activeEvent.endedAt = new Date();
    await activeEvent.save();

    // 2. Pasar todos los retos completados a estado de "votación"
    await Challenge.updateMany(
      { eventId: activeEvent._id, status: "done" },
      { $set: { status: "voting" } }
    );

    // 3. ENVIAR NOTIFICACIÓN A TODO EL GRUPO
    const allMembers = await Member.find({ groupId: group._id });
    const notificationsToInsert = allMembers.map(m => ({
      groupId: group._id,
      memberId: m._id,
      type: "info",
      who: "El Admin",
      action: "ha cerrado la noche. ¡Toca juzgar los retos!",
      target: activeEvent.name,
      read: false
    }));
    
    /// Importante: asegúrate de tener Notification importado arriba del todo en este archivo
    await Notification.insertMany(notificationsToInsert);

    // --- NUEVO ONESIGNAL: Push Masivo por cierre manual ---
    for (const m of allMembers) {
      // No hace falta avisar al propio admin que acaba de darle al botón
      if (m._id.toString() !== data.memberId) {
        await sendPushNotification(
          m._id.toString(),
          "¡Se acabó la noche! 🏁",
          `${member.name} ha cerrado la noche. ¡Toca juzgar los retos pendientes!`
        );
      }
    }

    return { success: true, eventId: activeEvent._id.toString() };
  });
  // OBTENER TODOS LOS GRUPOS DE UN USUARIO (Para el Lobby)
export const getUserGroups = createServerFn({ method: "GET" })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    await connectDB();

    // 1. Buscamos todos los perfiles "Member" asociados a esta cuenta
    const members = await Member.find({ userId: data.userId });
    if (!members || members.length === 0) return [];

    const groupsList = [];

    // 2. Por cada perfil, buscamos los datos reales de la sala (nombre, código, etc.)
    for (const member of members) {
      const group = await Group.findById(member.groupId);
      if (group) {
        groupsList.push({
          groupId: group._id.toString(),
          memberId: member._id.toString(), // <--- AÑADIR ESTA LÍNEA VITAL
          groupCode: group.code,
          groupName: group.name,
          memberName: member.name,
          memberAvatar: member.avatar,
        });
      }
    }

    return groupsList; // Devolvemos el array listo para pintar
  });