class GitHubStorageManager {
    constructor() {
        this.owner = 'Maxyey';
        this.repo = 'LYRICSSOS-SOURCES';
        this.branch = 'main';
        this.baseUrl = 'https://api.github.com';
        this.dataFile = 'songs-data.json';
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }

    async initialize(token) {
        try {
            // Validate the provided token
            if (!token) {
                throw new Error('No GitHub token provided');
            }

            const data = await this.fetchSongsDataWithRetry();
            if (!data) {
                // Initialize with sample data if no songs exist
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
                await this.saveSongsData({ songs: sampleSongs, audioData: {} });
                return { songs: sampleSongs, audioData: {} };
            }
            return data;
        } catch (error) {
            console.error('Error initializing GitHub storage:', error);
            return null;
        }
    }

    async fetchSongsDataWithRetry(attempt = 1) {
        try {
            const token = this.getGitHubToken();
            if (!token) {
                throw new Error('No GitHub token available');
            }

            const response = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${this.dataFile}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return null; // File doesn't exist yet
                }
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('github_token'); // Clear invalid token
                    throw new Error('GitHub authentication failed');
                }
                throw new Error(`GitHub API error: ${response.statusText}`);
            }

            const data = await response.json();
            const content = atob(data.content);
            return JSON.parse(content);
        } catch (error) {
            if (attempt < this.retryAttempts) {
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.fetchSongsDataWithRetry(attempt + 1);
            }
            throw error;
        }
    }

    async saveSongsData(data) {
        try {
            const token = this.getGitHubToken();
            if (!token) {
                throw new Error('No GitHub token available');
            }

            const content = btoa(JSON.stringify(data, null, 2));
            let currentFile;
            
            try {
                currentFile = await this.fetchSongsDataWithRetry();
            } catch (error) {
                console.log('No existing file found, creating new one');
            }
            
            const requestBody = {
                message: 'Update songs data',
                content: content,
                branch: this.branch
            };

            if (currentFile && currentFile.sha) {
                requestBody.sha = currentFile.sha;
            }

            const response = await fetch(`${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${this.dataFile}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('github_token'); // Clear invalid token
                    throw new Error('GitHub authentication failed');
                }
                throw new Error(`GitHub API error: ${response.statusText}`);
            }

            // Dispatch event to notify of successful save
            window.dispatchEvent(new CustomEvent('githubSaveSuccess'));
            return true;
        } catch (error) {
            console.error('Error saving data to GitHub:', error);
            // Dispatch event to notify of save failure
            window.dispatchEvent(new CustomEvent('githubSaveError', { detail: error.message }));
            return false;
        }
    }

    getGitHubToken() {
        return localStorage.getItem('github_token');
    }

    isAuthenticated() {
        return !!this.getGitHubToken();
    }
}

// Create a single instance of GitHubStorageManager
const githubStorage = new GitHubStorageManager();
