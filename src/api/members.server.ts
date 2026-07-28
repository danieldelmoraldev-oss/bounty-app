import { createServerFn } from "@tanstack/react-start";
import { connectDB } from "@/db/client";
import { Member } from "@/db/models/Member";
import { Group } from "@/db/models/Group";
import { mockGetMemberProfile } from "@/db/mock-store";
import { Media } from "@/db/models/Media";

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

// Obtener perfil de un miembro
export const getMemberProfile = createServerFn({ method: "GET" })
  .validator((data: { memberId: string; groupCode: string }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) {
      return mockGetMemberProfile(data.memberId, data.groupCode);
    }

    await connectDB();
    const group = await Group.findOne({ code: data.groupCode.toUpperCase() });
    if (!group) throw new Error("Grupo no encontrado");

    const member = await Member.findOne({ _id: data.memberId, groupId: group._id });
    if (!member) throw new Error("Miembro no encontrado");

    const allMembers = await Member.find({ groupId: group._id }).sort({ points: -1 });
    const rank = allMembers.findIndex((m) => m._id.toString() === data.memberId) + 1;

    return {
      id: member._id.toString(),
      name: member.name,
      avatar: member.avatar,
      points: member.points,
      balance: member.balance,
      title: member.title,
      frame: member.frame,
      isAdmin: member.isAdmin,
      streak: member.streak || 0,
      unlockedFrames: member.unlockedFrames,
      unlockedTitles: member.unlockedTitles,
      rank,
      totalMembers: allMembers.length,
    };
  });

// Obtener ranking completo
export const getRanking = createServerFn({ method: "GET" })
  .validator((data: { groupCode: string }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) {
      // Reusamos mockGetGroupInfo para obtener members con ranking
      const { mockGetGroupInfo } = await import("@/db/mock-store");
      const info = mockGetGroupInfo(data.groupCode);
      return info.members.map((m, i) => ({ ...m, rank: i + 1 }));
    }

    await connectDB();
    const group = await Group.findOne({ code: data.groupCode.toUpperCase() });
    if (!group) throw new Error("Grupo no encontrado");

    const members = await Member.find({ groupId: group._id }).sort({ points: -1 });
    return members.map((m, i) => ({
      id: m._id.toString(),
      name: m.name,
      avatar: m.avatar,
      points: m.points,
      title: m.title,
      frame: m.frame,
      isAdmin: m.isAdmin,
      rank: i + 1,
    }));
  });
  // Obtener el historial de fotos de un miembro específico
export const getMemberMedia = createServerFn({ method: "GET" })
  .validator((data: { memberId: string; groupCode: string }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) {
      return []; 
    }

    await connectDB();
    const group = await Group.findOne({ code: data.groupCode.toUpperCase() });
    if (!group) throw new Error("Grupo no encontrado");

    // Buscamos todas las fotos subidas por este usuario y las ordenamos de más reciente a más antigua
    const mediaItems = await Media.find({ memberId: data.memberId })
      .populate("memberId", "name avatar")
      .sort({ createdAt: -1 });

    return mediaItems.map((m) => ({
      id: m._id.toString(),
      type: m.type,
      url: m.url,
      caption: m.caption,
      averageStars: m.averageStars,
      member: (m.memberId as any)?.name || "Anónimo",
      memberAvatar: (m.memberId as any)?.avatar || "",
    }));
  });
  // Actualizar el perfil completo del miembro (Nombre, Avatar, Marco y Título)
export const updateProfile = createServerFn({ method: "POST" })
  .validator((data: { memberId: string; name: string; avatar: string; frame: string; title: string }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) return { success: true };
    await connectDB();
    
    const member = await Member.findById(data.memberId);
    if (!member) throw new Error("Miembro no encontrado");

    // Validamos que el marco que intenta ponerse lo tenga comprado
    if (data.frame === "none" || member.unlockedFrames.includes(data.frame)) {
      member.frame = data.frame as any;
    }
    
    // Validamos que el título que intenta ponerse lo tenga comprado
    if (data.title === "" || member.unlockedTitles.includes(data.title)) {
      member.title = data.title;
    }

    member.name = data.name;
    member.avatar = data.avatar;
    
    await member.save();
    return { success: true };
  });
  