import mongoose, { Schema, Document } from "mongoose";

export interface IShopItem extends Document {
  groupId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  price: number;
  tag: "Buff" | "Sabotaje" | "Cosmético";
  icon: string;
  createdAt: Date;
}

const ShopItemSchema = new Schema<IShopItem>({
  groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  tag: { type: String, enum: ["Buff", "Sabotaje", "Cosmético"], required: true },
  icon: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const ShopItem = mongoose.models.ShopItem || mongoose.model<IShopItem>("ShopItem", ShopItemSchema);