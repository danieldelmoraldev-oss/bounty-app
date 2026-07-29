import { createServerFn } from "@tanstack/react-start";
import { connectDB } from "@/db/client";
import { Notification } from "@/db/models/Notification";
import { Group } from "@/db/models/Group";
import { mockGetNotifications } from "@/db/mock-store";
import { Member } from "@/db/models/Member";
import { sendPushNotification } from "@/api/onesignal.server"; // AÑADIR IMPORT

let mongoAvailable: boolean | null = null;
async function isMongoAvailable(): Promise<boolean> {
  if (mongoAvailable !== null) return mongoAvailable;
  try {
    await connectDB();
    mongoAvailable = true;
  } catch {
    mongoAvailable = false;
  }
  return mongoAvailable;
}

export const getNotifications = createServerFn({ method: "GET" })
  .validator((data: { memberId: string; groupCode: string }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) {
      return mockGetNotifications(data.memberId, data.groupCode);
    }

    await connectDB();
    const group = await Group.findOne({ code: data.groupCode.toUpperCase() });
    if (!group) throw new Error("Grupo no encontrado");

    const notifications = await Notification.find({
      memberId: data.memberId,
      groupId: group._id,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    return notifications.map((n) => ({
      id: n._id.toString(),
      who: n.who,
      action: n.action,
      target: n.target,
      time: getRelativeTime(n.createdAt),
      type: n.type,
      read: n.read,
    }));
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .validator((data: { memberId: string }) => data)
  .handler(async ({ data }) => {
    // Si la base de datos se desconecta, no bloquea la app
    if (!(await isMongoAvailable())) {
      return { success: true };
    }
    
    await connectDB();
    await Notification.updateMany({ memberId: data.memberId, read: false }, { read: true });
    return { success: true };
  });

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
// Dar un toque al admin para empezar la noche
export const pokeAdmin = createServerFn({ method: "POST" })
  .validator((data: { memberId: string; groupCode: string }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) {
      return { success: true };
    }

    await connectDB();
    const group = await Group.findOne({ code: data.groupCode.toUpperCase() });
    if (!group) throw new Error("Grupo no encontrado");

    const sender = await Member.findById(data.memberId);
    if (!sender) throw new Error("Usuario no encontrado");

    // Buscamos al administrador del grupo
    const admin = await Member.findOne({ groupId: group._id, isAdmin: true });
    if (!admin) throw new Error("Admin no encontrado");

    // Creamos la notificación que le saltará al admin
    await Notification.create({
      groupId: group._id,
      memberId: admin._id,
      type: "info",
      who: sender.name,
      action: "te ha dado un toque para que empieces la noche",
      target: "¡Dale al botón!",
    });

    // NUEVO: Disparamos la notificación real al teléfono del admin
    await sendPushNotification(
      admin._id.toString(),
      "¡Toque recibido!",
      `${sender.name} te ha dado un toque para que empieces la noche. ¡Dale al botón!`
    );

    return { success: true };
  });