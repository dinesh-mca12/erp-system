import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const projectId = process.env.FIREBASE_PROJECT_ID || "flowos-dev";

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: projectId,
  });
}

const realDb = admin.firestore();

// If we are in local development and Firestore emulator is not running, 
// bypass connection retries immediately to load fallback mock stores instantly.
const isEmulatorActive = !!process.env.FIRESTORE_EMULATOR_HOST;
const isProduction = process.env.NODE_ENV === "production" || process.env.FIREBASE_PRODUCTION === "true";

export const db = (!isEmulatorActive && !isProduction)
  ? new Proxy(realDb, {
      get(target, prop, receiver) {
        if (prop === "collection") {
          return () => {
            throw new Error("Firestore connection bypassed: offline mode active.");
          };
        }
        return Reflect.get(target, prop, receiver);
      }
    })
  : realDb;

export const auth = admin.auth();
export const storage = admin.storage();
export default admin;
