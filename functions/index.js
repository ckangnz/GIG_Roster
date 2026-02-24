const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { DateTime } = require("luxon");
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
      console.log(`Liker UID: ${likerUid}, Author UID: ${newValue.userUid}`);
      
      if (!likerUid || likerUid === newValue.userUid) {
        console.log("Skipping notification: Liking own thought or no UID found.");
        return null; 
      }

      try {
        // Get the liker's name
        const likerDoc = await admin.firestore().doc(`users/${likerUid}`).get();
        const likerName = likerDoc.data()?.name || "Someone";

        // Get the author's tokens and preferences
        const authorDoc = await admin
          .firestore()
          .doc(`users/${newValue.userUid}`)
          .get();
        
        if (!authorDoc.exists) {
          console.warn(`Author doc not found for UID: ${newValue.userUid}`);
          return null;
        }

        const authorData = authorDoc.data();
        const tokens = authorData.fcmTokens || [];
        console.log(`Author Name: ${authorData.name}, Tokens count: ${tokens.length}, thoughtLikes pref: ${authorData.notificationPrefs?.thoughtLikes}`);

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
          const response = await admin.messaging().sendEachForMulticast(message);
          console.log(`Successfully sent ${response.successCount} heart notifications.`);
          return response;
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
        if (doc.id !== authorUid) {
          if (userData.fcmTokens && userData.notificationPrefs?.newTeamThought !== false) {
            tokens.push(...userData.fcmTokens);
          } else {
            console.log(`Skipping notification for ${userData.name}: No tokens or pref disabled.`);
          }
        }
      });

      console.log(`Team: ${teamName}, Recipients count: ${tokens.length}`);

      if (tokens.length > 0) {
        const message = {
          notification: {
            title: `New Team Thought: ${teamName} 💭`,
            body: `${authorName} shared: "${thoughtData.text.substring(0, 50)}${thoughtData.text.length > 50 ? "..." : ""}"`,
          },
          tokens: tokens,
        };
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`Successfully sent ${response.successCount} new thought notifications.`);
        return response;
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
      console.log(`Sending status change notification to ${newValue.name}. Tokens: ${tokens.length}`);
      const message = {
        notification: { title, body },
        tokens: tokens,
      };
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`Successfully sent ${response.successCount} status notifications.`);
      return response;
    }

    return null;
  });

/**
 * 4. checkRosterHandoff: Runs every 10 minutes.
 * Notifies the NEXT rostered users when a team's current duty ends.
 */
exports.checkRosterHandoff = functions.pubsub
  .schedule("every 10 minutes")
  .onRun(async (context) => {
    const nzNow = DateTime.now().setZone("Pacific/Auckland");
    const todayKey = nzNow.toFormat("yyyy-MM-dd");
    const currentWeekday = nzNow.weekdayLong; // e.g. "Sunday"

    try {
      // 1. Get all teams
      const teamsDoc = await admin.firestore().doc("metadata/teams").get();
      if (!teamsDoc.exists) return null;
      const teams = teamsDoc.data().list || [];

      for (const team of teams) {
        const endTime = team.dayEndTimes?.[currentWeekday];
        if (!endTime) continue;

        // Check if current time is within 10 minutes AFTER the endTime
        // (Ensures we only trigger once per handoff)
        const [endHour, endMin] = endTime.split(":").map(Number);
        const endDateTime = nzNow.set({
          hour: endHour,
          minute: endMin,
          second: 0,
          millisecond: 0,
        });

        const diffMins = nzNow.diff(endDateTime, "minutes").minutes;

        if (diffMins >= 0 && diffMins < 10) {
          console.log(
            `Handoff detected for team ${team.name} (End time: ${endTime})`
          );

          // 2. Check if we already sent this handoff
          const handoffId = `${team.name}_${todayKey}`;
          const handoffRef = admin.firestore().doc(`handoffs/${handoffId}`);
          const handoffSnap = await handoffRef.get();
          if (handoffSnap.exists) {
            console.log(`Handoff already processed for ${handoffId}`);
            continue;
          }

          // 3. Find the NEXT upcoming roster date for this team
          // We look for dates > today
          const rosterSnap = await admin
            .firestore()
            .collection("roster")
            .where("date", ">", todayKey)
            .orderBy("date", "asc")
            .limit(1)
            .get();

          if (rosterSnap.empty) {
            console.log(`No upcoming roster found for team ${team.name}`);
            continue;
          }

          const nextRoster = rosterSnap.docs[0].data();
          const nextDate = nextRoster.date;
          const assignments = nextRoster.teams?.[team.name] || {};
          const usersToNotify = Object.keys(assignments);

          if (usersToNotify.length === 0) {
            console.log(`No users assigned for next roster on ${nextDate}`);
            continue;
          }

          // 4. Collect tokens for these users
          const tokens = [];
          for (const email of usersToNotify) {
            const userSnap = await admin
              .firestore()
              .collection("users")
              .where("email", "==", email)
              .get();

            if (!userSnap.empty) {
              const userData = userSnap.docs[0].data();
              if (
                userData.fcmTokens &&
                userData.notificationPrefs?.rosterHandoff !== false
              ) {
                tokens.push(...userData.fcmTokens);
              }
            }
          }

          // 5. Send notifications
          if (tokens.length > 0) {
            const message = {
              notification: {
                title: `${team.emoji} Next Roster is Live!`,
                body: `Duties for ${team.name} have ended. You are rostered for the next event on ${nextDate}.`,
              },
              tokens: tokens,
            };
            await admin.messaging().sendEachForMulticast(message);
            console.log(`Sent handoff notification to ${tokens.length} tokens.`);
          }

          // 6. Mark as processed
          await handoffRef.set({
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    } catch (err) {
      console.error("Error in checkRosterHandoff:", err);
    }
    return null;
  });
