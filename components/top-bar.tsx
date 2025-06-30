"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Plus, Download, Upload, Undo, Redo, Save } from "lucide-react"
import { useGraphStore } from "@/lib/store"
import { CampaignStorage } from "@/lib/storage"
import { useRef } from "react"
import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface TopBarProps {
  onCreateNode: any
  onExpandGraph?: () => void
}

export function TopBar({ onCreateNode, onExpandGraph }: TopBarProps) {
  const fileInputRef = useRef<any>(null)

  const { currentCampaign, saveCampaign, undo, redo, canUndo, canRedo, setCurrentCampaign, loadCampaigns } =
    useGraphStore()

  const handleSave = () => {
    if (currentCampaign) {
      saveCampaign()
      // Show a brief success indication (you could add a toast here)
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

        // Load the imported campaign
        setCurrentCampaign(importedCampaign)
        loadCampaigns() // Refresh the campaigns list

        console.log("Campaign imported successfully")
      } catch (error) {
        console.error("Import failed:", error)
        alert("Failed to import campaign. Please check the file format and try again.")
      }
    }
    reader.readAsText(file)

    // Reset the input
    event.target.value = ""
  }

  const handleUndo = () => {
    if (canUndo) {
      undo()
    }
  }

  const handleRedo = () => {
    if (canRedo) {
      redo()
    }
  }

  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  const handleThemeToggle = () => {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <div className="border-b bg-background p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold">The Spider's Web</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={onCreateNode} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Node
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button variant="ghost" size="sm" onClick={handleUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            <Undo className="w-4 h-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={handleRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">
            <Redo className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button variant="ghost" size="sm" onClick={handleImport} title="Import Campaign">
            <Upload className="w-4 h-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={handleExport} disabled={!currentCampaign} title="Export Campaign">
            <Download className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={!currentCampaign}
            title="Save Campaign (Ctrl+S)"
          >
            <Save className="w-4 h-4" />
          </Button>

          {/* Theme toggle button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleThemeToggle}
                  aria-label="Toggle dark mode"
                  className="ml-2"
                >
                  {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isDark ? "Switch to light mode" : "Switch to dark mode"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Hidden file input for import */}
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: "none" }} />
    </div>
  )
}
