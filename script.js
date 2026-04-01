// script.js
import { loginWithGoogle, logout, listenAuthState, saveStoryHistory, getUserStories } from './firebase.js';

// State
let currentUser = null;
let mcName = "";
let premise = "";
let chatHistory = []; 
let isGenerating = false;

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const menuScreen = document.getElementById('menu-screen');
const historyScreen = document.getElementById('history-screen');
const gameScreen = document.getElementById('game-screen');

const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userNameDisplay = document.getElementById('user-name');

const mcNameInput = document.getElementById('mc-name');
const premiseInput = document.getElementById('story-premise');
const startBtn = document.getElementById('start-btn');
const viewHistoryBtn = document.getElementById('view-history-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const historyList = document.getElementById('history-list');
const saveStoryBtn = document.getElementById('save-story-btn');

const storyContainer = document.getElementById('story-container');
const controlsContainer = document.getElementById('controls-container');
const loadingIndicator = document.getElementById('loading-indicator');
const aiChoicesContainer = document.getElementById('ai-choices-container');
const customChoiceInput = document.getElementById('custom-choice-input');
const sendCustomBtn = document.getElementById('send-custom-btn');

// --- AUTHENTICATION LOGIC ---
loginBtn.addEventListener('click', loginWithGoogle);
logoutBtn.addEventListener('click', logout);

listenAuthState((user) => {
    if (user) {
        currentUser = user;
        userNameDisplay.textContent = user.displayName || 'Pemain';
        loginScreen.classList.add('hidden');
        menuScreen.classList.remove('hidden');
        menuScreen.classList.add('flex');
    } else {
        currentUser = null;
        loginScreen.classList.remove('hidden');
        menuScreen.classList.add('hidden');
        menuScreen.classList.remove('flex');
        historyScreen.classList.add('hidden');
        gameScreen.classList.add('hidden');
    }
});

// --- NAVIGATION LOGIC ---
viewHistoryBtn.addEventListener('click', async () => {
    menuScreen.classList.add('hidden');
    historyScreen.classList.remove('hidden');
    historyScreen.classList.add('flex');
    
    historyList.innerHTML = '<p class="text-slate-400">Memuat riwayat...</p>';
    const stories = await getUserStories(currentUser.uid);
    
    historyList.innerHTML = '';
    if (stories.length === 0) {
        historyList.innerHTML = '<p class="text-slate-400">Belum ada cerita yang disimpan.</p>';
        return;
    }

    stories.forEach(story => {
        const div = document.createElement('div');
        div.className = "bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-slate-500 cursor-pointer transition-colors";
        
        // Format tanggal ringan
        const dateString = story.createdAt ? new Date(story.createdAt.toDate()).toLocaleDateString('id-ID') : 'Baru saja';
        
        div.innerHTML = `
            <h3 class="font-medium text-blue-400">${story.mcName}</h3>
            <p class="text-xs text-slate-400 mb-2">${dateString}</p>
            <p class="text-sm text-slate-300 line-clamp-2">${story.premise}</p>
        `;
        div.onclick = () => loadStory(story);
        historyList.appendChild(div);
    });
});

backToMenuBtn.addEventListener('click', () => {
    historyScreen.classList.add('hidden');
    historyScreen.classList.remove('flex');
    menuScreen.classList.remove('hidden');
});

// --- GAME LOGIC ---
startBtn.addEventListener('click', startGame);
sendCustomBtn.addEventListener('click', () => submitChoice(customChoiceInput.value));
customChoiceInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitChoice(customChoiceInput.value);
});
saveStoryBtn.addEventListener('click', () => {
    if(currentUser && chatHistory.length > 0) {
        saveStoryHistory(currentUser.uid, mcName, premise, chatHistory);
    }
});

function startGame() {
    mcName = mcNameInput.value.trim() || "Pemain";
    premise = premiseInput.value.trim();

    if (!premise) {
        alert("Mohon isi premis cerita terlebih dahulu!");
        return;
    }

    // Reset UI dan History
    chatHistory = [];
    storyContainer.innerHTML = '';
    
    menuScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    gameScreen.classList.add('flex');

    const initialPrompt = `Mulai cerita Visual Novel ini.
Karakter Utama: ${mcName}
Premis: ${premise}

Buat adegan pengenalan yang menarik. Ikuti format JSON secara ketat.`;

    generateStory(initialPrompt, true);
}

async function submitChoice(choiceText) {
    if (!choiceText.trim() || isGenerating) return;
    
    customChoiceInput.value = '';
    addNarrationToUI(`Kamu memutuskan: "${choiceText}"`, true);
    generateStory(`Pemain memilih: ${choiceText}. Lanjutkan cerita berdasarkan pilihan ini.`);
}

async function generateStory(userPrompt, isInitial = false) {
    isGenerating = true;
    controlsContainer.classList.add('hidden');
    loadingIndicator.classList.remove('hidden');
    loadingIndicator.classList.add('flex');
    scrollToBottom();

    const systemInstruction = `Kamu adalah AI Game Master untuk Visual Novel Interaktif.
PERATURAN MUTLAK:
1. Sudut pandang Orang Pertama dari karakter utama: ${mcName}.
2. Format: Dominan percakapan. Rasio 80% dialog, 20% narasi.
3. Gunakan huruf miring HANYA untuk aksi atau narasi.
4. Format Output WAJIB JSON:
{
  "story_nodes": [
    { "type": "narration", "text": "Teks narasi" },
    { "type": "dialog", "character_name": "Nama", "dialog_text": "Teks", "action_text": "Aksi", "emoji": "😊" }
  ],
  "choices": ["Pilihan A", "Pilihan B", "Pilihan C"]
}`;

    const contents = [...chatHistory, { role: "user", parts: [{ text: userPrompt }] }];
    const payload = {
        contents: contents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: { responseMimeType: "application/json" }
    };

    let responseJson = null;

    try {
        // PERUBAHAN: Sekarang memanggil Vercel Serverless Function milik kita
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'API Error');
        }

        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
            responseJson = JSON.parse(rawText);
            chatHistory.push({ role: "user", parts: [{ text: userPrompt }] });
            chatHistory.push({ role: "model", parts: [{ text: rawText }] });
        } else {
            throw new Error('Format balasan tidak valid');
        }
    } catch (error) {
        console.error("Kesalahan:", error);
        addNarrationToUI(`*Terjadi gangguan sistem. Silakan muat ulang halaman atau coba lagi.*`, false);
    }

    loadingIndicator.classList.remove('flex');
    loadingIndicator.classList.add('hidden');

    if (responseJson) {
        renderStoryData(responseJson);
    }

    controlsContainer.classList.remove('hidden');
    isGenerating = false;
    scrollToBottom();
}

function renderStoryData(data) {
    const nodes = data.story_nodes || [];
    const choices = data.choices || [];

    nodes.forEach(node => {
        if (node.type === 'narration') {
            addNarrationToUI(node.text);
        } else if (node.type === 'dialog') {
            addDialogToUI(node.character_name, node.dialog_text, node.action_text, node.emoji);
        }
    });

    aiChoicesContainer.innerHTML = '';
    choices.forEach(choiceText => {
        const btn = document.createElement('button');
        btn.className = "bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-left px-4 py-3 rounded-lg text-sm transition-colors";
        btn.innerText = choiceText;
        btn.onclick = () => submitChoice(choiceText);
        aiChoicesContainer.appendChild(btn);
    });
}

function addNarrationToUI(text, isUserAction = false) {
    const div = document.createElement('div');
    div.className = `chat-bubble text-center my-4 ${isUserAction ? 'text-blue-400' : 'text-slate-400'}`;
    div.innerHTML = `<p class="italic">"${text}"</p>`;
    storyContainer.appendChild(div);
}

function addDialogToUI(name, dialog, action, emoji) {
    const isMC = name.toLowerCase() === mcName.toLowerCase();
    const alignClass = isMC ? 'flex-row-reverse' : 'flex-row';
    const bgClass = isMC ? 'bg-blue-900/40 border-blue-800/50' : 'bg-slate-800 border-slate-700';
    const nameColor = isMC ? 'text-blue-300' : 'text-slate-300';
    const emojiBg = isMC ? 'bg-blue-800/50' : 'bg-slate-700';

    const actionHtml = action ? `<p class="italic text-slate-400 mt-1"> ${action} </p>` : '';

    const div = document.createElement('div');
    div.className = `chat-bubble flex gap-3 ${alignClass} w-full`;
    
    div.innerHTML = `
        <div class="flex-shrink-0 w-10 h-10 rounded-full ${emojiBg} border border-slate-600 flex items-center justify-center text-xl shadow-inner">
            ${emoji || '👤'}
        </div>
        <div class="flex-col max-w-[80%]">
            <div class="px-1 pb-1 text-xs font-semibold ${nameColor} ${isMC ? 'text-right' : 'text-left'}">
                ${name}
            </div>
            <div class="${bgClass} border rounded-2xl p-3 text-slate-200 shadow-sm ${isMC ? 'rounded-tr-sm' : 'rounded-tl-sm'}">
                <p class="leading-relaxed">${dialog}</p>
                ${actionHtml}
            </div>
        </div>
    `;
    storyContainer.appendChild(div);
}

function scrollToBottom() {
    setTimeout(() => {
        storyContainer.scrollTo({
            top: storyContainer.scrollHeight,
            behavior: 'smooth'
        });
    }, 100);
}

// Fungsi untuk memuat ulang cerita dari database ke layar
function loadStory(storyData) {
    // 1. Mengembalikan data state utama dari database ke variabel lokal
    mcName = storyData.mcName;
    premise = storyData.premise;
    chatHistory = storyData.chatHistory || [];

    // 2. Membersihkan layar permainan dari cerita sebelumnya
    storyContainer.innerHTML = '';
    aiChoicesContainer.innerHTML = '';

    // 3. Berpindah dari layar riwayat (History) ke layar permainan (Game)
    historyScreen.classList.add('hidden');
    historyScreen.classList.remove('flex');
    gameScreen.classList.remove('hidden');
    gameScreen.classList.add('flex');

    // 4. Membaca ulang isi chatHistory dan mencetaknya ke layar
    let lastChoices = []; // Untuk menyimpan pilihan paling terakhir dari AI

    chatHistory.forEach(item => {
        if (item.role === 'user') {
            // Mengekstrak tulisan pilihan user dari struktur prompt kita sebelumnya
            // Format prompt kita: "Pemain memilih: [PILIHAN]. Lanjutkan cerita..."
            const text = item.parts[0].text;
            if (text.startsWith("Pemain memilih: ")) {
                const choiceMatch = text.match(/Pemain memilih: (.*?)\. Lanjutkan/);
                if (choiceMatch && choiceMatch[1]) {
                    addNarrationToUI(`Kamu memutuskan: "${choiceMatch[1]}"`, true);
                }
            }
        } else if (item.role === 'model') {
            // Mem-parsing teks mentah menjadi JSON kembali
            try {
                const responseJson = JSON.parse(item.parts[0].text);
                const nodes = responseJson.story_nodes || [];
                
                // Menampilkan ulang narasi dan dialog persis seperti saat bermain
                nodes.forEach(node => {
                    if (node.type === 'narration') {
                        addNarrationToUI(node.text);
                    } else if (node.type === 'dialog') {
                        addDialogToUI(node.character_name, node.dialog_text, node.action_text, node.emoji);
                    }
                });

                // Terus perbarui 'lastChoices' sehingga kita mendapat pilihan paling akhir
                if (responseJson.choices) {
                    lastChoices = responseJson.choices;
                }
            } catch (e) {
                console.error("Gagal memuat sebagian riwayat JSON:", e);
            }
        }
    });

    // 5. Menampilkan kembali tombol pilihan terakhir agar permainan bisa dilanjutkan
    lastChoices.forEach(choiceText => {
        const btn = document.createElement('button');
        btn.className = "bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-left px-4 py-3 rounded-lg text-sm transition-colors";
        btn.innerText = choiceText;
        btn.onclick = () => submitChoice(choiceText);
        aiChoicesContainer.appendChild(btn);
    });

    // 6. Tampilkan panel kontrol dan sembunyikan loading
    controlsContainer.classList.remove('hidden');
    loadingIndicator.classList.add('hidden');
    loadingIndicator.classList.remove('flex');
    isGenerating = false;
    
    // Gulir ke bawah secara otomatis
    scrollToBottom();
}
