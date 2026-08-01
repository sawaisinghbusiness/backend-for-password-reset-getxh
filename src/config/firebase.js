const admin = require('firebase-admin');
const fs = require('fs');
const env = require('./env');
const { logger } = require('../utils/logger');

let initialized = false;

function initFirebase() {
  if (initialized || admin.apps.length > 0) {
    return {
      admin,
      auth: admin.auth(),
      db: admin.firestore()
    };
  }

  try {
    let credential;

    if (env.FIREBASE_SERVICE_ACCOUNT_PATH && fs.existsSync(env.FIREBASE_SERVICE_ACCOUNT_PATH)) {
      const serviceAccount = JSON.parse(fs.readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'));
      credential = admin.credential.cert(serviceAccount);
      logger.info('Initializing Firebase Admin SDK via service account JSON file.');
    } else if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
      credential = admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY
      });
      logger.info('Initializing Firebase Admin SDK via environment variables.');
    } else {
      logger.warn('Firebase credentials not provided. Attempting default application credentials.');
      credential = admin.credential.applicationDefault();
    }

    admin.initializeApp({ credential });
    initialized = true;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK:', { error: error.message });
  }

  return {
    admin,
    auth: admin.apps.length > 0 ? admin.auth() : null,
    db: admin.apps.length > 0 ? admin.firestore() : null
  };
}

module.exports = initFirebase();
