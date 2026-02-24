# Plan: Multiple Thoughts & Floating Bubbles Refactor

This plan outlines the steps to upgrade the "Thoughts" feature to support up to 5 floating thoughts per user, while maintaining backward compatibility and fixing mobile UX bugs.

## 1. Data Model Upgrade
- **Goal:** Shift from a single thought string to an array of thought objects.
- **New Structure:**
  ```typescript
  export interface ThoughtEntry {
    id: string; // random id
    text: string;
    updatedAt: number;
    hearts: Record<string, number>;
  }
  
  // Update Thought interface
  export interface Thought {
    id: string; // userUid_teamName
    userUid: string;
    userName: string;
    teamName: string;
    entries: ThoughtEntry[]; // NEW
    updatedAt: number;
    // legacy 'text' and 'hearts' will be migrated or handled gracefully
  }
  ```
- **Backward Compatibility:** Update `thoughtsSlice.ts` to treat documents with the old `text` field as having a single entry in the new system.

## 2. Thought Wheel UI: Floating Bubbles
- **Goal:** Display multiple bubbles floating in the space above the focused user's name.
- **Animation:** 
  - Bubbles should fade in/out when the focus shifts.
  - Use independent "floating" animations (different durations/offsets) so they look organic.
  - Positioning: Offset the bubbles around the top area of the focused user.

## 3. Management UI: ActionSheet Refactor
- **Goal:** Allow users to manage their 5 thoughts.
- **UI Components:**
  - A list showing current thoughts.
  - "Clear" button for each thought.
  - "Add Thought" button (limit to 5).
  - Re-use the `TextAreaField` for editing.

## 4. Bug Fixes (Accessibility & Mobile)
- **Focus Bug:** 
  - Ensure the `TextAreaField` receives explicit focus when the ActionSheet finishes its opening animation.
  - Use `scrollIntoView` or `padding-bottom` adjustments to ensure the input field is visible above the mobile keyboard.

## 5. Technical Implementation Steps
1.  **Step 1:** Update `model.ts` and `thoughtsSlice.ts` logic.
2.  **Step 2:** Refactor `ActionSheet.tsx` and `ThoughtsPage.tsx` to ensure perfect focus/visibility on mobile.
3.  **Step 3:** Implement the "Manage Thoughts" list in the ActionSheet.
4.  **Step 4:** Refactor `ThoughtWheel.tsx` to render multiple `SpeechBubble` components with randomized floating offsets.
5.  **Step 5:** Quality check (Lint, TSC).
