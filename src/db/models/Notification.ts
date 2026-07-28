import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  groupId: mongoose.Types.ObjectId;
  memberId: mongoose.Types.ObjectId;
  type: "success" | "sabotage" | "info";
  who: string;
  action: string;
  target: string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
  memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
  type: { type: String, enum: ["success", "sabotage", "info"], required: true },
  who: { type: String, required: true },
  action: { type: String, required: true },
  target: { type: String, default: "" },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const Notification = mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);