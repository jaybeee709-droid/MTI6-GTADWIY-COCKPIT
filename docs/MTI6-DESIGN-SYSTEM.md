# MTI6 Design System

## 1. Overview
The MTI6 Design System defines the visual language, color tokens, surface hierarchy, and World-Based OS architecture for the MTI6-GTADWIY-COCKPIT foundation (React + Vite + TypeScript + Tailwind CSS).

## 2. Color Palette

### Background & Surface Hierarchy
- Void / Base Canvas: #050505
- Primary Surface / Panel: #101010
- Elevated Surface / Card: #151515
- Interactive / Border / Hover Surface: #202020

### Brand & World Accents
- Cyan Primary / Telemetry Accent: #00B7FF
- Electric Blue / Action & Focus: #0080FF
- Violet / Intelligence & System Accent: #8B5CFF

### Semantic & Status Colors
- Critical / Alert / Bearish: #FF3B30
- Operational / Positive / Bullish: #32D74B

### Typography & Foreground
- Primary Text: #FFFFFF
- Secondary / Muted Text: #B8B8B8

## 3. World-Based OS Architecture
The cockpit is organized as a World-Based Operating System where each domain operates as a dedicated World inside a unified shell:
- Shell & Window Manager: Persistent top status bar, world switcher, and responsive viewport container on #050505 canvas.
- World Isolation: Each World owns its local state, widgets, and telemetry streams while consuming shared design tokens from src/tokens.ts.
- Surface Layering: Panels use #101010, nested cards use #151515, and interactive controls or hairline dividers use #202020.
- Signal Discipline: Reserve #00B7FF, #0080FF, and #8B5CFF for active focus, navigation, and world identity; reserve #32D74B and #FF3B30 strictly for live status and outcome telemetry.
