import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD3qhR4YYl6mUKdLYEkSseS3KhMriXMPyk",
  authDomain: "cnl-shop.firebaseapp.com",
  projectId: "cnl-shop",
  storageBucket: "cnl-shop.firebasestorage.app",
  messagingSenderId: "867541408578",
  appId: "1:867541408578:web:f637688315f6dfbb5206db",
  measurementId: "G-M9XHHY1D5Q"
};

// Inizializza l'app
const app = initializeApp(firebaseConfig);

// Inizializza Auth
export const auth = getAuth(app);

// Inizializza Firestore forzando il Long Polling per evitare blocchi client/adblock
export const db = initializeFirestore(app, {
  experimentalLongPollingOptions: {
    timeoutSeconds: 30,
  },
  useFetchStreams: false // disabilita gli stream persistenti spesso bloccati
});