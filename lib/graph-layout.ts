import type { Node, Edge } from "./graph-types"

// Find all connected components via BFS
export function getConnectedComponents(nodes: Node[], edges: Edge[]): string[][] {
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

export function estimateLabelWidth(label: string): number {
  return Math.max(60, label.length * 8 + 24)
}

function edgesCross(
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  b1: { x: number; y: number },
  b2: { x: number; y: number },
): boolean {
  function ccw(p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }) {
    return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x)
  }
  return ccw(a1, b1, b2) !== ccw(a2, b1, b2) && ccw(a1, a2, b1) !== ccw(a1, a2, b2)
}

export function forceDirectedLayout(
  nodeIds: string[],
  edges: Edge[],
  labelWidths: Record<string, number>,
  edgeCounts: Record<string, number>,
  allNodes: Node[],
  iterations = 100,
  layoutWidth = 600,
  layoutHeight = 600,
): Record<string, { x: number; y: number }> {
  const nodeMap = new Map(allNodes.map((n) => [n.id, n]))

  function estimateNodeSize(id: string) {
    const node = nodeMap.get(id)
    const name = node?.data?.name ?? "Node"
    const status = node?.data?.status ?? ""
    const tags = node?.data?.tags ?? []
    const desc = node?.data?.description ?? ""
    const tagCount = tags.length
    const tagLines = Math.ceil(tagCount / 3)
    const descLines = desc ? desc.split(/\r?\n/).length : 0
    const w =
      Math.max(120, name.length * 9 + status.length * 7 + Math.min(3, tagCount) * 40 + (tagCount > 3 ? 40 : 0) + 32)
    const h = 48 + tagLines * 24 + descLines * 18
    return { width: w, height: h }
  }

  const n = nodeIds.length
  const angleStep = (2 * Math.PI) / n
  const positions: Record<string, { x: number; y: number }> = {}
  for (let i = 0; i < n; i++) {
    positions[nodeIds[i]] = {
      x: layoutWidth / 2 + 200 * Math.cos(i * angleStep),
      y: layoutHeight / 2 + 200 * Math.sin(i * angleStep),
    }
  }

  const adj: Record<string, Set<string>> = {}
  nodeIds.forEach((id) => (adj[id] = new Set()))
  edges.forEach((e) => {
    adj[e.source].add(e.target)
    adj[e.target].add(e.source)
  })

  function countCrossings(pos: Record<string, { x: number; y: number }>) {
    let count = 0
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const e1 = edges[i],
          e2 = edges[j]
        if (
          e1.source !== e2.source &&
          e1.source !== e2.target &&
          e1.target !== e2.source &&
          e1.target !== e2.target
        ) {
          const a1 = pos[e1.source],
            a2 = pos[e1.target]
          const b1 = pos[e2.source],
            b2 = pos[e2.target]
          if (edgesCross(a1, a2, b1, b2)) count++
        }
      }
    }
    return count
  }

  for (let iter = 0; iter < iterations; iter++) {
    const disp: Record<string, { x: number; y: number }> = {}
    nodeIds.forEach((id) => (disp[id] = { x: 0, y: 0 }))

    // Repulsion: push overlapping nodes apart
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = nodeIds[i],
          b = nodeIds[j]
        const sizeA = estimateNodeSize(a)
        const sizeB = estimateNodeSize(b)
        const ax = positions[a].x,
          ay = positions[a].y
        const bx = positions[b].x,
          by = positions[b].y
        const margin = 64
        if (
          Math.abs(ax - bx) < (sizeA.width + sizeB.width) / 2 + margin &&
          Math.abs(ay - by) < (sizeA.height + sizeB.height) / 2 + margin
        ) {
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

    // Spring attraction: pull connected nodes toward desired distance
    edges.forEach((e) => {
      if (!nodeIds.includes(e.source) || !nodeIds.includes(e.target)) return
      const a = e.source,
        b = e.target
      const dx = positions[a].x - positions[b].x
      const dy = positions[a].y - positions[b].y
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
      const key = [a, b].sort().join("-")
      const numRels = edgeCounts[key] || 1
      const desired = (labelWidths[key] || 10) + 10 + (numRels - 1) * 30
      const force = 0.1 * (dist - desired)
      disp[a].x -= (dx / dist) * force
      disp[a].y -= (dy / dist) * force
      disp[b].x += (dx / dist) * force
      disp[b].y += (dy / dist) * force
    })

    // Radial force: nudge nodes toward average radius from centroid
    let sumX = 0,
      sumY = 0
    nodeIds.forEach((id) => {
      sumX += positions[id].x
      sumY += positions[id].y
    })
    const centroid = { x: sumX / n, y: sumY / n }
    let totalRadius = 0
    nodeIds.forEach((id) => {
      const dx = positions[id].x - centroid.x
      const dy = positions[id].y - centroid.y
      totalRadius += Math.sqrt(dx * dx + dy * dy)
    })
    const avgRadius = totalRadius / n
    nodeIds.forEach((id) => {
      const dx = positions[id].x - centroid.x
      const dy = positions[id].y - centroid.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
      const radialForce = 0.05 * (avgRadius - dist)
      disp[id].x += (dx / dist) * radialForce
      disp[id].y += (dy / dist) * radialForce
      const idx = nodeIds.indexOf(id)
      const idealAngle = (2 * Math.PI * idx) / n
      const currentAngle = Math.atan2(dy, dx)
      const angleDiff = idealAngle - currentAngle
      const angleForce = 0.08 * angleDiff * dist
      disp[id].x += -Math.sin(currentAngle) * angleForce
      disp[id].y += Math.cos(currentAngle) * angleForce
    })

    // Edge crossing repulsion
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const e1 = edges[i],
          e2 = edges[j]
        if (
          e1.source !== e2.source &&
          e1.source !== e2.target &&
          e1.target !== e2.source &&
          e1.target !== e2.target
        ) {
          const a1 = positions[e1.source],
            a2 = positions[e1.target]
          const b1 = positions[e2.source],
            b2 = positions[e2.target]
          if (edgesCross(a1, a2, b1, b2)) {
            const repel = 120
            disp[e1.source].x += repel * Math.sign(a1.x - b1.x)
            disp[e1.source].y += repel * Math.sign(a1.y - b1.y)
            disp[e1.target].x += repel * Math.sign(a2.x - b2.x)
            disp[e1.target].y += repel * Math.sign(a2.y - b2.y)
            disp[e2.source].x -= repel * Math.sign(b1.x - a1.x)
            disp[e2.source].y -= repel * Math.sign(b1.y - a1.y)
            disp[e2.target].x -= repel * Math.sign(b2.x - a2.x)
            disp[e2.target].y -= repel * Math.sign(b2.y - a2.y)
          }
        }
      }
    }

    // Apply displacement with clamping
    nodeIds.forEach((id) => {
      positions[id].x += Math.max(-30, Math.min(30, disp[id].x * 0.01))
      positions[id].y += Math.max(-30, Math.min(30, disp[id].y * 0.01))
    })

    // Clamp distance from centroid
    const maxRadius = 500
    nodeIds.forEach((id) => {
      const dx = positions[id].x - centroid.x
      const dy = positions[id].y - centroid.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > maxRadius) {
        const s = maxRadius / dist
        positions[id].x = centroid.x + dx * s
        positions[id].y = centroid.y + dy * s
      }
    })
  }

  // Post-process: local node swapping to reduce edge crossings
  let improved = true
  let bestCrossings = countCrossings(positions)
  for (let swapIter = 0; swapIter < 10 && improved; swapIter++) {
    improved = false
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const temp = { ...positions[nodeIds[i]] }
        positions[nodeIds[i]] = { ...positions[nodeIds[j]] }
        positions[nodeIds[j]] = temp
        const crossings = countCrossings(positions)
        if (crossings < bestCrossings) {
          bestCrossings = crossings
          improved = true
        } else {
          const temp2 = { ...positions[nodeIds[i]] }
          positions[nodeIds[i]] = { ...positions[nodeIds[j]] }
          positions[nodeIds[j]] = temp2
        }
      }
    }
  }

  return positions
}
