import mongoose, { Schema, Document } from "mongoose";

export interface IChallenge extends Document {
  groupId: mongoose.Types.ObjectId;
  seasonId: mongoose.Types.ObjectId;
  eventId?: mongoose.Types.ObjectId;
  level: 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
  points: number;
  status: "locked" | "available" | "pending" | "voting" | "done";
  assignedTo?: mongoose.Types.ObjectId;
  submittedMedia?: string;
  validatedBy?: mongoose.Types.ObjectId;
  validatedAt?: Date;
  votes: { memberId: mongoose.Types.ObjectId; vote: boolean; votedAt: Date }[];
  votingStartedAt?: Date;
  createdAt: Date;
}

const ChallengeSchema = new Schema<IChallenge>({
  groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
  seasonId: { type: Schema.Types.ObjectId, ref: "Season", required: true },
  eventId: { type: Schema.Types.ObjectId, ref: "Event" },
  level: { type: Number, enum: [1, 2, 3, 4, 5], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  points: { type: Number, required: true },
  status: { type: String, enum: ["locked", "available", "pending", "voting", "done"], default: "locked" },
  assignedTo: { type: Schema.Types.ObjectId, ref: "Member" },
  submittedMedia: { type: String },
  validatedBy: { type: Schema.Types.ObjectId, ref: "Member" },
  validatedAt: { type: Date },
  votes: [{ memberId: { type: Schema.Types.ObjectId, ref: "Member" }, vote: Boolean, votedAt: { type: Date, default: Date.now } }],
  votingStartedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export const Challenge = mongoose.models.Challenge || mongoose.model<IChallenge>("Challenge", ChallengeSchema);