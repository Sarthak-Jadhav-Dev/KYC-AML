
import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NodeType } from '@/lib/workflow/schema';

function CustomNode({ data, selected }: { data: any, selected: boolean }) {
    const isEntry = data.type === NodeType.KYC_CLIENT_REGISTRATION; // Heuristic

    return (
        <Card className={`w-[200px] shadow-sm transition-all ${selected ? 'border-primary ring-1 ring-primary' : ''}`}>
            <Handle type="target" position={Position.Top} className="bg-primary/50!" />
            <CardHeader className="p-3 pb-1">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                    {data.type?.replace(/_/g, ' ')}
                    {isEntry && <Badge variant="outline" className="text-[10px] h-4">Entry</Badge>}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1 text-sm font-semibold truncate">
                {data.label || data.name || "Node"}
            </CardContent>
            <Handle type="source" position={Position.Bottom} className="bg-primary/50!" />
        </Card>
    );
}

export default memo(CustomNode);
