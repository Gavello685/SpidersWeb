"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Plus, Calendar, Users, Trash2, Edit, Coffee, ExternalLink } from "lucide-react"
import { useGraphStore } from "@/lib/store"
import type { Campaign } from "@/lib/storage"

interface CampaignSelectorProps {
  onCampaignSelect: (campaign: Campaign) => void
}

export function CampaignSelector({ onCampaignSelect }: CampaignSelectorProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newCampaignName, setNewCampaignName] = useState("")
  const [newCampaignDescription, setNewCampaignDescription] = useState("")

  const { campaigns, loadCampaigns, createCampaign, deleteCampaign } = useGraphStore()

  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  const handleCreateCampaign = () => {
    if (!newCampaignName.trim()) return

    const campaign = createCampaign(newCampaignName.trim(), newCampaignDescription.trim())
    setNewCampaignName("")
    setNewCampaignDescription("")
    setIsCreateModalOpen(false)
    onCampaignSelect(campaign)
  }

  const handleDeleteCampaign = (e: React.MouseEvent, campaignId: string) => {
    e.stopPropagation()
    if (confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) {
      deleteCampaign(campaignId)
    }
  }

  const handleKofiClick = () => {
    window.open("https://ko-fi.com/gavello685#", "_blank", "noopener,noreferrer")
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">The Spider's Web</h1>
          <p className="text-muted-foreground text-lg">
            Manage your tabletop RPG campaigns and character relationships
          </p>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Your Campaigns</h2>

          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                    value={newCampaignName}
                    onChange={(e) => setNewCampaignName(e.target.value)}
                    placeholder="Enter campaign name..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="campaign-description">Description (Optional)</Label>
                  <Textarea
                    id="campaign-description"
                    value={newCampaignDescription}
                    onChange={(e) => setNewCampaignDescription(e.target.value)}
                    placeholder="Describe your campaign..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCampaign} disabled={!newCampaignName.trim()}>
                    Create Campaign
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {campaigns.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-muted-foreground mb-4">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No campaigns yet</h3>
                <p>Create your first campaign to start mapping character relationships</p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Campaign
                </Button>
                <div className="text-sm text-muted-foreground">
                  <span>Enjoying this tool? </span>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleKofiClick}
                    className="text-orange-600 hover:text-orange-700 p-0 h-auto font-normal"
                  >
                    <Coffee className="w-3 h-3 mr-1" />
                    Help me make more
                    <ExternalLink className="w-2 h-2 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((campaign) => (
                <Card
                  key={campaign.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow relative group"
                  onClick={() => onCampaignSelect(campaign)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{campaign.name}</CardTitle>
                        {campaign.description && (
                          <CardDescription className="mt-1 line-clamp-2">{campaign.description}</CardDescription>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                        onClick={(e) => handleDeleteCampaign(e, campaign.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{campaign.nodes.length} characters</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>⚡</span>
                          <span>{campaign.edges.length} relationships</span>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Created: {formatDate(campaign.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Edit className="w-3 h-3" />
                          <span>Updated: {formatDate(campaign.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 text-center">
              <div className="text-sm text-muted-foreground">
                <span>Find this tool helpful? </span>
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleKofiClick}
                  className="text-orange-600 hover:text-orange-700 p-0 h-auto font-normal"
                >
                  <Coffee className="w-3 h-3 mr-1" />
                  Help me make more
                  <ExternalLink className="w-2 h-2 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
