import mongoose, { Schema, Document } from "mongoose";

export interface IMedia extends Document {
  eventId?: mongoose.Types.ObjectId;
  memberId: mongoose.Types.ObjectId;
  challengeId?: mongoose.Types.ObjectId;
  type: "reto" | "free";
  url: string;
  caption: string;
  averageStars: number;
  createdAt: Date;
}

const MediaSchema = new Schema<IMedia>({
  eventId: { type: Schema.Types.ObjectId, ref: "Event" }, // <-- Le quitamos el required: true
  memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
  challengeId: { type: Schema.Types.ObjectId, ref: "Challenge" },
  type: { type: String, enum: ["reto", "free"], required: true },
  url: { type: String, default: "" },
  caption: { type: String, default: "" },
  averageStars: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const Media = mongoose.models.Media || mongoose.model<IMedia>("Media", MediaSchema);