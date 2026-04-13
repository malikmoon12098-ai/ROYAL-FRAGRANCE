import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, doc, getDoc, setDoc, updateDoc, increment, addDoc, getDocs, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCKjflGpPVp5tEHE6UACEnTrDN2KxkJX5s",
    authDomain: "bin-mazhar.firebaseapp.com",
    projectId: "bin-mazhar",
    storageBucket: "bin-mazhar.firebasestorage.app",
    messagingSenderId: "557313301501",
    appId: "1:557313301501:web:c2b529ef2dd5bd7b465794"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, onSnapshot, query, orderBy, doc, getDoc, setDoc, updateDoc, increment, addDoc, getDocs, where };
