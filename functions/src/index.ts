import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const onTodoCreated = functions.firestore
  .document("todos/{todoId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const text = data.text || "(no text)";
    const imageUrl = data.imageUrl || null;

    console.log("New todo created:", data);

    // Fetch all FCM tokens
    const tokensSnap = await admin.firestore().collection("tokens").get();
    const tokens = tokensSnap.docs.map((doc) => doc.id);

    if (tokens.length === 0) {
      console.log("No tokens registered. Exiting.");
      return;
    }

    // Build notification payload
    let payload: admin.messaging.MulticastMessage;

    if (imageUrl) {
      // RICH NOTIFICATION WITH IMAGE
      payload = {
        notification: {
          title: "New Todo Added!",
          body: text,
          imageUrl: imageUrl,
        },
        webpush: {
          fcmOptions: {
            link: "https://chaelri.github.io/chaelri-todo/",
          },
        },
        tokens,
      };
    } else {
      // SIMPLE NOTIFICATION
      payload = {
        notification: {
          title: "New Todo Added!",
          body: text,
        },
        webpush: {
          fcmOptions: {
            link: "https://chaelri.github.io/chaelri-todo/",
          },
        },
        tokens,
      };
    }

    // Send notification
    const response = await admin.messaging().sendEachForMulticast(payload);

    console.log("Push sent:", response.successCount, "successes");
    console.log("Errors:", response.failureCount);

    return;
  });
