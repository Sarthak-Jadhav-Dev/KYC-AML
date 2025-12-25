
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITenant extends Document {
    name: string;
    apiKeyHash: string;
    createdAt: Date;
}

const TenantSchema = new Schema<ITenant>({
    name: { type: String, required: true },
    apiKeyHash: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
});

export const Tenant: Model<ITenant> = mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', TenantSchema);

export interface IWorkflow extends Document {
    tenantId: string;
    userId?: string; // New field for user association
    name: string;
    version: number;
    status: 'DRAFT' | 'DEPLOYED';
    graphJson: any; // Raw ReactFlow JSON
    compiledJson?: any; // Executable schema
    generatedCodeTs?: string; // Display code
    createdAt: Date;
    updatedAt: Date;
}

const WorkflowSchema = new Schema<IWorkflow>({
    tenantId: { type: String, required: true, index: true },
    userId: { type: String, index: true }, // New field for user association
    name: { type: String, required: true },
    version: { type: Number, default: 1 },
    status: { type: String, enum: ['DRAFT', 'DEPLOYED'], default: 'DRAFT' },
    graphJson: { type: Schema.Types.Mixed, default: {} },
    compiledJson: { type: Schema.Types.Mixed },
    generatedCodeTs: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// Update timestamp on save
WorkflowSchema.pre('save', function () {
    this.updatedAt = new Date();
});

export const Workflow: Model<IWorkflow> = mongoose.models.Workflow || mongoose.model<IWorkflow>('Workflow', WorkflowSchema);

export interface IExecution extends Document {
    tenantId: string;
    workflowId: string;
    status: 'RUNNING' | 'DONE' | 'FAILED';
    input: any;
    output?: any;
    riskScore?: number;
    riskLevel?: string;
    decision?: string;
    reasons?: string[];
    startedAt: Date;
    finishedAt?: Date;
}

const ExecutionSchema = new Schema<IExecution>({
    tenantId: { type: String, required: true, index: true },
    workflowId: { type: String, required: true, index: true },
    status: { type: String, enum: ['RUNNING', 'DONE', 'FAILED'], default: 'RUNNING' },
    input: { type: Schema.Types.Mixed },
    output: { type: Schema.Types.Mixed },
    riskScore: { type: Number },
    riskLevel: { type: String },
    decision: { type: String },
    reasons: { type: [String] },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
});

export const Execution: Model<IExecution> = mongoose.models.Execution || mongoose.model<IExecution>('Execution', ExecutionSchema);

export interface IAuditEvent extends Document {
    tenantId: string;
    executionId: string;
    workflowId: string;
    nodeId: string;
    type: string; // NODE_START, NODE_END, ERROR
    timestamp: Date;
    payload: any;
}

const AuditEventSchema = new Schema<IAuditEvent>({
    tenantId: { type: String, required: true, index: true },
    executionId: { type: String, required: true, index: true },
    workflowId: { type: String, required: true },
    nodeId: { type: String, required: true },
    type: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    payload: { type: Schema.Types.Mixed },
});

export const AuditEvent: Model<IAuditEvent> = mongoose.models.AuditEvent || mongoose.model<IAuditEvent>('AuditEvent', AuditEventSchema);
