import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDjxRG08W3pWSqdy9MJfXh_7MjIwGfdODA",
  authDomain: "ai-healthcare-agent.firebaseapp.com",
  databaseURL: "https://ai-healthcare-agent-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "ai-healthcare-agent",
  storageBucket: "ai-healthcare-agent.firebasestorage.app",
  messagingSenderId: "1042465304360",
  appId: "1:1042465304360:web:e548126d6e492c052d6a1d",
  measurementId: "G-QWCRZTCTFT"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getDatabase(app);
export const auth = getAuth(app);
export { app };
