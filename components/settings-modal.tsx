"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useGraphStore } from "@/lib/store"


interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { settings, updateSettings } = useGraphStore()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="panel-mode" className="font-medium">Side Panel Mode</Label>
              <p className="text-xs text-muted-foreground">
                Click any node to open its details in a side panel. Character sheets require Pro.
              </p>
            </div>
            <Switch
              id="panel-mode"
              checked={settings.sheetViewMode === "panel"}
              onCheckedChange={(checked) =>
                updateSettings({ sheetViewMode: checked ? "panel" : "modal" })
              }
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
