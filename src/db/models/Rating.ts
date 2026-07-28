import mongoose, { Schema, Document } from "mongoose";

export interface IRating extends Document {
  mediaId: mongoose.Types.ObjectId;
  memberId: mongoose.Types.ObjectId;
  stars: number;
  createdAt: Date;
}

const RatingSchema = new Schema<IRating>({
  mediaId: { type: Schema.Types.ObjectId, ref: "Media", required: true },
  memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
  stars: { type: Number, required: true, min: 1, max: 5 },
  createdAt: { type: Date, default: Date.now },
});

// Un miembro solo puede votar una vez por media
RatingSchema.index({ mediaId: 1, memberId: 1 }, { unique: true });

export const Rating = mongoose.models.Rating || mongoose.model<IRating>("Rating", RatingSchema);