const CACHE_NAME = "word-order-quest-v2";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./pwa.js",
  "./manifest.webmanifest",
  "./data/audio/manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./data/courses.json",
  "./data/lessons/jhs1/basic-past-tense.json",
  "./data/lessons/jhs1/be-verb.json",
  "./data/lessons/jhs1/can.json",
  "./data/lessons/jhs1/general-verbs.json",
  "./data/lessons/jhs1/imperatives.json",
  "./data/lessons/jhs1/nouns-articles-plurals.json",
  "./data/lessons/jhs1/present-progressive.json",
  "./data/lessons/jhs1/pronouns.json",
  "./data/lessons/jhs1/question-words.json",
  "./data/lessons/jhs1/third-person-singular.json",
  "./data/lessons/jhs2/basic-sentence-patterns.json",
  "./data/lessons/jhs2/comparisons.json",
  "./data/lessons/jhs2/conjunctions.json",
  "./data/lessons/jhs2/future-expressions.json",
  "./data/lessons/jhs2/gerunds.json",
  "./data/lessons/jhs2/infinitives.json",
  "./data/lessons/jhs2/modal-verbs.json",
  "./data/lessons/jhs2/past-progressive.json",
  "./data/lessons/jhs2/past-tense.json",
  "./data/lessons/jhs2/there-is-there-are.json",
  "./data/lessons/jhs3/basic-subjunctive.json",
  "./data/lessons/jhs3/indirect-questions.json",
  "./data/lessons/jhs3/it-is-for-to.json",
  "./data/lessons/jhs3/object-complement.json",
  "./data/lessons/jhs3/participles.json",
  "./data/lessons/jhs3/passive-voice.json",
  "./data/lessons/jhs3/present-perfect.json",
  "./data/lessons/jhs3/question-word-to.json",
  "./data/lessons/jhs3/relative-pronouns.json",
  "./data/lessons/jhs3/too-to-enough-to.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "./index.html"));
    return;
  }

  if (url.pathname.endsWith(".json")) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackUrl) return caches.match(fallbackUrl);
    throw new Error("Offline and no cached response available.");
  }
}
