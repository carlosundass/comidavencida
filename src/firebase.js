import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBeVqBKvon1gO0JKO_ajs3cYZ_H5Z6P4H8",
  authDomain: "comidavencidacl.firebaseapp.com",
  projectId: "comidavencidacl",
  storageBucket: "comidavencidacl.firebasestorage.app",
  messagingSenderId: "689587273651",
  appId: "1:689587273651:web:7a58bf5fe731f069d755c6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);