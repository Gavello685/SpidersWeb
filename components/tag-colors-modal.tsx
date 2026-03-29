"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tag, Trash2, X } from "lucide-react"
import { useGraphStore } from "@/lib/store"

interface TagColorsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#6b7280", "#78716c",
]

export function TagColorsModal({ open, onOpenChange }: TagColorsModalProps) {
  const { currentCampaign, nodes, edges, setTagColor, removeTagColor } = useGraphStore()
  const tagColors: Record<string, string> = currentCampaign?.tagColors ?? {}

  // Collect all unique tags across nodes and edges
  const allTags = Array.from(
    new Set([
      ...nodes.flatMap((n) => n.data.tags),
      ...edges.flatMap((e) => e.data.tags),
    ]),
  ).sort()

  const [newTag, setNewTag] = useState("")
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])

  const tagsToShow = Array.from(new Set([...Object.keys(tagColors), ...allTags]))

  const handleSet = (tag: string, color: string) => {
    setTagColor(tag, color)
  }

  const handleAddCustom = () => {
    if (!newTag.trim()) return
    setTagColor(newTag.trim(), newColor)
    setNewTag("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Tag Colors
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground shrink-0">
          Assign colors to tags. Nodes and edges with a colored tag show a colored border dot.
        </p>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {tagsToShow.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No tags found in this campaign yet.
            </p>
          )}
          {tagsToShow.map((tag) => {
            const color = tagColors[tag]
            return (
              <div key={tag} className="flex items-center gap-2 p-2 rounded-lg border">
                {color && (
                  <div
                    className="w-5 h-5 rounded-full shrink-0 border border-border"
                    style={{ background: color }}
                  />
                )}
                <span className="text-sm flex-1 truncate">{tag}</span>
                <div className="flex gap-1 shrink-0">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`w-4 h-4 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-125" : "border-transparent hover:border-foreground/50"}`}
                      style={{ background: c }}
                      onClick={() => handleSet(tag, c)}
                      title={c}
                    />
                  ))}
                  <input
                    type="color"
                    value={color ?? "#6b7280"}
                    onChange={(e) => handleSet(tag, e.target.value)}
                    className="w-4 h-4 rounded cursor-pointer border border-border"
                    title="Custom color"
                  />
                </div>
                {color && (
                  <button
                    type="button"
                    className="shrink-0 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    onClick={() => removeTagColor(tag)}
                    title="Remove color"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Add tag manually (for tags not yet in campaign) */}
        <div className="pt-3 border-t shrink-0 space-y-2">
          <p className="text-xs text-muted-foreground">Add color for a new tag:</p>
          <div className="flex gap-2">
            <Input
              className="h-8 text-sm flex-1"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Tag name..."
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCustom())}
            />
            <div className="flex gap-1 items-center">
              {PRESET_COLORS.slice(0, 5).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-5 h-5 rounded-full border-2 transition-all ${newColor === c ? "border-foreground scale-110" : "border-transparent hover:border-foreground/50"}`}
                  style={{ background: c }}
                  onClick={() => setNewColor(c)}
                />
              ))}
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer border border-border"
              />
            </div>
            <Button size="sm" className="h-8" onClick={handleAddCustom} disabled={!newTag.trim()}>
              Add
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
