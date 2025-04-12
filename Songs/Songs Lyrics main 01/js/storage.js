class StorageManager {
    constructor() {
        this.songs = [];
        this.audioData = {};
        this.initialized = false;
        this.lastSyncTime = 0;
        this.syncInterval = 30000; // Sync every 30 seconds
    }

    async startAutoSync() {
        if (!this.initialized) {
            await this.initializeStorage();
        }
        // Set up periodic sync
        setInterval(async () => {
            await this.syncWithGitHub();
        }, this.syncInterval);
    }

    async syncWithGitHub() {
        try {
            if (!githubStorage.isAuthenticated()) {
                return; // Skip sync if not authenticated
            }

            const githubData = await githubStorage.fetchSongsDataWithRetry();
            if (githubData) {
                // Only update if the data has changed
                if (JSON.stringify(this.songs) !== JSON.stringify(githubData.songs) ||
                    JSON.stringify(this.audioData) !== JSON.stringify(githubData.audioData)) {
                    this.songs = githubData.songs;
                    this.audioData = githubData.audioData;
                    localStorage.setItem('songs', JSON.stringify(this.songs));
                    localStorage.setItem('audioData', JSON.stringify(this.audioData));
                    // Dispatch an event to notify UI of updates
                    window.dispatchEvent(new CustomEvent('songsUpdated'));
                }
            }
        } catch (error) {
            console.error('Error syncing with GitHub:', error);
        }
    }

    async initializeStorage() {
        try {
            // First try local storage
            this.songs = JSON.parse(localStorage.getItem('songs')) || [];
            this.audioData = JSON.parse(localStorage.getItem('audioData')) || {};

            // If GitHub is authenticated, try to get data from there
            if (githubStorage.isAuthenticated()) {
                try {
                    const githubData = await githubStorage.fetchSongsDataWithRetry();
                    if (githubData) {
                        this.songs = githubData.songs;
                        this.audioData = githubData.audioData;
                        // Update local storage with GitHub data
                        localStorage.setItem('songs', JSON.stringify(this.songs));
                        localStorage.setItem('audioData', JSON.stringify(this.audioData));
                    }
                } catch (error) {
                    console.warn('Failed to fetch from GitHub, using local storage:', error);
                }
            }

            // Initialize with sample data if no songs exist anywhere
            if (this.songs.length === 0) {
                const sampleSongs = [
                    {
                        id: '1',
                        name: 'Amazing Grace',
                        composer: 'John Newton',
                        lyrics: 'Amazing grace, how sweet the sound\nThat saved a wretch like me.\nI once was lost, but now am found,\nWas blind, but now I see.',
                        tags: ['hymn', 'classic', 'worship'],
                        demoText: 'Demo song'
                    },
                    {
                        id: '2',
                        name: 'How Great Thou Art',
                        composer: 'Carl Boberg',
                        lyrics: 'O Lord my God, when I in awesome wonder\nConsider all the worlds Thy hands have made,\nI see the stars, I hear the rolling thunder,\nThy power throughout the universe displayed.',
                        tags: ['hymn', 'worship', 'traditional'],
                        demoText: 'Demo song'
                    },
                    {
                        id: '3',
                        name: 'It Is Well',
                        composer: 'Horatio Spafford',
                        lyrics: 'When peace like a river attendeth my way,\nWhen sorrows like sea billows roll,\nWhatever my lot, Thou hast taught me to say,\nIt is well, it is well with my soul.',
                        tags: ['hymn', 'peace', 'classic'],
                        demoText: 'Demo song'
                    }
                ];
                this.songs = sampleSongs;
                await this.saveSongs();
            }
            this.initialized = true;
            // Start auto-sync after successful initialization
            this.startAutoSync();
        } catch (error) {
            console.error('Error initializing storage:', error);
            // Ensure we at least have local data
            this.songs = JSON.parse(localStorage.getItem('songs')) || [];
            this.audioData = JSON.parse(localStorage.getItem('audioData')) || {};
            this.initialized = true;
        }
    }

    async saveSongs() {
        // Save to localStorage
        localStorage.setItem('songs', JSON.stringify(this.songs));
        localStorage.setItem('audioData', JSON.stringify(this.audioData));

        // If GitHub token exists and we're in admin mode, also save to GitHub
        if (githubStorage.isAuthenticated() && localStorage.getItem('adminAuth') === 'true') {
            try {
                await githubStorage.saveSongsData({
                    songs: this.songs,
                    audioData: this.audioData
                });
            } catch (error) {
                console.error('Error saving to GitHub:', error);
                throw error; // Propagate error to handle in UI
            }
        }
    }

    async addSong(song, audioData = null, audioUrl = null) {
        song.id = Date.now().toString();
        song.tags = typeof song.tags === 'string' ? 
            song.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : 
            song.tags;
        song.demoText = song.demoText || 'Demo song';
        
        if (audioData) {
            this.audioData[song.id] = { type: 'file', data: audioData };
        } else if (audioUrl) {
            this.audioData[song.id] = { 
                type: this.isYouTubeUrl(audioUrl) ? 'youtube' : 'url',
                data: audioUrl 
            };
        }
        
        this.songs.push(song);
        await this.saveSongs();
        return song;
    }

    getAllSongs() {
        return this.songs;
    }

    getSong(id) {
        const song = this.songs.find(song => song.id === id);
        if (song) {
            song.audioData = this.audioData[id] || null;
        }
        return song;
    }

    async updateSong(id, updatedSong, audioData = null, audioUrl = null) {
        const index = this.songs.findIndex(song => song.id === id);
        if (index !== -1) {
            const existingSong = this.songs[index];
            
            const tags = typeof updatedSong.tags === 'string' ? 
                updatedSong.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : 
                updatedSong.tags;

            if (audioData) {
                this.audioData[id] = { type: 'file', data: audioData };
            } else if (audioUrl) {
                this.audioData[id] = { 
                    type: this.isYouTubeUrl(audioUrl) ? 'youtube' : 'url',
                    data: audioUrl 
                };
            }

            this.songs[index] = {
                ...existingSong,
                ...updatedSong,
                id: existingSong.id,
                tags: tags,
                demoText: updatedSong.demoText || existingSong.demoText || 'Demo song'
            };
            
            await this.saveSongs();
            return true;
        }
        return false;
    }

    async deleteSong(id) {
        const index = this.songs.findIndex(song => song.id === id);
        if (index !== -1) {
            this.songs.splice(index, 1);
            delete this.audioData[id];
            await this.saveSongs();
            return true;
        }
        return false;
    }

    searchSongs(query, sortBy = 'az', tags = []) {
        let filteredSongs = [...this.songs];

        if (query) {
            const searchQuery = query.toLowerCase();
            filteredSongs = filteredSongs.filter(song => 
                song.name.toLowerCase().includes(searchQuery) ||
                song.composer.toLowerCase().includes(searchQuery) ||
                song.lyrics.toLowerCase().includes(searchQuery) ||
                song.tags.some(tag => tag.toLowerCase().includes(searchQuery))
            );
        }

        if (tags.length > 0) {
            filteredSongs = filteredSongs.filter(song => 
                tags.some(searchTag => 
                    song.tags.some(songTag => 
                        songTag.toLowerCase().includes(searchTag.toLowerCase())
                    )
                )
            );
        }

        switch (sortBy) {
            case 'za':
                filteredSongs.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'az':
            default:
                filteredSongs.sort((a, b) => a.name.localeCompare(b.name));
        }

        return filteredSongs;
    }

    getAllTags() {
        const tagSet = new Set();
        this.songs.forEach(song => {
            song.tags.forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet).sort();
    }

    getAudioData(songId) {
        return this.audioData[songId] || null;
    }

    async updateAudioData(songId, audioData = null, audioUrl = null) {
        if (audioData) {
            this.audioData[songId] = { type: 'file', data: audioData };
        } else if (audioUrl) {
            this.audioData[songId] = { 
                type: this.isYouTubeUrl(audioUrl) ? 'youtube' : 'url',
                data: audioUrl 
            };
        }
        await this.saveSongs();
    }

    isYouTubeUrl(url) {
        return url.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/);
    }

    getYouTubeVideoId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }
}

// Create a single instance of StorageManager
const storage = new StorageManager();

// Initialize storage when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    storage.initializeStorage();
});
