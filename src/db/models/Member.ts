import mongoose, { Schema, Document } from "mongoose";

export interface IMember extends Document {
  userId: mongoose.Types.ObjectId; // <-- NUEVO: Enlace al usuario global
  groupId: mongoose.Types.ObjectId;
  name: string; // Nombre específico para este grupo (por si te llaman por un apodo aquí)
  avatar: string;
  points: number;
  balance: number;
  title: string;
  frame: "gold" | "violet" | "electric" | "ember" | "none";
  isAdmin: boolean;
  unlockedFrames: string[];
  unlockedTitles: string[];
  createdAt: Date;
}

const MemberSchema = new Schema<IMember>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, // <-- NUEVO
  groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
  name: { type: String, required: true },
  avatar: { type: String, default: "" },
  points: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  title: { type: String, default: "" },
  frame: { type: String, enum: ["gold", "violet", "electric", "ember", "none"], default: "none" },
  isAdmin: { type: Boolean, default: false },
  unlockedFrames: { type: [String], default: ["none"] },
  unlockedTitles: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

// NUEVO: Bloqueo de seguridad. Un usuario solo puede tener un "Member" por grupo.
MemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });

export const Member = mongoose.models.Member || mongoose.model<IMember>("Member", MemberSchema);