import { createServerFn } from "@tanstack/react-start";
import { connectDB } from "@/db/client";
import { Member } from "@/db/models/Member";
import { Group } from "@/db/models/Group";
import { ShopItem } from "@/db/models/ShopItem";
import { Purchase } from "@/db/models/Purchase";

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

// Obtener items de la tienda
export const getShopItems = createServerFn({ method: "GET" })
  .validator((data: { groupCode: string }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) {
      return [];
    }

    await connectDB();
    const group = await Group.findOne({ code: data.groupCode.toUpperCase() });
    if (!group) throw new Error("Grupo no encontrado");

    const items = await ShopItem.find({ groupId: group._id });
    return items.map((item) => ({
      id: item._id.toString(),
      name: item.name,
      description: item.description,
      price: item.price,
      tag: item.tag,
      icon: item.icon,
    }));
  });

// Comprar item de la tienda con soporte para inventario y buffs temporales
export const purchaseShopItem = createServerFn({ method: "POST" })
  .validator((data: { groupCode: string; memberId: string; itemId: string }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) {
      return { success: false, error: "Base de datos no disponible" };
    }

    await connectDB();
    const group = await Group.findOne({ code: data.groupCode.toUpperCase() });
    if (!group) throw new Error("Grupo no encontrado");

    const member = await Member.findOne({ _id: data.memberId, groupId: group._id });
    if (!member) throw new Error("Miembro no encontrado");

    const item = await ShopItem.findOne({ _id: data.itemId, groupId: group._id });
    if (!item) throw new Error("Item no encontrado");

    // ¡Restaurado a balance!
    if ((member.balance || 0) < item.price) {
      return { success: false, error: "No tienes suficiente saldo" };
    }

    // Si es cosmético, evitamos que lo compre dos veces
    if (item.tag === "Cosmético") {
      const existing = await Purchase.findOne({ memberId: data.memberId, itemId: data.itemId });
      if (existing) return { success: false, error: "Ya tienes este objeto cosmético" };
    }

    // Configurar expiración o efectos según el tag
    let expiresAt: Date | undefined = undefined;
    let multiplier = 1;

    if (item.tag === "Buff") {
      if (item.name.includes("x2")) {
        multiplier = 2;
        expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
      } else if (item.name.includes("1.5")) {
        multiplier = 1.5;
        expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos
      }
    }

    // Crear compra en el inventario
    await Purchase.create({
      groupId: group._id,
      memberId: data.memberId,
      itemId: data.itemId,
      itemName: item.name,
      price: item.price,
      tag: item.tag,
      multiplier,
      expiresAt,
      isActive: true,
    });

    member.balance -= item.price; 

    // Desbloquear cosméticos automáticamente
    if (item.tag === "Cosmético") {
      if (item.name.includes("Marco")) {
        const frameMap: Record<string, string> = {
          "Marco Dorado": "gold",
          "Marco Violeta": "violet",
          "Marco Eléctrico": "electric",
          "Marco Ember": "ember",
        };
        const frame = Object.keys(frameMap).find((key) => item.name.includes(key));
        if (frame && !member.unlockedFrames.includes(frameMap[frame])) {
          member.unlockedFrames.push(frameMap[frame]);
        }
      }
      if (item.name.includes("Título")) {
        const titleMatch = item.name.match(/'([^']+)'/);
        if (titleMatch && !member.unlockedTitles.includes(titleMatch[1])) {
          member.unlockedTitles.push(titleMatch[1]);
        }
      }
    }

    
    await member.save();

    return {
      success: true,
      newBalance: member.balance,
      itemName: item.name,
    };
  });

// Equipar marco o título
export const equipItem = createServerFn({ method: "POST" })
  .validator((data: { memberId: string; itemId: string; type: "frame" | "title" }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) {
      return { success: false, error: "Base de datos no disponible" };
    }

    await connectDB();
    const member = await Member.findById(data.memberId);
    if (!member) throw new Error("Miembro no encontrado");

    const purchase = await Purchase.findOne({ memberId: data.memberId, itemId: data.itemId });
    if (!purchase) {
      return { success: false, error: "No has comprado este item" };
    }

    if (data.type === "frame") {
      const frameMap: Record<string, string> = {
        "Marco Dorado": "gold",
        "Marco Violeta": "violet",
        "Marco Eléctrico": "electric",
        "Marco Ember": "ember",
      };
      const frame = Object.keys(frameMap).find((key) => purchase.itemName.includes(key));
      if (frame && member.unlockedFrames.includes(frameMap[frame])) {
        member.frame = frameMap[frame] as any;
      }
    } else if (data.type === "title") {
      const titleMatch = purchase.itemName.match(/'([^']+)'/);
      if (titleMatch && member.unlockedTitles.includes(titleMatch[1])) {
        member.title = titleMatch[1];
      }
    }

    await member.save();
    return { success: true, frame: member.frame, title: member.title };
  });