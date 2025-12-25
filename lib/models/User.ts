import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
    email: string;
    password: string;
    name: string;
    createdAt: Date;
}

const UserSchema = new Schema<IUser>({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
});

// Index for faster email lookups
UserSchema.index({ email: 1 });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
