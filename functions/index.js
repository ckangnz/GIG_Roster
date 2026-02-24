const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

/**
 * 1. onThoughtLiked: Fires when someone hearts a thought.
 * Notify the thought owner.
 */
exports.onHeartAdded = functions.firestore
  .document("thoughts/{thoughtId}")
  .onUpdate(async (change, context) => {
    const newValue = change.after.data();
    const previousValue = change.before.data();

    const newHearts = Object.keys(newValue.hearts || {});
    const oldHearts = Object.keys(previousValue.hearts || {});

    // Only trigger if a heart was added, not removed
    if (newHearts.length > oldHearts.length) {
      const likerUid = newHearts.find((uid) => !oldHearts.includes(uid));
      if (!likerUid || likerUid === newValue.userUid) return null; // Don't notify if liking own thought

      try {
        // Get the liker's name
        const likerDoc = await admin.firestore().doc(`users/${likerUid}`).get();
        const likerName = likerDoc.data()?.name || "Someone";

        // Get the author's tokens and preferences
        const authorDoc = await admin
          .firestore()
          .doc(`users/${newValue.userUid}`)
          .get();
        if (!authorDoc.exists) return null;

                const authorData = authorDoc.data();
        const tokens = authorData.fcmTokens || [];

        if (
          tokens.length > 0 && 
          authorData.notificationPrefs?.thoughtLikes !== false
        ) {
          const message = {
            notification: {
              title: "New Love! ❤️",
              body: `${likerName} hearted your thought in ${newValue.teamName}.`,
            },
            tokens: tokens,
          };
          return admin.messaging().sendEachForMulticast(message);
        }
      } catch (err) {
        console.error("Error sending heart notification:", err);
      }
    }
    return null;
  });

/**
 * 2. onNewThought: Fires when a new thought is shared with the team.
 * Notify everyone in the team.
 */
exports.onThoughtCreated = functions.firestore
  .document("thoughts/{thoughtId}")
  .onCreate(async (snapshot, context) => {
    const thoughtData = snapshot.data();
    const teamName = thoughtData.teamName;
    const authorUid = thoughtData.userUid;
    const authorName = thoughtData.userName;

    try {
      // Find all users in this team
      const usersSnapshot = await admin
        .firestore()
        .collection("users")
        .where("teams", "array-contains", teamName)
        .get();

      const tokens = [];
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        // Don't notify the author and check preferences
        if (doc.id !== authorUid && 
            userData.fcmTokens && 
            userData.notificationPrefs?.newTeamThought !== false) {
          tokens.push(...userData.fcmTokens);
        }
        
      });

      if (tokens.length > 0) {
        const message = {
          notification: {
            title: `New Team Thought: ${teamName} 💭`,
            body: `${authorName} shared: "${thoughtData.text.substring(0, 50)}${thoughtData.text.length > 50 ? "..." : ""}"`,
          },
          tokens: tokens,
        };
        return admin.messaging().sendEachForMulticast(message);
      }
    } catch (err) {
      console.error("Error sending new thought notification:", err);
    }
    return null;
  });

/**
 * 3. onUserStatusChange: Fires when an admin approves a user or changes admin status.
 * Notify the user.
 */
exports.onUserStatusChange = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    const newValue = change.after.data();
    const previousValue = change.before.data();
    const tokens = newValue.fcmTokens || [];

    if (tokens.length === 0) return null;

    let title = "";
    let body = "";

    // Check for Approval
    if (newValue.isApproved === true && previousValue.isApproved !== true) {
      title = "Welcome to GIG Roster! 🎉";
      body =
        "Your account has been approved. You can now access your team rosters.";
    }
    // Check for Admin status
    else if (newValue.isAdmin === true && previousValue.isAdmin !== true) {
      title = "Admin Privileges Granted 🛡️";
      body =
        "You have been promoted to an Admin. You can now manage teams and users.";
    }

    if (title && body) {
      const message = {
        notification: { title, body },
        tokens: tokens,
      };
      return admin.messaging().sendEachForMulticast(message);
    }

    return null;
  });
