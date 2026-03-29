"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { FileText, Shield, Users } from "lucide-react"
import { useGraphStore } from "@/lib/store"
import type { Node, Edge } from "@/lib/graph-types"

interface PdfExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function buildPdfHtml(
  campaignName: string,
  campaignDescription: string,
  nodes: Node[],
  edges: Edge[],
  mode: "dm" | "player",
): string {
  const hiddenNodeIds = new Set(nodes.filter((n) => n.data.hiddenFromPlayers).map((n) => n.id))

  const visibleNodes = mode === "player" ? nodes.filter((n) => !n.data.hiddenFromPlayers) : nodes
  const visibleEdges =
    mode === "player"
      ? edges.filter((e) => !e.data.hiddenFromPlayers && !hiddenNodeIds.has(e.source) && !hiddenNodeIds.has(e.target))
      : edges

  const getNodeName = (id: string) => nodes.find((n) => n.id === id)?.data.name ?? "Unknown"

  const nodesHtml = visibleNodes
    .map((node) => {
      const sheet = node.data.sheet
      const sheetRows = sheet
        ? [
            sheet.race ? `<tr><td class="label">Race</td><td>${sheet.race}</td></tr>` : "",
            sheet.class ? `<tr><td class="label">Class</td><td>${sheet.class}</td></tr>` : "",
            sheet.level !== undefined ? `<tr><td class="label">Level</td><td>${sheet.level}</td></tr>` : "",
            sheet.alignment ? `<tr><td class="label">Alignment</td><td>${sheet.alignment}</td></tr>` : "",
            sheet.backstory
              ? `<tr><td class="label">Backstory</td><td>${sheet.backstory.replace(/\n/g, "<br>")}</td></tr>`
              : "",
            sheet.notes
              ? `<tr><td class="label">Notes</td><td>${sheet.notes.replace(/\n/g, "<br>")}</td></tr>`
              : "",
            ...(sheet.customFields ?? []).map(
              (f) => `<tr><td class="label">${f.key}</td><td>${f.value}</td></tr>`,
            ),
          ]
            .filter(Boolean)
            .join("")
        : ""

      const tagsHtml =
        node.data.tags.length > 0
          ? `<div class="tags">${node.data.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>`
          : ""

      const portraitHtml =
        sheet?.imageData
          ? `<img src="${sheet.imageData}" class="portrait" alt="Portrait of ${node.data.name}" />`
          : ""

      const hiddenBadge =
        mode === "dm" && node.data.hiddenFromPlayers
          ? `<span class="hidden-badge">Hidden from players</span>`
          : ""

      return `
        <div class="node-card">
          <div class="node-header">
            ${portraitHtml}
            <div class="node-title-block">
              <h3>${node.data.name} ${hiddenBadge}</h3>
              <div class="node-meta">${node.data.type} · ${node.data.status}</div>
              ${tagsHtml}
            </div>
          </div>
          ${node.data.description ? `<p class="description">${node.data.description.replace(/\n/g, "<br>")}</p>` : ""}
          ${sheetRows ? `<table class="sheet-table"><tbody>${sheetRows}</tbody></table>` : ""}
        </div>`
    })
    .join("")

  const edgesHtml = visibleEdges
    .map((edge) => {
      const sourceName = getNodeName(edge.source)
      const targetName = getNodeName(edge.target)
      const dirSymbol =
        edge.data.directional
          ? edge.data.direction === "source-to-target"
            ? "→"
            : edge.data.direction === "target-to-source"
              ? "←"
              : "↔"
          : "↔"
      const hiddenBadge =
        mode === "dm" && edge.data.hiddenFromPlayers
          ? `<span class="hidden-badge">Hidden</span>`
          : ""
      return `
        <tr>
          <td>${sourceName} ${dirSymbol} ${targetName}</td>
          <td>${edge.data.relationshipType}</td>
          <td>${edge.data.strength}</td>
          <td>${edge.data.tags.join(", ")}</td>
          <td>${edge.data.notes ?? ""}</td>
          <td>${hiddenBadge}</td>
        </tr>`
    })
    .join("")

  const modeLabel = mode === "dm" ? "DM Version" : "Player Version"

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${campaignName} — ${modeLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, serif; font-size: 13px; color: #1a1a1a; padding: 2cm; line-height: 1.5; }
    h1 { font-size: 26px; margin-bottom: 4px; }
    h2 { font-size: 16px; margin: 28px 0 10px; border-bottom: 2px solid #1a1a1a; padding-bottom: 4px; }
    h3 { font-size: 14px; margin-bottom: 4px; }
    .meta { font-size: 11px; color: #666; margin-bottom: 6px; }
    .campaign-desc { margin-bottom: 16px; font-style: italic; color: #444; }
    .mode-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; background: ${mode === "dm" ? "#fef3c7" : "#dbeafe"}; color: ${mode === "dm" ? "#92400e" : "#1e40af"}; border: 1px solid ${mode === "dm" ? "#fcd34d" : "#93c5fd"}; margin-left: 8px; vertical-align: middle; }
    .hidden-badge { display: inline-block; padding: 1px 6px; border-radius: 8px; font-size: 10px; background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; margin-left: 6px; vertical-align: middle; }
    .nodes-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .node-card { border: 1px solid #ccc; border-radius: 8px; padding: 12px; break-inside: avoid; }
    .node-header { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 8px; }
    .portrait { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid #ddd; flex-shrink: 0; }
    .node-title-block { flex: 1; min-width: 0; }
    .node-meta { font-size: 11px; color: #666; margin-bottom: 4px; }
    .tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
    .tag { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; padding: 1px 6px; font-size: 10px; }
    .description { font-size: 12px; color: #444; margin-bottom: 8px; }
    .sheet-table { width: 100%; font-size: 11px; border-collapse: collapse; margin-top: 8px; }
    .sheet-table td { padding: 3px 6px; border-bottom: 1px solid #f0f0f0; }
    .sheet-table td.label { font-weight: bold; width: 80px; color: #333; vertical-align: top; }
    .rel-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .rel-table th { text-align: left; padding: 6px 8px; background: #f3f4f6; border-bottom: 2px solid #d1d5db; font-size: 11px; }
    .rel-table td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    .rel-table tr:hover td { background: #fafafa; }
    .footer { margin-top: 32px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }
    @media print {
      body { padding: 1cm; }
      .nodes-grid { grid-template-columns: 1fr 1fr; }
      .node-card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${campaignName} <span class="mode-badge">${modeLabel}</span></h1>
  ${campaignDescription ? `<p class="campaign-desc">${campaignDescription}</p>` : ""}
  <p class="meta">Exported ${new Date().toLocaleDateString()} · ${visibleNodes.length} nodes · ${visibleEdges.length} relationships</p>

  <h2>Characters &amp; Entities</h2>
  <div class="nodes-grid">
    ${nodesHtml}
  </div>

  <h2>Relationships</h2>
  <table class="rel-table">
    <thead>
      <tr>
        <th>Relationship</th>
        <th>Type</th>
        <th>Strength</th>
        <th>Tags</th>
        <th>Notes</th>
        ${mode === "dm" ? "<th></th>" : ""}
      </tr>
    </thead>
    <tbody>
      ${edgesHtml}
    </tbody>
  </table>

  <div class="footer">Generated by The Spider's Web · spidersweb.vercel.app</div>
  <script>window.onload = () => window.print()</script>
</body>
</html>`
}

export function PdfExportModal({ open, onOpenChange }: PdfExportModalProps) {
  const [mode, setMode] = useState<"dm" | "player">("dm")
  const { currentCampaign, nodes, edges } = useGraphStore()

  const handleExport = () => {
    if (!currentCampaign) return
    const html = buildPdfHtml(
      currentCampaign.name,
      currentCampaign.description,
      nodes,
      edges,
      mode,
    )
    const win = window.open("", "_blank")
    if (!win) {
      alert("Pop-up blocked. Please allow pop-ups for this site to export PDF.")
      return
    }
    win.document.write(html)
    win.document.close()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Export Campaign PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Choose which version to export. The player version omits all nodes and relationships marked &quot;Hidden from players&quot;.
          </p>

          <RadioGroup value={mode} onValueChange={(v) => setMode(v as "dm" | "player")} className="space-y-2">
            <div className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setMode("dm")}>
              <RadioGroupItem value="dm" id="export-dm" className="mt-0.5" />
              <Label htmlFor="export-dm" className="cursor-pointer">
                <div className="flex items-center gap-2 font-medium">
                  <Shield className="w-4 h-4 text-amber-500" />
                  DM Version
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Full export — all nodes, relationships, and DM notes. Hidden items are included with a marker.</p>
              </Label>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setMode("player")}>
              <RadioGroupItem value="player" id="export-player" className="mt-0.5" />
              <Label htmlFor="export-player" className="cursor-pointer">
                <div className="flex items-center gap-2 font-medium">
                  <Users className="w-4 h-4 text-blue-500" />
                  Player Version
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Strips all hidden nodes and relationships. Safe to share with your table.</p>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleExport} disabled={!currentCampaign}>
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Export &amp; Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
