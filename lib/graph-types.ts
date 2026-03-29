export type NodeType = "npc" | "pc" | "faction" | "location" | "abstract"

export interface SessionRef {
  sessionNumber?: number
  inGameDate?: string
  realDate?: string
}

export interface JournalEntry {
  id: string
  createdAt: string
  session: SessionRef
  title: string
  body: string
}

export interface QuestGoal {
  id: string
  title: string
  status: "open" | "resolved" | "failed"
  session: SessionRef
  linkedNodeIds: string[]
  notes: string
}

export interface NodeGroup {
  id: string
  name: string
  nodeIds: string[]
  color?: string
}

export interface CharacterSheet {
  imageData?: string // base64 compressed image (~10-30KB after resize)
  race?: string
  class?: string
  level?: number
  alignment?: string
  backstory?: string
  notes?: string
  customFields?: { key: string; value: string }[]
}

export interface NodeData {
  name: string
  type: string
  status: string
  description: string
  tags: string[]
  sheet?: CharacterSheet
  hiddenFromPlayers?: boolean
}

export interface Node {
  id: string
  type: NodeType
  position: { x: number; y: number }
  data: NodeData
}

export interface RelationshipHistoryEntry {
  id: string
  createdAt: string
  session: SessionRef
  note?: string
  changes?: {
    field: string
    from: string | number | boolean
    to: string | number | boolean
  }[]
}

export interface EdgeData {
  relationshipType: string
  strength: number
  notes: string
  tags: string[]
  directional?: boolean
  direction?: "source-to-target" | "target-to-source" | "bidirectional"
  hiddenFromPlayers?: boolean
  history?: RelationshipHistoryEntry[]
}

export interface Edge {
  id: string
  source: string
  target: string
  data: EdgeData
  label: string
}
