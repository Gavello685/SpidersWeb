"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Plus, Download, Upload, Undo, Redo, Save, Settings, Sparkles, FileText, BookOpen, Target, Tag } from "lucide-react"
import { useGraphStore } from "@/lib/store"
import { CampaignStorage } from "@/lib/storage"
import { useRef, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { LicenseModal } from "@/components/license-modal"
import { SettingsModal } from "@/components/settings-modal"
import { PdfExportModal } from "@/components/pdf-export-modal"
import { JournalModal } from "@/components/journal-modal"
import { GoalsModal } from "@/components/goals-modal"
import { TagColorsModal } from "@/components/tag-colors-modal"

interface TopBarProps {
  onCreateNode: any
  onExpandGraph?: () => void
}

export function TopBar({ onCreateNode, onExpandGraph }: TopBarProps) {
  const fileInputRef = useRef<any>(null)
  const [licenseOpen, setLicenseOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pdfExportOpen, setPdfExportOpen] = useState(false)
  const [journalOpen, setJournalOpen] = useState(false)
  const [goalsOpen, setGoalsOpen] = useState(false)
  const [tagColorsOpen, setTagColorsOpen] = useState(false)

  const { currentCampaign, saveCampaign, undo, redo, canUndo, canRedo, setCurrentCampaign, loadCampaigns, isPremium, initLicense } =
    useGraphStore()

  useEffect(() => {
    initLicense()
  }, [initLicense])

  const handleSave = () => {
    if (currentCampaign) {
      saveCampaign()
      console.log("Campaign saved successfully")
    }
  }

  const handleExport = () => {
    if (!currentCampaign) return
    try {
      const exportData = CampaignStorage.exportCampaign(currentCampaign)
      const blob = new Blob([exportData], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${currentCampaign.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_campaign.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export failed:", error)
      alert("Failed to export campaign. Please try again.")
    }
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const importedCampaign = CampaignStorage.importCampaign(content)
        setCurrentCampaign(importedCampaign)
        loadCampaigns()
        console.log("Campaign imported successfully")
      } catch (error) {
        console.error("Import failed:", error)
        alert("Failed to import campaign. Please check the file format and try again.")
      }
    }
    reader.readAsText(file)
    event.target.value = ""
  }

  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <div className="border-b bg-background p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">The Spider's Web</h1>
          {isPremium && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" />
              Pro
            </span>
          )}
        </div>

        <TooltipProvider>
        <div className="flex items-center gap-2">
          <Button onClick={onCreateNode} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Node
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button variant="ghost" size="sm" onClick={() => undo()} disabled={!canUndo} title="Undo (Ctrl+Z)">
            <Undo className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => redo()} disabled={!canRedo} title="Redo (Ctrl+Y)">
            <Redo className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button variant="ghost" size="sm" onClick={handleImport} title="Import Campaign">
            <Upload className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExport} disabled={!currentCampaign} title="Export Campaign">
            <Download className="w-4 h-4" />
          </Button>
          {isPremium && (
            <Button variant="ghost" size="sm" onClick={() => setPdfExportOpen(true)} disabled={!currentCampaign} title="Export PDF (Pro)">
              <FileText className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleSave} disabled={!currentCampaign} title="Save Campaign (Ctrl+S)">
            <Save className="w-4 h-4" />
          </Button>

          {isPremium && currentCampaign && (
            <>
              <Separator orientation="vertical" className="h-6" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setJournalOpen(true)} title="Session Journal (Pro)">
                    <BookOpen className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Session Journal</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setGoalsOpen(true)} title="Quest Tracker (Pro)">
                    <Target className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Quest Tracker</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setTagColorsOpen(true)} title="Tag Colors (Pro)">
                    <Tag className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tag Colors</TooltipContent>
              </Tooltip>
            </>
          )}

          <Separator orientation="vertical" className="h-6" />
            {!isPremium && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLicenseOpen(true)}
                    className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300"
                    title="Upgrade to Pro"
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    Pro
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Upgrade to Spider's Web Pro</TooltipContent>
              </Tooltip>
            )}

            {isPremium && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setLicenseOpen(true)} title="Manage license">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Manage Pro license</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} title="Settings">
                  <Settings className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  aria-label="Toggle dark mode"
                >
                  {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isDark ? "Switch to light mode" : "Switch to dark mode"}</TooltipContent>
            </Tooltip>
        </div>
        </TooltipProvider>
      </div>

      <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: "none" }} />

      <LicenseModal open={licenseOpen} onOpenChange={setLicenseOpen} />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <PdfExportModal open={pdfExportOpen} onOpenChange={setPdfExportOpen} />
      <JournalModal open={journalOpen} onOpenChange={setJournalOpen} />
      <GoalsModal open={goalsOpen} onOpenChange={setGoalsOpen} />
      <TagColorsModal open={tagColorsOpen} onOpenChange={setTagColorsOpen} />
    </div>
  )
}
