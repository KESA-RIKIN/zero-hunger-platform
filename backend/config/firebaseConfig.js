const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Firebase Admin Initialized Successfully');
} catch (error) {
  console.error('Firebase Admin Initialization Error:', error);
}

const db = admin.firestore();

module.exports = { admin, db };
