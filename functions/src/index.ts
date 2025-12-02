import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const onTodoCreated = functions.firestore
  .document("todos/{todoId}")
  .onCreate(
    async (
      snap: functions.firestore.QueryDocumentSnapshot,
      context: functions.EventContext
    ) => {
      const data = snap.data();
      const text = data.text || "(no text)";
      const imageUrl = data.imageUrl || null;

      console.log("New todo created:", data);

      const tokensSnap = await admin.firestore().collection("tokens").get();
      const tokens = tokensSnap.docs.map((doc) => doc.id);

      if (tokens.length === 0) {
        console.log("No tokens registered. Exiting.");
        return;
      }

      const payload: admin.messaging.MulticastMessage = {
        notification: {
          title: "New Todo Added!",
          body: text,
          ...(imageUrl ? { imageUrl } : {}),
        },
        webpush: {
          fcmOptions: {
            link: "https://chaelri.github.io/chaelri-todo/",
          },
        },
        tokens,
      };

      const response = await admin.messaging().sendEachForMulticast(payload);

      console.log("Push sent:", response.successCount, "success");
      console.log("Errors:", response.failureCount);

      return;
    }
  );
