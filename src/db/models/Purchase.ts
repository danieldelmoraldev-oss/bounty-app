import mongoose, { Schema, Document } from "mongoose";

export interface IPurchase extends Document {
  groupId: mongoose.Types.ObjectId;
  memberId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  itemName: string;
  price: number;
  tag: "Buff" | "Sabotaje" | "Cosmético";
  targetMemberId?: mongoose.Types.ObjectId;
  multiplier?: number; // Para los multiplicadores de puntos
  purchasedAt: Date;
  expiresAt?: Date;
  isActive: boolean; // True si está en el inventario sin gastar o activo temporalmente
}

const PurchaseSchema = new Schema<IPurchase>({
  groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
  memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
  itemId: { type: Schema.Types.ObjectId, ref: "ShopItem", required: true },
  itemName: { type: String, required: true },
  price: { type: Number, required: true },
  tag: { type: String, enum: ["Buff", "Sabotaje", "Cosmético"], required: true },
  targetMemberId: { type: Schema.Types.ObjectId, ref: "Member" },
  multiplier: { type: Number, default: 1 },
  purchasedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true },
});

export const Purchase = mongoose.models.Purchase || mongoose.model<IPurchase>("Purchase", PurchaseSchema);