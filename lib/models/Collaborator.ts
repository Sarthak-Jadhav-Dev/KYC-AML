import mongoose, { Schema, Document, Model } from 'mongoose';

export type CollaboratorRole = 'viewer' | 'editor' | 'admin';
export type CollaboratorStatus = 'pending' | 'accepted';

export interface ICollaborator extends Document {
    workflowId: string;
    userId: string;
    email: string;
    name: string;
    role: CollaboratorRole;
    invitedBy: string;
    invitedAt: Date;
    status: CollaboratorStatus;
}

const CollaboratorSchema = new Schema<ICollaborator>({
    workflowId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['viewer', 'editor', 'admin'], default: 'viewer' },
    invitedBy: { type: String, required: true },
    invitedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'accepted'], default: 'accepted' },
});

// Compound index for efficient lookups
CollaboratorSchema.index({ workflowId: 1, userId: 1 }, { unique: true });

// Index for finding all collaborations for a user
CollaboratorSchema.index({ userId: 1, status: 1 });

export const Collaborator: Model<ICollaborator> = mongoose.models.Collaborator || mongoose.model<ICollaborator>('Collaborator', CollaboratorSchema);
