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