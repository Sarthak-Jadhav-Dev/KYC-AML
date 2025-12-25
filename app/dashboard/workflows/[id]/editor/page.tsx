
"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
  MiniMap
} from 'reactflow';
import 'reactflow/dist/style.css';

import { NodePalette } from '@/components/workflow/NodePalette';
import { ConfigPanel } from '@/components/workflow/ConfigPanel';
import CustomNode from '@/components/workflow/CustomNode';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { NodeType } from '@/lib/workflow/schema';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Register custom nodes
const nodeTypes = {
  [NodeType.KYC_CLIENT_REGISTRATION]: CustomNode,
  [NodeType.KYC_DOCUMENT_UPLOAD]: CustomNode,
  [NodeType.KYC_OCR_EXTRACT]: CustomNode,
  [NodeType.KYC_DOCUMENT_FRAUD_CHECK]: CustomNode,
  [NodeType.KYC_BIOMETRIC_LIVENESS]: CustomNode,
  [NodeType.KYC_FACE_MATCH]: CustomNode,
  [NodeType.AML_SANCTIONS_SCREEN]: CustomNode,
  [NodeType.AML_PEP_SCREEN]: CustomNode,
  [NodeType.AML_WATCHLIST_SCREEN]: CustomNode,
  [NodeType.AML_ADVERSE_MEDIA_SCREEN]: CustomNode,
  [NodeType.RISK_CALCULATOR]: CustomNode,
  [NodeType.RISK_GATE]: CustomNode,
  [NodeType.DECISION_APPROVE]: CustomNode,
  [NodeType.DECISION_REJECT]: CustomNode,
  [NodeType.DECISION_MANUAL_REVIEW]: CustomNode,
  [NodeType.CALLBACK_WEBHOOK]: CustomNode,
  [NodeType.AUDIT_LOG]: CustomNode,
  [NodeType.TM_SCHEMA_VALIDATE]: CustomNode,
  [NodeType.TM_SCENARIO_RULE]: CustomNode,
  [NodeType.TM_CREATE_ALERT]: CustomNode,
  [NodeType.TM_FX_NORMALIZE]: CustomNode,
  [NodeType.TM_DEDUPLICATE]: CustomNode,
  default: CustomNode
};

export default function EditorPage() {
  const { id } = useParams();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [workflow, setWorkflow] = useState<any>(null);

  const [importJson, setImportJson] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/workflows/' + id);
        const data = await res.json();
        setWorkflow(data);
        if (data.graphJson) {
          setNodes(data.graphJson.nodes || []);
          setEdges(data.graphJson.edges || []);
        }
      } catch (e) {
        toast.error("Failed to load workflow");
      }
    }
    if (id) load();
  }, [id, setNodes, setEdges]);

  const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = reactFlowInstance?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: 'node-' + Date.now(),
        type,
        position: position || { x: 0, y: 0 },
        data: { label: type.replace(/_/g, ' '), type, config: {} },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onNodeUpdate = useCallback((id: string, newData: any) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === id) return { ...n, data: { ...n.data, ...newData } };
      return n;
    }));
    toast.success("Node updated");
  }, [setNodes]);

  const handleSave = async () => {
    const graphJson = reactFlowInstance?.toObject();
    try {
      await fetch('/api/workflows/' + id, {
        method: 'PUT',
        body: JSON.stringify({ graphJson })
      });
      toast.success("Workflow saved");
    } catch (e) {
      toast.error("Save failed");
    }
  };

  const handleDeploy = async () => {
    await handleSave();
    try {
      const res = await fetch('/api/workflows/' + id + '/deploy', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success("Deployed successfully!");
        setWorkflow(data.workflow);
      } else {
        toast.error("Deploy failed: " + data.error);
      }
    } catch (e) {
      toast.error("Deploy failed");
    }
  };

  const handleExport = () => {
    const graphJson = reactFlowInstance?.toObject();
    const blob = new Blob([JSON.stringify(graphJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workflow-' + id + '.json';
    a.click();
    toast.success("Exported JSON");
  };

  const handleImport = () => {
    try {
      const start = JSON.parse(importJson);
      if (start.nodes && start.edges) {
        setNodes(start.nodes);
        setEdges(start.edges);
        setIsImportOpen(false);
        toast.success("Imported JSON successfully");
      } else {
        toast.error("Invalid JSON format");
      }
    } catch (e) {
      toast.error("Invalid JSON");
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="h-14 border-b flex items-center justify-between px-4 bg-background z-10">
        <div className="font-semibold flex items-center gap-2">
          Workflow Editor
          <span className="text-xs text-muted-foreground font-normal">v{workflow?.version || 1}</span>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild><Button variant="outline" size="sm">Import</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Import JSON</DialogTitle></DialogHeader>
              <Textarea
                value={importJson}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setImportJson(e.target.value)}
                placeholder="Paste JSON here..."
                className="h-[300px]"
              />
              <DialogFooter><Button onClick={handleImport}>Import</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" onClick={handleExport}>Export</Button>

          <Sheet>
            <SheetTrigger asChild><Button variant="outline" size="sm">View Code</Button></SheetTrigger>
            <SheetContent className="w-[600px] sm:max-w-[600px]">
              <SheetHeader><SheetTitle>Generated Code</SheetTitle></SheetHeader>
              <div className="mt-4 h-full bg-muted p-4 rounded-md overflow-auto font-mono text-xs whitespace-pre">
                {workflow?.generatedCodeTs || "// No code generated yet. Deploy first."}
              </div>
            </SheetContent>
          </Sheet>

          <Button variant="secondary" size="sm" onClick={handleSave}>Save</Button>
          <Button size="sm" onClick={handleDeploy}>Deploy</Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ReactFlowProvider>
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={20} minSize={15}>
              <NodePalette />
            </ResizablePanel>

            <ResizableHandle />

            <ResizablePanel defaultSize={60} minSize={30}>
              <div className="h-full w-full" ref={reactFlowWrapper}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onInit={setReactFlowInstance}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onNodeClick={onNodeClick}
                  nodeTypes={nodeTypes}
                  fitView
                >
                  <Background />
                  <Controls />
                  <MiniMap />
                </ReactFlow>
              </div>
            </ResizablePanel>

            <ResizableHandle />

            <ResizablePanel defaultSize={20} minSize={20}>
              <ConfigPanel selectedNode={selectedNode} onUpdate={onNodeUpdate} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ReactFlowProvider>
      </div>
    </div>
  );
}
