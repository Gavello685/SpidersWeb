"use client"

import type { Node, Edge } from "@/components/relationship-graph"

export interface Campaign {
  id: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
  nodes: Node[]
  edges: Edge[]
}

const STORAGE_KEY = "npc-relationship-campaigns"

export class CampaignStorage {
  static getAllCampaigns(): Campaign[] {
    try {
      if (typeof window === "undefined") return []

      const data = localStorage.getItem(STORAGE_KEY)
      if (!data) return []

      const campaigns = JSON.parse(data)
      return campaigns.map((campaign: any) => ({
        ...campaign,
        createdAt: new Date(campaign.createdAt),
        updatedAt: new Date(campaign.updatedAt),
        nodes: campaign.nodes || [],
        edges: campaign.edges || [],
      }))
    } catch (error) {
      console.error("Error loading campaigns:", error)
      return []
    }
  }

  static getCampaign(id: string): Campaign | null {
    const campaigns = this.getAllCampaigns()
    return campaigns.find((c) => c.id === id) || null
  }

  static saveCampaign(campaign: Campaign): void {
    try {
      if (typeof window === "undefined") return

      const campaigns = this.getAllCampaigns()
      const existingIndex = campaigns.findIndex((c) => c.id === campaign.id)

      const updatedCampaign = {
        ...campaign,
        updatedAt: new Date(),
      }

      if (existingIndex >= 0) {
        campaigns[existingIndex] = updatedCampaign
      } else {
        campaigns.push(updatedCampaign)
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns))
    } catch (error) {
      console.error("Error saving campaign:", error)
    }
  }

  static deleteCampaign(id: string): void {
    try {
      if (typeof window === "undefined") return

      const campaigns = this.getAllCampaigns()
      const filtered = campaigns.filter((c) => c.id !== id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    } catch (error) {
      console.error("Error deleting campaign:", error)
    }
  }

  static createCampaign(name: string, description = ""): Campaign {
    const campaign: Campaign = {
      id: `campaign-${Date.now()}`,
      name,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
      nodes: [],
      edges: [],
    }

    this.saveCampaign(campaign)
    return campaign
  }

  static exportCampaign(campaign: Campaign): string {
    try {
      // Create a clean export object
      const exportData = {
        name: campaign.name,
        description: campaign.description,
        nodes: campaign.nodes,
        edges: campaign.edges,
        exportedAt: new Date().toISOString(),
        version: "1.0",
      }

      return JSON.stringify(exportData, null, 2)
    } catch (error) {
      console.error("Error exporting campaign:", error)
      throw new Error("Failed to export campaign")
    }
  }

  static importCampaign(jsonData: string): Campaign {
    try {
      const campaignData = JSON.parse(jsonData)

      // Validate required fields
      if (!campaignData.name) {
        throw new Error("Invalid campaign data: missing name field")
      }

      // Create a new campaign with imported data
      const campaign: Campaign = {
        id: `campaign-${Date.now()}`, // Generate new ID to avoid conflicts
        name: campaignData.name,
        description: campaignData.description || "",
        createdAt: new Date(),
        updatedAt: new Date(),
        nodes: campaignData.nodes || [],
        edges: campaignData.edges || [],
      }

      // Validate nodes and edges structure
      if (!Array.isArray(campaign.nodes) || !Array.isArray(campaign.edges)) {
        throw new Error("Invalid campaign data: nodes and edges must be arrays")
      }

      this.saveCampaign(campaign)
      return campaign
    } catch (error) {
      console.error("Error importing campaign:", error)
      if (error instanceof SyntaxError) {
        throw new Error("Failed to import campaign: Invalid JSON format")
      }
      throw new Error("Failed to import campaign: " + (error as Error).message)
    }
  }
}
