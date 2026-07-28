import mongoose, { Schema, Document } from "mongoose";

export interface IGroup extends Document {
  name: string;
  code: string;
  adminId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const GroupSchema = new Schema<IGroup>({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true, uppercase: true, minlength: 5, maxlength: 5 },
  adminId: { type: Schema.Types.ObjectId, ref: "Member", default: null },
  createdAt: { type: Date, default: Date.now },
});

export const Group = mongoose.models.Group || mongoose.model<IGroup>("Group", GroupSchema);