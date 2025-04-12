document.addEventListener('DOMContentLoaded', async () => {
    // Check admin authentication
    if (!isAdminAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    // Elements
    const uploadForm = document.getElementById('uploadForm');
    const manageSongsList = document.getElementById('manageSongsList');
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    const closeEditModal = document.getElementById('closeEditModal');
    const logoutBtn = document.getElementById('logoutBtn');
    const githubBtn = document.getElementById('githubBtn');
    const githubModal = document.getElementById('githubModal');
    const closeGithubModal = document.getElementById('closeGithubModal');
    const githubForm = document.getElementById('githubForm');
    const syncGithubBtn = document.getElementById('syncGithubBtn');
    const uploadAndSyncBtn = document.getElementById('uploadAndSyncBtn');
    const saveAndSyncBtn = document.getElementById('saveAndSyncBtn');

    // Initialize
    await storage.initializeStorage();
    renderManageSongs();
    updateGithubButtonStatus();

    // GitHub token setup
    githubBtn.addEventListener('click', () => {
        githubModal.classList.remove('hidden');
        githubModal.classList.add('flex');
        const currentToken = localStorage.getItem('github_token') || '';
        document.getElementById('githubToken').value = currentToken;
    });

    closeGithubModal.addEventListener('click', () => {
        githubModal.classList.add('hidden');
        githubModal.classList.remove('flex');
    });

    githubForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = document.getElementById('githubToken').value;
        githubStorage.token = token; // Set the token directly in the GitHubStorageManager
        updateGithubButtonStatus();
        githubModal.classList.add('hidden');
        githubModal.classList.remove('flex');
        showNotification('GitHub token saved successfully!');

        // Sync current data to GitHub
        try {
            await storage.saveSongs();
            showNotification('Data synchronized with GitHub!');
        } catch (error) {
            console.error('Error syncing with GitHub:', error);
            showNotification('Error syncing with GitHub', 'error');
        }
    });

    function updateGithubButtonStatus() {
        const hasToken = githubStorage.isAuthenticated();
        githubBtn.innerHTML = `<i class="fab fa-github text-${hasToken ? 'teal' : 'gray'}-600"></i>`;
        githubBtn.title = hasToken ? 'GitHub Sync Enabled' : 'Setup GitHub Sync';
        
        // Show/hide sync buttons
        syncGithubBtn.classList.toggle('hidden', !hasToken);
        syncGithubBtn.classList.toggle('flex', hasToken);
        uploadAndSyncBtn.classList.toggle('hidden', !hasToken);
        saveAndSyncBtn.classList.toggle('hidden', !hasToken);
    }

    // GitHub sync button handler
    syncGithubBtn.addEventListener('click', async () => {
        if (!githubStorage.isAuthenticated()) {
            showNotification('Please set up GitHub token first', 'error');
            githubBtn.click();
            return;
        }

        try {
            showNotification('Syncing with GitHub...', 'info');
            await storage.saveSongs();
            showNotification('Successfully synced with GitHub!');
        } catch (error) {
            console.error('Error syncing with GitHub:', error);
            showNotification('Error syncing with GitHub: ' + error.message, 'error');
        }
    });

    // Upload and sync button handler
    uploadAndSyncBtn.addEventListener('click', async () => {
        if (!githubStorage.isAuthenticated()) {
            showNotification('Please set up GitHub token first', 'error');
            githubBtn.click();
            return;
        }

        const formData = {
            name: document.getElementById('songName').value,
            composer: document.getElementById('composer').value,
            lyrics: document.getElementById('lyrics').value,
            tags: document.getElementById('tags').value,
            demoText: document.getElementById('demoText').value || 'Demo song'
        };

        const audioFile = document.getElementById('audioFile').files[0];
        const audioUrl = document.getElementById('audioUrl').value;

        try {
            showNotification('Uploading and syncing song...', 'info');
            
            if (audioFile) {
                const audioData = await readAudioFile(audioFile);
                await storage.addSong(formData, audioData);
            } else if (audioUrl) {
                await storage.addSong(formData, null, audioUrl);
            } else {
                await storage.addSong(formData);
            }

            // Force sync to GitHub
            await storage.saveSongs();
            
            uploadForm.reset();
            await renderManageSongs();
            showNotification('Song uploaded and synced to GitHub successfully!');
        } catch (error) {
            console.error('Error uploading and syncing song:', error);
            showNotification('Error: ' + error.message, 'error');
        }
    });

    // Save and sync button handler in edit modal
    saveAndSyncBtn.addEventListener('click', async () => {
        if (!githubStorage.isAuthenticated()) {
            showNotification('Please set up GitHub token first', 'error');
            githubBtn.click();
            return;
        }

        const songId = document.getElementById('editSongId').value;
        const audioFile = document.getElementById('editAudioFile').files[0];
        const audioUrl = document.getElementById('editAudioUrl').value;
        
        const updatedSong = {
            name: document.getElementById('editSongName').value,
            composer: document.getElementById('editComposer').value,
            lyrics: document.getElementById('editLyrics').value,
            tags: document.getElementById('editTags').value,
            demoText: document.getElementById('editDemoText').value || 'Demo song'
        };

        try {
            showNotification('Saving and syncing changes...', 'info');
            
            if (audioFile) {
                const audioData = await readAudioFile(audioFile);
                await storage.updateSong(songId, updatedSong, audioData);
            } else if (audioUrl) {
                await storage.updateSong(songId, updatedSong, null, audioUrl);
            } else {
                await storage.updateSong(songId, updatedSong);
            }

            // Force sync to GitHub
            await storage.saveSongs();
            
            closeEditModal.click();
            await renderManageSongs();
            showNotification('Changes saved and synced to GitHub successfully!');
        } catch (error) {
            console.error('Error saving and syncing changes:', error);
            showNotification('Error: ' + error.message, 'error');
        }
    });

    // Upload form handler
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('songName').value,
            composer: document.getElementById('composer').value,
            lyrics: document.getElementById('lyrics').value,
            tags: document.getElementById('tags').value,
            demoText: document.getElementById('demoText').value || 'Demo song'
        };

        const audioFile = document.getElementById('audioFile').files[0];
        const audioUrl = document.getElementById('audioUrl').value;

        try {
            if (audioFile) {
                const audioData = await readAudioFile(audioFile);
                await storage.addSong(formData, audioData);
            } else if (audioUrl) {
                await storage.addSong(formData, null, audioUrl);
            } else {
                await storage.addSong(formData);
            }
            
            uploadForm.reset();
            await renderManageSongs();
            showNotification('Song uploaded successfully!');
        } catch (error) {
            console.error('Error uploading song:', error);
            showNotification('Error: ' + error.message, 'error');
        }
    });

    // Edit form handler
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const songId = document.getElementById('editSongId').value;
        const audioFile = document.getElementById('editAudioFile').files[0];
        const audioUrl = document.getElementById('editAudioUrl').value;
        
        const updatedSong = {
            name: document.getElementById('editSongName').value,
            composer: document.getElementById('editComposer').value,
            lyrics: document.getElementById('editLyrics').value,
            tags: document.getElementById('editTags').value,
            demoText: document.getElementById('editDemoText').value || 'Demo song'
        };

        try {
            if (audioFile) {
                const audioData = await readAudioFile(audioFile);
                await storage.updateSong(songId, updatedSong, audioData);
            } else if (audioUrl) {
                await storage.updateSong(songId, updatedSong, null, audioUrl);
            } else {
                await storage.updateSong(songId, updatedSong);
            }
            
            closeEditModal.click();
            await renderManageSongs();
            showNotification('Song updated successfully!');
        } catch (error) {
            console.error('Error updating song:', error);
            showNotification('Error: ' + error.message, 'error');
        }
    });

    // Close edit modal
    closeEditModal.addEventListener('click', () => {
        editModal.classList.add('hidden');
        editModal.classList.remove('flex');
    });

    // Logout handler
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('adminAuth');
        window.location.href = 'index.html';
    });

    function isAdminAuthenticated() {
        return localStorage.getItem('adminAuth') === 'true';
    }

    async function renderManageSongs() {
        const songs = await storage.fetchSongsDataWithRetry(); // Fetch latest songs from GitHub
        manageSongsList.innerHTML = '';

        if (songs.length === 0) {
            manageSongsList.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-music text-4xl text-gray-400 mb-2"></i>
                    <p class="text-gray-500">No songs available</p>
                </div>
            `;
            return;
        }

        songs.forEach(song => {
            const songElement = document.createElement('div');
            songElement.className = 'bg-white rounded-lg shadow p-4 flex items-center justify-between';
            
            const audioData = storage.getAudioData(song.id);
            const audioStatus = audioData ? 
                audioData.type === 'youtube' ? 'YouTube video linked' :
                audioData.type === 'url' ? 'Audio URL linked' :
                'Audio file attached' : 'No audio';
            
            songElement.innerHTML = `
                <div class="flex-1">
                    <h3 class="font-semibold">${song.name}</h3>
                    <p class="text-sm text-gray-600">${song.composer}</p>
                    <div class="flex flex-wrap gap-1 mt-1">
                        ${song.tags.map(tag => `
                            <span class="text-xs px-2 py-1 bg-gray-100 rounded-full">${tag}</span>
                        `).join('')}
                    </div>
                    <p class="text-xs text-gray-500 mt-1">Demo Text: ${song.demoText || 'Demo song'}</p>
                    <p class="text-xs text-gray-500">${audioStatus}</p>
                </div>
                <div class="flex items-center gap-2">
                    <button class="edit-btn p-2 text-blue-600 hover:bg-blue-50 rounded-full" data-id="${song.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn p-2 text-red-600 hover:bg-red-50 rounded-full" data-id="${song.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            // Edit button handler
            songElement.querySelector('.edit-btn').addEventListener('click', () => {
                const songToEdit = storage.getSong(song.id);
                showEditModal(songToEdit);
            });

            // Delete button handler
            songElement.querySelector('.delete-btn').addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this song?')) {
                    try {
                        await storage.deleteSong(song.id);
                        await renderManageSongs();
                        showNotification('Song deleted successfully!');
                        
                        // If GitHub sync is enabled, sync the deletion
                        if (githubStorage.isAuthenticated()) {
                            try {
                                await storage.saveSongs();
                                showNotification('Changes synced to GitHub!');
                            } catch (error) {
                                console.error('Error syncing deletion to GitHub:', error);
                                showNotification('Error syncing to GitHub: ' + error.message, 'error');
                            }
                        }
                    } catch (error) {
                        console.error('Error deleting song:', error);
                        showNotification('Error: ' + error.message, 'error');
                    }
                }
            });

            manageSongsList.appendChild(songElement);
        });
    }

    function showEditModal(song) {
        document.getElementById('editSongId').value = song.id;
        document.getElementById('editSongName').value = song.name;
        document.getElementById('editComposer').value = song.composer;
        document.getElementById('editLyrics').value = song.lyrics;
        document.getElementById('editTags').value = song.tags.join(', ');
        document.getElementById('editDemoText').value = song.demoText || 'Demo song';

        // Show current audio status
        const currentAudioStatus = document.getElementById('currentAudioStatus');
        const audioData = storage.getAudioData(song.id);
        
        if (audioData) {
            if (audioData.type === 'youtube') {
                currentAudioStatus.textContent = 'Current audio: YouTube video';
                document.getElementById('editAudioUrl').value = audioData.data;
            } else if (audioData.type === 'url') {
                currentAudioStatus.textContent = 'Current audio: Audio URL';
                document.getElementById('editAudioUrl').value = audioData.data;
            } else {
                currentAudioStatus.textContent = 'Current audio: Audio file';
                document.getElementById('editAudioUrl').value = '';
            }
            currentAudioStatus.className = 'text-sm text-teal-600 mt-1';
        } else {
            currentAudioStatus.textContent = 'No audio attached';
            currentAudioStatus.className = 'text-sm text-gray-500 mt-1';
            document.getElementById('editAudioUrl').value = '';
        }

        editModal.classList.remove('hidden');
        editModal.classList.add('flex');
    }

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            'bg-blue-500'
        } text-white transform transition-transform duration-300 translate-y-0`;
        
        notification.innerHTML = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('translate-y-full');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    async function readAudioFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }
});
