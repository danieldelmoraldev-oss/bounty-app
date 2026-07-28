import { createServerFn } from "@tanstack/react-start";
import { connectDB } from "@/db/client";
import { Event } from "@/db/models/Event";
import { Media } from "@/db/models/Media";
import { Rating } from "@/db/models/Rating";
import { Group } from "@/db/models/Group";
import { Season } from "@/db/models/Season";
import { Challenge } from "@/db/models/Challenge";
import { Member } from "@/db/models/Member";

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

export const getEvents = createServerFn({ method: "GET" })
  .validator((data: { groupCode: string }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) return [];

    await connectDB();
    const group = await Group.findOne({ code: data.groupCode.toUpperCase() });
    if (!group) throw new Error("Grupo no encontrado");

    // MAGIA AQUÍ: Solo buscamos las "Carpetas Superiores" (las que no tienen parentEventId)
    const parentEvents = await Event.find({ 
      groupId: group._id, 
      parentEventId: { $exists: false } 
    }).sort({ date: -1 });

    const eventsWithStats = await Promise.all(
      parentEvents.map(async (ev) => {
        // Buscamos si tiene sub-noches (hijos)
        const childEvents = await Event.find({ parentEventId: ev._id });
        const eventIdsToSearch = [ev._id, ...childEvents.map(c => c._id)];

        const mediaCount = await Media.countDocuments({ eventId: { $in: eventIdsToSearch } });
        
        const ratings = await Rating.find().populate({
          path: "mediaId",
          match: { eventId: { $in: eventIdsToSearch } },
        });
        const avgStars = ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length
          : 0;

        let coverUrl = ev.cover;
        if (!coverUrl || coverUrl === "" || coverUrl.includes("plantilla")) {
          // Buscamos la foto más reciente de cualquiera de las noches de esta carpeta
          const someMedia = await Media.findOne({ eventId: { $in: eventIdsToSearch } }).sort({ createdAt: -1 });
          coverUrl = someMedia?.url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80";
        }

        return {
          id: ev._id.toString(),
          name: ev.name,
          date: ev.date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }),
          cover: coverUrl,
          photos: mediaCount,
          stars: Math.round(avgStars * 10) / 10,
        };
      })
    );

    return eventsWithStats;
  });

// Obtener detalle de un evento
export const getEventDetail = createServerFn({ method: "GET" })
  .validator((data: { eventId: string }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) throw new Error("Evento no encontrado");

    await connectDB();
    const event = await Event.findById(data.eventId);
    if (!event) throw new Error("Evento no encontrado");

    // Buscamos todas las sub-noches (si es que tiene)
    const childEvents = await Event.find({ parentEventId: event._id }).sort({ startedAt: 1, date: 1 });
    const eventIdsToSearch = [event._id, ...childEvents.map(c => c._id)];

    // NUEVO: Preparar la información de las sub-carpetas para que la UI las dibuje
    const childEventsData = await Promise.all(
      childEvents.map(async (child) => {
        const mediaCount = await Media.countDocuments({ eventId: child._id });
        const someMedia = await Media.findOne({ eventId: child._id }).sort({ createdAt: -1 });
        return {
          id: child._id.toString(),
          name: child.name,
          date: child.date.toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
          cover: someMedia?.url || child.cover || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
          photos: mediaCount
        };
      })
    );

    // Extraemos TODAS las fotos
    const mediaItems = await Media.find({ eventId: { $in: eventIdsToSearch } })
      .populate("memberId", "name avatar")
      .sort({ createdAt: -1 });

    const challengesData = await Challenge.find({ eventId: { $in: eventIdsToSearch } })
      .populate("assignedTo", "name avatar");

    const totalMembers = await Member.countDocuments({ groupId: event.groupId });
    const ratedMedia = mediaItems.filter(m => m.averageStars && m.averageStars > 0);
    const eventAvgStars = ratedMedia.length > 0 
      ? ratedMedia.reduce((sum, m) => sum + m.averageStars, 0) / ratedMedia.length 
      : 0;

    return {
      event: {
        id: event._id.toString(),
        name: event.name,
        date: event.date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }),
        cover: event.cover,
        isNight: !!event.parentEventId,
      },
      stats: { totalMembers, eventAvgStars: Math.round(eventAvgStars * 10) / 10 },
      childEvents: childEventsData, // <--- Enviamos las subcarpetas a la interfaz
      media: mediaItems.map((m) => ({
        id: m._id.toString(),
        type: m.type,
        url: m.url,
        caption: m.caption,
        averageStars: m.averageStars,
        member: (m.memberId as any)?.name || "Anónimo",
        memberAvatar: (m.memberId as any)?.avatar || "",
        eventId: m.eventId.toString(),
        challengeId: m.challengeId?.toString(),
      })),
      challenges: challengesData.map((c) => ({
        id: c._id.toString(),
        level: c.level,
        title: c.title,
        status: c.status,
        member: (c.assignedTo as any)?.name || "Anónimo",
      })),
    };
  });

// Subir foto desde la cámara
export const uploadPhoto = createServerFn({ method: "POST" })
  .validator((data: {
    eventId?: string; // <-- Opcional
    memberId: string;
    type: "reto" | "free";
    challengeId?: string;
    caption?: string;
    imageBase64: string;
  }) => data)
  .handler(async ({ data }) => {
    // Subir imagen a Cloudinary (o simular)
    const url = await uploadToCloudinary(data.imageBase64);

    if (!(await isMongoAvailable())) {
      return { id: `mock_${Date.now()}`, type: data.type, url };
    }

    await connectDB();

    // Construimos el objeto de datos dinámicamente para evitar pasar undefined a Mongoose
    const mediaData: any = {
      memberId: data.memberId,
      type: data.type,
      caption: data.caption || "",
      url,
    };

    if (data.eventId) mediaData.eventId = data.eventId;
    if (data.challengeId) mediaData.challengeId = data.challengeId;

    const media = await Media.create(mediaData);

    return { id: media._id.toString(), type: media.type, url: media.url };
  });

// Subir media metadata (sin imagen real, para cuando se usa desde galería mock)
export const uploadMedia = createServerFn({ method: "POST" })
  .validator((data: {
    eventId: string;
    memberId: string;
    type: "reto" | "free";
    challengeId?: string;
    caption?: string;
    url?: string;
  }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) {
      return { id: `mock_${Date.now()}`, type: data.type, url: data.url || "" };
    }

    await connectDB();
    const media = await Media.create({
      eventId: data.eventId,
      memberId: data.memberId,
      type: data.type,
      challengeId: data.challengeId,
      caption: data.caption || "",
      url: data.url || "",
    });

    return { id: media._id.toString(), type: media.type, url: media.url };
  });

// Helper: subida a Cloudinary con fallback simulado
async function uploadToCloudinary(base64Data: string): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return `https://res.cloudinary.com/demo/image/upload/v1/bounty/mock_${Date.now()}.jpg`;
  }

  try {
    const cloudinary = await import("cloudinary");
    cloudinary.v2.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    
    // 1. Limpiamos la cabecera del Base64 para que Cloudinary no se confunda
    // Esto cambia "data:video/webm;codecs=vp8,opus;base64,..." por "data:video/webm;base64,..."
    const cleanBase64 = base64Data.replace(/;codecs=[^;]+/, '');

    // 2. Subimos usando el Base64 limpio y con resource_type: "auto"
    const result = await cloudinary.v2.uploader.upload(cleanBase64, { 
      folder: "bounty", 
      resource_type: "auto" 
    });
    
    return result.secure_url;
  } catch (error) {
    console.error("[Upload] Error en Cloudinary:", error);
    return `https://res.cloudinary.com/demo/image/upload/v1/bounty/mock_${Date.now()}.jpg`;
  }
}

// Valorar una foto
export const rateMedia = createServerFn({ method: "POST" })
  .validator((data: { mediaId: string; memberId: string; stars: number }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) {
      return { success: true, averageStars: data.stars };
    }

    await connectDB();
    if (data.stars < 1 || data.stars > 5) {
      throw new Error("La valoración debe ser entre 1 y 5 estrellas");
    }

    await Rating.findOneAndUpdate(
      { mediaId: data.mediaId, memberId: data.memberId },
      { stars: data.stars },
      { upsert: true, new: true }
    );

    const ratings = await Rating.find({ mediaId: data.mediaId });
    const avg = ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length;
    await Media.findByIdAndUpdate(data.mediaId, { averageStars: Math.round(avg * 10) / 10 });

    return { success: true, averageStars: Math.round(avg * 10) / 10 };
  });
  // Añadir al final de src/api/events.server.ts

// Obtener las fotos más recientes del grupo globalmente
export const getRecentMedia = createServerFn({ method: "GET" })
  .validator((data: { groupCode: string; limit?: number }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) {
      return []; 
    }

    await connectDB();
    const group = await Group.findOne({ code: data.groupCode.toUpperCase() });
    if (!group) throw new Error("Grupo no encontrado");

    // NUEVO ENFOQUE: 1. Buscamos a todos los miembros de este grupo
    const members = await Member.find({ groupId: group._id }, "_id");
    const memberIds = members.map(m => m._id);

    // 2. Buscamos TODAS las fotos subidas por esos miembros
    // Esto atrapará las de retos, las de álbumes y las subidas "por libre"
    const recentMedia = await Media.find({ memberId: { $in: memberIds } })
      .populate("memberId", "name avatar")
      .sort({ createdAt: -1 })
      .limit(data.limit || 10);

    return recentMedia.map((m) => ({
      id: m._id.toString(),
      type: m.type,
      url: m.url,
      caption: m.caption,
      averageStars: m.averageStars,
      member: (m.memberId as any)?.name || "Anónimo",
      memberAvatar: (m.memberId as any)?.avatar || "",
    }));
  });
  export const createAlbum = createServerFn({ method: "POST" })
  .validator((data: { groupCode: string; name: string }) => data)
  .handler(async ({ data }) => {
    await connectDB();
    const group = await Group.findOne({ code: data.groupCode.toUpperCase() });
    if (!group) throw new Error("Grupo no encontrado");
    
    const season = await Season.findOne({ groupId: group._id, isActive: true });
    
    const newEvent = await Event.create({
      groupId: group._id,
      seasonId: season?._id || group._id, // Fallback por si acaso
      name: data.name,
      isActive: false, // Es un álbum histórico, no una noche activa
      date: new Date(),
    });
    
    return { id: newEvent._id.toString(), name: newEvent.name };
  });