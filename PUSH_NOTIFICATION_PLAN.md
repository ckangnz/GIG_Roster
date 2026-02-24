# 🔔 Push Notification Implementation Plan

This plan outlines the integration of **Firebase Cloud Messaging (FCM)** into the GIG Roster PWA to keep users engaged and informed.

---

## 1. Notification Types & Triggers

### A. User-Configurable (Opt-in/out)
| Feature | Notification Trigger | Recipient |
| :--- | :--- | :--- |
| **Roster Handoff** | When current event ends (e.g., Sunday 5:30pm) | Users rostered for the *next* upcoming date |
| **Thought Likes** | When someone hearts your thought | The thought author |
| **New Team Thought** | When a team member shares a new thought | All team members |
| **Roster Reminder** | 24 hours before your scheduled duty | Assigned user |

### B. System-Critical (Always On)
| Feature | Notification Trigger | Recipient |
| :--- | :--- | :--- |
| **Account Approval** | When `isApproved` status changes | The user |
| **Admin Promotion** | When `isAdmin` status changes | The user |
| **Absence Alert** | When someone marks themselves absent (Admin only) | Team Admins |

---

## 2. Technical Steps

### Phase 1: Infrastructure & Permissions
- [ ] **Service Worker:** Create `public/firebase-messaging-sw.js` to handle background notifications.
- [ ] **FCM Setup:** Initialize Firebase Messaging in `src/firebase.ts`.
- [ ] **Token Management:** 
    - Implement `requestPermission()` logic.
    - Store user's device token in `users/{uid}/fcmTokens` (array to support multiple devices).
- [ ] **Permissions UI:** Create a "Enable Notifications" prompt (Banner or Modal).

### Phase 2: Settings & UI
- [ ] **Toggle Component:** Create a reusable `Toggle.tsx` component with CSS modules.
- [ ] **Settings Section:** Add "Notification Settings" to the Settings page.
- [ ] **Sync Settings:** Store notification preferences in `users/{uid}/notificationPrefs`.

### Phase 3: Trigger Logic (Requires Firebase Cloud Functions)
*Note: Direct client-to-client messaging is not supported by FCM for security reasons. Triggers must happen on the server.*
- [ ] **Cloud Function: onThoughtCreated** -> Send to team.
- [ ] **Cloud Function: onHeartAdded** -> Send to author.
- [ ] **Cloud Function: onUserUpdate** -> Send on status changes.
- [ ] **Cloud Function: Scheduled Task** -> Check `dayEndTime` and notify next rostered users.

---

## 3. Development Standards
- Use **CSS Modules** for the Toggle component.
- Ensure the Toggle component is accessible (ARIA labels).
- Run `yarn eslint . --fix` and `yarn tsc` before every commit.
- Use existing `ActionSheet` or `Modal` for permission prompts.

---

## 5. Testing in Production (Safety)
To test notifications in production without spamming real users:
1. **Feature Flag:** Set `VITE_ENABLE_PUSH_NOTIFICATIONS=true` only in your local `.env.local`. This hides the UI and prevents token registration for other users.
2. **Whitelist (Backend):** In `functions/index.js`, implement a whitelist of emails allowed to receive notifications during the testing phase.
3. **Manual Ping:** Use the Firebase Console "Messaging" tool to send a test message directly to your `fcmToken` (visible in your user document in Firestore).
