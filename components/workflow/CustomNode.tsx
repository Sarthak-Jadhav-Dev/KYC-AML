
import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { NodeType } from '@/lib/workflow/schema';
import {
    UserPlus, FileText, ScanSearch, ShieldAlert, Fingerprint,
    ScanFace, AlertTriangle, Flag, List, Newspaper,
    Calculator, GitBranch, CheckCircle, XCircle, Eye,
    Webhook, FileCheck, ClipboardCheck, BarChart3, Layers, Copy, Bell
} from 'lucide-react';

// Map node types to icons
const nodeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    [NodeType.KYC_CLIENT_REGISTRATION]: UserPlus,
    [NodeType.KYC_DOCUMENT_UPLOAD]: FileText,
    [NodeType.KYC_OCR_EXTRACT]: ScanSearch,
    [NodeType.KYC_DOCUMENT_FRAUD_CHECK]: ShieldAlert,
    [NodeType.KYC_BIOMETRIC_LIVENESS]: Fingerprint,
    [NodeType.KYC_FACE_MATCH]: ScanFace,
    [NodeType.AML_SANCTIONS_SCREEN]: AlertTriangle,
    [NodeType.AML_PEP_SCREEN]: Flag,
    [NodeType.AML_WATCHLIST_SCREEN]: List,
    [NodeType.AML_ADVERSE_MEDIA_SCREEN]: Newspaper,
    [NodeType.RISK_CALCULATOR]: Calculator,
    [NodeType.RISK_GATE]: GitBranch,
    [NodeType.DECISION_APPROVE]: CheckCircle,
    [NodeType.DECISION_REJECT]: XCircle,
    [NodeType.DECISION_MANUAL_REVIEW]: Eye,
    [NodeType.CALLBACK_WEBHOOK]: Webhook,
    [NodeType.AUDIT_LOG]: FileCheck,
    [NodeType.TM_SCHEMA_VALIDATE]: ClipboardCheck,
    [NodeType.TM_SCENARIO_RULE]: BarChart3,
    [NodeType.TM_CREATE_ALERT]: Bell,
    [NodeType.TM_FX_NORMALIZE]: Layers,
    [NodeType.TM_DEDUPLICATE]: Copy,
};

// Map node types to gradient colors
const nodeColors: Record<string, { from: string; to: string; icon: string }> = {
    [NodeType.KYC_CLIENT_REGISTRATION]: { from: '#8B5CF6', to: '#6366F1', icon: '#A78BFA' },
    [NodeType.KYC_DOCUMENT_UPLOAD]: { from: '#8B5CF6', to: '#6366F1', icon: '#A78BFA' },
    [NodeType.KYC_OCR_EXTRACT]: { from: '#8B5CF6', to: '#6366F1', icon: '#A78BFA' },
    [NodeType.KYC_DOCUMENT_FRAUD_CHECK]: { from: '#8B5CF6', to: '#6366F1', icon: '#A78BFA' },
    [NodeType.KYC_BIOMETRIC_LIVENESS]: { from: '#8B5CF6', to: '#6366F1', icon: '#A78BFA' },
    [NodeType.KYC_FACE_MATCH]: { from: '#8B5CF6', to: '#6366F1', icon: '#A78BFA' },
    [NodeType.AML_SANCTIONS_SCREEN]: { from: '#F59E0B', to: '#EF4444', icon: '#FBBF24' },
    [NodeType.AML_PEP_SCREEN]: { from: '#F59E0B', to: '#EF4444', icon: '#FBBF24' },
    [NodeType.AML_WATCHLIST_SCREEN]: { from: '#F59E0B', to: '#EF4444', icon: '#FBBF24' },
    [NodeType.AML_ADVERSE_MEDIA_SCREEN]: { from: '#F59E0B', to: '#EF4444', icon: '#FBBF24' },
    [NodeType.RISK_CALCULATOR]: { from: '#3B82F6', to: '#8B5CF6', icon: '#60A5FA' },
    [NodeType.RISK_GATE]: { from: '#3B82F6', to: '#8B5CF6', icon: '#60A5FA' },
    [NodeType.DECISION_APPROVE]: { from: '#10B981', to: '#059669', icon: '#34D399' },
    [NodeType.DECISION_REJECT]: { from: '#EF4444', to: '#DC2626', icon: '#F87171' },
    [NodeType.DECISION_MANUAL_REVIEW]: { from: '#F59E0B', to: '#D97706', icon: '#FBBF24' },
    [NodeType.CALLBACK_WEBHOOK]: { from: '#6366F1', to: '#4F46E5', icon: '#818CF8' },
    [NodeType.AUDIT_LOG]: { from: '#6B7280', to: '#4B5563', icon: '#9CA3AF' },
    [NodeType.TM_SCHEMA_VALIDATE]: { from: '#06B6D4', to: '#0891B2', icon: '#22D3EE' },
    [NodeType.TM_SCENARIO_RULE]: { from: '#06B6D4', to: '#0891B2', icon: '#22D3EE' },
    [NodeType.TM_CREATE_ALERT]: { from: '#06B6D4', to: '#0891B2', icon: '#22D3EE' },
    [NodeType.TM_FX_NORMALIZE]: { from: '#06B6D4', to: '#0891B2', icon: '#22D3EE' },
    [NodeType.TM_DEDUPLICATE]: { from: '#06B6D4', to: '#0891B2', icon: '#22D3EE' },
};

const defaultColor = { from: '#6366F1', to: '#8B5CF6', icon: '#818CF8' };

function CustomNode({ data, selected }: { data: any, selected: boolean }) {
    const isEntry = data.type === NodeType.KYC_CLIENT_REGISTRATION;
    const IconComponent = nodeIcons[data.type] || FileText;
    const colors = nodeColors[data.type] || defaultColor;

    return (
        <div
            className={`
                relative min-w-[220px] rounded-lg transition-all duration-200
                ${selected ? 'scale-105' : ''}
            `}
            style={{
                background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
                padding: '2px',
                boxShadow: selected
                    ? `0 0 20px ${colors.from}80, 0 4px 20px rgba(0,0,0,0.3)`
                    : '0 4px 12px rgba(0,0,0,0.2)',
            }}
        >
            {/* Inner container */}
            <div className="bg-[#1a1a2e] rounded-md overflow-hidden">
                {/* Handle - Top */}
                <Handle
                    type="target"
                    position={Position.Top}
                    className="w-3! h-3! border-2! border-white/50! bg-linear-to-r! from-purple-500! to-blue-500! -top-1.5!"
                />

                {/* Header with icon */}
                <div className="flex items-center gap-3 p-3">
                    {/* Icon container */}
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                            background: `linear-gradient(135deg, ${colors.from}40, ${colors.to}40)`,
                            border: `1px solid ${colors.icon}40`
                        }}
                    >
                        <span style={{ color: colors.icon }}>
                            <IconComponent className="w-5 h-5" />
                        </span>
                    </div>

                    {/* Text content */}
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400 flex items-center gap-2">
                            {data.type?.replace(/_/g, ' ')}
                            {isEntry && (
                                <Badge
                                    variant="outline"
                                    className="text-[8px] h-3 px-1 border-purple-500/50 text-purple-300"
                                >
                                    Entry
                                </Badge>
                            )}
                        </div>
                        <div className="text-sm font-semibold text-white truncate mt-0.5">
                            {data.label || data.name || "Node"}
                        </div>
                    </div>
                </div>

                {/* Handle - Bottom */}
                <Handle
                    type="source"
                    position={Position.Bottom}
                    className="w-3! h-3! border-2! border-white/50! bg-linear-to-r! from-blue-500! to-purple-500! -bottom-1.5!"
                />
            </div>
        </div>
    );
}

export default memo(CustomNode);
