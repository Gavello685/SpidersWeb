"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X, Trash2 } from "lucide-react"
import { useGraphStore } from "@/lib/store"

interface NodeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NodeModal({ open, onOpenChange }: NodeModalProps) {
  const { selectedNode, addNode, updateNode, setSelectedNode } = useGraphStore()
  const [formData, setFormData] = useState({
    name: "",
    type: "NPC",
    status: "Alive",
    description: "",
    tags: [] as string[],
  })
  const [newTag, setNewTag] = useState("")

  // Dynamic status options based on node type
  const statusOptions: Record<string, string[]> = {
    NPC: ["Alive", "Dead", "Unknown", "Missing"],
    PC: ["Alive", "Dead", "Unknown", "Missing"],
    Faction: ["Active", "Inactive"],
    Location: ["Known", "Unknown", "Lost"],
    Abstract: ["Active", "Inactive", "Dormant"],
  }
  const currentStatusOptions = statusOptions[formData.type] || ["Alive", "Dead", "Unknown", "Missing"]

  useEffect(() => {
    if (selectedNode) {
      setFormData({
        name: selectedNode.data?.name || "",
        type: selectedNode.data?.type || "NPC",
        status: selectedNode.data?.status || "Alive",
        description: selectedNode.data?.description || "",
        tags: selectedNode.data?.tags || [],
      })
    } else {
      setFormData({
        name: "",
        type: "NPC",
        status: "Alive",
        description: "",
        tags: [],
      })
    }
  }, [selectedNode])

  // Guarantee: reset form when modal closes and no node is selected
  useEffect(() => {
    if (!open && !selectedNode) {
      setFormData({
        name: "",
        type: "NPC",
        status: "Alive",
        description: "",
        tags: [],
      })
      setNewTag("")
    }
  }, [open, selectedNode])

  // Reset status to default if type changes and current status is not valid
  useEffect(() => {
    if (!currentStatusOptions.includes(formData.status)) {
      setFormData((prev) => ({ ...prev, status: currentStatusOptions[0] }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.type])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedNode) {
      // Update existing node
      updateNode(selectedNode.id, formData)
    } else {
      // Create new node
      const nodeType = formData.type.toLowerCase() as "npc" | "pc" | "faction" | "location" | "abstract"
      const newNode = {
        id: `node-${Date.now()}`,
        type: nodeType,
        position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
        data: formData,
      }
      addNode(newNode)
    }

    onOpenChange(false)
    setSelectedNode(null)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{selectedNode ? "Edit Node" : "Create New Node"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter name..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NPC">NPC</SelectItem>
                  <SelectItem value="PC">Player Character</SelectItem>
                  <SelectItem value="Faction">Faction/Group</SelectItem>
                  <SelectItem value="Location">Location</SelectItem>
                  <SelectItem value="Abstract">Abstract</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentStatusOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Enter description..."
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

          <div className="flex justify-end gap-2 pt-4">
            {selectedNode && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (
                    confirm(
                      `Are you sure you want to delete "${selectedNode.data.name}"? This will also remove all connected relationships. This action cannot be undone.`,
                    )
                  ) {
                    useGraphStore.getState().removeNode(selectedNode.id)
                    onOpenChange(false)
                    setSelectedNode(null)
                  }
                }}
                className="mr-auto flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{selectedNode ? "Update" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
