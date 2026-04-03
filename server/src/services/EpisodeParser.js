/**
 * Parse season/episode info from a torrent title.
 * Returns { season, episode, isCompleteSeason, isCompleteSeries }
 */
function parseEpisodeInfo(title) {
    const result = { season: null, episode: null, isCompleteSeason: false, isCompleteSeries: false };
    if (!title) return result;

    // Complete Series detection
    if (/Complete\s*(Series|Collection)/i.test(title) || /Season\s*1\s*[-–]\s*\d{1,2}\s/i.test(title) || /S01\s*[-–]\s*S\d{2}/i.test(title)) {
        result.isCompleteSeries = true;
        // Try to extract season range
        const rangeMatch = title.match(/Season\s*(\d{1,2})\s*[-–]\s*(\d{1,2})/i) || title.match(/S(\d{2})\s*[-–]\s*S(\d{2})/i);
        if (rangeMatch) {
            result.season = Number(rangeMatch[1]);
        }
        return result;
    }

    // Standard S02E05 pattern
    const seMatch = title.match(/S(\d{1,2})E(\d{1,2})/i);
    if (seMatch) {
        result.season = Number(seMatch[1]);
        result.episode = Number(seMatch[2]);
        return result;
    }

    // Season X Episode Y
    const longMatch = title.match(/Season\s*(\d{1,2})\s*Episode\s*(\d{1,2})/i);
    if (longMatch) {
        result.season = Number(longMatch[1]);
        result.episode = Number(longMatch[2]);
        return result;
    }

    // Complete Season (S02 COMPLETE, Season 2 Complete, Season 2 Full)
    const completeSeasonMatch = title.match(/(?:S(\d{1,2})\s*(?:COMPLETE|Full)|Season\s*(\d{1,2})\s*(?:COMPLETE|Full)?(?:\s|$))/i);
    if (completeSeasonMatch && /COMPLETE|Full|Season\s*\d{1,2}\s*$/i.test(title)) {
        result.season = Number(completeSeasonMatch[1] || completeSeasonMatch[2]);
        result.isCompleteSeason = true;
        return result;
    }

    // S02 without episode (likely complete season)
    const sOnlyMatch = title.match(/\bS(\d{1,2})\b(?!\s*E)/i);
    if (sOnlyMatch && !seMatch) {
        result.season = Number(sOnlyMatch[1]);
        result.isCompleteSeason = true;
        return result;
    }

    return result;
}

/**
 * Check if a torrent title looks like TV content
 */
function isLikelyTVContent(title) {
    if (!title) return false;
    return /S\d{1,2}E\d{1,2}/i.test(title) ||
        /S\d{1,2}\b/i.test(title) ||
        /Season\s*\d/i.test(title) ||
        /Episode\s*\d/i.test(title) ||
        /Complete\s*(Series|Season|Collection)/i.test(title) ||
        /\bS\d{2}\s*[-–]\s*S\d{2}\b/i.test(title);
}

module.exports = { parseEpisodeInfo, isLikelyTVContent };
