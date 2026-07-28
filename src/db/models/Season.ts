import mongoose, { Schema, Document } from "mongoose";

export interface ISeason extends Document {
  groupId: mongoose.Types.ObjectId;
  name: string;
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
}

const SeasonSchema = new Schema<ISeason>({
  groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
  name: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export const Season = mongoose.models.Season || mongoose.model<ISeason>("Season", SeasonSchema);