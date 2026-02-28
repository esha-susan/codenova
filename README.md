# codenova
# HerCode Odyssey 🐉

## Basic Details

### Team Name: Demon SlayHer

### Team Members
- **Member 1:** Gowri M M - Model Engineering College
- **Member 2:** Esha Susan Shaji - Model Engineering College

### Hosted Project Link
[[Add your hosted link here]](https://codenova4.vercel.app/)

---

## Project Description

HerCode Odyssey is a 2D pixel-art RPG learning game designed to teach Python programming through an immersive fantasy adventure. Players take on the role of an Initiate tasked with restoring the corrupted Grid of Emberwood by solving progressively challenging coding puzzles. The game blends pixel-art aesthetics, gamification mechanics, and hands-on coding practice to make learning fun and engaging — built specifically for women entering tech.

---

## The Problem Statement

Traditional coding education platforms are dry, intimidating, and fail to engage beginners — especially women and underrepresented groups in tech. Most platforms treat coding as a chore rather than an adventure, leading to high drop-off rates and low motivation among new learners.

---

## The Solution

HerCode Odyssey wraps Python learning inside a pixel-art RPG experience. Each coding challenge is a "hunt" set inside a fantasy world. Players earn XP, level up, unlock new regions on a kingdom map, and battle corrupted code through story-driven missions. By combining narrative, visual feedback, and incremental difficulty, the game transforms coding practice into an immersive journey — making learners want to return and progress.

---

## Technical Details

### Technologies / Components Used

**Languages:**
- TypeScript / JavaScript

- CSS

**Frameworks:**
- React (frontend UI)
- Phaser (2D game engine for in-game scenes)
- Node.js / Express (backend API)

**Libraries:**
- `axios` — API communication
- `react-router-dom` — screen/route management
- Custom pixel-art CSS design system (no UI framework dependency)

**Tools:**
- VS Code
- Git & GitHub
- Vite (build tool)
- Supabase (authentication & database)
- Postman (API testing)

---

## Features

- 🗺️ **Kingdom Map** — An interactive pixel-art world map with castle-style hunt nodes across 7 Restoration Hunts and 3 Dragon Sigil Finale Trials, with animated state changes (locked / active / completed)
- 🧙‍♀️ **RPG Progression System** — XP bar, player levels, and checkpoints that unlock progressively, keeping learners motivated
- ⚔️ **Duel Arena** — Live coding duels where players compete to solve challenges fastest
- 🐉 **Story-Driven Narrative** — Each hunt has a unique narrative intro, blending fantasy lore with Python concepts (loops, strings, lists, dicts, recursion, OOP)
- 🎮 **Pixel Art UI** — Fully custom pixel-art interface including an animated title screen, castle map nodes, lore panels, glitch effects, and atmospheric animations (aurora, fireflies, perspective grid)
- 🔐 **Authentication** — Secure sign-up / login via Supabase Auth with persistent progress tracking

---

## Implementation

### For Software

#### Installation

```bash
# Clone the repository
git clone https://github.com/esha-susan/codenova.git
cd codenova

# Install frontend dependencies
npm install



#### Run

```bash
# Run the frontend (from root)
npm run dev

# Run the backend (from /server)
npm run dev
```

---

## Project Documentation

### Screenshots

![Title Screen<img width="1823" height="822" alt="Screenshot 2026-02-28 084800" src="https://github.com/user-attachments/assets/ea06adf9-bac7-4af2-b4a9-6020edfd5c29" />

*The animated pixel-art title screen — featuring the HERCODE ODYSSEY logo with 8-bit stacked shadow, glitch effects, aurora background, twinkling stars, and a gold CTA button with rotating border glow*

![Kingdom Map](scr<img width="1881" height="853" alt="Screenshot 2026-02-28 085518" src="https://github.com/user-attachments/assets/77434ed2-df3a-40c3-a7a3-c69198566249" />

*The Emberwood Kingdom Map — each hunt is represented as a pixel-art castle tower with 3 states (locked stone / active gold glow / completed green). Atmospheric background with misty hills, fireflies, and a Dragon Gate finale*

![Game Scr<img width="1912" height="879" alt="Screenshot 2026-02-28 085647" src="https://github.com/user-attachments/assets/9378aea2-66c0-42e0-a1ae-fa455aaa873c" />

*The in-game coding challenge screen — players solve Python puzzles to restore corrupted runes, with narrative context, a code editor, and XP rewards on completion*

---<img width="1895" height="903" alt="Screenshot 2026-02-28 085744" src="https://github.com/user-attachments/assets/6ed4d7b1-312e-48c4-b9e1-6de8762fcd0d" />


### Diagrams

#### System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT (React + Phaser)           │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Title   │  │  Map     │  │   Game Screen     │  │
│  │  Screen  │  │  Screen  │  │  (Phaser Scene)   │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
│        │            │                 │              │
│        └────────────┴────────┬────────┘              │
│                              │                       │
│                    GameContext (React)                │
│                  AuthContext (Supabase)               │
└──────────────────────────────┼──────────────────────┘
                               │ HTTP / REST
                    ┌──────────▼──────────┐
                    │   Backend API       │
                    │  (Node / Express)   │
                    │                    │
                    │  /api/checkpoints  │
                    │  /api/progress     │
                    │  /api/submit       │
                    │  /api/duel         │
                    └──────────┬─────────┘
                               │
                    ┌──────────▼─────────┐
                    │    Supabase        │
                    │  PostgreSQL DB     │
                    │  Auth Service      │
                    └────────────────────┘
```

#### Application Workflow

```
User opens app
      │
      ▼
 Title Screen  ──────────────────────────────────►  Auth Screen
                                                        │
                                              Sign Up / Sign In
                                                        │
                                                        ▼
                                               Kingdom Map Screen
                                                        │
                                          Select unlocked Hunt node
                                                        │
                                                        ▼
                                              Narrative Intro Screen
                                                        │
                                                        ▼
                                           Game Screen (Phaser + Editor)
                                                        │
                                          ┌─────────────┴───────────────┐
                                          │                             │
                                     Pass ✓                        Fail ✗
                                          │                             │
                                   XP Awarded                    Retry / Hint
                                   Next Hunt Unlocked
                                          │
                                          ▼
                                   Back to Map Screen
```

---

## Additional Documentation

### API Documentation



#### `GET /api/checkpoints`

- **Description:** Returns all available checkpoints (hunts + finale trials) in order
- **Headers:** `Authorization: Bearer <token>`
- **Response:**

```json
{
  "status": "success",
  "data": {
    "checkpoints": [
      {
        "id": "cp_001",
        "title": "The Loop Lab",
        "order_index": 1,
        "narrative_intro": "The first rune is fractured...",
        "xp_reward": 100
      }
    ]
  }
}
```

---

#### `GET /api/progress`

- **Description:** Returns the authenticated user's progress across all checkpoints
- **Headers:** `Authorization: Bearer <token>`
- **Response:**

```json
{
  "status": "success",
  "data": {
    "progress": [
      {
        "checkpoint_id": "cp_001",
        "status": "completed",
        "attempt_count": 2
      },
      {
        "checkpoint_id": "cp_002",
        "status": "unlocked",
        "attempt_count": 0
      }
    ]
  }
}
```

---

#### `POST /api/submit`

- **Description:** Submits a code solution for a checkpoint and evaluates it
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**

```json
{
  "checkpoint_id": "cp_001",
  "code": "for i in range(5):\n    print(i)"
}
```

- **Response (pass):**

```json
{
  "status": "success",
  "passed": true,
  "xp_awarded": 100,
  "message": "Rune restored! The Grid grows stronger."
}
```

- **Response (fail):**

```json
{
  "status": "success",
  "passed": false,
  "xp_awarded": 0,
  "message": "The corruption holds. Try again.",
  "hint": "Check your loop range."
}
```

---

#### `GET /api/profile`

- **Description:** Returns the authenticated user's profile — username, level, XP
- **Headers:** `Authorization: Bearer <token>`
- **Response:**

```json
{
  "status": "success",
  "data": {
    "username": "ShadowCoder",
    "level": 3,
    "xp": 420
  }
}
```

---

## Team

Built with 💛 by **Demon SlayHer** — inspired by Ada Lovelace, designed for women in tech.
