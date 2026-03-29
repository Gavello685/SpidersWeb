"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { BookOpen, Plus, Trash2, ChevronDown, ChevronUp, Pencil, Check, X } from "lucide-react"
import { useGraphStore } from "@/lib/store"
import type { JournalEntry } from "@/lib/graph-types"

interface JournalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const emptyForm = () => ({
  title: "",
  body: "",
  sessionNumber: "",
  inGameDate: "",
  realDate: "",
})

export function JournalModal({ open, onOpenChange }: JournalModalProps) {
  const { currentCampaign, addJournalEntry, updateJournalEntry, removeJournalEntry } = useGraphStore()
  const entries: JournalEntry[] = currentCampaign?.journal ?? []

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())

  const resetForm = () => {
    setForm(emptyForm())
    setAdding(false)
    setEditingId(null)
  }

  const handleAdd = () => {
    if (!form.title.trim()) return
    const entry: JournalEntry = {
      id: `journal-${Date.now()}`,
      createdAt: new Date().toISOString(),
      title: form.title.trim(),
      body: form.body.trim(),
      session: {
        sessionNumber: form.sessionNumber ? Number(form.sessionNumber) : undefined,
        inGameDate: form.inGameDate.trim() || undefined,
        realDate: form.realDate.trim() || undefined,
      },
    }
    addJournalEntry(entry)
    setExpandedId(entry.id)
    resetForm()
  }

  const handleEdit = (entry: JournalEntry) => {
    setEditingId(entry.id)
    setExpandedId(entry.id)
    setAdding(false)
    setForm({
      title: entry.title,
      body: entry.body,
      sessionNumber: entry.session.sessionNumber?.toString() ?? "",
      inGameDate: entry.session.inGameDate ?? "",
      realDate: entry.session.realDate ?? "",
    })
  }

  const handleSaveEdit = () => {
    if (!editingId || !form.title.trim()) return
    updateJournalEntry(editingId, {
      title: form.title.trim(),
      body: form.body.trim(),
      session: {
        sessionNumber: form.sessionNumber ? Number(form.sessionNumber) : undefined,
        inGameDate: form.inGameDate.trim() || undefined,
        realDate: form.realDate.trim() || undefined,
      },
    })
    resetForm()
  }

  const handleDelete = (id: string) => {
    if (confirm("Delete this journal entry? This cannot be undone.")) {
      removeJournalEntry(id)
      if (expandedId === id) setExpandedId(null)
      if (editingId === id) resetForm()
    }
  }

  const sessionLabel = (entry: JournalEntry) => {
    const parts: string[] = []
    if (entry.session.sessionNumber !== undefined) parts.push(`Session ${entry.session.sessionNumber}`)
    if (entry.session.inGameDate) parts.push(entry.session.inGameDate)
    if (entry.session.realDate) parts.push(entry.session.realDate)
    return parts.join(" · ")
  }

  const EntryForm = ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
      <div>
        <Label className="text-xs">Title</Label>
        <Input
          className="h-8 text-sm mt-1"
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          placeholder="Session title or summary..."
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
            placeholder="e.g. 12"
          />
        </div>
        <div>
          <Label className="text-xs">In-game date</Label>
          <Input
            className="h-7 text-xs mt-1"
            value={form.inGameDate}
            onChange={(e) => setForm((p) => ({ ...p, inGameDate: e.target.value }))}
            placeholder="e.g. 3rd Harvest"
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
          value={form.body}
          onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
          placeholder="What happened this session? Key events, decisions, revelations..."
          rows={5}
        />
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
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Session Journal
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {entries.length === 0 && !adding && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No journal entries yet. Add your first session note.
            </p>
          )}

          {entries.map((entry) => (
            <div key={entry.id} className="border rounded-lg overflow-hidden">
              <div
                className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              >
                <button className="shrink-0 text-muted-foreground" type="button">
                  {expandedId === entry.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{entry.title}</span>
                  {sessionLabel(entry) && (
                    <span className="text-xs text-muted-foreground ml-2">{sessionLabel(entry)}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground"
                  onClick={(e) => { e.stopPropagation(); handleEdit(entry) }}
                  title="Edit"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); handleDelete(entry.id) }}
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {expandedId === entry.id && (
                <div className="px-3 pb-3 border-t">
                  {editingId === entry.id ? (
                    <div className="pt-3">
                      <EntryForm onSave={handleSaveEdit} onCancel={resetForm} />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                      {entry.body || <span className="italic">No notes written.</span>}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}

          {adding && (
            <EntryForm onSave={handleAdd} onCancel={resetForm} />
          )}
        </div>

        <div className="flex justify-between items-center pt-3 border-t">
          <p className="text-xs text-muted-foreground">{entries.length} {entries.length === 1 ? "entry" : "entries"}</p>
          {!adding && !editingId && (
            <Button size="sm" onClick={() => { setAdding(true); setEditingId(null) }}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Entry
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
