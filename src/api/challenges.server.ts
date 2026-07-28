import { createServerFn } from "@tanstack/react-start";
import { connectDB } from "@/db/client";
import { Challenge } from "@/db/models/Challenge";
import { Member } from "@/db/models/Member";
import { Group } from "@/db/models/Group";
import { Notification } from "@/db/models/Notification";
import { Event } from "@/db/models/Event"; 
import { Media } from "@/db/models/Media"; 
import { Purchase } from "@/db/models/Purchase"; // <-- NUEVO: Importamos el inventario
import {
  mockGetMemberChallenges,
  mockGetChallengeDetail,
  mockSubmitChallenge,
  mockRerollChallenge,
} from "@/db/mock-store";

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

// --- NUEVO: Función para calcular puntos reales con el multiplicador activo ---
async function calculateFinalPoints(basePoints: number, memberId: string): Promise<number> {
  const activeBuffs = await Purchase.find({
    memberId: memberId,
    tag: "Buff",
    expiresAt: { $gt: new Date() }
  });

  let maxMultiplier = 1;
  for (const buff of activeBuffs) {
    if (buff.multiplier && buff.multiplier > maxMultiplier) {
      maxMultiplier = buff.multiplier;
    }
  }
  
  return Math.round(basePoints * maxMultiplier);
}
// -----------------------------------------------------------------------------

export const getMemberChallenges = createServerFn({ method: "GET" })
  .validator((data: { memberId: string; groupCode: string }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) {
      return mockGetMemberChallenges(data.memberId, data.groupCode);
    }

    await connectDB();
    const group = await Group.findOne({ code: data.groupCode.toUpperCase() });
    if (!group) throw new Error("Grupo no encontrado");

    const challenges = await Challenge.find({
      groupId: group._id,
      assignedTo: data.memberId,
    }).sort({ level: 1 });

    return challenges.map((c) => ({
      id: c._id.toString(),
      level: c.level,
      title: c.title,
      description: c.description,
      points: c.points,
      status: c.status,
      submittedMedia: c.submittedMedia,
    }));
  });

export const getChallengeDetail = createServerFn({ method: "GET" })
  .validator((data: { challengeId: string }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) {
      return mockGetChallengeDetail(data.challengeId);
    }

    await connectDB();
    const challenge = await Challenge.findById(data.challengeId);
    if (!challenge) throw new Error("Reto no encontrado");

    return {
      id: challenge._id.toString(),
      level: challenge.level,
      title: challenge.title,
      description: challenge.description,
      points: challenge.points,
      status: challenge.status,
    };
  });

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

export const submitChallenge = createServerFn({ method: "POST" })
  .validator((data: { challengeId: string; memberId: string; imageBase64?: string }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) {
      return mockSubmitChallenge(data.challengeId, data.memberId);
    }

    await connectDB();
    const challenge = await Challenge.findById(data.challengeId);
    if (!challenge) throw new Error("Reto no encontrado");
    if (challenge.status !== "available") throw new Error("Este reto no está disponible");

    let finalUrl = "";
    if (data.imageBase64) {
      finalUrl = await uploadToCloudinary(data.imageBase64);
    }

    challenge.status = "done";
    if (finalUrl) challenge.submittedMedia = finalUrl;
    challenge.validatedAt = new Date();
    await challenge.save();

    // --- AQUÍ APLICAMOS EL MULTIPLICADOR (Subida de reto) ---
    const member = await Member.findById(data.memberId);
    if (member) {
      const finalPoints = await calculateFinalPoints(challenge.points, data.memberId);
      member.points += finalPoints;
      member.balance += finalPoints;
      await member.save();
    }

    const activeEvent = await Event.findOne({ groupId: challenge.groupId, isActive: true });
    if (activeEvent && finalUrl) {
      await Media.create({
        eventId: activeEvent._id,
        memberId: data.memberId,
        challengeId: challenge._id,
        type: "reto",
        url: finalUrl,
        caption: `Nivel ${challenge.level}: ${challenge.title}`, 
      });
    }

    const nextLevel = challenge.level + 1;
    if (nextLevel <= 5) {
      await Challenge.findOneAndUpdate(
        { groupId: challenge.groupId, assignedTo: data.memberId, level: nextLevel, status: "locked" },
        { status: "available" }
      );
    }

    await Notification.create({
      groupId: challenge.groupId,
      memberId: data.memberId,
      type: "success",
      who: member?.name || "Alguien",
      action: `completó el Nivel ${challenge.level}`,
      target: challenge.title,
    });

    return { success: true, status: "done" };
  });

export const validateChallenge = createServerFn({ method: "POST" })
  .validator((data: { challengeId: string; adminId: string; approved: boolean }) => data)
  .handler(async ({ data }) => {
    await connectDB();
    const admin = await Member.findById(data.adminId);
    if (!admin || !admin.isAdmin) throw new Error("Solo el admin puede validar retos");

    const challenge = await Challenge.findById(data.challengeId);
    if (!challenge) throw new Error("Reto no encontrado");
    if (challenge.status !== "pending") throw new Error("Este reto no está pendiente de validación");

    if (data.approved) {
      challenge.status = "done";
      challenge.validatedBy = admin._id;
      challenge.validatedAt = new Date();
      await challenge.save();

      // --- AQUÍ APLICAMOS EL MULTIPLICADOR (Validación de Admin) ---
      const member = await Member.findById(challenge.assignedTo);
      if (member) {
        const finalPoints = await calculateFinalPoints(challenge.points, member._id.toString());
        member.points += finalPoints;
        member.balance += finalPoints;
        await member.save();
      }

      const nextLevel = challenge.level + 1;
      if (nextLevel <= 5) {
        await Challenge.updateMany(
          { groupId: challenge.groupId, assignedTo: challenge.assignedTo, level: nextLevel, status: "locked" },
          { status: "available" }
        );
      }

      await Notification.create({
        groupId: challenge.groupId,
        memberId: challenge.assignedTo!,
        type: "success",
        who: admin.name,
        action: "validó tu reto",
        target: challenge.title,
      });
    } else {
      challenge.status = "available";
      await challenge.save();
      await Notification.create({
        groupId: challenge.groupId,
        memberId: challenge.assignedTo!,
        type: "info",
        who: admin.name,
        action: "rechazó tu reto",
        target: challenge.title,
      });
    }

    return { success: true, status: challenge.status };
  });

export const rerollChallenge = createServerFn({ method: "POST" })
  .validator((data: { challengeId: string; memberId: string }) => data)
  .handler(async ({ data }) => {
    if (!(await isMongoAvailable())) {
      return mockRerollChallenge(data.challengeId, data.memberId);
    }

    await connectDB();
    const member = await Member.findById(data.memberId);
    if (!member) throw new Error("Miembro no encontrado");

    const rerollCost = 80;
    if (member.balance < rerollCost) {
      throw new Error(`No tienes suficientes puntos. Necesitas ${rerollCost} pts.`);
    }

    const challenge = await Challenge.findById(data.challengeId);
    if (!challenge) throw new Error("Reto no encontrado");

    const alternativeChallenges: Record<number, { title: string; description: string }[]> = {
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

    const alternatives = alternativeChallenges[challenge.level] || [];
    if (alternatives.length === 0) throw new Error("No hay retos alternativos para este nivel");

    const randomAlt = alternatives[Math.floor(Math.random() * alternatives.length)];
    challenge.title = randomAlt.title;
    challenge.description = randomAlt.description;
    challenge.status = "available";
    await challenge.save();

    member.balance -= rerollCost;
    await member.save();

    return {
      success: true,
      challenge: {
        id: challenge._id.toString(),
        level: challenge.level,
        title: challenge.title,
        description: challenge.description,
        points: challenge.points,
        status: challenge.status,
      },
      newBalance: member.balance,
    };
  });

export const startVoting = createServerFn({ method: "POST" })
  .validator((data: { challengeId: string; adminId: string }) => data)
  .handler(async ({ data }) => {
    await connectDB();
    const admin = await Member.findById(data.adminId);
    if (!admin || !admin.isAdmin) throw new Error("Solo el admin puede iniciar votación");

    const challenge = await Challenge.findById(data.challengeId);
    if (!challenge) throw new Error("Reto no encontrado");
    if (challenge.status !== "pending") throw new Error("El reto no está pendiente");

    challenge.status = "voting";
    challenge.votingStartedAt = new Date();
    challenge.votes = [];
    await challenge.save();

    return { success: true, status: "voting" };
  });

export const voteChallenge = createServerFn({ method: "POST" })
  .validator((data: { challengeId: string; memberId: string; vote: boolean }) => data)
  .handler(async ({ data }) => {
    await connectDB();
    const challenge = await Challenge.findById(data.challengeId);
    if (!challenge) throw new Error("Reto no encontrado");
    if (challenge.status !== "voting") throw new Error("La votación no está activa");

    const alreadyVoted = challenge.votes.some((v: any) => v.memberId.toString() === data.memberId);
    if (alreadyVoted) throw new Error("Ya has votado en este reto");

    challenge.votes.push({ memberId: data.memberId as any, vote: data.vote, votedAt: new Date() });
    await challenge.save();

    const group = await Group.findById(challenge.groupId);
    const totalMembers = await Member.countDocuments({ groupId: challenge.groupId });
    const totalVotes = challenge.votes.length;

    let result: any = { success: true, totalVotes, totalMembers, status: challenge.status };

    if (totalVotes >= totalMembers) {
      const yesVotes = challenge.votes.filter((v: any) => v.vote).length;
      const majority = Math.floor(totalMembers / 2) + 1;

      if (yesVotes >= majority) {
        challenge.status = "done";
        challenge.validatedAt = new Date();
        await challenge.save();

        // --- AQUÍ APLICAMOS EL MULTIPLICADOR (Votación grupal aprobada) ---
        const member = await Member.findById(challenge.assignedTo);
        if (member) {
          const finalPoints = await calculateFinalPoints(challenge.points, member._id.toString());
          member.points += finalPoints;
          member.balance += finalPoints;
          await member.save();
        }

        result.status = "done";
        result.approved = true;
      } else {
        challenge.status = "available";
        await challenge.save();
        result.status = "available";
        result.approved = false;
      }
    }

    return result;
  });

export const getVotingStatus = createServerFn({ method: "GET" })
  .validator((data: { challengeId: string }) => data)
  .handler(async ({ data }) => {
    await connectDB();
    const challenge = await Challenge.findById(data.challengeId);
    if (!challenge) throw new Error("Reto no encontrado");

    const group = await Group.findById(challenge.groupId);
    const totalMembers = await Member.countDocuments({ groupId: challenge.groupId });
    const totalVotes = challenge.votes.length;

    return {
      status: challenge.status,
      totalMembers,
      totalVotes,
      votes: challenge.votes.map((v: any) => ({
        memberId: v.memberId.toString(),
        vote: v.vote,
        votedAt: v.votedAt,
      })),
    };
  });

export const dislikeChallenge = createServerFn({ method: "POST" })
  .validator((data: { challengeId: string; memberId: string }) => data)
  .handler(async ({ data }) => {
    await connectDB();
    const challenge = await Challenge.findById(data.challengeId);
    if (!challenge || challenge.status !== "done") throw new Error("No se puede valorar ahora");

    const alreadyVoted = challenge.votes.some((v: any) => v.memberId.toString() === data.memberId);
    if (alreadyVoted) throw new Error("Ya has dado tu veredicto");

    challenge.votes.push({ memberId: data.memberId as any, vote: false, votedAt: new Date() });
    await challenge.save();

    const totalMembers = await Member.countDocuments({ groupId: challenge.groupId });
    const dislikes = challenge.votes.filter((v: any) => v.vote === false).length;
    const majority = Math.floor(totalMembers / 2) + 1;

    if (dislikes >= majority) {
       challenge.status = "available";
       challenge.submittedMedia = "";
       challenge.votes = []; 
       await challenge.save();

       await Media.deleteOne({ challengeId: challenge._id });

       // NOTA: Cuando se le quitan los puntos por trampa, le quitamos los base. 
       // Así no lo rompemos más si el multiplicador ya ha caducado.
       const member = await Member.findById(challenge.assignedTo);
       if (member) {
         member.points -= challenge.points;
         member.balance -= challenge.points;
         await member.save();
       }

       await Notification.create({
         groupId: challenge.groupId,
         memberId: challenge.assignedTo!,
         type: "sabotage",
         who: "El Grupo",
         action: "tumbó tu prueba fake de",
         target: challenge.title,
       });
       
       return { success: true, revoked: true };
    }
    
    return { success: true, revoked: false };
  });