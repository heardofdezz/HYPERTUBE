const KEY_PREFIX = 'hypertube:progress:';
const MAX_ENTRIES = 50;
const MIN_POSITION_TO_SAVE = 10;
const COMPLETION_THRESHOLD = 0.95;

function buildKey(movieId, season, episode) {
    let k = `${KEY_PREFIX}${movieId}`;
    if (season != null) k += `:S${season}`;
    if (episode != null) k += `:E${episode}`;
    return k;
}

function pruneOldEntries() {
    const items = getAllProgress();
    if (items.length <= MAX_ENTRIES) return;
    items.slice(MAX_ENTRIES).forEach((item) => {
        localStorage.removeItem(buildKey(item.movieId, item.season, item.episode));
    });
}

export function saveProgress(entry) {
    if (!entry?.movieId || !entry.position || entry.position < MIN_POSITION_TO_SAVE) return;
    if (entry.duration && entry.position / entry.duration >= COMPLETION_THRESHOLD) {
        clearProgress(entry.movieId, entry.season, entry.episode);
        return;
    }
    const key = buildKey(entry.movieId, entry.season, entry.episode);
    const record = { ...entry, updatedAt: Date.now() };
    try {
        localStorage.setItem(key, JSON.stringify(record));
        pruneOldEntries();
    } catch (e) { /* quota — ignore */ }
}

export function getProgress(movieId, season, episode) {
    try {
        const raw = localStorage.getItem(buildKey(movieId, season, episode));
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

export function clearProgress(movieId, season, episode) {
    localStorage.removeItem(buildKey(movieId, season, episode));
}

export function getAllProgress() {
    const items = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(KEY_PREFIX)) continue;
        try {
            const v = JSON.parse(localStorage.getItem(key));
            if (v) items.push(v);
        } catch (e) { /* corrupt — skip */ }
    }
    return items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function formatTime(seconds) {
    if (!seconds || seconds < 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}
