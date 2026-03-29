"use client"

import { create } from "zustand"
import type { Node, Edge, JournalEntry, QuestGoal, NodeGroup } from "@/lib/graph-types"
import type { Campaign } from "@/lib/storage"
import { CampaignStorage } from "@/lib/storage"
import { LicenseStorage } from "@/lib/license"

const SETTINGS_KEY = "spidersweb-settings"

export interface AppSettings {
  sheetViewMode: "modal" | "panel"
}

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return { sheetViewMode: "modal" }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { sheetViewMode: "modal", ...JSON.parse(raw) } : { sheetViewMode: "modal" }
  } catch {
    return { sheetViewMode: "modal" }
  }
}

interface HistoryState {
  nodes: Node[]
  edges: Edge[]
  timestamp: number
}

interface GraphState {
  // Campaign state
  currentCampaign: Campaign | null
  campaigns: Campaign[]

  // Graph state
  nodes: Node[]
  edges: Edge[]
  selectedNode: Node | null
  selectedEdge: Edge | null

  // History state for undo/redo
  history: HistoryState[]
  historyIndex: number
  canUndo: boolean
  canRedo: boolean

  // Search state
  searchTerm: string
  filteredNodes: Node[]

  // Filter state
  activeTagFilters: string[]
  showOnlyPlayerVisible: boolean
  toggleTagFilter: (tag: string) => void
  setShowOnlyPlayerVisible: (v: boolean) => void
  clearFilters: () => void

  // License state
  isPremium: boolean
  licenseKey: string | null
  initLicense: () => void
  revalidateLicense: () => Promise<void>
  validateLicense: (key: string) => Promise<{ valid: boolean; error?: string }>
  clearLicense: () => void

  // Settings state
  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => void

  // Sheet expansion (UI state, not persisted)
  expandedSheetNodes: Set<string>
  toggleSheetExpanded: (nodeId: string) => void

  // Node side panel (UI state, not persisted)
  panelNodeId: string | null
  openNodePanel: (nodeId: string) => void
  closeNodePanel: () => void

  // Multi-select (UI state, not persisted)
  selectedNodeIds: Set<string>
  toggleNodeSelection: (nodeId: string) => void
  clearNodeSelection: () => void

  // Campaign actions
  loadCampaigns: () => void
  setCurrentCampaign: (campaign: Campaign) => void
  createCampaign: (name: string, description?: string) => Campaign
  createCampaignFromTemplate: (name: string, template: Omit<Campaign, "id" | "name" | "createdAt" | "updatedAt">) => Campaign
  saveCampaign: () => void
  deleteCampaign: (id: string) => void

  // Graph actions
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  addNode: (node: Node) => void
  updateNode: (id: string, data: any) => void
  removeNode: (id: string) => void
  addEdge: (edge: Edge) => void
  updateEdge: (id: string, data: any) => void
  removeEdge: (id: string) => void
  setSelectedNode: (node: Node | null) => void
  setSelectedEdge: (edge: Edge | null) => void

  // History actions
  undo: () => void
  redo: () => void
  pushToHistory: () => void
  clearHistory: () => void

  // Search actions
  setSearchTerm: (term: string) => void
  updateFilteredNodes: () => void

  // Relationship history note (Pro)
  addRelationshipHistoryNote: (edgeId: string, entry: import("@/lib/graph-types").RelationshipHistoryEntry) => void
  removeRelationshipHistoryEntry: (edgeId: string, entryId: string) => void

  // Journal actions (Pro)
  addJournalEntry: (entry: JournalEntry) => void
  updateJournalEntry: (id: string, patch: Partial<JournalEntry>) => void
  removeJournalEntry: (id: string) => void

  // Goals actions (Pro)
  addGoal: (goal: QuestGoal) => void
  updateGoal: (id: string, patch: Partial<QuestGoal>) => void
  removeGoal: (id: string) => void

  // Groups actions (Pro)
  addGroup: (group: NodeGroup) => void
  updateGroup: (id: string, patch: Partial<NodeGroup>) => void
  removeGroup: (id: string) => void

  // Tag colors actions (Pro)
  setTagColor: (tag: string, color: string) => void
  removeTagColor: (tag: string) => void
}

export const useGraphStore = create<GraphState>((set, get) => ({
  // Initial state
  currentCampaign: null,
  campaigns: [],
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,
  searchTerm: "",
  filteredNodes: [],
  activeTagFilters: [],
  showOnlyPlayerVisible: false,
  isPremium: false,
  licenseKey: null,
  settings: { sheetViewMode: "modal" },
  expandedSheetNodes: new Set<string>(),
  panelNodeId: null,
  selectedNodeIds: new Set<string>(),

  // Campaign actions
  loadCampaigns: () => {
    const campaigns = CampaignStorage.getAllCampaigns()
    set({ campaigns })
  },

  setCurrentCampaign: (campaign) => {
    set({
      currentCampaign: campaign,
      nodes: campaign.nodes,
      edges: campaign.edges,
      filteredNodes: campaign.nodes,
    })
    get().clearHistory()
    get().pushToHistory()
  },

  createCampaign: (name, description = "") => {
    const campaign = CampaignStorage.createCampaign(name, description)
    const campaigns = CampaignStorage.getAllCampaigns()
    set({ campaigns })
    return campaign
  },

  createCampaignFromTemplate: (name, template) => {
    const campaign: Campaign = {
      id: `campaign-${Date.now()}`,
      name,
      description: template.description,
      createdAt: new Date(),
      updatedAt: new Date(),
      nodes: template.nodes,
      edges: template.edges,
      journal: template.journal ?? [],
      goals: template.goals ?? [],
      groups: template.groups ?? [],
      tagColors: template.tagColors ?? {},
    }
    CampaignStorage.saveCampaign(campaign)
    const campaigns = CampaignStorage.getAllCampaigns()
    set({ campaigns })
    return campaign
  },

  saveCampaign: () => {
    const { currentCampaign, nodes, edges } = get()
    if (currentCampaign) {
      const updatedCampaign = {
        ...currentCampaign,
        nodes,
        edges,
        updatedAt: new Date(),
      }
      CampaignStorage.saveCampaign(updatedCampaign)
      set({ currentCampaign: updatedCampaign })
    }
  },

  deleteCampaign: (id) => {
    CampaignStorage.deleteCampaign(id)
    const campaigns = CampaignStorage.getAllCampaigns()
    const { currentCampaign } = get()

    set({
      campaigns,
      ...(currentCampaign?.id === id && {
        currentCampaign: null,
        nodes: [],
        edges: [],
        filteredNodes: [],
      }),
    })
  },

  // History actions
  pushToHistory: () => {
    const { nodes, edges, history, historyIndex } = get()
    const newState: HistoryState = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      timestamp: Date.now(),
    }

    // Remove any history after current index (when undoing then making new changes)
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newState)

    // Limit history to last 50 states
    if (newHistory.length > 50) {
      newHistory.shift()
    }

    const newIndex = newHistory.length - 1
    set({
      history: newHistory,
      historyIndex: newIndex,
      canUndo: newIndex > 0,
      canRedo: false,
    })
  },

  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      const state = history[newIndex]
      set({
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
        historyIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: true,
      })
      get().updateFilteredNodes()
      get().saveCampaign()
    }
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      const state = history[newIndex]
      set({
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
        historyIndex: newIndex,
        canUndo: true,
        canRedo: newIndex < history.length - 1,
      })
      get().updateFilteredNodes()
      get().saveCampaign()
    }
  },

  clearHistory: () => {
    set({
      history: [],
      historyIndex: -1,
      canUndo: false,
      canRedo: false,
    })
  },

  // Graph actions
  setNodes: (nodes) => {
    set({ nodes, filteredNodes: nodes })
    get().pushToHistory()
    get().saveCampaign()
    get().updateFilteredNodes()
  },

  setEdges: (edges) => {
    set({ edges })
    get().pushToHistory()
    get().saveCampaign()
  },

  addNode: (node) => {
    const { nodes } = get()
    const newNodes = [...nodes, node]
    set({ nodes: newNodes })
    get().pushToHistory()
    get().saveCampaign()
    get().updateFilteredNodes()
  },

  updateNode: (id, data) => {
    const { nodes } = get()
    const newNodes = nodes.map((node) => {
      if (node.id === id) {
        // Handle position updates separately to maintain reactivity
        if (data.position) {
          return { ...node, position: data.position }
        }
        return { ...node, data: { ...node.data, ...data } }
      }
      return node
    })
    set({ nodes: newNodes })

    // Position-only updates (during drag) skip history and deferred save to avoid
    // hammering localStorage on every mouse-move pixel. saveCampaign is called
    // once when drag ends (handleMouseUp in relationship-graph.tsx).
    if (!data.position) {
      get().pushToHistory()
      get().saveCampaign()
      get().updateFilteredNodes()
    }
  },

  removeNode: (id) => {
    const { nodes, edges, panelNodeId } = get()
    const newNodes = nodes.filter((node) => node.id !== id)
    const newEdges = edges.filter((edge) => edge.source !== id && edge.target !== id)
    set({
      nodes: newNodes,
      edges: newEdges,
      ...(panelNodeId === id && { panelNodeId: null }),
    })
    get().pushToHistory()
    get().saveCampaign()
    get().updateFilteredNodes()
  },

  addEdge: (edge) => {
    const { edges } = get()
    const newEdges = [...edges, edge]
    set({ edges: newEdges })
    get().pushToHistory()
    get().saveCampaign()
  },

  updateEdge: (id, data) => {
    const { edges, isPremium } = get()
    const existing = edges.find((e) => e.id === id)

    // Auto-capture meaningful changes into history (Pro only)
    let updatedHistory = existing?.data.history ?? []
    if (isPremium && existing) {
      const trackedFields: Array<keyof typeof existing.data> = [
        "relationshipType", "strength", "direction", "directional", "tags",
      ]
      const changes: { field: string; from: string | number | boolean; to: string | number | boolean }[] = []
      for (const field of trackedFields) {
        const prev = existing.data[field]
        const next = data[field]
        if (next !== undefined) {
          const prevStr = Array.isArray(prev) ? prev.join(", ") : String(prev ?? "")
          const nextStr = Array.isArray(next) ? next.join(", ") : String(next ?? "")
          if (prevStr !== nextStr) {
            changes.push({ field: String(field), from: prevStr, to: nextStr })
          }
        }
      }
      if (changes.length > 0) {
        const historyEntry = {
          id: `hist-${Date.now()}`,
          createdAt: new Date().toISOString(),
          session: {},
          changes,
        }
        updatedHistory = [...updatedHistory, historyEntry]
      }
    }

    const newEdges = edges.map((edge) =>
      edge.id === id
        ? {
            ...edge,
            data: { ...edge.data, ...data, history: updatedHistory },
            label: data.customLabel?.trim()
              ? data.customLabel.trim()
              : `${data.relationshipType} (${data.strength})`,
          }
        : edge,
    )
    set({ edges: newEdges })
    get().pushToHistory()
    get().saveCampaign()
  },

  removeEdge: (id) => {
    const { edges } = get()
    const newEdges = edges.filter((edge) => edge.id !== id)
    set({ edges: newEdges })
    get().pushToHistory()
    get().saveCampaign()
  },

  setSelectedNode: (node) => set({ selectedNode: node }),
  setSelectedEdge: (edge) => set({ selectedEdge: edge }),

  // License actions
  initLicense: () => {
    const record = LicenseStorage.get()
    if (record?.valid) {
      set({ isPremium: true, licenseKey: record.key, settings: loadSettings() })
    } else {
      set({ settings: loadSettings() })
    }
  },

  revalidateLicense: async () => {
    const record = LicenseStorage.get()
    if (!record?.key) return
    try {
      const res = await fetch("/api/validate-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: record.key }),
      })
      const data = await res.json()
      if (!data.valid) {
        LicenseStorage.clear()
        set({ isPremium: false, licenseKey: null })
      }
    } catch {
      // Network error — don't revoke, assume still valid
    }
  },

  validateLicense: async (key) => {
    try {
      const res = await fetch("/api/validate-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: key }),
      })
      const data = await res.json()
      if (data.valid) {
        LicenseStorage.set({ key, valid: true })
        set({ isPremium: true, licenseKey: key })
        return { valid: true }
      }
      return { valid: false, error: data.error ?? "Invalid license key." }
    } catch {
      return { valid: false, error: "Could not reach license server. Check your connection." }
    }
  },

  clearLicense: () => {
    LicenseStorage.clear()
    set({ isPremium: false, licenseKey: null })
  },

  // Settings actions
  updateSettings: (patch) => {
    set((state) => {
      const next = { ...state.settings, ...patch }
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
      return { settings: next }
    })
  },

  // Sheet expansion (in-memory UI state)
  toggleSheetExpanded: (nodeId) => {
    set((state) => {
      const next = new Set(state.expandedSheetNodes)
      if (next.has(nodeId)) { next.delete(nodeId) } else { next.add(nodeId) }
      return { expandedSheetNodes: next }
    })
  },

  // Node side panel (in-memory UI state)
  openNodePanel: (nodeId) => set({ panelNodeId: nodeId }),
  closeNodePanel: () => set({ panelNodeId: null }),

  // Multi-select (in-memory UI state)
  toggleNodeSelection: (nodeId) => {
    set((state) => {
      const next = new Set(state.selectedNodeIds)
      if (next.has(nodeId)) { next.delete(nodeId) } else { next.add(nodeId) }
      return { selectedNodeIds: next }
    })
  },
  clearNodeSelection: () => set({ selectedNodeIds: new Set<string>() }),

  // Search actions
  setSearchTerm: (term) => {
    set({ searchTerm: term })
    get().updateFilteredNodes()
  },

  updateFilteredNodes: () => {
    const { nodes, searchTerm } = get()
    if (!searchTerm.trim()) {
      set({ filteredNodes: nodes })
      return
    }

    const filtered = nodes.filter((node) => {
      const searchLower = searchTerm.toLowerCase()
      return (
        node.data.name.toLowerCase().includes(searchLower) ||
        node.data.description.toLowerCase().includes(searchLower) ||
        node.data.type.toLowerCase().includes(searchLower) ||
        node.data.tags.some((tag) => tag.toLowerCase().includes(searchLower))
      )
    })

    set({ filteredNodes: filtered })
  },

  toggleTagFilter: (tag) => {
    const { activeTagFilters } = get()
    const next = activeTagFilters.includes(tag)
      ? activeTagFilters.filter((t) => t !== tag)
      : [...activeTagFilters, tag]
    set({ activeTagFilters: next })
  },

  setShowOnlyPlayerVisible: (v) => set({ showOnlyPlayerVisible: v }),

  clearFilters: () => set({ activeTagFilters: [], showOnlyPlayerVisible: false }),

  // ── Relationship history ─────────────────────────────────────────────────
  addRelationshipHistoryNote: (edgeId, entry) => {
    const { edges } = get()
    const newEdges = edges.map((edge) =>
      edge.id === edgeId
        ? { ...edge, data: { ...edge.data, history: [...(edge.data.history ?? []), entry] } }
        : edge,
    )
    set({ edges: newEdges })
    get().saveCampaign()
  },

  removeRelationshipHistoryEntry: (edgeId, entryId) => {
    const { edges } = get()
    const newEdges = edges.map((edge) =>
      edge.id === edgeId
        ? { ...edge, data: { ...edge.data, history: (edge.data.history ?? []).filter((h) => h.id !== entryId) } }
        : edge,
    )
    set({ edges: newEdges })
    get().saveCampaign()
  },

  // ── Journal ──────────────────────────────────────────────────────────────
  addJournalEntry: (entry) => {
    const { currentCampaign } = get()
    if (!currentCampaign) return
    const updated = { ...currentCampaign, journal: [...(currentCampaign.journal ?? []), entry] }
    CampaignStorage.saveCampaign(updated)
    set({ currentCampaign: updated })
  },

  updateJournalEntry: (id, patch) => {
    const { currentCampaign } = get()
    if (!currentCampaign) return
    const updated = {
      ...currentCampaign,
      journal: (currentCampaign.journal ?? []).map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }
    CampaignStorage.saveCampaign(updated)
    set({ currentCampaign: updated })
  },

  removeJournalEntry: (id) => {
    const { currentCampaign } = get()
    if (!currentCampaign) return
    const updated = {
      ...currentCampaign,
      journal: (currentCampaign.journal ?? []).filter((e) => e.id !== id),
    }
    CampaignStorage.saveCampaign(updated)
    set({ currentCampaign: updated })
  },

  // ── Goals ────────────────────────────────────────────────────────────────
  addGoal: (goal) => {
    const { currentCampaign } = get()
    if (!currentCampaign) return
    const updated = { ...currentCampaign, goals: [...(currentCampaign.goals ?? []), goal] }
    CampaignStorage.saveCampaign(updated)
    set({ currentCampaign: updated })
  },

  updateGoal: (id, patch) => {
    const { currentCampaign } = get()
    if (!currentCampaign) return
    const updated = {
      ...currentCampaign,
      goals: (currentCampaign.goals ?? []).map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }
    CampaignStorage.saveCampaign(updated)
    set({ currentCampaign: updated })
  },

  removeGoal: (id) => {
    const { currentCampaign } = get()
    if (!currentCampaign) return
    const updated = {
      ...currentCampaign,
      goals: (currentCampaign.goals ?? []).filter((g) => g.id !== id),
    }
    CampaignStorage.saveCampaign(updated)
    set({ currentCampaign: updated })
  },

  // ── Groups ───────────────────────────────────────────────────────────────
  addGroup: (group) => {
    const { currentCampaign } = get()
    if (!currentCampaign) return
    const updated = { ...currentCampaign, groups: [...(currentCampaign.groups ?? []), group] }
    CampaignStorage.saveCampaign(updated)
    set({ currentCampaign: updated })
  },

  updateGroup: (id, patch) => {
    const { currentCampaign } = get()
    if (!currentCampaign) return
    const updated = {
      ...currentCampaign,
      groups: (currentCampaign.groups ?? []).map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }
    CampaignStorage.saveCampaign(updated)
    set({ currentCampaign: updated })
  },

  removeGroup: (id) => {
    const { currentCampaign } = get()
    if (!currentCampaign) return
    const updated = {
      ...currentCampaign,
      groups: (currentCampaign.groups ?? []).filter((g) => g.id !== id),
    }
    CampaignStorage.saveCampaign(updated)
    set({ currentCampaign: updated })
  },

  // ── Tag colors ───────────────────────────────────────────────────────────
  setTagColor: (tag, color) => {
    const { currentCampaign } = get()
    if (!currentCampaign) return
    const updated = {
      ...currentCampaign,
      tagColors: { ...(currentCampaign.tagColors ?? {}), [tag]: color },
    }
    CampaignStorage.saveCampaign(updated)
    set({ currentCampaign: updated })
  },

  removeTagColor: (tag) => {
    const { currentCampaign } = get()
    if (!currentCampaign) return
    const next = { ...(currentCampaign.tagColors ?? {}) }
    delete next[tag]
    const updated = { ...currentCampaign, tagColors: next }
    CampaignStorage.saveCampaign(updated)
    set({ currentCampaign: updated })
  },
}))
