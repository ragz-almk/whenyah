// firebase.js
// Menggunakan CDN agar langsung berjalan di browser
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Konfigurasi Firebase milikmu
const firebaseConfig = {
    apiKey: "AIzaSyBvTKkVWz5iCO4Za-zkbKYvBjaNlg8try0",
    authDomain: "project-9d0d452a-34e8-478d-81b.firebaseapp.com",
    databaseURL: "https://project-9d0d452a-34e8-478d-81b-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "project-9d0d452a-34e8-478d-81b",
    storageBucket: "project-9d0d452a-34e8-478d-81b.firebasestorage.app",
    messagingSenderId: "403143207083",
    appId: "1:403143207083:web:313934017514bd3f3a2fee",
    measurementId: "G-7FW7BHVPLV"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); // Mengaktifkan Analytics
const auth = getAuth(app);
const db = getFirestore(app, "whenyah"); // Kita menggunakan Firestore untuk menyimpan history
const provider = new GoogleAuthProvider();

// --- FUNGSI AUTENTIKASI ---

export const loginWithGoogle = async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login Error:", error);
        alert("Gagal login: " + error.message);
    }
};

export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout Error:", error);
    }
};

export const listenAuthState = (callback) => {
    return onAuthStateChanged(auth, callback);
};

// --- FUNGSI DATABASE (FIRESTORE) ---

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
        alert("Gagal menyimpan cerita. Pastikan aturan (Rules) Firestore sudah diatur.");
    }
};

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
