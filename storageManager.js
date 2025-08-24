// ==========================================
// STORAGE MANAGER MODULE
// ==========================================

export const storageManager = {
  // Local storage management
  localStorage: {
    save: function(key, data) {
      try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
        return false;
      }
    },

    load: function(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (error) {
        console.error('Failed to load from localStorage:', error);
        return defaultValue;
      }
    },

    remove: function(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error('Failed to remove from localStorage:', error);
        return false;
      }
    },

    clear: function() {
      try {
        localStorage.clear();
        return true;
      } catch (error) {
        console.error('Failed to clear localStorage:', error);
        return false;
      }
    }
  },

  // Application state persistence
  state: {
    savePlayerState: function() {
      const playerState = {
        volume: musicPlayer.state.volume || 1,
        shuffleMode: musicPlayer.state.shuffleMode,
        repeatMode: musicPlayer.state.repeatMode,
        theme: document.documentElement.classList.contains('light') ? 'light' : 
               document.documentElement.classList.contains('medium') ? 'medium' : 'dark'
      };
      
      return storageManager.localStorage.save('playerState', playerState);
    },

    loadPlayerState: function() {
      const defaultState = {
        volume: 1,
        shuffleMode: false,
        repeatMode: 'off',
        theme: 'dark'
      };
      
      return storageManager.localStorage.load('playerState', defaultState);
    },

    saveQueue: function() {
      const queueState = {
        queue: queueManager.queue.items,
        recentlyPlayed: queueManager.recentlyPlayed.items,
        favorites: Array.from(queueManager.favorites.items),
        playlists: queueManager.playlists.items
      };
      
      return storageManager.localStorage.save('queueState', queueState);
    },

    loadQueue: function() {
      const defaultState = {
        queue: [],
        recentlyPlayed: [],
        favorites: [],
        playlists: []
      };
      
      const state = storageManager.localStorage.load('queueState', defaultState);
      
      // Restore data structures
      queueManager.queue.items = state.queue || [];
      queueManager.recentlyPlayed.items = state.recentlyPlayed || [];
      queueManager.favorites.items = new Set(state.favorites || []);
      queueManager.playlists.items = state.playlists || [];
      
      return state;
    },

    saveCurrentSong: function() {
      if (!musicPlayer.state.currentSong) return false;
      
      const songState = {
        song: musicPlayer.state.currentSong,
        position: musicPlayer.state.audioElement ? musicPlayer.state.audioElement.currentTime : 0,
        timestamp: Date.now()
      };
      
      return storageManager.localStorage.save('currentSong', songState);
    },

    loadCurrentSong: function() {
      const songState = storageManager.localStorage.load('currentSong');
      
      if (songState && songState.song) {
        // Only restore if saved within last 24 hours
        const hoursSinceLastPlay = (Date.now() - songState.timestamp) / (1000 * 60 * 60);
        if (hoursSinceLastPlay < 24) {
          return songState;
        }
      }
      
      return null;
    }
  },

  // Search history
  search: {
    saveRecentSearch: function(query) {
      const recentSearches = this.getRecentSearches();
      
      // Remove if already exists
      const filtered = recentSearches.filter(item => item !== query);
      
      // Add to beginning
      filtered.unshift(query);
      
      // Keep only last 5
      const limited = filtered.slice(0, 5);
      
      return storageManager.localStorage.save('recentSearches', limited);
    },

    getRecentSearches: function() {
      return storageManager.localStorage.load('recentSearches', []);
    },

    clearRecentSearches: function() {
      return storageManager.localStorage.remove('recentSearches');
    },

    removeRecentSearch: function(query) {
      const recentSearches = this.getRecentSearches();
      const filtered = recentSearches.filter(item => item !== query);
      return storageManager.localStorage.save('recentSearches', filtered);
    }
  },

  // Settings
  settings: {
    saveViewMode: function(mode) {
      return storageManager.localStorage.save('artistsViewMode', mode);
    },

    getViewMode: function() {
      return storageManager.localStorage.load('artistsViewMode', 'grid');
    },

    saveTheme: function(theme) {
      return storageManager.localStorage.save('theme-preference', theme);
    },

    getTheme: function() {
      return storageManager.localStorage.load('theme-preference', 'dark');
    }
  },

  // Initialization
  initialization: {
    initialize: function() {
      // Load and apply saved state
      const playerState = storageManager.state.loadPlayerState();
      const queueState = storageManager.state.loadQueue();
      
      // Apply theme
      const theme = playerState.theme;
      if (theme === 'light') {
        document.documentElement.classList.add('light');
      } else if (theme === 'medium') {
        document.documentElement.classList.add('medium');
      }
      
      // Apply player settings
      musicPlayer.state.shuffleMode = playerState.shuffleMode;
      musicPlayer.state.repeatMode = playerState.repeatMode;
      
      // Set up auto-save
      this.setupAutoSave();
    },

    setupAutoSave: function() {
      // Save state every 30 seconds
      setInterval(() => {
        storageManager.state.savePlayerState();
        storageManager.state.saveQueue();
        if (musicPlayer.state.currentSong) {
          storageManager.state.saveCurrentSong();
        }
      }, 30000);
      
      // Save on page unload
      window.addEventListener('beforeunload', () => {
        storageManager.state.savePlayerState();
        storageManager.state.saveQueue();
        if (musicPlayer.state.currentSong) {
          storageManager.state.saveCurrentSong();
        }
      });
    }
  }
};