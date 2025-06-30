"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { X, ArrowRight, ArrowLeft, ArrowLeftRight, Trash2 } from "lucide-react"
import { useGraphStore } from "@/lib/store"

interface RelationshipModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RelationshipModal({ open, onOpenChange }: RelationshipModalProps) {
  const { selectedEdge, nodes, updateEdge, removeEdge, setSelectedEdge } = useGraphStore()
  const [formData, setFormData] = useState({
    relationshipType: "Neutral",
    strength: [50],
    notes: "",
    tags: [] as string[],
    directional: false,
    direction: "source-to-target" as "source-to-target" | "target-to-source" | "bidirectional",
    hiddenFromPlayers: false,
  })
  const [newTag, setNewTag] = useState("")

  useEffect(() => {
    if (selectedEdge) {
      setFormData({
        relationshipType: selectedEdge.data?.relationshipType || "Neutral",
        strength: [selectedEdge.data?.strength || 50],
        notes: selectedEdge.data?.notes || "",
        tags: selectedEdge.data?.tags || [],
        directional: selectedEdge.data?.directional || false,
        direction: selectedEdge.data?.direction || "source-to-target",
        hiddenFromPlayers: selectedEdge.data?.hiddenFromPlayers || false,
      })
    }
  }, [selectedEdge])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedEdge) {
      const updatedData = {
        ...formData,
        strength: formData.strength[0],
      }
      updateEdge(selectedEdge.id, updatedData)
    }

    onOpenChange(false)
    setSelectedEdge(null)
  }

  const handleDelete = () => {
    if (selectedEdge) {
      if (confirm("Are you sure you want to delete this relationship? This action cannot be undone.")) {
        removeEdge(selectedEdge.id)
        onOpenChange(false)
        setSelectedEdge(null)
      }
    }
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }))
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }))
  }

  const getNodeName = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    return node?.data?.name || "Unknown"
  }

  const getDirectionLabel = () => {
    if (!selectedEdge) return ""

    const sourceName = getNodeName(selectedEdge.source)
    const targetName = getNodeName(selectedEdge.target)

    switch (formData.direction) {
      case "source-to-target":
        return `${sourceName} → ${targetName}`
      case "target-to-source":
        return `${targetName} → ${sourceName}`
      case "bidirectional":
        return `${sourceName} ↔ ${targetName}`
      default:
        return `${sourceName} ↔ ${targetName}`
    }
  }

  if (!selectedEdge) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Relationship</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {getNodeName(selectedEdge.source)} ↔ {getNodeName(selectedEdge.target)}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="type">Relationship Type</Label>
            <Select
              value={formData.relationshipType}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, relationshipType: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ally">Ally</SelectItem>
                <SelectItem value="Enemy">Enemy</SelectItem>
                <SelectItem value="Neutral">Neutral</SelectItem>
                <SelectItem value="Romantic">Romantic</SelectItem>
                <SelectItem value="Rival">Rival</SelectItem>
                <SelectItem value="Secret">Secret</SelectItem>
                <SelectItem value="Subordinate">Subordinate</SelectItem>
                <SelectItem value="Family">Family</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Strength: {formData.strength[0]}</Label>
            <Slider
              value={formData.strength}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, strength: value }))}
              max={100}
              min={1}
              step={1}
              className="mt-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Weak</span>
              <span>Strong</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="directional"
              checked={formData.directional}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, directional: checked }))}
            />
            <Label htmlFor="directional">Directional relationship</Label>
          </div>

          {formData.directional && (
            <div className="space-y-3">
              <Label>Direction</Label>
              <RadioGroup
                value={formData.direction}
                onValueChange={(value: "source-to-target" | "target-to-source" | "bidirectional") =>
                  setFormData((prev) => ({ ...prev, direction: value }))
                }
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="source-to-target" id="source-to-target" />
                  <Label htmlFor="source-to-target" className="flex items-center gap-2 cursor-pointer">
                    <ArrowRight className="w-4 h-4" />
                    {getNodeName(selectedEdge.source)} → {getNodeName(selectedEdge.target)}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="target-to-source" id="target-to-source" />
                  <Label htmlFor="target-to-source" className="flex items-center gap-2 cursor-pointer">
                    <ArrowLeft className="w-4 h-4" />
                    {getNodeName(selectedEdge.target)} → {getNodeName(selectedEdge.source)}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bidirectional" id="bidirectional" />
                  <Label htmlFor="bidirectional" className="flex items-center gap-2 cursor-pointer">
                    <ArrowLeftRight className="w-4 h-4" />
                    Bidirectional ({getNodeName(selectedEdge.source)} ↔ {getNodeName(selectedEdge.target)})
                  </Label>
                </div>
              </RadioGroup>

              <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                <strong>Preview:</strong> {getDirectionLabel()}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="hidden"
              checked={formData.hiddenFromPlayers}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, hiddenFromPlayers: checked }))}
            />
            <Label htmlFor="hidden">Hidden from players</Label>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Add notes about this relationship..."
              rows={3}
            />
          </div>

          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag..."
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} size="sm">
                Add
              </Button>
            </div>

            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center gap-2 pt-4">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </Button>

            <Button type="submit" size="default">
              Update Relationship
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
