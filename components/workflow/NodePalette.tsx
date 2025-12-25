
import React from 'react';
import { NodeType } from '@/lib/workflow/schema';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const NODE_CATEGORIES = [
    {
        title: 'KYC',
        items: [
            { type: NodeType.KYC_CLIENT_REGISTRATION, label: 'Client Registration' },
            { type: NodeType.KYC_DOCUMENT_UPLOAD, label: 'Document Upload' },
            { type: NodeType.KYC_OCR_EXTRACT, label: 'OCR Extraction' },
            { type: NodeType.KYC_DOCUMENT_FRAUD_CHECK, label: 'Fraud Check' },
            { type: NodeType.KYC_BIOMETRIC_LIVENESS, label: 'Liveness Check' },
            { type: NodeType.KYC_FACE_MATCH, label: 'Face Match' },
        ]
    },
    {
        title: 'AML Screening',
        items: [
            { type: NodeType.AML_SANCTIONS_SCREEN, label: 'Sanctions' },
            { type: NodeType.AML_PEP_SCREEN, label: 'PEP Screening' },
            { type: NodeType.AML_WATCHLIST_SCREEN, label: 'Watchlist' },
            { type: NodeType.AML_ADVERSE_MEDIA_SCREEN, label: 'Adverse Media' },
        ]
    },
    {
        title: 'Risk & Logic',
        items: [
            { type: NodeType.RISK_CALCULATOR, label: 'Risk Calculator' },
            { type: NodeType.RISK_GATE, label: 'Risk Gate (Route)' },
        ]
    },
    {
        title: 'Decision & Actions',
        items: [
            { type: NodeType.DECISION_APPROVE, label: 'Approve' },
            { type: NodeType.DECISION_REJECT, label: 'Reject' },
            { type: NodeType.DECISION_MANUAL_REVIEW, label: 'Manual Review' },
            { type: NodeType.CALLBACK_WEBHOOK, label: 'Webhook Callback' },
            { type: NodeType.AUDIT_LOG, label: 'Audit Log' },
        ]
    },
    {
        title: 'Transaction Monitoring',
        items: [
            { type: NodeType.TM_SCHEMA_VALIDATE, label: 'Schema Validate' },
            { type: NodeType.TM_SCENARIO_RULE, label: 'Scenario Rule' },
            { type: NodeType.TM_CREATE_ALERT, label: 'Create Alert' },
            { type: NodeType.TM_FX_NORMALIZE, label: 'FX Normalize' },
            { type: NodeType.TM_DEDUPLICATE, label: 'Deduplicate' },
        ]
    }
];

export function NodePalette() {
    const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="h-full flex flex-col border-r bg-muted/10">
            <div className="p-4 border-b font-semibold text-sm">Node Palette</div>
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                    {NODE_CATEGORIES.map((cat) => (
                        <div key={cat.title}>
                            <h4 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{cat.title}</h4>
                            <div className="grid grid-cols-1 gap-2">
                                {cat.items.map((item) => (
                                    <div
                                        key={item.type}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, item.type)}
                                        className="p-3 text-sm bg-card border rounded-md cursor-grab hover:border-primary hover:shadow-sm transition-all flex items-center gap-2"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-primary/50" />
                                        {item.label}
                                    </div>
                                ))}
                            </div>
                            <Separator className="mt-4" />
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
