import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

initializeApp();

export const onTodoCreated = onDocumentCreated("todos/{todoId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  const data = snap.data();
  const text = data.text || "(no text)";
  const imageUrl = data.imageUrl || null;

  console.log("New todo created:", data);

  // Fetch all FCM tokens
  const db = getFirestore();
  const tokensSnap = await db.collection("tokens").get();
  const tokens = tokensSnap.docs.map((doc) => doc.id);

  if (tokens.length === 0) {
    console.log("No tokens registered. Exiting.");
    return;
  }

  // Prepare notification payload
  const messaging = getMessaging();

  const message: any = {
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

  // Send push
  const response = await messaging.sendEachForMulticast(message);

  console.log("Push sent:", response.successCount, "success");
  console.log("Errors:", response.failureCount);
});
