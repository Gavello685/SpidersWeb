"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, Trash2, Sparkles, Plus, ImageIcon, EyeOff } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useGraphStore } from "@/lib/store"
import { compressImage } from "@/lib/image-utils"
import type { CharacterSheet } from "@/lib/graph-types"

interface NodeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NodeModal({ open, onOpenChange }: NodeModalProps) {
  const { selectedNode, addNode, updateNode, setSelectedNode, isPremium } = useGraphStore()
  const [formData, setFormData] = useState({
    name: "",
    type: "NPC",
    status: "Alive",
    description: "",
    tags: [] as string[],
    hiddenFromPlayers: false,
  })
  const [newTag, setNewTag] = useState("")

  // Character sheet state
  const [sheet, setSheet] = useState<CharacterSheet>({})
  const [newFieldKey, setNewFieldKey] = useState("")
  const [newFieldValue, setNewFieldValue] = useState("")
  const [imageError, setImageError] = useState("")
  const imageInputRef = useRef<HTMLInputElement>(null)

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
        hiddenFromPlayers: selectedNode.data?.hiddenFromPlayers ?? false,
      })
      setSheet(selectedNode.data?.sheet ?? {})
    } else {
      setFormData({ name: "", type: "NPC", status: "Alive", description: "", tags: [], hiddenFromPlayers: false })
      setSheet({})
    }
    setImageError("")
  }, [selectedNode])

  useEffect(() => {
    if (!open && !selectedNode) {
      setFormData({ name: "", type: "NPC", status: "Alive", description: "", tags: [], hiddenFromPlayers: false })
      setNewTag("")
      setSheet({})
      setImageError("")
    }
  }, [open, selectedNode])

  useEffect(() => {
    if (!currentStatusOptions.includes(formData.status)) {
      setFormData((prev) => ({ ...prev, status: currentStatusOptions[0] }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.type])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const dataToSave = isPremium
      ? { ...formData, sheet: Object.keys(sheet).length > 0 ? sheet : undefined }
      : formData

    if (selectedNode) {
      updateNode(selectedNode.id, dataToSave)
    } else {
      const nodeType = formData.type.toLowerCase() as "npc" | "pc" | "faction" | "location" | "abstract"
      addNode({
        id: `node-${Date.now()}`,
        type: nodeType,
        position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
        data: dataToSave,
      })
    }

    onOpenChange(false)
    setSelectedNode(null)
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, newTag.trim()] }))
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tagToRemove) }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageError("")
    try {
      const compressed = await compressImage(file)
      setSheet((prev) => ({ ...prev, imageData: compressed }))
    } catch {
      setImageError("Failed to process image. Please try a different file.")
    }
    e.target.value = ""
  }

  const addCustomField = () => {
    if (!newFieldKey.trim()) return
    setSheet((prev) => ({
      ...prev,
      customFields: [...(prev.customFields ?? []), { key: newFieldKey.trim(), value: newFieldValue.trim() }],
    }))
    setNewFieldKey("")
    setNewFieldValue("")
  }

  const removeCustomField = (idx: number) => {
    setSheet((prev) => ({
      ...prev,
      customFields: prev.customFields?.filter((_, i) => i !== idx),
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{selectedNode ? "Edit Node" : "Create New Node"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
              <TabsTrigger value="sheet" className="flex-1 flex items-center gap-1">
                Character Sheet
                {!isPremium && <Sparkles className="w-3 h-3 text-yellow-500" />}
              </TabsTrigger>
            </TabsList>

            {/* ── Details tab ── */}
            <TabsContent value="details" className="space-y-4">
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
                  <Select value={formData.type} onValueChange={(v) => setFormData((prev) => ({ ...prev, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Select value={formData.status} onValueChange={(v) => setFormData((prev) => ({ ...prev, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {currentStatusOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
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
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} size="sm">Add</Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              {isPremium && (
                <div className="flex items-center gap-2 pt-1">
                  <Switch
                    id="node-hidden"
                    checked={formData.hiddenFromPlayers}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, hiddenFromPlayers: checked }))}
                  />
                  <Label htmlFor="node-hidden" className="flex items-center gap-1.5 cursor-pointer">
                    <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                    Hidden from players
                  </Label>
                </div>
              )}
            </TabsContent>

            {/* ── Character Sheet tab ── */}
            <TabsContent value="sheet">
              {!isPremium ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <Sparkles className="w-10 h-10 text-yellow-500" />
                  <h3 className="font-semibold text-base">Pro Feature</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Character sheets are available with Spider's Web Pro. Purchase a license to attach rich character data and portraits to any node.
                  </p>
                  <a
                    href="https://gavello.gumroad.com/l/utlht"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline underline-offset-2"
                  >
                    Get Pro on Gumroad →
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Portrait */}
                  <div className="space-y-2">
                    <Label>Portrait</Label>
                    <div className="flex items-center gap-4">
                      {sheet.imageData ? (
                        <img
                          src={sheet.imageData}
                          alt="Portrait"
                          className="w-20 h-20 rounded-full object-cover border-2 border-border"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()}>
                          {sheet.imageData ? "Change Image" : "Upload Image"}
                        </Button>
                        {sheet.imageData && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setSheet((prev) => ({ ...prev, imageData: undefined }))}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                    {imageError && <p className="text-sm text-destructive">{imageError}</p>}
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>

                  {/* Core fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Race</Label>
                      <Input value={sheet.race ?? ""} onChange={(e) => setSheet((p) => ({ ...p, race: e.target.value }))} placeholder="e.g. Elf" />
                    </div>
                    <div>
                      <Label>Class</Label>
                      <Input value={sheet.class ?? ""} onChange={(e) => setSheet((p) => ({ ...p, class: e.target.value }))} placeholder="e.g. Wizard" />
                    </div>
                    <div>
                      <Label>Level</Label>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={sheet.level ?? ""}
                        onChange={(e) => setSheet((p) => ({ ...p, level: e.target.value ? Number(e.target.value) : undefined }))}
                        placeholder="e.g. 5"
                      />
                    </div>
                    <div>
                      <Label>Alignment</Label>
                      <Input value={sheet.alignment ?? ""} onChange={(e) => setSheet((p) => ({ ...p, alignment: e.target.value }))} placeholder="e.g. Neutral Good" />
                    </div>
                  </div>

                  <div>
                    <Label>Backstory</Label>
                    <Textarea
                      value={sheet.backstory ?? ""}
                      onChange={(e) => setSheet((p) => ({ ...p, backstory: e.target.value }))}
                      placeholder="Character backstory..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={sheet.notes ?? ""}
                      onChange={(e) => setSheet((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="DM notes, secrets, plot hooks..."
                      rows={2}
                    />
                  </div>

                  {/* Custom fields */}
                  <div className="space-y-2">
                    <Label>Custom Fields</Label>
                    {(sheet.customFields ?? []).map((field, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs font-medium w-24 shrink-0 truncate">{field.key}</span>
                        <span className="text-xs text-muted-foreground flex-1 truncate">{field.value}</span>
                        <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeCustomField(idx)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        className="h-8 text-sm"
                        value={newFieldKey}
                        onChange={(e) => setNewFieldKey(e.target.value)}
                        placeholder="Field name"
                      />
                      <Input
                        className="h-8 text-sm"
                        value={newFieldValue}
                        onChange={(e) => setNewFieldValue(e.target.value)}
                        placeholder="Value"
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomField())}
                      />
                      <Button type="button" variant="outline" size="sm" className="h-8 shrink-0" onClick={addCustomField}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 mt-2 border-t">
            {selectedNode && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${selectedNode.data.name}"? This will also remove all connected relationships. This action cannot be undone.`)) {
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{selectedNode ? "Update" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
