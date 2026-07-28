import mongoose, { Schema, Document } from "mongoose";

export interface IEvent extends Document {
  groupId: mongoose.Types.ObjectId;
  seasonId: mongoose.Types.ObjectId;
  name: string;
  date: Date;
  cover: string;
  isActive: boolean;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  parentEventId?: mongoose.Types.ObjectId;
}

const EventSchema = new Schema<IEvent>({
  groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
  seasonId: { type: Schema.Types.ObjectId, ref: "Season", required: true },
  name: { type: String, required: true },
  date: { type: Date, default: Date.now },
  cover: { type: String, default: "" },
  isActive: { type: Boolean, default: false },
  startedAt: { type: Date },
  endedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  parentEventId: { type: Schema.Types.ObjectId, ref: "Event" },
});

export const Event = mongoose.models.Event || mongoose.model<IEvent>("Event", EventSchema);