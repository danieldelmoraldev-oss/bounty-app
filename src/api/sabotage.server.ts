import { createServerFn } from "@tanstack/react-start";
import { connectDB } from "@/db/client";
import { Member } from "@/db/models/Member";
import { Purchase } from "@/db/models/Purchase";
import { Notification } from "@/db/models/Notification";

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

// 1. Obtener el inventario de sabotajes sin usar del usuario
export const getUserSabotages = createServerFn({ method: "GET" })
  .validator((data: { memberId: string }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) return [];
    await connectDB();

    // Buscamos compras tipo Sabotaje que no tengan víctima asignada todavía
    const inventory = await Purchase.find({
      memberId: data.memberId,
      tag: "Sabotaje",
      targetMemberId: { $exists: false },
    }).populate("itemId"); // Traemos los datos originales de la tienda para el icono y descripción

    // Agrupamos para saber cuántos tienes de cada tipo
    const grouped: Record<string, any> = {};
    for (const item of inventory) {
      const shopItem = item.itemId as any;
      const key = shopItem._id.toString();
      
      if (!grouped[key]) {
        grouped[key] = {
          purchaseId: item._id.toString(), // Guardamos el ID de la compra para gastarla
          name: item.itemName,
          description: shopItem.description,
          icon: shopItem.icon,
          count: 1,
        };
      } else {
        grouped[key].count++;
      }
    }

    return Object.values(grouped);
  });

// 2. Ejecutar el ataque
export const launchSabotage = createServerFn({ method: "POST" })
  .validator((data: { purchaseId: string; attackerId: string; victimId: string; groupId: string }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) return { success: false, error: "BD no disponible" };
    await connectDB();

    const purchase = await Purchase.findById(data.purchaseId);
    if (!purchase || purchase.targetMemberId) {
      return { success: false, error: "Este sabotaje ya no está disponible" };
    }

    const attacker = await Member.findById(data.attackerId);
    const victim = await Member.findById(data.victimId);
    
    if (!attacker || !victim) return { success: false, error: "Usuarios no encontrados" };

    // Asignamos la víctima para dar por gastado el ítem
    purchase.targetMemberId = victim._id;

    // Lógica especial según el ataque (Tiempo de expiración o efecto instantáneo)
    if (purchase.itemName.includes("Cámara")) {
      purchase.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
    } else if (purchase.itemName.includes("Bloqueo")) {
      purchase.expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos
    } else if (purchase.itemName.includes("Bomba")) {
      // La bomba quita puntos al instante y no tiene tiempo
      victim.points = Math.max(0, victim.points - 100); 
      await victim.save();
      purchase.isActive = false; // Se consume al instante
    }
    
    await purchase.save();

    // Notificamos a todo el grupo del salseo
    await Notification.create({
      groupId: data.groupId,
      memberId: victim._id,
      type: "sabotage",
      who: attacker.name,
      action: `le ha tirado "${purchase.itemName}" a`,
      target: victim.name,
      read: false,
    });

    return { success: true, itemName: purchase.itemName, victimName: victim.name };
  });
  // 3. Obtener efectos activos sobre un usuario
export const getActiveEffects = createServerFn({ method: "GET" })
  .validator((data: { memberId: string }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) return { isBlurred: false, isBlocked: false, activeTimers: [] };
    await connectDB();

    const now = new Date();

    // 1. Buscamos sabotajes que nos han tirado y que NO han caducado
    const activeSabotages = await Purchase.find({
      targetMemberId: data.memberId,
      expiresAt: { $gt: now }
    });

    // 2. Buscamos multiplicadores (Buffs) que hemos comprado nosotros y NO han caducado
    const activeBuffs = await Purchase.find({
      memberId: data.memberId,
      tag: "Buff",
      expiresAt: { $gt: now }
    });

    const isBlurred = activeSabotages.some(s => 
      s.itemName.toLowerCase().includes("cámar") || 
      s.itemName.toLowerCase().includes("camar")
    );
    
    const isBlocked = activeSabotages.some(s => 
      s.itemName.toLowerCase().includes("bloque") || 
      s.itemName.toLowerCase().includes("parálisis")
    );

    // 3. Juntamos todo para mandar los contadores a la app
    const activeTimers = [
      ...activeSabotages.map(s => ({
        id: s._id.toString(),
        name: s.itemName,
        type: "sabotage",
        expiresAt: s.expiresAt.toISOString()
      })),
      ...activeBuffs.map(b => ({
        id: b._id.toString(),
        name: b.itemName,
        type: "buff",
        expiresAt: b.expiresAt.toISOString()
      }))
    ];

    return { isBlurred, isBlocked, activeTimers };
  });