const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");
console.log("🔥 Loaded Service Account for Project:", serviceAccount.project_id);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Initialize Firestore
const db = admin.firestore();

module.exports = {
  admin,
  db,
};
