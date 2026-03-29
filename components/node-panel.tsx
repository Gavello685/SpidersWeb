"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, Plus, ImageIcon, Sparkles, Trash2, EyeOff } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useGraphStore } from "@/lib/store"
import { compressImage } from "@/lib/image-utils"
import type { CharacterSheet } from "@/lib/graph-types"

interface NodePanelProps {
  nodeId: string
  onClose: () => void
}

export function NodePanel({ nodeId, onClose }: NodePanelProps) {
  const { nodes, updateNode, isPremium } = useGraphStore()
  const node = nodes.find((n) => n.id === nodeId)

  const [formData, setFormData] = useState({
    name: "",
    type: "NPC",
    status: "Alive",
    description: "",
    tags: [] as string[],
    hiddenFromPlayers: false,
  })
  const [newTag, setNewTag] = useState("")
  const [sheet, setSheet] = useState<CharacterSheet>({})
  const [newFieldKey, setNewFieldKey] = useState("")
  const [newFieldValue, setNewFieldValue] = useState("")
  const [imageError, setImageError] = useState("")
  const [saved, setSaved] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const statusOptions: Record<string, string[]> = {
    NPC: ["Alive", "Dead", "Unknown", "Missing"],
    PC: ["Alive", "Dead", "Unknown", "Missing"],
    Faction: ["Active", "Inactive"],
    Location: ["Known", "Unknown", "Lost"],
    Abstract: ["Active", "Inactive", "Dormant"],
  }
  const currentStatusOptions = statusOptions[formData.type] || ["Alive", "Dead", "Unknown", "Missing"]

  useEffect(() => {
    if (!node) return
    setFormData({
      name: node.data.name,
      type: node.data.type,
      status: node.data.status,
      description: node.data.description,
      tags: node.data.tags ?? [],
      hiddenFromPlayers: node.data.hiddenFromPlayers ?? false,
    })
    setSheet(node.data.sheet ?? {})
    setImageError("")
    setSaved(false)
    setNewTag("")
    setNewFieldKey("")
    setNewFieldValue("")
  }, [nodeId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!currentStatusOptions.includes(formData.status)) {
      setFormData((prev) => ({ ...prev, status: currentStatusOptions[0] }))
    }
  }, [formData.type]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!node) return null

  const handleSave = () => {
    const dataToSave = isPremium
      ? { ...formData, sheet: Object.keys(sheet).length > 0 ? sheet : undefined }
      : formData
    updateNode(nodeId, dataToSave)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const handleDelete = () => {
    if (
      confirm(
        `Are you sure you want to delete "${node.data.name}"? This will also remove all connected relationships. This action cannot be undone.`,
      )
    ) {
      useGraphStore.getState().removeNode(nodeId)
      onClose()
    }
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, newTag.trim()] }))
      setNewTag("")
    }
  }

  const removeTag = (tag: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))
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
    setSheet((prev) => ({ ...prev, customFields: prev.customFields?.filter((_, i) => i !== idx) }))
  }

  return (
    <div className="w-80 flex flex-col border-l bg-background overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{node.data.type}</p>
          <p className="font-semibold text-sm truncate">{node.data.name}</p>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0 ml-2" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Tabs defaultValue="details" className="flex flex-col flex-1 overflow-hidden">
        <TabsList className="mx-4 mt-3 shrink-0">
          <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
          <TabsTrigger value="sheet" className="flex-1 flex items-center gap-1">
            Sheet
            {!isPremium && <Sparkles className="w-3 h-3 text-yellow-500" />}
          </TabsTrigger>
        </TabsList>

        {/* ── Details tab ── */}
        <TabsContent value="details" className="flex-1 overflow-y-auto px-4 pb-2 space-y-3 mt-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              className="h-8 text-sm mt-1"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="Enter name..."
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData((p) => ({ ...p, type: v }))}>
                <SelectTrigger className="h-8 text-xs mt-1">
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
              <Label className="text-xs">Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData((p) => ({ ...p, status: v }))}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentStatusOptions.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              className="text-sm mt-1"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="Enter description..."
              rows={3}
            />
          </div>

          <div>
            <Label className="text-xs">Tags</Label>
            <div className="flex gap-1.5 mt-1">
              <Input
                className="h-7 text-xs"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag..."
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button type="button" size="sm" className="h-7 shrink-0" onClick={addTag}>
                Add
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="flex items-center gap-1 text-xs">
                    {tag}
                    <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => removeTag(tag)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>
          {isPremium && (
            <div className="flex items-center gap-2 pt-1">
              <Switch
                id="panel-node-hidden"
                checked={formData.hiddenFromPlayers}
                onCheckedChange={(checked) => setFormData((p) => ({ ...p, hiddenFromPlayers: checked }))}
              />
              <Label htmlFor="panel-node-hidden" className="flex items-center gap-1.5 text-xs cursor-pointer">
                <EyeOff className="w-3 h-3 text-muted-foreground" />
                Hidden from players
              </Label>
            </div>
          )}
        </TabsContent>

        {/* ── Character Sheet tab ── */}
        <TabsContent value="sheet" className="flex-1 overflow-y-auto px-4 pb-2 mt-3">
          {!isPremium ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Sparkles className="w-10 h-10 text-yellow-500" />
              <h3 className="font-semibold text-base">Pro Feature</h3>
              <p className="text-sm text-muted-foreground">
                Character sheets are available with Spider&apos;s Web Pro. Attach rich character data and portraits to any node.
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
                <Label className="text-xs">Portrait</Label>
                <div className="flex items-center gap-3">
                  {sheet.imageData ? (
                    <img
                      src={sheet.imageData}
                      alt="Portrait"
                      className="w-14 h-14 rounded-full object-cover border-2 border-border shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border shrink-0">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      {sheet.imageData ? "Change" : "Upload"}
                    </Button>
                    {sheet.imageData && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => setSheet((p) => ({ ...p, imageData: undefined }))}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
                {imageError && <p className="text-xs text-destructive">{imageError}</p>}
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Race</Label>
                  <Input
                    className="h-8 text-sm mt-1"
                    value={sheet.race ?? ""}
                    onChange={(e) => setSheet((p) => ({ ...p, race: e.target.value }))}
                    placeholder="e.g. Elf"
                  />
                </div>
                <div>
                  <Label className="text-xs">Class</Label>
                  <Input
                    className="h-8 text-sm mt-1"
                    value={sheet.class ?? ""}
                    onChange={(e) => setSheet((p) => ({ ...p, class: e.target.value }))}
                    placeholder="e.g. Wizard"
                  />
                </div>
                <div>
                  <Label className="text-xs">Level</Label>
                  <Input
                    className="h-8 text-sm mt-1"
                    type="number"
                    min={1}
                    max={30}
                    value={sheet.level ?? ""}
                    onChange={(e) =>
                      setSheet((p) => ({ ...p, level: e.target.value ? Number(e.target.value) : undefined }))
                    }
                    placeholder="e.g. 5"
                  />
                </div>
                <div>
                  <Label className="text-xs">Alignment</Label>
                  <Input
                    className="h-8 text-sm mt-1"
                    value={sheet.alignment ?? ""}
                    onChange={(e) => setSheet((p) => ({ ...p, alignment: e.target.value }))}
                    placeholder="e.g. Neutral Good"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Backstory</Label>
                <Textarea
                  className="text-sm mt-1"
                  value={sheet.backstory ?? ""}
                  onChange={(e) => setSheet((p) => ({ ...p, backstory: e.target.value }))}
                  placeholder="Character backstory..."
                  rows={4}
                />
              </div>

              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea
                  className="text-sm mt-1"
                  value={sheet.notes ?? ""}
                  onChange={(e) => setSheet((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="DM notes, secrets, plot hooks..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Custom Fields</Label>
                {(sheet.customFields ?? []).map((field, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-medium w-20 shrink-0 truncate">{field.key}</span>
                    <span className="text-xs text-muted-foreground flex-1 truncate">{field.value}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 shrink-0"
                      onClick={() => removeCustomField(idx)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-1.5">
                  <Input
                    className="h-7 text-xs"
                    value={newFieldKey}
                    onChange={(e) => setNewFieldKey(e.target.value)}
                    placeholder="Field name"
                  />
                  <Input
                    className="h-7 text-xs"
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    placeholder="Value"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomField())}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 shrink-0"
                    onClick={addCustomField}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="flex gap-2 px-4 py-3 border-t">
        <Button
          variant="destructive"
          size="sm"
          className="flex items-center gap-1"
          onClick={handleDelete}
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </Button>
        <Button className="flex-1" size="sm" onClick={handleSave}>
          {saved ? "Saved!" : "Save"}
        </Button>
      </div>
    </div>
  )
}
