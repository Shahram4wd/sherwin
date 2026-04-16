# Radioactive Decay Simulation (Web App) – Product Requirements Document

## 1. Overview

This project is an original, web-based educational simulation focused on **radioactive decay and nuclear stability**.

The application allows users to construct atomic nuclei, observe stability, explore decay processes, and understand nuclear physics concepts interactively.

The design is **inspired by the educational goal** of existing simulations but must be **fully original in implementation, design, and user experience**.

---

## 2. Originality Guardrails (Critical)

The implementation must follow these rules:

- Do NOT use, inspect, or reference any source code from existing simulations.
- Do NOT replicate UI layout, structure, labels, icons, or animations.
- Do NOT copy wording, descriptions, or help text.
- Do NOT reuse assets (images, sounds, or models).
- Do NOT use original branding or naming.
- All interactions, visuals, and flows must be **new and independently designed**.

---

## 3. Learning Goals

Users should understand:

- What makes a nucleus stable or unstable
- The role of neutron-to-proton ratio
- Radioactive decay processes
- Half-life and exponential decay behavior
- How nuclei transform over time

---

## 4. Core Experience

### Gameplay Loop

1. User constructs a nucleus by selecting protons and neutrons
2. System evaluates stability
3. Simulation displays predicted half-life and stability indicators
4. User triggers decay (if unstable)
5. Nucleus transforms into a daughter nucleus
6. Process repeats to explore decay chains

---

## 5. Functional Requirements

### 5.1 Nucleus Construction

- Users can add/remove:
  - Protons (Z)
  - Neutrons (N)
- System computes:
  - Atomic number (Z)
  - Mass number (A = Z + N)
- Element identity is derived dynamically

---

### 5.2 Stability Evaluation

System determines stability using:

- Neutron-to-proton ratio (N/Z)
- Even–odd rule
- Magic numbers
- Upper atomic number limits

Provide feedback:

- Stable
- Long-lived
- Unstable

---

### 5.3 Decay System

Supported decay modes:

- Beta-minus (β⁻)
- Beta-plus (β⁺)
- Electron capture (EC)
- Alpha decay (α)
- Gamma decay (γ)

Each decay:

- Updates N and Z
- Produces a new nucleus
- Recalculates stability

Decay options should be:

- Dynamically enabled/disabled
- Based on physics rules or dataset

---

### 5.4 Half-Life Representation

- Display half-life using logarithmic scale
- Units:
  - seconds, minutes, years
- Stable nuclei labeled as:
  - “Stable” or extremely long-lived

Use exponential decay model:

- Conceptual (no need for exact physics precision)

---

### 5.5 Decay Chain Visualization

- Track sequence of transformations
- Show lineage of nuclei
- Allow step-by-step or automatic decay progression

---

## 6. Data Requirements

Use independent public datasets (e.g., NNDC):

Each isotope includes:

- Proton count (Z)
- Neutron count (N)
- Mass number (A)
- Half-life
- Possible decay modes

Fallback:

- Use heuristic rules for unknown isotopes

---

## 7. User Interface (Original Design Required)

### 7.1 Interaction Model

- Users construct nuclei via:
  - Drag-and-drop OR control panel (design choice)
- Must not replicate existing layouts

---

### 7.2 Visual Representation

- Nucleus displayed as:
  - 2D or 3D particle cluster
- Protons and neutrons visually distinct
- Provide:
  - rotation
  - zoom (if 3D)

Visuals must be:

- Original
- Not patterned after existing simulations

---

### 7.3 Information Display

Show:

- Z, N, A values
- Element name/symbol
- Stability status
- Half-life indicator

---

### 7.4 Decay Controls

- Buttons or controls for decay modes
- Only available when valid
- Visual feedback on interaction

---

### 7.5 Accessibility

- Keyboard navigation
- Screen-reader support
- High contrast mode
- Responsive design

---

## 8. AI Assistant Integration

Replace static help with an AI assistant.

### Features:

- Chat interface
- Answers user questions
- Explains:
  - stability
  - decay processes
  - half-life
- Adapts to user level

### Requirements:

- Use reliable physics knowledge
- Avoid hallucinations
- Prefer retrieval-based grounding

---

## 9. Physics Model

### Core Concepts

- Strong nuclear force vs electromagnetic repulsion
- Stability band (N/Z ratio)
- Even–odd stability
- Magic numbers

### Behavior Rules

- Neutron-rich → β⁻ decay
- Proton-rich → β⁺ or EC
- Heavy nuclei → α decay
- Excited states → γ decay

### Simplifications

- Educational accuracy over full physical precision
- Heuristics acceptable for unknown isotopes

---

## 10. Technical Architecture

### Frontend

- HTML5, CSS, JavaScript (ES6+)
- Framework:
  - React / Vue / Svelte

### Visualization

- 3D: Three.js or Babylon.js
- Charts: D3.js or Chart.js

### State Management

- Track:
  - nucleus composition
  - stability
  - decay history

---

### Physics Engine

Separate module for:

- Stability calculation
- Decay transitions
- Half-life logic

---

### Data Layer

- Load isotope dataset (JSON)
- Support offline mode if needed

---

### AI Integration

- API-based LLM (e.g., OpenAI)
- Optional retrieval system for grounding

---

## 11. Performance

- Optimize rendering for many particles
- Provide 2D fallback for low-end devices
- Use requestAnimationFrame for animation

---

## 12. Suggested Enhancements

- 3D interactive nucleus exploration
- Statistical decay simulation over time
- Binding energy visualization
- Guided learning scenarios
- Gamification (challenges, goals)
- Multilingual support

---

## 13. Risks & Considerations

- Over-simplifying physics
- Performance in 3D rendering
- AI hallucination risk
- Dataset completeness

---

## 14. Acceptance Criteria

- Users can build nuclei and observe stability
- Decay modes behave correctly
- Half-life is meaningfully represented
- UI is clearly original and distinct
- No reuse of external code or assets
- AI assistant provides helpful explanations

---

## 15. Key Principle

This must be an **original educational product**, not a reproduction.

Same science → OK
Same implementation → NOT OK
