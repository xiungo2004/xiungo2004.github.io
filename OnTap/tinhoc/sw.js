const CACHE_NAME = 'quiz-app-v1';
const urlsToCache = [
    '/OnTap/tinhoc/',
    '/OnTap/tinhoc/index.html',
    '/OnTap/tinhoc/style.css',
    '/OnTap/tinhoc/app.js',
    '/OnTap/tinhoc/questions.js',
    '/OnTap/tinhoc/questions.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            }
        )
    );
});