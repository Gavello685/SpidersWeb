"use client"

import { useState, useEffect } from "react"
import { RelationshipGraph } from "@/components/relationship-graph"
import { Sidebar } from "@/components/sidebar"
import { TopBar } from "@/components/top-bar"
import { NodeModal } from "@/components/node-modal"
import { RelationshipModal } from "@/components/relationship-modal"
import { CampaignSelector } from "@/components/campaign-selector"
import { useGraphStore } from "@/lib/store"
import type { Campaign } from "@/lib/storage"

export default function Home() {
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false)
  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false)
  const [showCampaignSelector, setShowCampaignSelector] = useState(true)

  const { selectedNode, selectedEdge, setCurrentCampaign, saveCampaign, undo, redo } = useGraphStore()

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S to save
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault()
        saveCampaign()
      }

      // Ctrl+Z to undo
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        undo()
      }

      // Ctrl+Y or Ctrl+Shift+Z to redo
      if ((e.ctrlKey && e.key === "y") || (e.ctrlKey && e.shiftKey && e.key === "z")) {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [saveCampaign, undo, redo])

  const handleCampaignSelect = (campaign: Campaign) => {
    setCurrentCampaign(campaign)
    setShowCampaignSelector(false)
  }

  const handleBackToCampaigns = () => {
    setShowCampaignSelector(true)
  }

  if (showCampaignSelector) {
    return <CampaignSelector onCampaignSelect={handleCampaignSelect} />
  }

  const handleExpandGraph = () => {
    // TODO: Implement graph explosion logic
    alert('Expand Graph clicked! (stub)')
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopBar onCreateNode={() => setIsNodeModalOpen(true)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar onBackToCampaigns={handleBackToCampaigns} />
        <div className="flex-1 relative overflow-hidden">
          <RelationshipGraph onExpandGraph={handleExpandGraph} />
        </div>
      </div>

      <NodeModal
        open={isNodeModalOpen || !!selectedNode}
        onOpenChange={(open) => {
          setIsNodeModalOpen(open)
          if (!open && selectedNode) {
            useGraphStore.getState().setSelectedNode(null)
          }
        }}
      />

      <RelationshipModal
        open={isRelationshipModalOpen || !!selectedEdge}
        onOpenChange={(open) => {
          setIsRelationshipModalOpen(open)
          if (!open && selectedEdge) {
            useGraphStore.getState().setSelectedEdge(null)
          }
        }}
      />
    </div>
  )
}
