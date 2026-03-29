"use client"

import type React from "react"

import { useRef, useEffect, useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { User, Users, MapPin, Sparkles, Plus, Minus, RefreshCw, Expand, ChevronDown, ChevronUp, EyeOff, X } from "lucide-react"
import { useGraphStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { getConnectedComponents, estimateLabelWidth, forceDirectedLayout } from "@/lib/graph-layout"
export type { NodeType, NodeData, Node, EdgeData, Edge } from "@/lib/graph-types"
import type { Node, Edge } from "@/lib/graph-types"

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

export function RelationshipGraph() {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null)
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
    saveCampaign,
    selectedEdge,
    selectedNode,
    isPremium,
    expandedSheetNodes,
    toggleSheetExpanded,
    settings,
    openNodePanel,
    currentCampaign,
    selectedNodeIds,
    toggleNodeSelection,
    clearNodeSelection,
    addGroup,
    updateGroup,
    removeGroup,
  } = useGraphStore()

  const tagColors: Record<string, string> = currentCampaign?.tagColors ?? {}
  const groups = currentCampaign?.groups ?? []

  // Context menu state (for right-click → group)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null)
  // Group name dialog state
  const [groupNamePrompt, setGroupNamePrompt] = useState<{ nodeIds: string[] } | null>(null)
  const [groupNameInput, setGroupNameInput] = useState("")
  // Group rename/delete state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState("")

  const { theme } = useTheme();
  const isDark = theme === "dark";

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
      if (settings.sheetViewMode === "panel") {
        openNodePanel(node.id)
      } else {
        setSelectedNode(node)
      }
    },
    [setSelectedNode, settings.sheetViewMode, openNodePanel],
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

      // Ctrl/Cmd+click: toggle multi-select (Pro only)
      if (isPremium && (e.ctrlKey || e.metaKey)) {
        toggleNodeSelection(nodeId)
        return
      }

      dragStartPosRef.current = { x: e.clientX, y: e.clientY }

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
    [nodes, scale, pan, isAltPressed, isShiftPressed, isPremium, toggleNodeSelection],
  )

  const handleNodeContextMenu = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      if (!isPremium) return
      e.preventDefault()
      e.stopPropagation()
      setContextMenu({ x: e.clientX, y: e.clientY, nodeId })
    },
    [isPremium],
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
      } else if (settings.sheetViewMode === "panel" && !isCreatingEdge && !isAltPressed) {
        // Detect click (no significant drag) to open node panel
        const wasClick =
          dragStartPosRef.current !== null &&
          Math.hypot(e.clientX - dragStartPosRef.current.x, e.clientY - dragStartPosRef.current.y) < 5
        if (wasClick) {
          openNodePanel(targetNodeId)
        }
      }

      dragStartPosRef.current = null

      // Reset all interaction states
      setIsCreatingEdge(false)
      setEdgeStart(null)
      setEdgePreview(null)
      setIsDragging(false)
      setDragNode(null)
      setDragOffset({ x: 0, y: 0 })
    },
    [isCreatingEdge, edgeStart, isAltPressed, settings.sheetViewMode, openNodePanel],
  )

  const handleMouseUp = useCallback(() => {
    // If a drag just ended, persist the final node position to storage
    if (isDragging) {
      saveCampaign()
    }
    setIsCreatingEdge(false)
    setEdgeStart(null)
    setEdgePreview(null)
    setIsDragging(false)
    setDragNode(null)
    setDragOffset({ x: 0, y: 0 })
    setIsPanning(false)
  }, [isDragging, saveCampaign])

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

  const getEdgeLabelPosition = (
    sourceNode: Node,
    targetNode: Node,
    edgeIndex: number,
    totalEdges: number,
  ): { x: number; y: number } => {
    const baseMidX = (sourceNode.position.x + targetNode.position.x) / 2
    const baseMidY = (sourceNode.position.y + targetNode.position.y) / 2 - 15

    let controlX = baseMidX
    let controlY = baseMidY

    if (totalEdges > 1) {
      const spacing = 40
      const currentOffset = -((totalEdges - 1) * spacing) / 2 + edgeIndex * spacing
      const dx = targetNode.position.x - sourceNode.position.x
      const dy = targetNode.position.y - sourceNode.position.y
      const length = Math.sqrt(dx * dx + dy * dy) || 1
      controlX = baseMidX + (-dy / length) * currentOffset
      controlY = baseMidY + (dx / length) * currentOffset
    }

    const t = 0.5
    const midX =
      (1 - t) * (1 - t) * sourceNode.position.x +
      2 * (1 - t) * t * controlX +
      t * t * targetNode.position.x
    const midY =
      (1 - t) * (1 - t) * sourceNode.position.y +
      2 * (1 - t) * t * controlY +
      t * t * targetNode.position.y

    const staggerStep = 32
    let staggerOffset = 0
    if (totalEdges === 2) {
      staggerOffset = edgeIndex === 0 ? -16 : -56
    } else if (totalEdges > 1) {
      const center = Math.floor(totalEdges / 2)
      staggerOffset = (edgeIndex - center) * staggerStep
      if (totalEdges % 2 === 0 && edgeIndex >= center) staggerOffset += staggerStep / 2
    }

    const staggerX = (edgeIndex - (totalEdges - 1) / 2) * 18
    return { x: midX + staggerX, y: midY - 28 + staggerOffset }
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
    const layoutCenters: { x: number; y: number }[] = []
    // Arrange component centers in a grid
    const cols = Math.ceil(Math.sqrt(components.length))
    for (let i = 0; i < components.length; i++) {
      const row = Math.floor(i / cols)
      const col = i % cols
      layoutCenters.push({ x: col * spacing, y: row * spacing })
    }
    // Calculate new positions
    const newPositions: Record<string, { x: number; y: number }> = {}
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
      // Run force-directed layout, passing nodes so sizes can be calculated accurately
      const positions = forceDirectedLayout(component, componentEdges, labelWidths, edgeCounts, nodes, 120)
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
        <button
          onClick={handleExpandGraph}
          className="bg-background p-2 rounded-md shadow-sm hover:bg-muted"
          aria-label="Explode/Expand graph"
          title="Explode/Expand graph"
        >
          <Expand className="w-4 h-4" />
        </button>
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
        {isPremium && <div>• Ctrl+click nodes to multi-select, then right-click to group</div>}
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

      {/* Multi-select indicator */}
      {isPremium && selectedNodeIds.size > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg z-20 flex items-center gap-2">
          <span>{selectedNodeIds.size} node{selectedNodeIds.size > 1 ? "s" : ""} selected</span>
          <button
            type="button"
            className="underline underline-offset-2 hover:no-underline"
            onClick={() => {
              const ids = Array.from(selectedNodeIds)
              setGroupNamePrompt({ nodeIds: ids })
              setGroupNameInput("")
            }}
          >
            Group
          </button>
          <button type="button" onClick={clearNodeSelection} className="ml-1 hover:text-violet-200">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Context menu */}
      {isPremium && contextMenu && (
        <div
          className="fixed z-50 bg-background border border-border rounded-lg shadow-lg py-1 text-sm min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <button
            type="button"
            className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2"
            onClick={() => {
              const nodeIds = selectedNodeIds.has(contextMenu.nodeId)
                ? Array.from(selectedNodeIds)
                : [contextMenu.nodeId]
              setGroupNamePrompt({ nodeIds })
              setGroupNameInput("")
              setContextMenu(null)
            }}
          >
            Group {selectedNodeIds.size > 1 ? `${selectedNodeIds.size} nodes` : "node"}
          </button>
          {groups.some((g) => g.nodeIds.includes(contextMenu.nodeId)) && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-muted text-destructive flex items-center gap-2"
              onClick={() => {
                const group = groups.find((g) => g.nodeIds.includes(contextMenu.nodeId))
                if (group && confirm(`Remove group "${group.name}"?`)) removeGroup(group.id)
                setContextMenu(null)
              }}
            >
              Remove from group
            </button>
          )}
        </div>
      )}

      {/* Group name dialog */}
      {isPremium && groupNamePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background border border-border rounded-xl shadow-xl p-5 w-72 space-y-3">
            <h3 className="font-semibold text-sm">Name this group</h3>
            <p className="text-xs text-muted-foreground">{groupNamePrompt.nodeIds.length} node{groupNamePrompt.nodeIds.length > 1 ? "s" : ""} will be grouped.</p>
            <input
              className="w-full h-8 text-sm border border-border rounded px-2 bg-background"
              value={groupNameInput}
              autoFocus
              onChange={(e) => setGroupNameInput(e.target.value)}
              placeholder="Group name..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && groupNameInput.trim()) {
                  addGroup({ id: `group-${Date.now()}`, name: groupNameInput.trim(), nodeIds: groupNamePrompt.nodeIds })
                  clearNodeSelection()
                  setGroupNamePrompt(null)
                }
                if (e.key === "Escape") setGroupNamePrompt(null)
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="px-3 py-1.5 text-xs rounded border border-border hover:bg-muted"
                onClick={() => setGroupNamePrompt(null)}
              >Cancel</button>
              <button
                type="button"
                className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                disabled={!groupNameInput.trim()}
                onClick={() => {
                  addGroup({ id: `group-${Date.now()}`, name: groupNameInput.trim(), nodeIds: groupNamePrompt.nodeIds })
                  clearNodeSelection()
                  setGroupNamePrompt(null)
                }}
              >Create Group</button>
            </div>
          </div>
        </div>
      )}

      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: getCursorStyle() }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseDown={startPan}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleCanvasDoubleClick}
        onClick={() => { setContextMenu(null) }}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
          {/* Render edges with proper spacing for multiple relationships */}
          {Object.entries(edgeGroups).map(([groupKey, groupEdges]) => {
            return groupEdges.map((edge, edgeIndex) => {
              const sourceNode = nodes.find((n) => n.id === edge.source)
              const targetNode = nodes.find((n) => n.id === edge.target)

              if (!sourceNode || !targetNode) return null

              const path = getEdgePath(sourceNode, targetNode, edgeIndex, groupEdges.length)
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
                      edge.data.hiddenFromPlayers && !isSelected && "opacity-40",
                    )}
                    strokeWidth={hoveredEdge === edge.id || isSelected ? "4" : "2"}
                    strokeDasharray={isSelected ? "8,4" : edge.data.hiddenFromPlayers ? "5,3" : undefined}
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

              const { x: labelX, y: labelY } = getEdgeLabelPosition(sourceNode, targetNode, edgeIndex, groupEdges.length)
              const isSelected = selectedEdge?.id === edge.id
              const label = edge.label
              const firstTagColor = isPremium
                ? edge.data.tags.map((t) => tagColors[t]).find(Boolean)
                : undefined
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
                  {firstTagColor && (
                    <circle
                      cx={labelX + labelWidth / 2 - 6}
                      cy={labelY - labelHeight / 2 - 4}
                      r={5}
                      fill={firstTagColor}
                      stroke="rgba(0,0,0,0.4)"
                      strokeWidth={1}
                    />
                  )}
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

          {/* Render group bounding boxes (Pro) */}
          {isPremium && groups.map((group) => {
            const groupNodes = nodes.filter((n) => group.nodeIds.includes(n.id))
            if (groupNodes.length === 0) return null
            const xs = groupNodes.map((n) => n.position.x)
            const ys = groupNodes.map((n) => n.position.y)
            const padding = 80
            const minX = Math.min(...xs) - padding
            const minY = Math.min(...ys) - padding
            const maxX = Math.max(...xs) + padding
            const maxY = Math.max(...ys) + padding
            const w = maxX - minX
            const h = maxY - minY
            const color = group.color ?? "#6b7280"
            return (
              <g key={group.id}>
                <rect
                  x={minX} y={minY} width={w} height={h}
                  rx={16}
                  fill={color + "14"}
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray="8,4"
                />
                <foreignObject x={minX + 8} y={minY + 6} width={w - 16} height={28}>
                  <div className="flex items-center gap-1">
                    {editingGroupId === group.id ? (
                      <>
                        <input
                          className="text-xs font-semibold bg-background border border-border rounded px-1.5 h-6 w-32"
                          value={editingGroupName}
                          autoFocus
                          onChange={(e) => setEditingGroupName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { updateGroup(group.id, { name: editingGroupName }); setEditingGroupId(null) }
                            if (e.key === "Escape") setEditingGroupId(null)
                          }}
                          onBlur={() => { updateGroup(group.id, { name: editingGroupName }); setEditingGroupId(null) }}
                        />
                      </>
                    ) : (
                      <span
                        className="text-xs font-semibold cursor-pointer select-none px-1 rounded hover:bg-muted/50"
                        style={{ color }}
                        onDoubleClick={() => { setEditingGroupId(group.id); setEditingGroupName(group.name) }}
                        title="Double-click to rename"
                      >
                        {group.name}
                      </span>
                    )}
                    <button
                      type="button"
                      className="ml-auto p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); if (confirm(`Remove group "${group.name}"?`)) removeGroup(group.id) }}
                      title="Remove group"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </foreignObject>
              </g>
            )
          })}

          {/* Render nodes */}
          {nodes.map((node) => {
            const hasSheet = isPremium && !!node.data.sheet
            const isExpanded = hasSheet && expandedSheetNodes.has(node.id)
            const sheet = node.data.sheet

            // Calculate dynamic height for the node card based on tag count
            const baseHeight = 100;
            const tagsPerRow = 3;
            const tagRows = node.data.tags.length > 0 ? Math.ceil(node.data.tags.length / tagsPerRow) : 0;
            const buffer = 40;
            const tagRowHeight = 32;
            let dynamicHeight = baseHeight + tagRows * tagRowHeight + buffer;

            // Extra height when sheet is expanded inline
            if (isExpanded && sheet) {
              if (sheet.imageData) dynamicHeight += 96   // portrait area
              if (sheet.race || sheet.class) dynamicHeight += 28
              if (sheet.level !== undefined || sheet.alignment) dynamicHeight += 28
              if (sheet.backstory) dynamicHeight += 60
              if (sheet.notes) dynamicHeight += 44
              if ((sheet.customFields?.length ?? 0) > 0) dynamicHeight += (sheet.customFields!.length * 24) + 8
              dynamicHeight += 16 // bottom padding
            }

            const maxVisibleTags = 3;
            const visibleTags = node.data.tags.slice(0, maxVisibleTags);
            const extraTagCount = node.data.tags.length - maxVisibleTags;
            const nodeWidth = isExpanded ? 240 : 200;

            return (
              <g key={node.id}>
                <foreignObject
                  x={node.position.x - nodeWidth / 2}
                  y={node.position.y - dynamicHeight / 2}
                  width={nodeWidth}
                  height={dynamicHeight}
                  onMouseDown={(e) => startNodeInteraction(e, node.id)}
                  onMouseUp={(e) => handleNodeMouseUp(e, node.id)}
                  onDoubleClick={(e) => { e.stopPropagation(); handleNodeDoubleClick(node); }}
                  onContextMenu={(e) => handleNodeContextMenu(e, node.id)}
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
                    "p-3 shadow-lg border-2 transition-all select-none rounded-xl bg-background border-border relative",
                    isExpanded && "pb-2",
                    isDragging && dragNode === node.id && "shadow-xl border-primary scale-105",
                    hoveredNode === node.id && !isDragging && "border-primary/50 shadow-xl",
                    isAltPressed && "border-primary/30",
                    node.data.hiddenFromPlayers && "border-dashed border-amber-500/60 opacity-75",
                    isPremium && selectedNodeIds.has(node.id) && "border-violet-500 ring-2 ring-violet-400/40",
                  )}>
                    {node.data.hiddenFromPlayers && (
                      <div className="absolute -top-2 -right-2 bg-amber-500 rounded-full p-0.5" title="Hidden from players">
                        <EyeOff className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      {/* Portrait or icon */}
                      {hasSheet && sheet?.imageData ? (
                        <img
                          src={sheet.imageData}
                          alt={node.data.name}
                          className="w-10 h-10 rounded-full object-cover shrink-0 border border-border"
                          draggable={false}
                        />
                      ) : (
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", getNodeColor(node.data.type))}>
                          {getNodeIcon(node.data.type)}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate select-none">{node.data.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs select-none">{node.data.type}</Badge>
                          <Badge variant={node.data.status === "Alive" ? "default" : "secondary"} className="text-xs select-none">
                            {node.data.status}
                          </Badge>
                        </div>
                        {node.data.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2 max-w-[170px]">
                            {visibleTags.map((tag, index) => {
                              const tagColor = isPremium ? tagColors[tag] : undefined
                              return (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="text-xs select-none break-all flex items-center gap-1"
                                  style={tagColor ? { borderColor: tagColor, borderWidth: 1 } : undefined}
                                >
                                  {tagColor && (
                                    <span
                                      className="w-1.5 h-1.5 rounded-full shrink-0"
                                      style={{ background: tagColor }}
                                    />
                                  )}
                                  {tag}
                                </Badge>
                              )
                            })}
                            {extraTagCount > 0 && (
                              <Badge variant="secondary" className="text-xs select-none">+{extraTagCount} more</Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Sheet expand toggle */}
                      {hasSheet && settings.sheetViewMode === "modal" && (
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); toggleSheetExpanded(node.id); }}
                          className="shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                          title={isExpanded ? "Collapse sheet" : "Expand sheet"}
                        >
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>

                    {/* Inline expanded sheet */}
                    {isExpanded && sheet && (
                      <div className="mt-3 pt-2 border-t border-border space-y-2 text-xs">
                        {sheet.imageData && (
                          <div className="flex justify-center">
                            <img
                              src={sheet.imageData}
                              alt={node.data.name}
                              className="w-20 h-20 rounded-lg object-cover border border-border"
                              draggable={false}
                            />
                          </div>
                        )}
                        {(sheet.race || sheet.class) && (
                          <div className="flex gap-3 text-muted-foreground">
                            {sheet.race && <span><span className="font-medium text-foreground">Race:</span> {sheet.race}</span>}
                            {sheet.class && <span><span className="font-medium text-foreground">Class:</span> {sheet.class}</span>}
                          </div>
                        )}
                        {(sheet.level !== undefined || sheet.alignment) && (
                          <div className="flex gap-3 text-muted-foreground">
                            {sheet.level !== undefined && <span><span className="font-medium text-foreground">Lvl:</span> {sheet.level}</span>}
                            {sheet.alignment && <span><span className="font-medium text-foreground">Align:</span> {sheet.alignment}</span>}
                          </div>
                        )}
                        {sheet.backstory && (
                          <div className="text-muted-foreground line-clamp-3">
                            <span className="font-medium text-foreground">Backstory:</span> {sheet.backstory}
                          </div>
                        )}
                        {sheet.notes && (
                          <div className="text-muted-foreground line-clamp-2">
                            <span className="font-medium text-foreground">Notes:</span> {sheet.notes}
                          </div>
                        )}
                        {(sheet.customFields?.length ?? 0) > 0 && sheet.customFields!.map((f, i) => (
                          <div key={i} className="flex gap-2 text-muted-foreground">
                            <span className="font-medium text-foreground">{f.key}:</span>
                            <span>{f.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
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

