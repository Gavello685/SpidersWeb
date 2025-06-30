"use client"

import type React from "react"

import { useRef, useEffect, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Users, MapPin, Sparkles } from "lucide-react"
import { useGraphStore } from "@/lib/store"
import { cn } from "@/lib/utils"

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

export function RelationshipGraph() {
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

      // Calculate zoom factor
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
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
    setScale((prev) => Math.max(prev / 1.2, 0.1))
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

    const arrows = []

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

  return (
    <div className="w-full h-full relative bg-muted/20 overflow-hidden">
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button onClick={zoomIn} className="bg-background p-2 rounded-md shadow-sm hover:bg-muted" aria-label="Zoom in">
          +
        </button>
        <button
          onClick={zoomOut}
          className="bg-background p-2 rounded-md shadow-sm hover:bg-muted"
          aria-label="Zoom out"
        >
          -
        </button>
        <button
          onClick={resetView}
          className="bg-background p-2 rounded-md shadow-sm hover:bg-muted"
          aria-label="Reset view"
        >
          ↺
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
      </div>

      {/* Mode indicator */}
      {(isAltPressed || isShiftPressed) && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm font-medium z-10">
          {isAltPressed && "Relationship Mode - Drag from node to create connection"}
          {isShiftPressed && !isAltPressed && "Pan Mode - Drag to move view"}
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

              if (groupEdges.length > 1) {
                const spacing = 40 // Match the spacing from getEdgePath
                const totalWidth = (groupEdges.length - 1) * spacing
                const startOffset = -totalWidth / 2
                const currentOffset = startOffset + edgeIndex * spacing

                // Calculate perpendicular vector for label offset
                const dx = targetNode.position.x - sourceNode.position.x
                const dy = targetNode.position.y - sourceNode.position.y
                const length = Math.sqrt(dx * dx + dy * dy)
                const perpX = -dy / length
                const perpY = dx / length

                labelX = baseMidX + perpX * currentOffset
                labelY = baseMidY + perpY * currentOffset
              }

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

                  {/* Edge label */}
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    className={cn(
                      "text-xs fill-foreground pointer-events-none transition-all",
                      (hoveredEdge === edge.id || isSelected) && "font-semibold",
                    )}
                  >
                    {edge.label}
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
          {nodes.map((node) => (
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
                y={node.position.y - 50}
                width="200"
                height="100"
                onMouseDown={(e) => {
                  // Remove the handleNodeClick call, only keep startNodeInteraction
                  startNodeInteraction(e, node.id)
                }}
                onMouseUp={(e) => handleNodeMouseUp(e, node.id)}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  handleNodeDoubleClick(node)
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
                <div className="w-full h-full flex items-center justify-center">
                  <Card
                    className={cn(
                      "min-w-[200px] p-3 shadow-lg border-2 transition-all select-none",
                      isDragging && dragNode === node.id && "shadow-xl border-primary scale-105",
                      hoveredNode === node.id && !isDragging && "border-primary/50 shadow-xl",
                      isAltPressed && "border-primary/30",
                    )}
                  >
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
                          <div className="flex flex-wrap gap-1 mt-2">
                            {node.data.tags.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs select-none">
                                {tag}
                              </Badge>
                            ))}
                            {node.data.tags.length > 2 && (
                              <Badge variant="secondary" className="text-xs select-none">
                                +{node.data.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              </foreignObject>
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}
