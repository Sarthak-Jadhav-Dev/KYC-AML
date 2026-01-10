
import React, { useEffect, useState } from 'react';
import { Node } from 'reactflow';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea'; // Need to add if not present, or use Input
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Trash2 } from 'lucide-react';

interface ConfigPanelProps {
    selectedNode: Node | null;
    onUpdate: (id: string, data: any) => void;
    onDelete?: (id: string) => void;
}

export function ConfigPanel({ selectedNode, onUpdate, onDelete }: ConfigPanelProps) {
    const [config, setConfig] = useState<any>({});
    const [nodeLabel, setNodeLabel] = useState("");

    useEffect(() => {
        if (selectedNode) {
            setConfig(selectedNode.data.config || {});
            setNodeLabel(selectedNode.data.label || selectedNode.data.name || "");
        }
    }, [selectedNode]);

    const handleSave = () => {
        if (selectedNode) {
            onUpdate(selectedNode.id, {
                label: nodeLabel,
                config: config
            });
        }
    };

    const handleDelete = () => {
        if (selectedNode && onDelete) {
            onDelete(selectedNode.id);
        }
    };

    if (!selectedNode) {
        return (
            <div className="p-6 text-center text-muted-foreground text-sm">
                Select a node to configure properties.
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-background border-l">
            <div className="p-4 border-b font-semibold text-sm flex items-center justify-between">
                <span>Configuration</span>
                {onDelete && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDelete}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete Node"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Node Label</Label>
                        <Input
                            value={nodeLabel}
                            onChange={(e) => setNodeLabel(e.target.value)}
                            placeholder="Custom Name"
                        />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <Label className="text-xs uppercase text-muted-foreground">Parameters</Label>

                        {/* Dynamic config fields based on type implies large switch logic. 
                 For MVP, we dump a JSON editor or simple key fields. 
                 Let's do a JSON textarea for flexible "n8n-like" power user feel if complex, 
                 or simple inputs for known keys.
             */}
                        <div className="space-y-2">
                            <Label>Configuration (JSON)</Label>
                            <textarea
                                className="w-full h-[300px] p-2 text-xs font-mono bg-muted rounded-md border resize-none focus:outline-none focus:ring-1 ring-primary"
                                value={JSON.stringify(config, null, 2)}
                                onChange={(e) => {
                                    try {
                                        setConfig(JSON.parse(e.target.value));
                                    } catch (e) {
                                        // Allow invalid json during typing?
                                    }
                                }}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Edit the configuration object directly.
                            </p>
                        </div>
                    </div>
                </div>
            </ScrollArea>
            <div className="p-4 border-t bg-muted/10 space-y-2">
                <Button onClick={handleSave} className="w-full">Update Node</Button>
                {onDelete && (
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        className="w-full"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Node
                    </Button>
                )}
            </div>
        </div>
    );
}
