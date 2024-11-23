# Master Plan for Territory-Grabbing Game

## Table of Contents
- [Introduction](#introduction)
- [Technical Stack](#technical-stack)
- [Features](#features)
- [Gameplay Mechanics](#gameplay-mechanics)
- [Implementation Details](#implementation-details)
- [Deployment Strategy](#deployment-strategy)
- [Conclusion](#conclusion)

## Introduction

This document outlines a comprehensive plan for developing a 2D overhead, territory-grabbing game. Inspired by classic games like Pokémon, players navigate a world using WASD controls but cannot directly alter the environment. Instead, they must interact with AI agents (NPCs) to influence the game world. The game incorporates modern web technologies and aims to provide an engaging multiplayer experience.

## Technical Stack

### Overview

- **Frontend**: Next.js (React) hosted on Vercel
- **Backend**: Supabase (PostgreSQL and Realtime features)
- **Game Server**: `bun` runtime
- **Language**: TypeScript
- **Billing**: Stripe API
- **Deployment**: Vercel for frontend, custom server for `bun` instance
- **Additional Tools**: Supabase Auth, Supabase Realtime, React Hooks, WebSockets

### Components

1. **Supabase**
   - Database: Stores user data, game states, NPC data, and more.
   - Auth: Handles user authentication and authorization.
   - Realtime: Facilitates real-time game updates and interactions.

2. **Next.js / React**
   - Server-side rendering for SEO and performance.
   - React components for dynamic UI.
   - API routes for serverless functions if needed.

3. **`bun` Game Server**
   - Handles game logic that requires server-side computation.
   - Manages NPC AI behaviors and interactions.
   - Maintains real-time game state synchronization.

4. **Stripe Billing**
   - Processes payments for in-game purchases or premium features.
   - Secure and compliant with payment regulations.

5. **Landing Page**
   - Built with Next.js for consistency.
   - Includes a promotional video showcasing gameplay.
   - Information pages about game mechanics and features.

## Features

1. **Authentication**
   - **Login/Signup with Supabase**: Secure user authentication using email/password or OAuth providers.

2. **Real-time Gameplay**
   - **Supabase Realtime**: Synchronizes game state across all connected clients.

3. **Game Rooms**
   - **Create a Game Room**: Users can initiate new game sessions.
   - **Invite Others**: Shareable links or codes to invite friends.
   - **Spectator Mode**: Non-players can watch ongoing games.

4. **Communication**
   - **In-Game Chat**: Players can talk to NPCs and other players.
   - **Proximity-Based Visibility**: Speech bubbles appear based on player proximity.

## Gameplay Mechanics

1. **World Generation**
   - **Map Spawn**: Fixed-size map with randomly generated terrain (forests, mountains, lakes).
   - **NPC Placement**: Random distribution of NPCs with varying traits.

2. **NPC Behavior**
   - **Actions**: Mine resources, build structures, attack enemy structures.
   - **Affiliations**: NPCs can align with players based on interactions.
   - **Internal States**: Each NPC has memories, personalities, drives, and goals influenced by player interactions.

3. **Player Interaction**
   - **Movement**: Navigate the world using WASD controls.
   - **Communication**: Talk to NPCs to persuade them to act.

4. **Structures and Territory**
   - **Building Creation**: NPCs build structures that claim territory over time.
   - **Territory Control**: Structures expand a player's influence.

5. **End Game Conditions**
   - **Victory**: First player to control over 50% of the map wins.
   - **NPC Affiliation Dynamics**: NPCs can switch allegiance based on player interactions.

## Implementation Details

### Frontend (Next.js/React)

- **State Management**: Use React Context or Redux for global state.
- **Map Rendering**: Canvas or SVG elements to render the game world.
- **Player and NPC Representation**: Sprites or simple shapes with animations.
- **User Interface**: HUD displaying player stats, mini-map, chat window.

### Backend (Supabase and `bun`)

- **Database Schema**:
  - Users: ID, username, email, stats.
  - Game Rooms: ID, settings, active players, map seed.
  - NPCs: ID, attributes, current state, memory logs.
  - Structures: ID, type, owner, location, build timer.

- **Game Logic Server (`bun`)**:
  - Handles complex computations like NPC AI.
  - Processes player inputs and updates game state.
  - Communicates with Supabase for real-time updates.

### Real-time Interactions

- **Supabase Realtime**:
  - Listens to changes in the database and pushes updates to clients.
  - Ensures all players see consistent game state.

- **WebSockets**:
  - May be used for low-latency communication between `bun` server and clients.

### NPC AI Implementation

- **Personality Traits**: Defined by parameters (e.g., aggression, friendliness).
- **Memory System**: Logs interactions with players to influence future behavior.
- **Decision-Making**:
  - Goal-Oriented Action Planning (GOAP) for NPC actions.
  - Influence from player communications.

### Billing and Landing Pages

- **Stripe Integration**:
  - Secure payment forms.
  - Webhooks to handle payment events.

- **Landing Page**:
  - Responsive design with Next.js.
  - Embedded gameplay video using HTML5 video or external platforms like YouTube/Vimeo.
  - SEO optimization for visibility.

### Additional Pages

- **About the Game**: Explains game mechanics and objectives.
- **How to Play**: Guides new players through controls and strategies.
- **Contact and Support**: Channels for user feedback and assistance.

## Deployment Strategy

- **Frontend (Next.js) on Vercel**
  - Continuous Deployment from the main branch.
  - Environment variables managed securely.

- **`bun` Game Server**
  - Deployed on a scalable cloud service (e.g., AWS, DigitalOcean).
  - Load balancing if scaling is needed in the future.

- **Supabase**
  - Managed hosting with automatic scaling.
  - Regular backups and security audits.

- **Domain and SSL**
  - Custom domain with SSL certificates.
  - Ensure secure connections for all endpoints.

## Conclusion

This master plan outlines the development of a unique, AI-driven territory-grabbing game using modern web technologies. By leveraging Supabase for real-time features and authentication, Next.js for a robust frontend, and `bun` for efficient server-side game logic, we aim to create an engaging and scalable multiplayer experience. The game's innovative mechanics focus on player communication and AI interaction, providing a fresh take on strategy and territory control games.

# Next Steps

- **Prototype Development**: Begin building a minimal viable product (MVP) to test core mechanics.
- **Asset Creation**: Design sprites, map tiles, and UI elements.
- **Testing**: Implement unit tests and conduct playtesting sessions.
- **Marketing**: Develop promotional materials and plan a marketing strategy for launch.




----------------------------------



# ORIGINAL PLAN


I would like to make a pokemon-style game (in the sense that it's an overhead 2-d world with WASD navigation) using supabase.

It should be a territory-grabbing game where the players cannot directly grab territory. Instead, they have to convince AI agents to grab territory for them.

I'd like you to create a master plan in a markdown document for gameplay details, and implementation details about how this would be implemented.

Here are the things I would like you to include:

# Technical Details
- Supabase
- Typescript
- Next.JS / Vercel / React
- `bun` for the game server -- we'll just use one bun instance for now.
- Stripe billing
- Landing Page with video of gameplay
- A few pages which talk about the game, and what it's all about

# Features
1. Login / Signup with Supabase
2. Realtime with Supabase
3. Create a game-room
4. Invite others to your game
5. Ability to make the game spectatable to non-players

# Gameplay
1. A map is spawned of some fixed size, with randomly generated terrain and some number of NPCs.
2. The NPCs are the only ones who can act on the environment, to mine things, attack structures, or create structures.
3. When structures are created, they begin a timer that grabs that territory.
4. The player can ONLY perform two actions:
     (A) move
     (B) talk
5. As such, the player must convince the AIs to do different actions (mine, build, attack)
6. Players should be able to see each-others' speech, and the speech of other AIs when they are in close proximity. When they are at a far distance, it should just appear as `...` bubbles.
7.  The AIs should all have internal memories, personalities, drives, and goals.
8. The game terminates when one player has taken over more than 50% of the map.
9. The AIs can create buildings that are affiliated with any player