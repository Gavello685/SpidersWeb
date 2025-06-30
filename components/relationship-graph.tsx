"use client"

import type React from "react"

import { useRef, useEffect, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Users, MapPin, Sparkles, Plus, Minus, RefreshCw, Expand } from "lucide-react"
import { useGraphStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { createPortal } from "react-dom"
import { useTheme } from "next-themes"

// Custom types to replace ReactFlow types
export type NodeType = "npc" | "pc" | "faction" | "location" | "abstract"

export interface NodeData {
  name: string
  type: string
  status: string
  description: string
  tags: string[]
}

export interface Node {
  id: string
  type: NodeType
  position: { x: number; y: number }
  data: NodeData
}

export interface EdgeData {
  relationshipType: string
  strength: number
  notes: string
  tags: string[]
  directional?: boolean
  direction?: "source-to-target" | "target-to-source" | "bidirectional"
  hiddenFromPlayers?: boolean
}

export interface Edge {
  id: string
  source: string
  target: string
  data: EdgeData
  label: string
}

const getNodeColor = (type: string) => {
  switch (type) {
    case "PC":
      return "bg-blue-500 text-white"
    case "Faction":
      return "bg-red-500 text-white"
    case "Location":
      return "bg-green-500 text-white"
    case "Abstract":
      return "bg-purple-500 text-white"
    default:
      return "bg-gray-500 text-white"
  }
}

const getNodeIcon = (type: string) => {
  switch (type) {
    case "PC":
      return <User className="w-4 h-4" />
    case "Faction":
      return <Users className="w-4 h-4" />
    case "Location":
      return <MapPin className="w-4 h-4" />
    case "Abstract":
      return <Sparkles className="w-4 h-4" />
    default:
      return <User className="w-4 h-4" />
  }
}

const getEdgeColor = (type: string) => {
  switch (type) {
    case "Ally":
      return "stroke-green-500"
    case "Enemy":
      return "stroke-red-500"
    case "Romantic":
      return "stroke-pink-500"
    case "Secret":
      return "stroke-purple-500"
    default:
      return "stroke-gray-500"
  }
}

export function RelationshipGraph({ onExpandGraph }: { onExpandGraph?: () => void }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragNode, setDragNode] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [isAltPressed, setIsAltPressed] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)

  // Relationship creation state
  const [isCreatingEdge, setIsCreatingEdge] = useState(false)
  const [edgeStart, setEdgeStart] = useState<{ nodeId: string; x: number; y: number } | null>(null)
  const [edgePreview, setEdgePreview] = useState<{ x: number; y: number } | null>(null)

  const {
    nodes,
    edges,
    setSelectedNode,
    setSelectedEdge,
    addNode,
    updateNode,
    removeEdge,
    selectedEdge,
    selectedNode,
  } = useGraphStore()

  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Get hovered node position for effect dependency
  const hoveredNodeObj = hoveredNode ? nodes.find((n) => n.id === hoveredNode) : null;
  const hoveredNodeX = hoveredNodeObj?.position.x;
  const hoveredNodeY = hoveredNodeObj?.position.y;

  // Ref for the hovered node's SVG element
  const hoveredNodeSvgRef = useRef<SVGCircleElement | null>(null);

  // Ref for the hovered node's SVG rect (node card)
  const hoveredNodeRectRef = useRef<SVGRectElement | null>(null);

  // Node card dimensions for pointer alignment
  const NODE_CARD_WIDTH = 260;
  const NODE_CARD_HEIGHT = 100; // base height, may be larger with tags

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift" && !isShiftPressed) {
        setIsShiftPressed(true)
      }
      if (e.key === "Alt" && !isAltPressed) {
        e.preventDefault()
        setIsAltPressed(true)
      }
      // Handle Delete key for selected edge
      if (e.key === "Delete" && selectedEdge) {
        e.preventDefault()
        if (confirm("Are you sure you want to delete this relationship? This action cannot be undone.")) {
          removeEdge(selectedEdge.id)
          setSelectedEdge(null)
        }
      }
      // Handle Delete key for selected node
      if (e.key === "Delete" && selectedNode) {
        e.preventDefault()
        if (
          confirm(
            `Are you sure you want to delete "${selectedNode.data.name}"? This will also remove all connected relationships. This action cannot be undone.`,
          )
        ) {
          useGraphStore.getState().removeNode(selectedNode.id)
          setSelectedNode(null)
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftPressed(false)
        setIsPanning(false)
      }
      if (e.key === "Alt") {
        e.preventDefault()
        setIsAltPressed(false)
        // Cancel edge creation if Alt is released
        if (isCreatingEdge) {
          setIsCreatingEdge(false)
          setEdgeStart(null)
          setEdgePreview(null)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [isShiftPressed, isAltPressed, isCreatingEdge, selectedEdge, removeEdge, setSelectedEdge])

  // Handle mouse wheel zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!svgRef.current) return

      e.preventDefault()

      const svgRect = svgRef.current.getBoundingClientRect()
      const mouseX = e.clientX - svgRect.left
      const mouseY = e.clientY - svgRect.top

      // Calculate zoom factor (finer control)
      const zoomFactor = e.deltaY > 0 ? 0.96 : 1.04
      const newScale = Math.max(0.1, Math.min(5, scale * zoomFactor))

      // Calculate the point in graph coordinates before zoom
      const graphX = (mouseX - pan.x) / scale
      const graphY = (mouseY - pan.y) / scale

      // Calculate new pan to keep the mouse point stationary
      const newPanX = mouseX - graphX * newScale
      const newPanY = mouseY - graphY * newScale

      setScale(newScale)
      setPan({ x: newPanX, y: newPanY })
    }

    const svgElement = svgRef.current
    if (svgElement) {
      svgElement.addEventListener("wheel", handleWheel, { passive: false })
      return () => svgElement.removeEventListener("wheel", handleWheel)
    }
  }, [scale, pan])

  const handleNodeClick = useCallback(
    (node: Node) => {
      // Remove selection logic - nodes are only edited on double-click
    },
    [setSelectedNode, selectedNode],
  )

  const handleNodeDoubleClick = useCallback(
    (node: Node) => {
      setSelectedNode(node)
    },
    [setSelectedNode],
  )

  const handleEdgeClick = useCallback(
    (edge: Edge) => {
      setSelectedEdge(edge)
    },
    [setSelectedEdge],
  )

  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === svgRef.current || (e.target as Element).tagName === "g") {
        const svgRect = svgRef.current?.getBoundingClientRect()
        if (!svgRect) return

        // Calculate position in graph coordinates using actual SVG dimensions
        const x = (e.clientX - svgRect.left - pan.x) / scale
        const y = (e.clientY - svgRect.top - pan.y) / scale

        // Create new node at clicked position
        const nodeType = "npc" as const
        const newNode = {
          id: `node-${Date.now()}`,
          type: nodeType,
          position: { x: x - 100, y: y - 50 }, // Offset to center the node
          data: {
            name: "New Node",
            type: "NPC",
            status: "Alive",
            description: "",
            tags: [],
          },
        }

        addNode(newNode)
        setSelectedNode(newNode)
      }
    },
    [pan, scale, setSelectedNode, addNode],
  )

  const startNodeInteraction = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation()

      const node = nodes.find((n) => n.id === nodeId)
      if (!node) return

      const svgRect = svgRef.current?.getBoundingClientRect()
      if (!svgRect) return

      const mouseX = e.clientX - svgRect.left
      const mouseY = e.clientY - svgRect.top
      const graphX = (mouseX - pan.x) / scale
      const graphY = (mouseY - pan.y) / scale

      if (isAltPressed) {
        // Start relationship creation
        setIsCreatingEdge(true)
        setEdgeStart({ nodeId, x: node.position.x, y: node.position.y })
        setEdgePreview({ x: graphX, y: graphY })
      } else if (!isShiftPressed) {
        // Start node dragging - calculate offset from mouse to node center
        const offsetX = graphX - node.position.x
        const offsetY = graphY - node.position.y
        setDragOffset({ x: offsetX, y: offsetY })
        setIsDragging(true)
        setDragNode(nodeId)
      }
    },
    [nodes, scale, pan, isAltPressed, isShiftPressed],
  )

  const startPan = useCallback(
    (e: React.MouseEvent) => {
      if (isShiftPressed && !isCreatingEdge && !isDragging) {
        setIsPanning(true)
        setLastPanPoint({ x: e.clientX, y: e.clientY })
      }
    },
    [isShiftPressed, isCreatingEdge, isDragging],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const svgRect = svgRef.current?.getBoundingClientRect()
      if (!svgRect) return

      const mouseX = e.clientX - svgRect.left
      const mouseY = e.clientY - svgRect.top
      const graphX = (mouseX - pan.x) / scale
      const graphY = (mouseY - pan.y) / scale

      if (isPanning && isShiftPressed) {
        const deltaX = e.clientX - lastPanPoint.x
        const deltaY = e.clientY - lastPanPoint.y

        setPan((prev) => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }))

        setLastPanPoint({ x: e.clientX, y: e.clientY })
      } else if (isCreatingEdge && edgeStart && isAltPressed) {
        setEdgePreview({ x: graphX, y: graphY })
      } else if (isDragging && dragNode && !isShiftPressed && !isAltPressed) {
        // Apply the drag offset to keep the node positioned correctly relative to the cursor
        updateNode(dragNode, { position: { x: graphX - dragOffset.x, y: graphY - dragOffset.y } })
      }
    },
    [
      isPanning,
      isShiftPressed,
      lastPanPoint,
      isCreatingEdge,
      edgeStart,
      isAltPressed,
      pan,
      scale,
      isDragging,
      dragNode,
      dragOffset,
      updateNode,
    ],
  )

  const handleNodeMouseUp = useCallback(
    (e: React.MouseEvent, targetNodeId: string) => {
      e.stopPropagation()

      if (isCreatingEdge && edgeStart && edgeStart.nodeId !== targetNodeId && isAltPressed) {
        // Create new relationship
        const newEdge = {
          id: `edge-${Date.now()}`,
          source: edgeStart.nodeId,
          target: targetNodeId,
          data: {
            relationshipType: "Neutral",
            strength: 50,
            notes: "",
            tags: [],
            directional: false,
            direction: "source-to-target" as const,
            hiddenFromPlayers: false,
          },
          label: "Neutral (50)",
        }

        useGraphStore.getState().addEdge(newEdge)
      }

      // Reset all interaction states
      setIsCreatingEdge(false)
      setEdgeStart(null)
      setEdgePreview(null)
      setIsDragging(false)
      setDragNode(null)
      setDragOffset({ x: 0, y: 0 })
    },
    [isCreatingEdge, edgeStart, isAltPressed],
  )

  const handleMouseUp = useCallback(() => {
    setIsCreatingEdge(false)
    setEdgeStart(null)
    setEdgePreview(null)
    setIsDragging(false)
    setDragNode(null)
    setDragOffset({ x: 0, y: 0 })
    setIsPanning(false)
  }, [])

  const zoomIn = () => {
    setScale((prev) => Math.min(prev * 1.2, 5))
  }

  const zoomOut = () => {
    setScale((prev) => Math.max(prev / 1.04, 0.1))
  }

  const resetView = () => {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }

  // Group edges by node pairs to handle multiple relationships
  const getEdgeGroups = () => {
    const groups: { [key: string]: Edge[] } = {}

    edges.forEach((edge) => {
      // Create a consistent key for node pairs (regardless of direction)
      const key = [edge.source, edge.target].sort().join("-")
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(edge)
    })

    return groups
  }

  // Calculate edge paths with proper spacing for multiple relationships
  const getEdgePath = (sourceNode: Node, targetNode: Node, edgeIndex: number, totalEdges: number) => {
    const sourceX = sourceNode.position.x
    const sourceY = sourceNode.position.y
    const targetX = targetNode.position.x
    const targetY = targetNode.position.y

    // Calculate the base curve
    const baseMidX = (sourceX + targetX) / 2
    const baseMidY = (sourceY + targetY) / 2 - Math.min(50, Math.abs(targetX - sourceX) / 4)

    // If there's only one edge, use the standard path
    if (totalEdges === 1) {
      return `M ${sourceX} ${sourceY} Q ${baseMidX} ${baseMidY} ${targetX} ${targetY}`
    }

    // Calculate offset for multiple edges
    const spacing = 40 // Increased spacing for better visibility
    const totalWidth = (totalEdges - 1) * spacing
    const startOffset = -totalWidth / 2
    const currentOffset = startOffset + edgeIndex * spacing

    // Calculate perpendicular vector for offset
    const dx = targetX - sourceX
    const dy = targetY - sourceY
    const length = Math.sqrt(dx * dx + dy * dy)
    const perpX = -dy / length
    const perpY = dx / length

    // Apply offset to the curve control point
    const offsetMidX = baseMidX + perpX * currentOffset
    const offsetMidY = baseMidY + perpY * currentOffset

    return `M ${sourceX} ${sourceY} Q ${offsetMidX} ${offsetMidY} ${targetX} ${targetY}`
  }

  const getPreviewEdgePath = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    const midX = (start.x + end.x) / 2
    const midY = (start.y + end.y) / 2 - Math.min(30, Math.abs(end.x - start.x) / 4)
    return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`
  }

  // Calculate points along a quadratic bezier curve for arrow placement
  const getPointsAlongCurve = (
    sourceX: number,
    sourceY: number,
    controlX: number,
    controlY: number,
    targetX: number,
    targetY: number,
    numPoints: number,
  ) => {
    const points = []
    for (let i = 1; i <= numPoints; i++) {
      const t = i / (numPoints + 1) // Distribute points evenly, excluding start and end
      const x = (1 - t) * (1 - t) * sourceX + 2 * (1 - t) * t * controlX + t * t * targetX
      const y = (1 - t) * (1 - t) * sourceY + 2 * (1 - t) * t * controlY + t * t * targetY

      // Calculate tangent for arrow rotation
      const dt = 0.01
      const t1 = Math.max(0, t - dt)
      const t2 = Math.min(1, t + dt)

      const x1 = (1 - t1) * (1 - t1) * sourceX + 2 * (1 - t1) * t1 * controlX + t1 * t1 * targetX
      const y1 = (1 - t1) * (1 - t1) * sourceY + 2 * (1 - t1) * t1 * controlY + t1 * t1 * targetY
      const x2 = (1 - t2) * (1 - t2) * sourceX + 2 * (1 - t2) * t2 * controlX + t2 * t2 * targetX
      const y2 = (1 - t2) * (1 - t2) * sourceY + 2 * (1 - t2) * t2 * controlY + t2 * t2 * targetY

      const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI

      points.push({ x, y, angle })
    }
    return points
  }

  const renderDirectionalArrows = (
    edge: Edge,
    sourceNode: Node,
    targetNode: Node,
    edgeIndex: number,
    totalEdges: number,
  ) => {
    if (!edge.data.directional) return null

    const sourceX = sourceNode.position.x
    const sourceY = sourceNode.position.y
    const targetX = targetNode.position.x
    const targetY = targetNode.position.y

    // Calculate control point (same logic as getEdgePath)
    let baseMidX = (sourceX + targetX) / 2
    let baseMidY = (sourceY + targetY) / 2 - Math.min(50, Math.abs(targetX - sourceX) / 4)

    if (totalEdges > 1) {
      const spacing = 40 // Match the spacing from getEdgePath
      const totalWidth = (totalEdges - 1) * spacing
      const startOffset = -totalWidth / 2
      const currentOffset = startOffset + edgeIndex * spacing

      const dx = targetX - sourceX
      const dy = targetY - sourceY
      const length = Math.sqrt(dx * dx + dy * dy)
      const perpX = -dy / length
      const perpY = dx / length

      baseMidX = baseMidX + perpX * currentOffset
      baseMidY = baseMidY + perpY * currentOffset
    }

    // Calculate the distance to determine number of arrows
    const distance = Math.sqrt((targetX - sourceX) ** 2 + (targetY - sourceY) ** 2)
    const numArrows = Math.max(2, Math.min(6, Math.floor(distance / 80))) // 2-6 arrows based on distance

    const arrows: JSX.Element[] = []

    if (edge.data.direction === "source-to-target" || edge.data.direction === "bidirectional") {
      const points = getPointsAlongCurve(sourceX, sourceY, baseMidX, baseMidY, targetX, targetY, numArrows)
      points.forEach((point, index) => {
        arrows.push(
          <g key={`arrow-forward-${index}`} transform={`translate(${point.x}, ${point.y}) rotate(${point.angle})`}>
            <polygon
              points="-6,-3 6,0 -6,3"
              className={cn("transition-all", getEdgeColor(edge.data.relationshipType).replace("stroke-", "fill-"))}
            />
          </g>,
        )
      })
    }

    if (edge.data.direction === "target-to-source" || edge.data.direction === "bidirectional") {
      const points = getPointsAlongCurve(targetX, targetY, baseMidX, baseMidY, sourceX, sourceY, numArrows)
      points.forEach((point, index) => {
        arrows.push(
          <g key={`arrow-backward-${index}`} transform={`translate(${point.x}, ${point.y}) rotate(${point.angle})`}>
            <polygon
              points="-6,-3 6,0 -6,3"
              className={cn("transition-all", getEdgeColor(edge.data.relationshipType).replace("stroke-", "fill-"))}
            />
          </g>,
        )
      })
    }

    return arrows
  }

  const getCursorStyle = () => {
    if (isAltPressed) return "crosshair"
    if (isShiftPressed) return "grab"
    if (isPanning) return "grabbing"
    if (isDragging) return "grabbing"
    return "default"
  }

  const edgeGroups = getEdgeGroups()

  // Expand graph handler
  const handleExpandGraph = () => {
    const components = getConnectedComponents(nodes, edges)
    // Layout parameters
    const spacing = 400 // space between component centers
    let layoutCenters: { x: number; y: number }[] = []
    // Arrange component centers in a grid
    const cols = Math.ceil(Math.sqrt(components.length))
    const rows = Math.ceil(components.length / cols)
    for (let i = 0; i < components.length; i++) {
      const row = Math.floor(i / cols)
      const col = i % cols
      layoutCenters.push({ x: col * spacing, y: row * spacing })
    }
    // Calculate new positions
    let newPositions: Record<string, { x: number; y: number }> = {}
    components.forEach((component, i) => {
      // Find all edges within this component
      const nodeSet = new Set(component)
      const componentEdges = edges.filter(e => nodeSet.has(e.source) && nodeSet.has(e.target))
      // Build label width map for this component
      const labelWidths: Record<string, number> = {}
      const edgeCounts: Record<string, number> = {}
      for (const edge of componentEdges) {
        const key = [edge.source, edge.target].sort().join('-')
        labelWidths[key] = estimateLabelWidth(edge.label)
        edgeCounts[key] = (edgeCounts[key] || 0) + 1
      }
      // Run force-directed layout
      const positions = forceDirectedLayout(component, componentEdges, labelWidths, edgeCounts, 120)
      // Offset to layout center
      const center = layoutCenters[i]
      // Calculate component centroid
      const xs = Object.values(positions).map(p => p.x)
      const ys = Object.values(positions).map(p => p.y)
      const centroid = { x: xs.reduce((a, b) => a + b, 0) / xs.length, y: ys.reduce((a, b) => a + b, 0) / ys.length }
      Object.entries(positions).forEach(([id, pos]) => {
        newPositions[id] = {
          x: pos.x - centroid.x + center.x + 400,
          y: pos.y - centroid.y + center.y + 350,
        }
      })
    })
    // Update node positions in the store
    nodes.forEach((node) => {
      if (newPositions[node.id]) {
        updateNode(node.id, { position: newPositions[node.id] })
      }
    })
  }

  useEffect(() => {
    if (!onExpandGraph) return
    // Patch the handler to log connected components for now
    (RelationshipGraph as any).expandGraph = () => {
      const components = getConnectedComponents(nodes, edges)
      // eslint-disable-next-line no-console
      console.log('Connected components:', components)
    }
  }, [nodes, edges, onExpandGraph])

  // Helper to estimate card size based on node content
  function estimateNodeSize(id: string) {
    // Estimate width: name + status + up to 3 tags + padding
    // Estimate height: 1 line for name, 1 for status, lines for description, lines for tags
    // Use nodeIds as keys, fallback to defaults if not found
    const node = (window as any)?.__allNodes?.find?.((n: any) => n.id === id)
    const name = node?.data?.name || 'Node'
    const status = node?.data?.status || ''
    const tags = node?.data?.tags || []
    const desc = node?.data?.description || ''
    const tagCount = tags.length
    const tagLines = Math.ceil(tagCount / 3)
    const descLines = desc ? desc.split(/\r?\n/).length : 0
    const width = Math.max(120, name.length * 9 + status.length * 7 + Math.min(3, tagCount) * 40 + (tagCount > 3 ? 40 : 0) + 32)
    const height = 48 + tagLines * 24 + descLines * 18
    return { width, height }
  }

  return (
    <div
      className="w-full h-full relative bg-muted/20 overflow-hidden"
      style={{ userSelect: isPanning ? "none" : undefined }}
    >
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button onClick={zoomIn} className="bg-background p-2 rounded-md shadow-sm hover:bg-muted" aria-label="Zoom in" title="Zoom in">
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          className="bg-background p-2 rounded-md shadow-sm hover:bg-muted"
          aria-label="Zoom out"
          title="Zoom out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="bg-background p-2 rounded-md shadow-sm hover:bg-muted"
          aria-label="Reset view"
          title="Reset view"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        {onExpandGraph && (
          <button
            onClick={handleExpandGraph}
            className="bg-background p-2 rounded-md shadow-sm hover:bg-muted"
            aria-label="Explode/Expand graph"
            title="Explode/Expand graph"
          >
            <Expand className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Instructions overlay */}
      <div className="absolute top-4 left-4 bg-background/90 p-3 rounded-md shadow-sm text-xs text-muted-foreground z-10">
        <div>• Double-click node to edit</div>
        <div>• Double-click empty space to create node</div>
        <div>• Hold Shift + drag to pan</div>
        <div>• Drag nodes to move them</div>
        <div>• Hold Alt + drag from node to create relationship</div>
        <div>• Click edge to edit relationship</div>
        <div>• Press Delete to remove selected relationship</div>
        <div>• Mouse wheel to zoom</div>
      </div>

      {/* Mode indicator */}
      {(isAltPressed || isShiftPressed) && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm font-medium z-10">
          {isAltPressed && "Relationship Mode - Drag from node to create connection"}
          {isShiftPressed && !isAltPressed && "Pan Mode - Drag to move view"}
        </div>
      )}

      {/* Description card in bottom right on hover */}
      {hoveredNode && (() => {
        const node = nodes.find((n) => n.id === hoveredNode);
        if (!node || !node.data.description) return null;
        return (
          <div
            className="fixed bottom-6 right-6 z-50 bg-background border border-border rounded-xl shadow-lg p-4 text-sm text-foreground max-w-xs w-[320px] min-h-[80px] select-none"
            style={{ pointerEvents: 'none' }}
          >
            <div className="mb-3 whitespace-pre-line break-words font-medium">
              {node.data.description}
            </div>
            <div className="flex flex-wrap gap-2">
              {node.data.tags.map((tag, i) => (
                <span key={i} className="inline-block bg-muted px-2 py-1 rounded text-xs font-semibold text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: getCursorStyle() }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseDown={startPan}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleCanvasDoubleClick}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
          {/* Render edges with proper spacing for multiple relationships */}
          {Object.entries(edgeGroups).map(([groupKey, groupEdges]) => {
            return groupEdges.map((edge, edgeIndex) => {
              const sourceNode = nodes.find((n) => n.id === edge.source)
              const targetNode = nodes.find((n) => n.id === edge.target)

              if (!sourceNode || !targetNode) return null

              const path = getEdgePath(sourceNode, targetNode, edgeIndex, groupEdges.length)

              // Calculate label position with offset for multiple edges
              const baseMidX = (sourceNode.position.x + targetNode.position.x) / 2
              const baseMidY = (sourceNode.position.y + targetNode.position.y) / 2 - 15

              let labelX = baseMidX
              let labelY = baseMidY

              // Stagger label Y for parallel edges
              const siblingIndex = edgeIndex
              const t = 0.5
              const controlX = baseMidX + (groupEdges.length > 1 ? (() => {
                const spacing = 40
                const totalWidth = (groupEdges.length - 1) * spacing
                const startOffset = -totalWidth / 2
                const currentOffset = startOffset + edgeIndex * spacing
                const dx = targetNode.position.x - sourceNode.position.x
                const dy = targetNode.position.y - sourceNode.position.y
                const length = Math.sqrt(dx * dx + dy * dy)
                const perpX = -dy / length
                return perpX * currentOffset
              })() : 0)
              const controlY = baseMidY + (groupEdges.length > 1 ? (() => {
                const spacing = 40
                const totalWidth = (groupEdges.length - 1) * spacing
                const startOffset = -totalWidth / 2
                const currentOffset = startOffset + edgeIndex * spacing
                const dx = targetNode.position.x - sourceNode.position.x
                const dy = targetNode.position.y - sourceNode.position.y
                const length = Math.sqrt(dx * dx + dy * dy)
                const perpY = dx / length
                return perpY * currentOffset
              })() : 0)
              const midX = (1 - t) * (1 - t) * sourceNode.position.x + 2 * (1 - t) * t * controlX + t * t * targetNode.position.x
              const midY = (1 - t) * (1 - t) * sourceNode.position.y + 2 * (1 - t) * t * controlY + t * t * targetNode.position.y
              // Stagger: alternate above/below, center if odd
              const staggerStep = 32
              let staggerOffset = 0
              if (groupEdges.length === 2) {
                // Special case: two edges, one above, one below
                staggerOffset = siblingIndex === 0 ? -16 : -56
              } else if (groupEdges.length > 1) {
                const center = Math.floor(groupEdges.length / 2)
                staggerOffset = (siblingIndex - center) * staggerStep
                if (groupEdges.length % 2 === 0 && siblingIndex >= center) staggerOffset += staggerStep / 2
              }
              // Add small X offset to further separate labels
              const staggerX = (siblingIndex - (groupEdges.length - 1) / 2) * 18
              labelX = midX + staggerX
              labelY = midY - 28 + staggerOffset

              const isSelected = selectedEdge?.id === edge.id

              return (
                <g key={edge.id} onMouseEnter={() => setHoveredEdge(edge.id)} onMouseLeave={() => setHoveredEdge(null)}>
                  {/* Invisible wider clickable area */}
                  <path
                    d={path}
                    className="stroke-transparent fill-none cursor-pointer"
                    strokeWidth="20"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdgeClick(edge)
                    }}
                  />

                  {/* Visible edge line */}
                  <path
                    d={path}
                    className={cn(
                      "fill-none cursor-pointer transition-all pointer-events-none",
                      hoveredEdge === edge.id || isSelected ? "stroke-4" : "stroke-2",
                      getEdgeColor(edge.data.relationshipType),
                      isSelected && "opacity-80",
                    )}
                    strokeWidth={hoveredEdge === edge.id || isSelected ? "4" : "2"}
                    strokeDasharray={isSelected ? "8,4" : undefined}
                  />

                  {/* Directional arrows along the path */}
                  {renderDirectionalArrows(edge, sourceNode, targetNode, edgeIndex, groupEdges.length)}
                </g>
              )
            })
          })}

          {/* Render all edge labels on top of lines/arrows for clarity */}
          {Object.entries(edgeGroups).map(([groupKey, groupEdges]) => {
            return groupEdges.map((edge, edgeIndex) => {
              const sourceNode = nodes.find((n) => n.id === edge.source)
              const targetNode = nodes.find((n) => n.id === edge.target)
              if (!sourceNode || !targetNode) return null

              // Calculate label position with offset for multiple edges
              const baseMidX = (sourceNode.position.x + targetNode.position.x) / 2
              const baseMidY = (sourceNode.position.y + targetNode.position.y) / 2 - 15

              let labelX = baseMidX
              let labelY = baseMidY

              // Stagger label Y for parallel edges
              const siblingIndex = edgeIndex
              const t = 0.5
              const controlX = baseMidX + (groupEdges.length > 1 ? (() => {
                const spacing = 40
                const totalWidth = (groupEdges.length - 1) * spacing
                const startOffset = -totalWidth / 2
                const currentOffset = startOffset + edgeIndex * spacing
                const dx = targetNode.position.x - sourceNode.position.x
                const dy = targetNode.position.y - sourceNode.position.y
                const length = Math.sqrt(dx * dx + dy * dy)
                const perpX = -dy / length
                return perpX * currentOffset
              })() : 0)
              const controlY = baseMidY + (groupEdges.length > 1 ? (() => {
                const spacing = 40
                const totalWidth = (groupEdges.length - 1) * spacing
                const startOffset = -totalWidth / 2
                const currentOffset = startOffset + edgeIndex * spacing
                const dx = targetNode.position.x - sourceNode.position.x
                const dy = targetNode.position.y - sourceNode.position.y
                const length = Math.sqrt(dx * dx + dy * dy)
                const perpY = dx / length
                return perpY * currentOffset
              })() : 0)
              const midX = (1 - t) * (1 - t) * sourceNode.position.x + 2 * (1 - t) * t * controlX + t * t * targetNode.position.x
              const midY = (1 - t) * (1 - t) * sourceNode.position.y + 2 * (1 - t) * t * controlY + t * t * targetNode.position.y
              // Stagger: alternate above/below, center if odd
              const staggerStep = 32
              let staggerOffset = 0
              if (groupEdges.length === 2) {
                // Special case: two edges, one above, one below
                staggerOffset = siblingIndex === 0 ? -16 : -56
              } else if (groupEdges.length > 1) {
                const center = Math.floor(groupEdges.length / 2)
                staggerOffset = (siblingIndex - center) * staggerStep
                if (groupEdges.length % 2 === 0 && siblingIndex >= center) staggerOffset += staggerStep / 2
              }
              // Add small X offset to further separate labels
              const staggerX = (siblingIndex - (groupEdges.length - 1) / 2) * 18
              labelX = midX + staggerX
              labelY = midY - 28 + staggerOffset

              const isSelected = selectedEdge?.id === edge.id
              const label = edge.label;
              const fontSize = 14;
              const fontWeight = 'bold';
              const paddingX = 8;
              const paddingY = 4;
              // Estimate label width (SVG monospace fallback)
              const labelWidth = label.length * fontSize * 0.6 + paddingX * 2;
              const labelHeight = fontSize + paddingY * 2;

              return (
                <g key={edge.id + "-label-group"}>
                  {/* Always render background for label */}
                  <rect
                    x={labelX - labelWidth / 2}
                    y={labelY - labelHeight / 2}
                    width={labelWidth}
                    height={labelHeight}
                    rx={8}
                    fill="rgba(0,0,0,0.72)"
                  />
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    fontSize={fontSize}
                    fontWeight={fontWeight}
                    style={{
                      pointerEvents: "none",
                      fill: "#fff",
                      textShadow: isDark
                        ? "0 1px 4px #000, 0 0px 2px #000"
                        : undefined,
                    }}
                  >
                    {label}
                  </text>
                </g>
              )
            })
          })}

          {/* Render edge preview during creation */}
          {isCreatingEdge && edgeStart && edgePreview && (
            <path
              d={getPreviewEdgePath(edgeStart, edgePreview)}
              className="stroke-primary stroke-2 fill-none opacity-70"
              strokeWidth="3"
              strokeDasharray="8,4"
            />
          )}

          {/* Render nodes */}
          {nodes.map((node) => {
            // Calculate dynamic height for the node card based on tag count
            const baseHeight = 100; // base height for card with no tags
            const tagsPerRow = 3;
            const tagRows = node.data.tags.length > 0 ? Math.ceil(node.data.tags.length / tagsPerRow) : 0;
            const buffer = 40; // px buffer for padding/rounded corners
            const tagRowHeight = 32; // px per row of tags (larger for long tags)
            const dynamicHeight = baseHeight + tagRows * tagRowHeight + buffer;

            const maxVisibleTags = 3;
            const visibleTags = node.data.tags.slice(0, maxVisibleTags);
            const extraTagCount = node.data.tags.length - maxVisibleTags;

            // Show description bubble above the node if hovered
            const showDescriptionBubble = hoveredNode === node.id && node.data.description;
            const bubbleWidth = 220;
            const bubbleHeight = 80; // estimate, can be adjusted

            return (
              <g key={node.id}>
                {/* Connection handles - only show when Alt is pressed */}
                {isAltPressed && (
                  <>
                    <circle
                      cx={node.position.x - 110}
                      cy={node.position.y}
                      r="8"
                      className="fill-primary stroke-background stroke-2 opacity-80 hover:opacity-100 cursor-crosshair"
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        startNodeInteraction(e, node.id)
                      }}
                    />
                    <circle
                      cx={node.position.x + 110}
                      cy={node.position.y}
                      r="8"
                      className="fill-primary stroke-background stroke-2 opacity-80 hover:opacity-100 cursor-crosshair"
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        startNodeInteraction(e, node.id)
                      }}
                    />
                    <circle
                      cx={node.position.x}
                      cy={node.position.y - 60}
                      r="8"
                      className="fill-primary stroke-background stroke-2 opacity-80 hover:opacity-100 cursor-crosshair"
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        startNodeInteraction(e, node.id)
                      }}
                    />
                    <circle
                      cx={node.position.x}
                      cy={node.position.y + 60}
                      r="8"
                      className="fill-primary stroke-background stroke-2 opacity-80 hover:opacity-100 cursor-crosshair"
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        startNodeInteraction(e, node.id)
                      }}
                    />
                  </>
                )}

                <foreignObject
                  x={node.position.x - 100}
                  y={node.position.y - dynamicHeight / 2}
                  width="200"
                  height={dynamicHeight}
                  onMouseDown={(e) => {
                    startNodeInteraction(e, node.id)
                  }}
                  onMouseUp={(e) => handleNodeMouseUp(e, node.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleNodeDoubleClick(node);
                  }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{
                    cursor: isAltPressed
                      ? "crosshair"
                      : isShiftPressed
                        ? "grab"
                        : isDragging && dragNode === node.id
                          ? "grabbing"
                          : "move",
                  }}
                >
                  <div className={cn(
                    "min-w-[200px] max-w-xs p-3 shadow-lg border-2 transition-all select-none rounded-xl bg-background border-border",
                    isDragging && dragNode === node.id && "shadow-xl border-primary scale-105",
                    hoveredNode === node.id && !isDragging && "border-primary/50 shadow-xl",
                    isAltPressed && "border-primary/30",
                  )}>
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          getNodeColor(node.data.type),
                        )}
                      >
                        {getNodeIcon(node.data.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate select-none">{node.data.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs select-none">
                            {node.data.type}
                          </Badge>
                          <Badge
                            variant={node.data.status === "Alive" ? "default" : "secondary"}
                            className="text-xs select-none"
                          >
                            {node.data.status}
                          </Badge>
                        </div>
                        {node.data.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2 max-w-[170px]">
                            {visibleTags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs select-none break-all">
                                {tag}
                              </Badge>
                            ))}
                            {extraTagCount > 0 && (
                              <Badge variant="secondary" className="text-xs select-none">
                                +{extraTagCount} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  )
}

// Utility to find connected components in the graph
function getConnectedComponents(nodes: Node[], edges: Edge[]): string[][] {
  const visited = new Set<string>()
  const adj: Record<string, string[]> = {}
  nodes.forEach((node) => (adj[node.id] = []))
  edges.forEach((edge) => {
    adj[edge.source].push(edge.target)
    adj[edge.target].push(edge.source)
  })
  const components: string[][] = []
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const queue = [node.id]
      const component: string[] = []
      visited.add(node.id)
      while (queue.length) {
        const curr = queue.shift()!
        component.push(curr)
        for (const neighbor of adj[curr]) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor)
            queue.push(neighbor)
          }
        }
      }
      components.push(component)
    }
  }
  return components
}

// Helper to estimate label width in pixels
function estimateLabelWidth(label: string) {
  // Approximate: 8px per character for small font
  return Math.max(60, label.length * 8 + 24) // min 60px, add padding
}

// Helper to check if two line segments cross
function edgesCross(a1: { x: number; y: number }, a2: { x: number; y: number }, b1: { x: number; y: number }, b2: { x: number; y: number }) {
  function ccw(p1: any, p2: any, p3: any) {
    return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x)
  }
  return (
    ccw(a1, b1, b2) !== ccw(a2, b1, b2) &&
    ccw(a1, a2, b1) !== ccw(a1, a2, b2)
  )
}

// Custom force-directed layout for a component
function forceDirectedLayout(
  nodeIds: string[],
  edges: Edge[],
  labelWidths: Record<string, number>,
  edgeCounts: Record<string, number>,
  iterations = 100,
  width = 600,
  height = 600
) {
  // Helper to estimate card size based on node content
  function estimateNodeSize(id: string) {
    // Estimate width: name + status + up to 3 tags + padding
    // Estimate height: 1 line for name, 1 for status, lines for description, lines for tags
    // Use nodeIds as keys, fallback to defaults if not found
    const node = (window as any)?.__allNodes?.find?.((n: any) => n.id === id)
    const name = node?.data?.name || 'Node'
    const status = node?.data?.status || ''
    const tags = node?.data?.tags || []
    const desc = node?.data?.description || ''
    const tagCount = tags.length
    const tagLines = Math.ceil(tagCount / 3)
    const descLines = desc ? desc.split(/\r?\n/).length : 0
    const width = Math.max(120, name.length * 9 + status.length * 7 + Math.min(3, tagCount) * 40 + (tagCount > 3 ? 40 : 0) + 32)
    const height = 48 + tagLines * 24 + descLines * 18
    return { width, height }
  }

  // Initialize positions in a circle
  const n = nodeIds.length
  const angleStep = (2 * Math.PI) / n
  let positions: Record<string, { x: number; y: number }> = {}
  for (let i = 0; i < n; i++) {
    positions[nodeIds[i]] = {
      x: width / 2 + 200 * Math.cos(i * angleStep),
      y: height / 2 + 200 * Math.sin(i * angleStep),
    }
  }
  // Build adjacency
  const adj: Record<string, Set<string>> = {}
  nodeIds.forEach((id) => (adj[id] = new Set()))
  edges.forEach((e) => {
    adj[e.source].add(e.target)
    adj[e.target].add(e.source)
  })
  // Helper to count edge crossings
  function countCrossings(pos: Record<string, { x: number; y: number }>) {
    let count = 0;
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const e1 = edges[i], e2 = edges[j];
        if (
          e1.source !== e2.source &&
          e1.source !== e2.target &&
          e1.target !== e2.source &&
          e1.target !== e2.target
        ) {
          const a1 = pos[e1.source], a2 = pos[e1.target];
          const b1 = pos[e2.source], b2 = pos[e2.target];
          if (edgesCross(a1, a2, b1, b2)) count++;
        }
      }
    }
    return count;
  }
  // Simulation
  for (let iter = 0; iter < iterations; iter++) {
    // Forces
    const disp: Record<string, { x: number; y: number }> = {}
    nodeIds.forEach((id) => (disp[id] = { x: 0, y: 0 }))
    // Repulsion
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = nodeIds[i], b = nodeIds[j]
        const sizeA = estimateNodeSize(a)
        const sizeB = estimateNodeSize(b)
        const ax = positions[a].x, ay = positions[a].y
        const bx = positions[b].x, by = positions[b].y
        const margin = 64
        // Check bounding box overlap
        if (
          Math.abs(ax - bx) < (sizeA.width + sizeB.width) / 2 + margin &&
          Math.abs(ay - by) < (sizeA.height + sizeB.height) / 2 + margin
        ) {
          // Overlap: apply strong repulsion
          const dx = ax - bx
          const dy = ay - by
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
          const overlapX = (sizeA.width + sizeB.width) / 2 + margin - Math.abs(ax - bx)
          const overlapY = (sizeA.height + sizeB.height) / 2 + margin - Math.abs(ay - by)
          const force = 1.2 * (overlapX + overlapY)
          disp[a].x += (dx / dist) * force
          disp[a].y += (dy / dist) * force
          disp[b].x -= (dx / dist) * force
          disp[b].y -= (dy / dist) * force
        }
      }
    }
    // Spring (edge) attraction
    edges.forEach((e) => {
      if (!nodeIds.includes(e.source) || !nodeIds.includes(e.target)) return
      const a = e.source, b = e.target
      const dx = positions[a].x - positions[b].x
      const dy = positions[a].y - positions[b].y
      let dist = Math.sqrt(dx * dx + dy * dy) || 0.01
      // Desired length: label width + padding + extra per relationship
      const key = [a, b].sort().join('-')
      const numRels = edgeCounts[key] || 1
      const desired = (labelWidths[key] || 10) + 10 + (numRels - 1) * 30
      const force = 0.1 * (dist - desired)
      disp[a].x -= (dx / dist) * force
      disp[a].y -= (dy / dist) * force
      disp[b].x += (dx / dist) * force
      disp[b].y += (dy / dist) * force
    })
    // Radial/circular force: nudge nodes toward average radius from centroid
    // 1. Calculate centroid
    let sumX = 0, sumY = 0;
    nodeIds.forEach((id) => {
      sumX += positions[id].x;
      sumY += positions[id].y;
    });
    const centroid = { x: sumX / n, y: sumY / n };
    // 2. Calculate average radius
    let totalRadius = 0;
    nodeIds.forEach((id) => {
      const dx = positions[id].x - centroid.x;
      const dy = positions[id].y - centroid.y;
      totalRadius += Math.sqrt(dx * dx + dy * dy);
    });
    const avgRadius = totalRadius / n;
    // 3. Nudge each node toward avgRadius from centroid
    nodeIds.forEach((id) => {
      const dx = positions[id].x - centroid.x;
      const dy = positions[id].y - centroid.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radialForce = 0.05 * (avgRadius - dist);
      disp[id].x += (dx / dist) * radialForce;
      disp[id].y += (dy / dist) * radialForce;
      // Angle regularization: nudge node toward its ideal angle
      const idx = nodeIds.indexOf(id);
      const idealAngle = (2 * Math.PI * idx) / n;
      const currentAngle = Math.atan2(dy, dx);
      const angleDiff = idealAngle - currentAngle;
      // Move node tangentially to match ideal angle
      const angleForce = 0.08 * angleDiff * dist;
      disp[id].x += -Math.sin(currentAngle) * angleForce;
      disp[id].y += Math.cos(currentAngle) * angleForce;
    });
    // Edge crossing minimization: strong repulsion for crossing edges
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const e1 = edges[i], e2 = edges[j];
        if (
          e1.source !== e2.source &&
          e1.source !== e2.target &&
          e1.target !== e2.source &&
          e1.target !== e2.target
        ) {
          const a1 = positions[e1.source], a2 = positions[e1.target];
          const b1 = positions[e2.source], b2 = positions[e2.target];
          if (edgesCross(a1, a2, b1, b2)) {
            // Apply strong repulsion to all involved nodes
            const repel = 120;
            disp[e1.source].x += repel * Math.sign(a1.x - b1.x);
            disp[e1.source].y += repel * Math.sign(a1.y - b1.y);
            disp[e1.target].x += repel * Math.sign(a2.x - b2.x);
            disp[e1.target].y += repel * Math.sign(a2.y - b2.y);
            disp[e2.source].x -= repel * Math.sign(b1.x - a1.x);
            disp[e2.source].y -= repel * Math.sign(b1.y - a1.y);
            disp[e2.target].x -= repel * Math.sign(b2.x - a2.x);
            disp[e2.target].y -= repel * Math.sign(b2.y - a2.y);
          }
        }
      }
    }
    // Update positions
    nodeIds.forEach((id) => {
      positions[id].x += Math.max(-30, Math.min(30, disp[id].x * 0.01))
      positions[id].y += Math.max(-30, Math.min(30, disp[id].y * 0.01))
    })
    // Clamp each node's distance from centroid to a max (e.g., 500px)
    const maxRadius = 500;
    nodeIds.forEach((id) => {
      const dx = positions[id].x - centroid.x;
      const dy = positions[id].y - centroid.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxRadius) {
        const scale = maxRadius / dist;
        positions[id].x = centroid.x + dx * scale;
        positions[id].y = centroid.y + dy * scale;
      }
    });
  }
  // Post-processing: local node swapping to reduce crossings
  let improved = true;
  let bestCrossings = countCrossings(positions);
  for (let swapIter = 0; swapIter < 10 && improved; swapIter++) {
    improved = false;
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        // Swap positions of nodeIds[i] and nodeIds[j]
        const temp = { ...positions[nodeIds[i]] };
        positions[nodeIds[i]] = { ...positions[nodeIds[j]] };
        positions[nodeIds[j]] = temp;
        const crossings = countCrossings(positions);
        if (crossings < bestCrossings) {
          bestCrossings = crossings;
          improved = true;
        } else {
          // Swap back if not improved
          const temp2 = { ...positions[nodeIds[i]] };
          positions[nodeIds[i]] = { ...positions[nodeIds[j]] };
          positions[nodeIds[j]] = temp2;
        }
      }
    }
  }
  return positions;
}