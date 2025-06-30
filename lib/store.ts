"use client"

import { create } from "zustand"
import type { Node, Edge } from "@/components/relationship-graph"
import type { Campaign } from "@/lib/storage"
import { CampaignStorage } from "@/lib/storage"

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

  // Campaign actions
  loadCampaigns: () => void
  setCurrentCampaign: (campaign: Campaign) => void
  createCampaign: (name: string, description?: string) => Campaign
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

    // Only push to history for data changes, not position changes (to avoid too many history entries)
    if (!data.position) {
      get().pushToHistory()
    }

    get().saveCampaign()
    get().updateFilteredNodes()
  },

  removeNode: (id) => {
    const { nodes, edges } = get()
    const newNodes = nodes.filter((node) => node.id !== id)
    const newEdges = edges.filter((edge) => edge.source !== id && edge.target !== id)
    set({ nodes: newNodes, edges: newEdges })
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
    const { edges } = get()
    const newEdges = edges.map((edge) =>
      edge.id === id
        ? {
            ...edge,
            data: { ...edge.data, ...data },
            label: `${data.relationshipType} (${data.strength})`,
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
}))
