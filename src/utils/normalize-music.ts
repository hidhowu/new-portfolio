// Normalize the `music` site setting into the shape the queue manager expects.
// Storage shapes supported (newest → oldest):
//   1) { library: [Track…], tracks: ["id1","id2"], autoplay }  — current
//   2) { tracks: [Track…], autoplay }                          — intermediate
//   3) { trackUrl, title, artist, … }                          — legacy single track
// Output always exposes `tracks: Track[]` (hydrated).

export interface MusicTrack {
  id?: string;
  trackUrl: string;
  title?: string;
  artist?: string;
  durationSec?: number;
  artUrl?: string | null;
  spotifyUrl?: string | null;
  youtubeMusicUrl?: string | null;
  sunoUrl?: string | null;
}

export interface NormalizedMusic {
  tracks: MusicTrack[];
  library?: MusicTrack[];
  autoplay?: boolean;
}

export function normalizeMusic(music: any): NormalizedMusic {
  if (!music || typeof music !== 'object') return { tracks: [] };

  // Shape 1: library + tracks (ids)
  if (Array.isArray(music.library) && music.library.length > 0) {
    const lookup = new Map<string, MusicTrack>();
    for (const t of music.library) {
      if (t && t.id && t.trackUrl) lookup.set(t.id, t);
    }
    let ids: string[] = [];
    if (Array.isArray(music.tracks)) {
      ids = music.tracks
        .map((t: any) => (typeof t === 'string' ? t : (t && t.id) || null))
        .filter(Boolean) as string[];
    }
    const hydrated = ids.map((id) => lookup.get(id)).filter(Boolean) as MusicTrack[];
    return { ...music, tracks: hydrated };
  }

  // Shape 2: tracks array of full objects
  if (
    Array.isArray(music.tracks) &&
    music.tracks.length > 0 &&
    typeof music.tracks[0] === 'object' &&
    (music.tracks[0] as any).trackUrl
  ) {
    return { ...music, tracks: music.tracks };
  }

  // Shape 3: legacy single track
  if (music.trackUrl) {
    return {
      ...music,
      tracks: [{
        id: 'legacy',
        trackUrl: music.trackUrl,
        title: music.title,
        artist: music.artist,
        durationSec: music.durationSec,
        artUrl: music.artUrl ?? null,
        spotifyUrl: music.spotifyUrl ?? null,
        youtubeMusicUrl: music.youtubeMusicUrl ?? null,
        sunoUrl: music.sunoUrl ?? null,
      }],
    };
  }

  return { ...music, tracks: [] };
}
