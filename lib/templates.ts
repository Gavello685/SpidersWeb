import type { Campaign } from "@/lib/storage"

type TemplateDef = Omit<Campaign, "id" | "name" | "createdAt" | "updatedAt">

export interface CampaignTemplate {
  id: string
  name: string
  description: string
  preview: string // one-liner shown in UI
  data: TemplateDef
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "mystery-web",
    name: "Mystery Web",
    preview: "A web of suspects, clues, and secrets around a central crime.",
    description: "A mystery investigation template with suspects, witnesses, and hidden connections.",
    data: {
      description: "A mystery investigation template.",
      nodes: [
        { id: "n1", type: "abstract", position: { x: 400, y: 200 }, data: { name: "The Crime", type: "Abstract", status: "Active", description: "The central event to be investigated.", tags: ["crime", "mystery"] } },
        { id: "n2", type: "npc", position: { x: 200, y: 380 }, data: { name: "Suspect A", type: "NPC", status: "Alive", description: "Has motive but denies involvement.", tags: ["suspect"] } },
        { id: "n3", type: "npc", position: { x: 400, y: 400 }, data: { name: "Suspect B", type: "NPC", status: "Alive", description: "Was seen near the scene.", tags: ["suspect"] } },
        { id: "n4", type: "npc", position: { x: 600, y: 380 }, data: { name: "Suspect C", type: "NPC", status: "Alive", description: "Has a secret alibi.", tags: ["suspect"] } },
        { id: "n5", type: "npc", position: { x: 250, y: 550 }, data: { name: "Key Witness", type: "NPC", status: "Alive", description: "Saw something they won't admit.", tags: ["witness"] } },
        { id: "n6", type: "location", position: { x: 580, y: 550 }, data: { name: "Crime Scene", type: "Location", status: "Known", description: "Where it all happened.", tags: ["location"] } },
        { id: "n7", type: "npc", position: { x: 400, y: 600 }, data: { name: "The Investigator", type: "PC", status: "Alive", description: "The player character leading the investigation.", tags: ["pc"] } },
      ],
      edges: [
        { id: "e1", source: "n2", target: "n1", label: "Motive (60)", data: { relationshipType: "Rival", strength: 60, notes: "", tags: [], directional: true, direction: "source-to-target", hiddenFromPlayers: false } },
        { id: "e2", source: "n3", target: "n1", label: "Opportunity (50)", data: { relationshipType: "Neutral", strength: 50, notes: "", tags: [], directional: true, direction: "source-to-target", hiddenFromPlayers: false } },
        { id: "e3", source: "n4", target: "n1", label: "Secret (40)", data: { relationshipType: "Secret", strength: 40, notes: "Hidden connection to the crime.", tags: ["secret"], directional: true, direction: "source-to-target", hiddenFromPlayers: true } },
        { id: "e4", source: "n2", target: "n3", label: "Ally (70)", data: { relationshipType: "Ally", strength: 70, notes: "They're covering for each other.", tags: [], directional: false, direction: "bidirectional", hiddenFromPlayers: true } },
        { id: "e5", source: "n5", target: "n6", label: "Witness (80)", data: { relationshipType: "Neutral", strength: 80, notes: "", tags: [], directional: true, direction: "source-to-target", hiddenFromPlayers: false } },
        { id: "e6", source: "n7", target: "n1", label: "Investigates (90)", data: { relationshipType: "Neutral", strength: 90, notes: "", tags: [], directional: true, direction: "source-to-target", hiddenFromPlayers: false } },
      ],
      journal: [],
      goals: [
        { id: "g1", title: "Identify the culprit", status: "open", notes: "Gather enough evidence to accuse.", linkedNodeIds: ["n1"], session: {} },
        { id: "g2", title: "Speak with the Key Witness", status: "open", notes: "They know more than they let on.", linkedNodeIds: ["n5"], session: {} },
      ],
      groups: [],
      tagColors: { suspect: "#ef4444", witness: "#3b82f6", secret: "#8b5cf6" },
    },
  },
  {
    id: "faction-war",
    name: "Faction War",
    preview: "Three factions in conflict — shifting alliances and hidden agendas.",
    description: "A political conflict template with three factions, key leaders, and contested territory.",
    data: {
      description: "A faction war template.",
      nodes: [
        { id: "n1", type: "faction", position: { x: 300, y: 200 }, data: { name: "The Iron Circle", type: "Faction", status: "Active", description: "A militaristic faction seeking territorial dominance.", tags: ["faction", "military"] } },
        { id: "n2", type: "faction", position: { x: 600, y: 200 }, data: { name: "The Silver Court", type: "Faction", status: "Active", description: "A wealthy merchant guild with political ambitions.", tags: ["faction", "merchant"] } },
        { id: "n3", type: "faction", position: { x: 450, y: 450 }, data: { name: "The Ash Brotherhood", type: "Faction", status: "Active", description: "A secretive cult playing both sides.", tags: ["faction", "secret"] } },
        { id: "n4", type: "npc", position: { x: 200, y: 350 }, data: { name: "General Morreth", type: "NPC", status: "Alive", description: "Leader of the Iron Circle. Ruthless and ambitious.", tags: ["leader"] } },
        { id: "n5", type: "npc", position: { x: 720, y: 350 }, data: { name: "Lady Voss", type: "NPC", status: "Alive", description: "Head of the Silver Court. Charming but dangerous.", tags: ["leader"] } },
        { id: "n6", type: "npc", position: { x: 450, y: 600 }, data: { name: "The Pale Envoy", type: "NPC", status: "Unknown", description: "A mysterious agent of the Ash Brotherhood.", tags: ["leader", "secret"], hiddenFromPlayers: true } },
        { id: "n7", type: "location", position: { x: 450, y: 270 }, data: { name: "The Contested City", type: "Location", status: "Known", description: "The prize all three factions are fighting over.", tags: ["location"] } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2", label: "Enemy (85)", data: { relationshipType: "Enemy", strength: 85, notes: "Open warfare in the streets.", tags: [], directional: false, direction: "bidirectional", hiddenFromPlayers: false } },
        { id: "e2", source: "n3", target: "n1", label: "Secret (60)", data: { relationshipType: "Secret", strength: 60, notes: "The Brotherhood funds the Iron Circle secretly.", tags: ["secret"], directional: true, direction: "source-to-target", hiddenFromPlayers: true } },
        { id: "e3", source: "n3", target: "n2", label: "Secret (55)", data: { relationshipType: "Secret", strength: 55, notes: "The Brotherhood is also advising the Silver Court.", tags: ["secret"], directional: true, direction: "source-to-target", hiddenFromPlayers: true } },
        { id: "e4", source: "n4", target: "n1", label: "Leads (95)", data: { relationshipType: "Subordinate", strength: 95, notes: "", tags: [], directional: true, direction: "source-to-target", hiddenFromPlayers: false } },
        { id: "e5", source: "n5", target: "n2", label: "Leads (90)", data: { relationshipType: "Subordinate", strength: 90, notes: "", tags: [], directional: true, direction: "source-to-target", hiddenFromPlayers: false } },
        { id: "e6", source: "n4", target: "n5", label: "Rival (70)", data: { relationshipType: "Rival", strength: 70, notes: "Personal vendetta between the two leaders.", tags: [], directional: false, direction: "bidirectional", hiddenFromPlayers: false } },
        { id: "e7", source: "n6", target: "n3", label: "Envoy (80)", data: { relationshipType: "Subordinate", strength: 80, notes: "", tags: ["secret"], directional: true, direction: "source-to-target", hiddenFromPlayers: true } },
      ],
      journal: [],
      goals: [
        { id: "g1", title: "Discover who is funding the Iron Circle", status: "open", notes: "", linkedNodeIds: ["n1", "n3"], session: {} },
        { id: "g2", title: "Broker a temporary ceasefire", status: "open", notes: "", linkedNodeIds: ["n4", "n5"], session: {} },
      ],
      groups: [
        { id: "gr1", name: "Active Factions", nodeIds: ["n1", "n2", "n3"], color: "#ef4444" },
      ],
      tagColors: { faction: "#ef4444", leader: "#f97316", secret: "#8b5cf6", military: "#6b7280" },
    },
  },
  {
    id: "heist-crew",
    name: "Heist Crew",
    preview: "A crew of specialists, the target, and all the complications in between.",
    description: "A heist template with a target, the crew, complications, and the big score.",
    data: {
      description: "A heist planning template.",
      nodes: [
        { id: "n1", type: "abstract", position: { x: 450, y: 180 }, data: { name: "The Score", type: "Abstract", status: "Active", description: "The heist target — a vault, an artifact, a secret.", tags: ["target"] } },
        { id: "n2", type: "npc", position: { x: 200, y: 180 }, data: { name: "The Mastermind", type: "PC", status: "Alive", description: "Plans the job. What could go wrong?", tags: ["crew"] } },
        { id: "n3", type: "npc", position: { x: 200, y: 360 }, data: { name: "The Muscle", type: "PC", status: "Alive", description: "Handles security and brute force.", tags: ["crew"] } },
        { id: "n4", type: "npc", position: { x: 700, y: 360 }, data: { name: "The Inside Man", type: "NPC", status: "Alive", description: "Has access to the target. Loyalty unclear.", tags: ["contact", "complication"] } },
        { id: "n5", type: "npc", position: { x: 700, y: 180 }, data: { name: "The Mark", type: "NPC", status: "Alive", description: "The target's owner or guardian.", tags: ["antagonist"] } },
        { id: "n6", type: "location", position: { x: 450, y: 380 }, data: { name: "The Vault", type: "Location", status: "Unknown", description: "The physical location of the score.", tags: ["location", "target"] } },
        { id: "n7", type: "npc", position: { x: 450, y: 560 }, data: { name: "The Fence", type: "NPC", status: "Alive", description: "Will pay for the stolen goods. Has a cut.", tags: ["contact"] } },
        { id: "n8", type: "npc", position: { x: 200, y: 540 }, data: { name: "The Loose End", type: "NPC", status: "Alive", description: "Knows too much. A liability.", tags: ["complication"], hiddenFromPlayers: true } },
      ],
      edges: [
        { id: "e1", source: "n2", target: "n1", label: "Plans (90)", data: { relationshipType: "Neutral", strength: 90, notes: "", tags: [], directional: true, direction: "source-to-target", hiddenFromPlayers: false } },
        { id: "e2", source: "n2", target: "n3", label: "Crew (85)", data: { relationshipType: "Ally", strength: 85, notes: "", tags: [], directional: false, direction: "bidirectional", hiddenFromPlayers: false } },
        { id: "e3", source: "n4", target: "n6", label: "Access (75)", data: { relationshipType: "Neutral", strength: 75, notes: "Has a key or code.", tags: [], directional: true, direction: "source-to-target", hiddenFromPlayers: false } },
        { id: "e4", source: "n5", target: "n1", label: "Guards (80)", data: { relationshipType: "Neutral", strength: 80, notes: "", tags: [], directional: true, direction: "source-to-target", hiddenFromPlayers: false } },
        { id: "e5", source: "n2", target: "n4", label: "Contact (50)", data: { relationshipType: "Neutral", strength: 50, notes: "Hired through a mutual contact.", tags: [], directional: false, direction: "bidirectional", hiddenFromPlayers: false } },
        { id: "e6", source: "n7", target: "n2", label: "Deal (70)", data: { relationshipType: "Neutral", strength: 70, notes: "", tags: [], directional: true, direction: "source-to-target", hiddenFromPlayers: false } },
        { id: "e7", source: "n8", target: "n4", label: "Knows (65)", data: { relationshipType: "Secret", strength: 65, notes: "The loose end has dirt on the inside man.", tags: ["secret"], directional: true, direction: "source-to-target", hiddenFromPlayers: true } },
      ],
      journal: [],
      goals: [
        { id: "g1", title: "Case the vault", status: "open", notes: "Find guard rotations and access points.", linkedNodeIds: ["n6"], session: {} },
        { id: "g2", title: "Secure a buyer", status: "open", notes: "", linkedNodeIds: ["n7"], session: {} },
        { id: "g3", title: "Deal with the loose end", status: "open", notes: "DM only — players don't know yet.", linkedNodeIds: ["n8"], session: {} },
      ],
      groups: [
        { id: "gr1", name: "The Crew", nodeIds: ["n2", "n3"], color: "#22c55e" },
      ],
      tagColors: { crew: "#22c55e", target: "#eab308", complication: "#ef4444", contact: "#06b6d4", antagonist: "#f97316" },
    },
  },
  {
    id: "royal-court",
    name: "Royal Court",
    preview: "Nobles, alliances, betrayals, and the scramble for royal favor.",
    description: "A political intrigue template set in a royal court with noble houses and contested succession.",
    data: {
      description: "A political intrigue template.",
      nodes: [
        { id: "n1", type: "npc", position: { x: 450, y: 160 }, data: { name: "The Monarch", type: "NPC", status: "Alive", description: "Aging ruler whose succession is uncertain.", tags: ["royalty"] } },
        { id: "n2", type: "faction", position: { x: 220, y: 340 }, data: { name: "House Aldren", type: "Faction", status: "Active", description: "Old money. Believes the throne is theirs by right.", tags: ["noble", "faction"] } },
        { id: "n3", type: "faction", position: { x: 680, y: 340 }, data: { name: "House Voryn", type: "Faction", status: "Active", description: "New wealth. Gained favor through commerce.", tags: ["noble", "faction"] } },
        { id: "n4", type: "npc", position: { x: 220, y: 520 }, data: { name: "Lord Aldren", type: "NPC", status: "Alive", description: "Proud patriarch. Will do anything to claim the throne.", tags: ["noble", "leader"] } },
        { id: "n5", type: "npc", position: { x: 680, y: 520 }, data: { name: "Lady Voryn", type: "NPC", status: "Alive", description: "Brilliant strategist. Prefers influence over open conflict.", tags: ["noble", "leader"] } },
        { id: "n6", type: "npc", position: { x: 450, y: 420 }, data: { name: "The King's Spymaster", type: "NPC", status: "Alive", description: "Knows everyone's secrets. Loyal only to coin.", tags: ["spy"], hiddenFromPlayers: true } },
        { id: "n7", type: "npc", position: { x: 450, y: 590 }, data: { name: "The Bastard Heir", type: "NPC", status: "Unknown", description: "A secret claimant to the throne. Hidden from court.", tags: ["royalty", "secret"], hiddenFromPlayers: true } },
        { id: "n8", type: "pc", position: { x: 150, y: 160 }, data: { name: "The Party", type: "PC", status: "Alive", description: "The players, navigating the court's dangerous politics.", tags: ["pc"] } },
      ],
      edges: [
        { id: "e1", source: "n2", target: "n3", label: "Rival (80)", data: { relationshipType: "Rival", strength: 80, notes: "Competing for succession.", tags: [], directional: false, direction: "bidirectional", hiddenFromPlayers: false } },
        { id: "e2", source: "n4", target: "n2", label: "Leads (95)", data: { relationshipType: "Subordinate", strength: 95, notes: "", tags: [], directional: true, direction: "source-to-target", hiddenFromPlayers: false } },
        { id: "e3", source: "n5", target: "n3", label: "Leads (90)", data: { relationshipType: "Subordinate", strength: 90, notes: "", tags: [], directional: true, direction: "source-to-target", hiddenFromPlayers: false } },
        { id: "e4", source: "n4", target: "n1", label: "Seeks Favor (70)", data: { relationshipType: "Neutral", strength: 70, notes: "", tags: [], directional: true, direction: "source-to-target", hiddenFromPlayers: false } },
        { id: "e5", source: "n5", target: "n1", label: "Seeks Favor (65)", data: { relationshipType: "Neutral", strength: 65, notes: "", tags: [], directional: true, direction: "source-to-target", hiddenFromPlayers: false } },
        { id: "e6", source: "n6", target: "n4", label: "Blackmail (85)", data: { relationshipType: "Secret", strength: 85, notes: "Spymaster has leverage over Lord Aldren.", tags: ["secret"], directional: true, direction: "source-to-target", hiddenFromPlayers: true } },
        { id: "e7", source: "n7", target: "n1", label: "Secret Heir (100)", data: { relationshipType: "Family", strength: 100, notes: "The true heir, hidden to protect their life.", tags: ["secret"], directional: true, direction: "source-to-target", hiddenFromPlayers: true } },
        { id: "e8", source: "n8", target: "n2", label: "Allied (60)", data: { relationshipType: "Ally", strength: 60, notes: "Party is currently working with House Aldren.", tags: [], directional: false, direction: "bidirectional", hiddenFromPlayers: false } },
      ],
      journal: [],
      goals: [
        { id: "g1", title: "Gain an audience with the Monarch", status: "open", notes: "", linkedNodeIds: ["n1"], session: {} },
        { id: "g2", title: "Uncover the Bastard Heir", status: "open", notes: "DM only. Players don't know this plot thread yet.", linkedNodeIds: ["n7"], session: {} },
        { id: "g3", title: "Expose the Spymaster's network", status: "open", notes: "", linkedNodeIds: ["n6"], session: {} },
      ],
      groups: [
        { id: "gr1", name: "Noble Houses", nodeIds: ["n2", "n3", "n4", "n5"], color: "#f97316" },
      ],
      tagColors: { noble: "#f97316", royalty: "#eab308", spy: "#8b5cf6", secret: "#6b7280", faction: "#ef4444" },
    },
  },
]
