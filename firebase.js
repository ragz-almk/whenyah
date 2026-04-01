// firebase.js
// Menggunakan CDN agar tidak perlu Node modules (bundler) di frontend
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// TODO: GANTI DENGAN KONFIGURASI FIREBASE KAMU
const firebaseConfig = {
    apiKey: "API_KEY_FIREBASE_KAMU",
    authDomain: "PROJECT_ID.firebaseapp.com",
    projectId: "PROJECT_ID",
    storageBucket: "PROJECT_ID.appspot.com",
    messagingSenderId: "SENDER_ID",
    appId: "APP_ID"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Fungsi Login
export const loginWithGoogle = async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login Error:", error);
        alert("Gagal login: " + error.message);
    }
};

// Fungsi Logout
export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout Error:", error);
    }
};

// Memantau status user
export const listenAuthState = (callback) => {
    return onAuthStateChanged(auth, callback);
};

// Fungsi Menyimpan Cerita ke Database
export const saveStoryHistory = async (userId, mcName, premise, chatHistory) => {
    try {
        await addDoc(collection(db, "stories"), {
            userId: userId,
            mcName: mcName,
            premise: premise,
            chatHistory: chatHistory,
            createdAt: serverTimestamp()
        });
        alert("Cerita berhasil disimpan!");
    } catch (error) {
        console.error("Gagal menyimpan cerita:", error);
        alert("Gagal menyimpan cerita.");
    }
};

// Fungsi Mengambil Riwayat Cerita
export const getUserStories = async (userId) => {
    try {
        const q = query(collection(db, "stories"), where("userId", "==", userId), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const stories = [];
        querySnapshot.forEach((doc) => {
            stories.push({ id: doc.id, ...doc.data() });
        });
        return stories;
    } catch (error) {
        console.error("Gagal mengambil riwayat:", error);
        return [];
    }
};
