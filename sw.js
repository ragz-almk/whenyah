const CACHE_NAME = 'ai-vn-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/script.js',
  '/firebase.js',
  '/manifest.json'
  // Jangan masukkan /api/gemini di sini karena itu butuh internet untuk memanggil AI
];

// 1. Proses Install: Menyimpan file penting ke dalam Cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Membuka cache dan menyimpan aset utama');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Proses Activate: Membersihkan Cache lama jika ada versi baru
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. Proses Fetch: Mengambil dari Cache dulu, jika tidak ada baru ke Internet (Cache First)
self.addEventListener('fetch', event => {
  // Abaikan request ke API Vercel atau Firebase Auth/Firestore
  // Kita hanya ingin meng-cache file statis (HTML, JS, CSS, Gambar)
  if (event.request.url.includes('/api/') || event.request.url.includes('firestore') || event.request.url.includes('identitytoolkit')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Jika file ada di cache, kembalikan dari cache
        if (response) {
          return response;
        }
        // Jika tidak ada, ambil dari internet
        return fetch(event.request);
      })
  );
});
