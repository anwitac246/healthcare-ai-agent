// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDjxRG08W3pWSqdy9MJfXh_7MjIwGfdODA",
  authDomain: "ai-healthcare-agent.firebaseapp.com",
  projectId: "ai-healthcare-agent",
  storageBucket: "ai-healthcare-agent.firebasestorage.app",
  messagingSenderId: "1042465304360",
  appId: "1:1042465304360:web:e548126d6e492c052d6a1d",
  measurementId: "G-QWCRZTCTFT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);