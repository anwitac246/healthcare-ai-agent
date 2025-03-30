import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

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

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
const analytics = getAnalytics(app);
