const admin = require('firebase-admin');
const path = require('path');

// Resolve service account from repo root (apps/driver cwd -> ../../firebase-service-account.json)
const serviceAccountPath = path.resolve(process.cwd(), '..', '..', 'firebase-service-account.json');
let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (e) {
  console.error('Service account not found at', serviceAccountPath);
}

if (!admin.apps.length) {
  try {
    if (serviceAccount) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else {
      admin.initializeApp();
    }
  } catch (e) {
    console.warn("Firebase Admin failed to initialize:", e.message);
  }
}

let db;
try {
  if (admin.apps.length) {
    db = admin.firestore();
  }
} catch (e) {
  console.warn("Firestore initialization failed:", e.message);
}

export default async function handler(req, res) {
  try {
    if (!db) return res.status(500).json({ error: "Firebase Admin not initialized. Server misconfigured." });
    if (req.method === 'GET') {
      // list users (first 1000)
      const list = await admin.auth().listUsers(1000);
      const users = await Promise.all(
        list.users.map(async (u) => {
          const doc = await db.collection('users').doc(u.uid).get().catch(() => null);
          return {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            disabled: u.disabled,
            customClaims: u.customClaims || {},
            firestore: doc ? doc.data() : null,
          };
        })
      );
      return res.status(200).json({ users });
    }

    if (req.method === 'POST') {
      // revoke tokens: body { uid }
      const { uid } = req.body;
      if (!uid) return res.status(400).json({ error: 'uid required' });
      await admin.auth().revokeRefreshTokens(uid);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      // delete user: body { uid }
      const { uid } = req.body;
      if (!uid) return res.status(400).json({ error: 'uid required' });
      try {
        await admin.auth().deleteUser(uid);
      } catch (e) { console.warn("Delete Auth user failed:", e.message); }
      await db.collection('users').doc(uid).delete().catch(() => { });
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'PUT') {
      // block/unblock user: body { uid, disabled }
      const { uid, disabled } = req.body;
      if (!uid) return res.status(400).json({ error: 'uid required' });
      try {
        await admin.auth().updateUser(uid, { disabled });
      } catch (e) { console.warn("Update Auth user failed:", e.message); }
      await db.collection('users').doc(uid).set({ disabled }, { merge: true }).catch(() => { });
      if (disabled) {
        try {
          await admin.auth().revokeRefreshTokens(uid);
        } catch (e) { console.warn("Revoke tokens failed:", e.message); }
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
