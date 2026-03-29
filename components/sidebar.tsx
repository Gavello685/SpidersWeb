"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Search, Users, User, MapPin, Sparkles, ArrowLeft, Filter, Eye, X } from "lucide-react"
import { useGraphStore } from "@/lib/store"
import { cn } from "@/lib/utils"

interface SidebarProps {
  onBackToCampaigns: () => void
}

export function Sidebar({ onBackToCampaigns }: SidebarProps) {
  const {
    nodes,
    edges,
    filteredNodes,
    searchTerm,
    setSearchTerm,
    currentCampaign,
    setSelectedNode,
    activeTagFilters,
    showOnlyPlayerVisible,
    toggleTagFilter,
    setShowOnlyPlayerVisible,
    clearFilters,
  } = useGraphStore()

  // All unique tags across all nodes in the campaign
  const allTags = Array.from(new Set(nodes.flatMap((n) => n.data.tags ?? []))).sort()
  const hasActiveFilters = activeTagFilters.length > 0 || showOnlyPlayerVisible

  const nodeTypes = [
    { type: "NPC", icon: User, count: nodes.filter((n) => n.data?.type === "NPC").length },
    { type: "PC", icon: User, count: nodes.filter((n) => n.data?.type === "PC").length },
    { type: "Faction", icon: Users, count: nodes.filter((n) => n.data?.type === "Faction").length },
    { type: "Location", icon: MapPin, count: nodes.filter((n) => n.data?.type === "Location").length },
    { type: "Abstract", icon: Sparkles, count: nodes.filter((n) => n.data?.type === "Abstract").length },
  ]

  const relationshipTypes = [
    { type: "Ally", count: edges.filter((e) => e.data?.relationshipType === "Ally").length },
    { type: "Enemy", count: edges.filter((e) => e.data?.relationshipType === "Enemy").length },
    { type: "Neutral", count: edges.filter((e) => e.data?.relationshipType === "Neutral").length },
    { type: "Romantic", count: edges.filter((e) => e.data?.relationshipType === "Romantic").length },
    { type: "Secret", count: edges.filter((e) => e.data?.relationshipType === "Secret").length },
    { type: "Family", count: edges.filter((e) => e.data?.relationshipType === "Family").length },
    { type: "Rival", count: edges.filter((e) => e.data?.relationshipType === "Rival").length },
    { type: "Subordinate", count: edges.filter((e) => e.data?.relationshipType === "Subordinate").length },
  ]

  const handleNodeClick = (node: any) => {
    setSelectedNode(node)
  }

  return (
    <div className="w-80 border-r bg-muted/30 flex flex-col overflow-hidden">
      <div className="p-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBackToCampaigns} className="mb-2 w-full justify-start" aria-label="Back to Campaigns">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Campaigns
        </Button>
        <div>
          <h2 className="font-semibold truncate">{currentCampaign?.name}</h2>
          {currentCampaign?.description && (
            <p className="text-sm text-muted-foreground truncate">{currentCampaign.description}</p>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Characters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="search">Search by name, description, or tags</Label>
              <Input
                id="search"
                placeholder="Search characters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>

            {searchTerm && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Search Results</span>
                  <Badge variant="secondary">{filteredNodes.length}</Badge>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {filteredNodes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No characters found</p>
                  ) : (
                    filteredNodes.map((node) => (
                      <div
                        key={node.id}
                        className="p-2 rounded-md hover:bg-muted cursor-pointer text-sm"
                        onClick={() => handleNodeClick(node)}
                      >
                        <div className="font-medium">{node.data.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {node.data.type} • {node.data.status}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter Graph
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  title="Clear all filters"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              type="button"
              onClick={() => setShowOnlyPlayerVisible(!showOnlyPlayerVisible)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors",
                showOnlyPlayerVisible
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-muted"
              )}
            >
              <Eye className="w-4 h-4 shrink-0" />
              Player view (hide DM-only)
            </button>

            {allTags.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Filter by tag</p>
                <div className="flex flex-wrap gap-1.5">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTagFilter(tag)}
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs border transition-colors",
                        activeTagFilters.includes(tag)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {allTags.length === 0 && (
              <p className="text-xs text-muted-foreground">No tags in this campaign yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Node Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {nodeTypes.map(({ type, icon: Icon, count }) => (
              <div key={type} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{type}</span>
                </div>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Relationships</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {relationshipTypes
              .filter(({ count }) => count > 0)
              .map(({ type, count }) => (
                <div key={type} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <span className="text-sm">{type}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}

            <Separator className="my-3" />

            <div className="text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Total Nodes:</span>
                <span>{nodes.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Connections:</span>
                <span>{edges.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
