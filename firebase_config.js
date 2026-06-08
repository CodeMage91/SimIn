// firebase_config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    onSnapshot,
    updateDoc,
    deleteDoc,
    getDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAOjphp5vIuJ5tL2fSkJ07BjukXC9w0yzo",
    authDomain: "siminven-5fa37.firebaseapp.com",
    projectId: "siminven-5fa37",
    storageBucket: "siminven-5fa37.firebasestorage.app",
    messagingSenderId: "202351647307",
    appId: "1:202351647307:web:9c4a927c05a25aa3640bce",
    measurementId: "G-LNFN64N3BB"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export {
    db,
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    onSnapshot,
    updateDoc,
    deleteDoc,
    getDoc,
    doc,
    serverTimestamp
};