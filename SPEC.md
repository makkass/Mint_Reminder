# Mint Reminder — Specification

## Concept & Vision

A sleek, cyberpunk-inspired NFT mint countdown tracker that lives in your browser. It serves as your personal mint command center — tracking upcoming drops with precision countdowns, firing audible alerts at critical thresholds (10min, 5min, 1min), and announcing mint start times with text-to-speech. The app feels like a high-tech trading terminal: dark, glowing, information-dense, yet effortlessly readable.

## Design Language

### Aesthetic Direction
Cyberpunk terminal meets modern dashboard — deep space blacks with electric cyan and purple accents. Think Bloomberg Terminal redesigned for the NFT generation. Glass morphism touches with subtle gradients.

### Color Palette
- **Primary**: `#22D3EE` (Cyan-400) — active states, countdowns, CTAs
- **Secondary**: `#A855F7` (Purple-500) — sound toggles, WL markers
- **Accent**: `#32FF98` (Mint green) — "MINTING NOW" state
- **Warning/Gold**: `#F59E0B` (Amber-500) — pinned items
- **Background**: `#050B16` (near-black with blue tint)
- **Card Background**: `#0B121D` with 80% opacity
- **Text Primary**: `#F1F5F9` (Slate-100)
- **Text Secondary**: `#64748B` (Slate-500)
- **Text Muted**: `#94A3B8` (Slate-400)
- **Borders**: `rgba(255,255,255,0.05)` — subtle glass edges

### Typography
- **Font Family**: System sans-serif stack (no external fonts needed for perf)
- **Headings**: Black weight (900), tight tracking (-0.02em)
- **Labels**: Uppercase, 10px, letter-spacing 0.1em, slate-500
- **Body**: Medium weight (500), slate-400

### Spatial System
- Card padding: 24px
- Card border-radius: 32px
- Grid gap: 24px
- Inner box padding: 16px
- Button border-radius: 16-20px

### Motion Philosophy
- **Entrance**: Fade + slide up (opacity 0→1, y: 20→0), 300ms ease-out
- **Exit**: Scale down + fade (opacity 0, scale 0.95), 200ms
- **Hover**: Border glow transitions, 300ms
- **Countdowns**: No animation (instant updates for precision)
- **Mint Start Pulse**: CSS pulse animation with glow shadow

### Visual Assets
- **Icons**: Lucide React — consistent 18-20px stroke icons
- **Decorative**: Subtle gradient overlays on hover, glow shadows on active elements
- **X/Twitter**: Custom SVG logo inline

## Layout & Structure

### Page Architecture
```
┌─────────────────────────────────────────────────────────┐
│  HEADER                                                 │
│  ┌─────────────────────┐  ┌─────────────────────────┐ │
│  │ Logo + Tagline       │  │ Action Buttons Row      │ │
│  └─────────────────────┘  └─────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│  PINNED SECTION (conditional)                           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│  │ Mint    │ │ Mint    │ │ Mint    │                   │
│  │ Card    │ │ Card    │ │ Card    │                   │
│  └─────────┘ └─────────┘ └─────────┘                   │
├─────────────────────────────────────────────────────────┤
│  ALL MINTS SECTION                                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│  │ Mint    │ │ Mint    │ │ Mint    │                   │
│  │ Card    │ │ Card    │ │ Card    │                   │
│  └─────────┘ └─────────┘ └─────────┘                   │
│                                                         │
│  (Empty State: Centered illustration + CTA)            │
├─────────────────────────────────────────────────────────┤
│  FOOTER: Privacy note, centered                        │
└─────────────────────────────────────────────────────────┘
```

### Responsive Strategy
- Mobile: Single column cards, stacked header
- Tablet: 2-column card grid
- Desktop: 3+ columns, side-by-side header layout
- Cards have fixed width (410px) on larger screens, full width on mobile

## Features & Interactions

### Core Features

#### 1. Mint Card Management
- **Add Mint**: Opens modal form with fields for name, date, price, supply, links, GTD/WL toggles
- **Edit Mint**: Click edit icon → same modal pre-filled
- **Delete Mint**: Click trash → immediate removal with exit animation
- **Pin Mint**: Toggle pin icon → moves card to Pinned section with gold border accent

#### 2. Countdown Timer
- Live countdown in `Xd Xh Xm Xs` format (2-row layout: days+hours, minutes+seconds)
- When mint starts: Shows "MINTING" in pulsing green
- Updates every second via `setInterval`

#### 3. Alert System
- **Thresholds**: 10 minutes, 5 minutes, 1 minute before mint
- **Sound**: Web Audio API generates urgency-based tones
  - High (1min): 880→1100→1320Hz pattern, faster
  - Medium (5min): 660→880Hz pattern
  - Low (10min): 520→660Hz pattern
- **Speech**: Turkish TTS announces "X Mintine son Y dakika" or "X Minti başladı!"
- **Browser Notifications**: Request permission → fire native notifications
- **Per-card toggles**: Sound and notification can be disabled per mint
- **One-time fire**: Each threshold fires only once per mint (tracked in Ref Set)

#### 4. GTD / WL Toggle
- Checkbox-style buttons for "Go To Deck" and "Whitelist" status
- Visual indicator: cyan glow for GTD, purple glow for WL

#### 5. Data Persistence
- All mints saved to `localStorage` under key `mint-reminders`
- Loads on app mount, saves on every change

### Interaction Details

| Element | Hover | Click | Active |
|---------|-------|-------|--------|
| Bell icon (notify) | Cyan glow | Toggle on/off | Filled cyan |
| Volume icon | Purple glow | Toggle on/off | Filled purple |
| Edit icon | Cyan tint | Open edit modal | — |
| Trash icon | Red tint | Delete mint | — |
| Pin icon | Amber tint | Toggle pin | Rotate 45°, amber |
| GTD checkbox | Border glow | Toggle state | Cyan checkmark |
| WL checkbox | Border glow | Toggle state | Purple checkmark |
| Official Links | Brighten | Open in new tab | — |
| Add button | Scale 1.02, brighter | Open add modal | Scale 0.98 |

### Edge Cases
- **Past date entered**: Shows "MINTING" immediately
- **Empty state**: Friendly message in Turkish with CTA
- **Notification denied**: Shows blocked status, explains issue
- **No speech synthesis**: Silently skips TTS
- **Mint deleted**: Cleans up fired alert refs

## Component Inventory

### 1. MintCard
- **States**: Default, Pinned (gold border), Minting (green pulse)
- **Inner boxes**: Name, Date, Time Left, Price+Supply
- **Action row**: Pin, Bell, Volume, Edit, Delete
- **Checkbox row**: GTD, WL
- **CTA**: External links button

### 2. MintFormModal
- **States**: Add mode, Edit mode (pre-filled)
- **Fields**: Name (required), Date (required), Price, Supply, Links, GTD, WL
- **Buttons**: Cancel (ghost), Submit (cyan primary)
- **Backdrop**: Black 80% with blur

### 3. CountdownDisplay
- **States**: Counting (cyan), Minting (green pulse)
- **Format**: 2-row stacked, monospace numerals

### 4. Clock
- **Display**: Live HH:mm:ss updating every second
- **Location**: Header subtitle

### 5. Header
- **Logo**: Gradient text "Mint Reminder"
- **Tagline**: Local time display
- **Actions**: Notification enable, X profile link, Sound test, Add mint

## Technical Approach

### Framework
- **React 18** with TypeScript
- **Vite** for bundling
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **date-fns** for date formatting
- **Lucide React** for icons

### State Management
- `useState` for mints array, modal states
- `useRef` for alert tracking (firedAlerts, alertQueue, processing flag)
- `useCallback` for memoized alert processor
- `useEffect` for intervals and localStorage sync

### Key Implementation Details
- AudioContext created fresh per sound play (browser policy)
- Speech synthesis with Turkish voice preference
- Notification permission request flow
- ISO date storage with datetime-local input conversion
- `crypto.randomUUID()` for mint IDs
