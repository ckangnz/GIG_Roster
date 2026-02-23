# Feature Specification: "Thoughts" (Team Connection)

The "Thoughts" feature is a dedicated space for team members to share what's on their mind, prayer requests, or encouraging notes. It uses a visually engaging "Roulette" interface to foster connection within the team.

## Core Requirements

### 1. Visual Interface: The "Thought Wheel"
- **Circular Layout:** Team members are arranged in a perfect circle.
- **Ordering:** Members are ordered alphabetically, clockwise.
- **The Roulette:** The wheel can be spun (rotated). The person at the "12 o'clock" position is the "Focused User."
- **Initial Focus:** Whenever navigating to the tab or clicking the "Thoughts" nav icon, the current user MUST be moved to the center (12 o'clock).
- **Floating Bubbles:** Each member has a speech bubble above their name.
- **Animation:** Bubbles should have a subtle "floating" animation (slow up/down movement).

### 2. Interaction & Content
- **Text Limits:** Speech bubbles show truncated text initially.
- **Expansion:** Clicking a bubble expands it to show the full content.
- **Hearts (Double Click):** 
    - Double-clicking a bubble adds a "Heart" (like).
    - Constraint: A user can only add one heart per bubble per day.
- **CRUD Operations:**
    - Users can add a thought for their currently selected team.
    - Users can edit their existing thought.
    - Users can remove their thought (data is permanently deleted).
- **Team Scoping:** Thoughts are team-specific. A user has a different "Thought" for each team they belong to.

### 3. Navigation & Context
- **Team Switcher:** A dropdown to switch between teams the user belongs to.
- **Navigation:** Accessible via a new "Thoughts" icon in the `BottomNav` and `SideNav`.

## Development Standards & Quality Control
- **Reusable Components:** Identify and extract common patterns (e.g., Circular Layout, Animated Bubble) into reusable components.
- **Styling:** Strictly use **CSS Modules** for all new components.
- **Common Components:** Leverage existing `Button`, `Pill`, `InputField`, `ActionSheet`, and `Modal` from `src/components/common`.
- **Optimization:** 
    - Use `memo`, `useCallback`, and `useMemo` to minimize unnecessary re-renders in the high-animation wheel.
    - Keep state local where possible to prevent global app thrashing.
- **Workflow:**
    - Create a clean commit for every technical step completed.
    - **Linting:** Run `yarn eslint . --fix` before every commit.
    - **Type Safety:** Run `yarn tsc` to verify no regressions or type errors.

---

## Technical Implementation Plan

### Step 1: Data Architecture (Firestore & Redux)
- **Firestore Collection:** `thoughts`
    - Document ID: `{userUid}_{teamName}`
    - Fields: `userUid`, `teamName`, `text`, `userName`, `updatedAt`, `hearts: { [userUid]: lastHeartTimestamp }`
- **Redux Slice:** `thoughtsSlice` to manage real-time updates and loading states.

### Step 2: Routing & Navigation
- Add route `/app/thoughts` in `routes.tsx`.
- Add `MessageSquareHeart` (Lucide) icon to `BOTTOM_NAV_ITEMS` and `SideNav`.

### Step 3: UI - The Thought Wheel Component
- Implement circular math logic using `sin` and `cos`.
- Use **Framer Motion** for smooth rotation and inertia.
- Implement the "auto-focus on me" logic using the initial rotation angle.

### Step 4: UI - The Speech Bubble
- Create a `SpeechBubble` component with CSS module styles.
- Add the `@keyframes` floating animation.
- Implement truncation and "click-to-expand" logic.

### Step 5: Interactions (Input & Hearts)
- Create an `ActionSheet` or `Modal` for users to type/edit their thoughts.
- Implement the double-click handler for Hearts.
- Add logic to verify "once per day" heart limit using the `hearts` timestamp map in Firestore.

### Step 6: Real-time Sync
- Set up a Firestore listener in `useAppListeners.ts` filtered by the active team.
- Ensure the wheel updates immediately when someone in the team changes their thought.
