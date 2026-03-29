"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Target, Plus, Trash2, CheckCircle2, Circle, XCircle, Pencil, X, Check } from "lucide-react"
import { useGraphStore } from "@/lib/store"
import type { QuestGoal } from "@/lib/graph-types"

interface GoalsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STATUS_ICONS = {
  open: <Circle className="w-4 h-4 text-blue-500" />,
  resolved: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  failed: <XCircle className="w-4 h-4 text-red-500" />,
}

const STATUS_LABELS = { open: "Open", resolved: "Resolved", failed: "Failed" }

const emptyForm = () => ({
  title: "",
  notes: "",
  sessionNumber: "",
  inGameDate: "",
  realDate: "",
  linkedNodeIds: [] as string[],
})

export function GoalsModal({ open, onOpenChange }: GoalsModalProps) {
  const { currentCampaign, nodes, addGoal, updateGoal, removeGoal } = useGraphStore()
  const goals: QuestGoal[] = currentCampaign?.goals ?? []

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "open" | "resolved" | "failed">("all")
  const [form, setForm] = useState(emptyForm())
  const [nodeSearch, setNodeSearch] = useState("")

  const resetForm = () => {
    setForm(emptyForm())
    setAdding(false)
    setEditingId(null)
    setNodeSearch("")
  }

  const handleAdd = () => {
    if (!form.title.trim()) return
    addGoal({
      id: `goal-${Date.now()}`,
      title: form.title.trim(),
      status: "open",
      notes: form.notes.trim(),
      linkedNodeIds: form.linkedNodeIds,
      session: {
        sessionNumber: form.sessionNumber ? Number(form.sessionNumber) : undefined,
        inGameDate: form.inGameDate.trim() || undefined,
        realDate: form.realDate.trim() || undefined,
      },
    })
    resetForm()
  }

  const handleSaveEdit = () => {
    if (!editingId || !form.title.trim()) return
    updateGoal(editingId, {
      title: form.title.trim(),
      notes: form.notes.trim(),
      linkedNodeIds: form.linkedNodeIds,
      session: {
        sessionNumber: form.sessionNumber ? Number(form.sessionNumber) : undefined,
        inGameDate: form.inGameDate.trim() || undefined,
        realDate: form.realDate.trim() || undefined,
      },
    })
    resetForm()
  }

  const handleEdit = (goal: QuestGoal) => {
    setEditingId(goal.id)
    setAdding(false)
    setForm({
      title: goal.title,
      notes: goal.notes,
      sessionNumber: goal.session.sessionNumber?.toString() ?? "",
      inGameDate: goal.session.inGameDate ?? "",
      realDate: goal.session.realDate ?? "",
      linkedNodeIds: goal.linkedNodeIds,
    })
  }

  const toggleNodeLink = (nodeId: string) => {
    setForm((p) => ({
      ...p,
      linkedNodeIds: p.linkedNodeIds.includes(nodeId)
        ? p.linkedNodeIds.filter((id) => id !== nodeId)
        : [...p.linkedNodeIds, nodeId],
    }))
  }

  const cycleStatus = (goal: QuestGoal) => {
    const next: Record<string, QuestGoal["status"]> = { open: "resolved", resolved: "failed", failed: "open" }
    updateGoal(goal.id, { status: next[goal.status] })
  }

  const filtered = filter === "all" ? goals : goals.filter((g) => g.status === filter)
  const counts = {
    open: goals.filter((g) => g.status === "open").length,
    resolved: goals.filter((g) => g.status === "resolved").length,
    failed: goals.filter((g) => g.status === "failed").length,
  }

  const filteredNodeSuggestions = nodes.filter(
    (n) =>
      !form.linkedNodeIds.includes(n.id) &&
      n.data.name.toLowerCase().includes(nodeSearch.toLowerCase()),
  )

  const GoalForm = ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
      <div>
        <Label className="text-xs">Title</Label>
        <Input
          className="h-8 text-sm mt-1"
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          placeholder="e.g. Find the missing merchant..."
          autoFocus
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs">Session #</Label>
          <Input
            className="h-7 text-xs mt-1"
            type="number"
            min={1}
            value={form.sessionNumber}
            onChange={(e) => setForm((p) => ({ ...p, sessionNumber: e.target.value }))}
            placeholder="e.g. 4"
          />
        </div>
        <div>
          <Label className="text-xs">In-game date</Label>
          <Input
            className="h-7 text-xs mt-1"
            value={form.inGameDate}
            onChange={(e) => setForm((p) => ({ ...p, inGameDate: e.target.value }))}
            placeholder="e.g. 12th Moon"
          />
        </div>
        <div>
          <Label className="text-xs">Real date</Label>
          <Input
            className="h-7 text-xs mt-1"
            type="date"
            value={form.realDate}
            onChange={(e) => setForm((p) => ({ ...p, realDate: e.target.value }))}
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Notes</Label>
        <Textarea
          className="text-sm mt-1"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          placeholder="Additional details, clues, stakes..."
          rows={3}
        />
      </div>
      <div>
        <Label className="text-xs">Linked nodes</Label>
        {form.linkedNodeIds.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 mb-1">
            {form.linkedNodeIds.map((id) => {
              const node = nodes.find((n) => n.id === id)
              return node ? (
                <Badge key={id} variant="secondary" className="text-xs flex items-center gap-1">
                  {node.data.name}
                  <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => toggleNodeLink(id)} />
                </Badge>
              ) : null
            })}
          </div>
        )}
        <Input
          className="h-7 text-xs mt-1"
          value={nodeSearch}
          onChange={(e) => setNodeSearch(e.target.value)}
          placeholder="Search nodes to link..."
        />
        {nodeSearch && filteredNodeSuggestions.length > 0 && (
          <div className="border rounded mt-1 max-h-28 overflow-y-auto">
            {filteredNodeSuggestions.slice(0, 8).map((n) => (
              <button
                key={n.id}
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted flex items-center justify-between"
                onClick={() => { toggleNodeLink(n.id); setNodeSearch("") }}
              >
                <span>{n.data.name}</span>
                <span className="text-muted-foreground">{n.data.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-3.5 h-3.5 mr-1" />Cancel
        </Button>
        <Button type="button" size="sm" onClick={onSave} disabled={!form.title.trim()}>
          <Check className="w-3.5 h-3.5 mr-1" />Save
        </Button>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Quest Tracker
          </DialogTitle>
        </DialogHeader>

        {/* Filter tabs */}
        <div className="flex gap-1 shrink-0">
          {(["all", "open", "resolved", "failed"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f === "all" ? `All (${goals.length})` : `${STATUS_LABELS[f]} (${counts[f]})`}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filtered.length === 0 && !adding && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {filter === "all" ? "No quests yet. Add your first plot hook or goal." : `No ${filter} quests.`}
            </p>
          )}

          {filtered.map((goal) => (
            <div key={goal.id} className="border rounded-lg p-3 space-y-1.5">
              {editingId === goal.id ? (
                <GoalForm onSave={handleSaveEdit} onCancel={resetForm} />
              ) : (
                <>
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => cycleStatus(goal)}
                      className="shrink-0 mt-0.5"
                      title={`Status: ${goal.status} — click to cycle`}
                    >
                      {STATUS_ICONS[goal.status]}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${goal.status === "resolved" ? "line-through text-muted-foreground" : ""}`}>
                        {goal.title}
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-1 text-xs text-muted-foreground">
                        {goal.session.sessionNumber !== undefined && <span>Session {goal.session.sessionNumber}</span>}
                        {goal.session.inGameDate && <span>{goal.session.inGameDate}</span>}
                        {goal.session.realDate && <span>{goal.session.realDate}</span>}
                      </div>
                      {goal.notes && <p className="text-xs text-muted-foreground mt-1">{goal.notes}</p>}
                      {goal.linkedNodeIds.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {goal.linkedNodeIds.map((id) => {
                            const node = nodes.find((n) => n.id === id)
                            return node ? (
                              <Badge key={id} variant="outline" className="text-xs">{node.data.name}</Badge>
                            ) : null
                          })}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground"
                      onClick={() => handleEdit(goal)}
                      title="Edit"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      onClick={() => { if (confirm("Delete this goal?")) removeGoal(goal.id) }}
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {adding && <GoalForm onSave={handleAdd} onCancel={resetForm} />}
        </div>

        <div className="flex justify-between items-center pt-3 border-t shrink-0">
          <p className="text-xs text-muted-foreground">{goals.length} total · {counts.open} open</p>
          {!adding && !editingId && (
            <Button size="sm" onClick={() => { setAdding(true); setEditingId(null) }}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Goal
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
