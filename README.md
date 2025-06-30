# The Spider's Web

The Spider's Web is a web-based tool for Dungeon Masters and worldbuilders to visually map, track, and manage dynamic relationships between NPCs, factions, players, and abstract concepts in tabletop RPG campaigns. It features an interactive, node-based graph where each node represents a character, group, location, or idea, and connections (edges) carry rich metadata such as relationship type, strength, directionality, tags, and notes. The tool is designed to aid worldbuilding, improvisation, and political storytelling by providing an at-a-glance view of how everyone is connected—and how those relationships evolve over time.

## Key Features
- Interactive relationship graph with drag-and-drop, zoom, and pan
- Multiple node types (NPC, PC, Faction, Location, Abstract) with icons and colors
- Rich relationship metadata: type, strength, directionality, tags, notes
- Dynamic tag and description display for nodes
- Explode/force-directed layout for visual clarity
- High-contrast, theme-aware relationship labels
- Campaign and session management
- Search and filter by name, type, tag, and relationship
- Import/export campaign data (JSON)
- Dark mode and accessibility support
- Responsive design (desktop and mobile)

## Tech Stack
- **Framework:** Next.js (React, TypeScript)
- **State Management:** Zustand
- **Styling:** Tailwind CSS
- **Graph Layout:** Custom force-directed and radial algorithms
- **Component Library:** Custom + Radix UI primitives
- **Build Tool:** pnpm

## Getting Started
1. Clone the repository
2. Install dependencies with `pnpm install`
3. Run the development server with `pnpm dev`
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Roadmap
See `reference/originalPrompt.txt` for the full feature outline and roadmap. 