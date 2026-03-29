"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useGraphStore } from "@/lib/store"
import { Sparkles, CheckCircle, ExternalLink } from "lucide-react"

interface LicenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LicenseModal({ open, onOpenChange }: LicenseModalProps) {
  const { isPremium, licenseKey, validateLicense, clearLicense } = useGraphStore()
  const [inputKey, setInputKey] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const handleActivate = async () => {
    if (!inputKey.trim()) return
    setStatus("loading")
    setErrorMsg("")
    const result = await validateLicense(inputKey.trim())
    if (result.valid) {
      setStatus("idle")
      setInputKey("")
      onOpenChange(false)
    } else {
      setStatus("error")
      setErrorMsg(result.error ?? "Invalid license key.")
    }
  }

  const handleRevoke = () => {
    clearLicense()
    setInputKey("")
    setStatus("idle")
    setErrorMsg("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Spider's Web Pro
          </DialogTitle>
          <DialogDescription>
            Unlock character sheets, node portraits, and more.
          </DialogDescription>
        </DialogHeader>

        {isPremium ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
              <CheckCircle className="w-5 h-5" />
              Pro license active
            </div>
            <p className="text-sm text-muted-foreground font-mono break-all">{licenseKey}</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button variant="destructive" size="sm" onClick={handleRevoke}>Revoke License</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Character sheets on any node</li>
              <li>Portrait images shown in the web</li>
              <li>Expand nodes inline to view sheet data</li>
              <li>Side panel view mode</li>
            </ul>

            <a
              href="https://gavello.gumroad.com/l/utlht"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2"
            >
              Get a license key on Gumroad
              <ExternalLink className="w-3 h-3" />
            </a>

            <div className="space-y-2">
              <Label htmlFor="license-key">License Key</Label>
              <Input
                id="license-key"
                value={inputKey}
                onChange={(e) => { setInputKey(e.target.value); setStatus("idle"); setErrorMsg("") }}
                placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                onKeyDown={(e) => e.key === "Enter" && handleActivate()}
              />
              {status === "error" && (
                <p className="text-sm text-destructive">{errorMsg}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleActivate} disabled={status === "loading" || !inputKey.trim()}>
                {status === "loading" ? "Validating…" : "Activate"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
