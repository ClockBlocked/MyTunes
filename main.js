// ==========================================
// MAIN APPLICATION ENTRY POINT
// ==========================================
import { music } from './library.js';
import { musicPlayer } from './musicPlayer.js';
import { uiManager } from './uiManager.js';
import { eventBus } from './eventBus.js';
import { render } from './blocks.js';

// ==========================================
// SIMPLIFIED APPLICATION CLASS
// ==========================================
class MyTunesApp {
  constructor() {
    this.initialized = false;
    this.currentPage = "home";
    
    // Simple state management
    this.state = {
      queue: [],
      recentlyPlayed: [],
      favorites: new Set(),
      playlists: [],
      currentSong: null
    };
  }

  async initialize() {
    try {
      console.log(`User: ClockBlocked | Time: 2025-08-24 09:16:47`);
      
      // Initialize event listeners first
      this.setupEventListeners();
      
      // Initialize music library
      this.initializeMusicLibrary();
      
      // Initialize core modules
      musicPlayer.initialize();
      uiManager.initialize();
      
      // Wait a bit for DOM to be ready, then load home page
      setTimeout(() => {
        this.loadHomePage();
        this.initialized = true;
        console.log("MyTunes application initialized successfully");
      }, 100);
      
    } catch (error) {
      console.error("Application initialization failed:", error);
    }
  }

  setupEventListeners() {
    // Core playback events
    eventBus.on('playSongRequested', (song) => {
      musicPlayer.playSong(song);
    });

    // Queue management
    eventBus.on('addToQueue', (song) => {
      this.state.queue.push(song);
      eventBus.emit('queueUpdated', this.state.queue);
    });

    eventBus.on('playFromQueue', (index) => {
      if (index >= 0 && index < this.state.queue.length) {
        const song = this.state.queue.splice(index, 1)[0];
        musicPlayer.playSong(song);
        eventBus.emit('queueUpdated', this.state.queue);
      }
    });

    eventBus.on('playFromRecent', (index) => {
      if (index >= 0 && index < this.state.recentlyPlayed.length) {
        musicPlayer.playSong(this.state.recentlyPlayed[index]);
      }
    });

    // Recently played management
    eventBus.on('addToRecentlyPlayed', (song) => {
      this.state.recentlyPlayed.unshift(song);
      if (this.state.recentlyPlayed.length > 50) {
        this.state.recentlyPlayed = this.state.recentlyPlayed.slice(0, 50);
      }
      eventBus.emit('recentlyPlayedUpdated', this.state.recentlyPlayed);
    });

    // Favorites management
    eventBus.on('toggleCurrentSongFavorite', () => {
      if (this.state.currentSong) {
        const songId = this.state.currentSong.id || this.state.currentSong.title;
        if (this.state.favorites.has(songId)) {
          this.state.favorites.delete(songId);
          eventBus.emit('showNotification', 'Removed from favorites', 'info');
        } else {
          this.state.favorites.add(songId);
          eventBus.emit('showNotification', 'Added to favorites', 'success');
        }
        eventBus.emit('favoritesUpdated', this.state.favorites);
      }
    });

    // Current song tracking
    eventBus.on('currentSongChanged', (song) => {
      this.state.currentSong = song;
    });

    // Navigation events
    eventBus.on('nextTrackRequested', () => this.nextTrack());
    eventBus.on('previousTrackRequested', () => this.previousTrack());

    // Notifications
    eventBus.on('showNotification', (message, type = 'info') => {
      this.showNotification(message, type);
    });
  }

  initializeMusicLibrary() {
    window.music = music;
    console.log(`Loaded ${music.length} artists`);
  }

  loadHomePage() {
    this.currentPage = "home";
    console.log("Loading home page...");
    
    const homeContent = this.renderHomePage();
    this.updatePageContent(homeContent, () => {
      this.renderRandomArtists();
      this.renderRandomAlbums();
      this.renderRecentlyListened();
      this.renderCreatePlaylistSection();
    });
  }

  renderHomePage() {
    return `
      <div class="text-center py-8 md:py-12">
        <h1 class="text-4xl md:text-5xl font-bold mb-6 gradient-text">Discover Amazing Music</h1>
        <p class="text-lg md:text-xl text-gray-400 mb-8 md:mb-12 max-w-2xl mx-auto">Explore artists, albums, and songs from your personal library with an immersive listening experience</p>
      </div>
      
      <!-- Random Artists Section -->
      <div class="mb-12">
        <h2 class="text-2xl md:text-3xl font-bold mb-6 md:mb-8 px-4">Featured Artists</h2>
        <div id="featured-artists" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 px-4"></div>
      </div>
      
      <!-- Random Albums Section -->
      <div class="mb-12">
        <h2 class="text-2xl md:text-3xl font-bold mb-6 md:mb-8 px-4">Featured Albums</h2>
        <div id="featured-albums" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 px-4"></div>
      </div>
      
      <!-- Bento Grid Section for Recent & Actions -->
      <div class="mb-12 px-4">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Recently Listened Bento Grid -->
          <div class="bento-grid-container">
            <h2 class="text-2xl md:text-3xl font-bold mb-6">Recently Listened</h2>
            <div id="recently-listened" class="bento-grid"></div>
          </div>
          
          <!-- Create Playlist Bento Grid -->
          <div class="bento-grid-container">
            <h2 class="text-2xl md:text-3xl font-bold mb-6">Quick Actions</h2>
            <div id="quick-actions" class="bento-grid"></div>
          </div>
        </div>
      </div>
    `;
  }

  renderRandomArtists() {
    const featuredArtists = document.getElementById('featured-artists');
    if (!window.music || window.music.length === 0) {
      if (featuredArtists) featuredArtists.innerHTML = "<p>No music library found.</p>";
      return;
    }
    
    const shuffled = [...window.music].sort(() => 0.5 - Math.random());
    const randomArtists = shuffled.slice(0, 4);
    if (featuredArtists) featuredArtists.innerHTML = "";
    
    randomArtists.forEach(artist => {
      const artistElement = this.createArtistCard(artist);
      if (artistElement && featuredArtists) {
        artistElement.addEventListener("click", () => this.loadArtistPage(artist));
        featuredArtists.appendChild(artistElement);
      }
    });
    
    if (featuredArtists) this.fadeInContent(featuredArtists);
  }

  renderRandomAlbums() {
    const featuredAlbums = document.getElementById('featured-albums');
    if (!window.music || window.music.length === 0) {
      if (featuredAlbums) featuredAlbums.innerHTML = "<p>No music library found.</p>";
      return;
    }
    
    // Collect all albums from all artists
    const allAlbums = [];
    window.music.forEach(artist => {
      artist.albums.forEach(album => {
        allAlbums.push({
          ...album,
          artist: artist.artist,
          artistData: artist
        });
      });
    });
    
    // Shuffle and get random albums
    const shuffled = [...allAlbums].sort(() => 0.5 - Math.random());
    const randomAlbums = shuffled.slice(0, 4);
    if (featuredAlbums) featuredAlbums.innerHTML = "";
    
    randomAlbums.forEach(album => {
      const albumElement = this.createAlbumCard(album);
      if (albumElement && featuredAlbums) {
        albumElement.addEventListener("click", () => this.playAlbum(album));
        featuredAlbums.appendChild(albumElement);
      }
    });
    
    if (featuredAlbums) this.fadeInContent(featuredAlbums);
  }

  renderRecentlyListened() {
    const recentlyListened = document.getElementById('recently-listened');
    if (!recentlyListened) return;
    
    const recentSongs = this.state.recentlyPlayed.slice(0, 7);
    
    if (recentSongs.length === 0) {
      recentlyListened.innerHTML = `
        <div class="bento-item empty-state">
          <div class="text-center py-8">
            <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z"/>
            </svg>
            <p class="text-sm opacity-70">No recently played songs</p>
          </div>
        </div>
      `;
      return;
    }
    
    recentlyListened.innerHTML = "";
    
    recentSongs.forEach((song, index) => {
      const songElement = this.createRecentSongCard(song, index);
      if (songElement) {
        songElement.addEventListener("click", () => {
          eventBus.emit('playSongRequested', song);
        });
        recentlyListened.appendChild(songElement);
      }
    });
    
    this.fadeInContent(recentlyListened);
  }

  renderCreatePlaylistSection() {
    const quickActions = document.getElementById('quick-actions');
    if (!quickActions) return;
    
    quickActions.innerHTML = `
      <!-- Create Playlist Card -->
      <div class="bento-item create-playlist-card cursor-pointer hover:scale-105 transition-transform duration-300" id="create-playlist-card">
        <div class="flex flex-col items-center justify-center h-full text-center p-6">
          <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
          </div>
          <h3 class="text-lg font-bold mb-2">Create Playlist</h3>
          <p class="text-sm opacity-70">Start building your perfect collection</p>
        </div>
      </div>
      
      <!-- Shuffle All Card -->
      <div class="bento-item shuffle-all-card cursor-pointer hover:scale-105 transition-transform duration-300" id="shuffle-all-card">
        <div class="flex flex-col items-center justify-center h-full text-center p-6">
          <div class="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
            </svg>
          </div>
          <h3 class="text-lg font-bold mb-2">Shuffle All</h3>
          <p class="text-sm opacity-70">Play all songs randomly</p>
        </div>
      </div>
      
      <!-- Favorite Songs Card -->
      <div class="bento-item favorites-card cursor-pointer hover:scale-105 transition-transform duration-300" id="favorites-card">
        <div class="flex flex-col items-center justify-center h-full text-center p-6">
          <div class="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
          </div>
          <h3 class="text-lg font-bold mb-2">Favorites</h3>
          <p class="text-sm opacity-70">${this.state.favorites.size} favorite songs</p>
        </div>
      </div>
      
      <!-- Library Stats Card -->
      <div class="bento-item stats-card">
        <div class="flex flex-col justify-center h-full p-6">
          <h3 class="text-lg font-bold mb-4">Your Library</h3>
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-sm opacity-70">Artists</span>
              <span class="font-semibold">${window.music ? window.music.length : 0}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm opacity-70">Albums</span>
              <span class="font-semibold">${this.getTotalAlbums()}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm opacity-70">Songs</span>
              <span class="font-semibold">${this.getTotalSongs()}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm opacity-70">Playlists</span>
              <span class="font-semibold">${this.state.playlists.length}</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Bind event listeners for quick actions
    this.bindQuickActionEvents();
    this.fadeInContent(quickActions);
  }

  bindQuickActionEvents() {
    // Create Playlist
    const createPlaylistCard = document.getElementById('create-playlist-card');
    if (createPlaylistCard) {
      createPlaylistCard.addEventListener('click', () => {
        const playlistName = prompt("Enter playlist name:");
        if (playlistName && playlistName.trim()) {
          const playlist = {
            id: Date.now().toString(),
            name: playlistName.trim(),
            songs: [],
            created: new Date().toISOString()
          };
          this.state.playlists.push(playlist);
          this.showNotification(`Created playlist: ${playlist.name}`, 'success');
        }
      });
    }
    
    // Shuffle All
    const shuffleAllCard = document.getElementById('shuffle-all-card');
    if (shuffleAllCard) {
      shuffleAllCard.addEventListener('click', () => {
        // This will trigger the shuffleAllSongs function in uiManager
        uiManager.shuffleAllSongs();
      });
    }
    
    // Favorites
    const favoritesCard = document.getElementById('favorites-card');
    if (favoritesCard) {
      favoritesCard.addEventListener('click', () => {
        uiManager.openFavoriteSongs();
      });
    }
  }

  createArtistCard(artist) {
    const html = `
      <div class="artist-card rounded-xl bg-white bg-opacity-5 backdrop-blur-sm border border-white border-opacity-10 p-6 cursor-pointer hover:shadow-lg transition-all" data-artist-id="${artist.id}">
        <div class="text-center">
          <div class="artist-avatar w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600">
            <img src="${window.getArtistImageUrl(artist.artist)}" alt="${artist.artist}" class="w-full h-full object-cover">
          </div>
          <h3 class="text-lg font-bold mb-2">${artist.artist}</h3>
          <div class="genre-tag inline-block px-3 py-1 bg-blue-600 bg-opacity-30 rounded-full text-xs font-medium mb-3">${artist.genre}</div>
          <p class="text-sm opacity-70">${artist.albums.length} album${artist.albums.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
    `;
    
    const div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstChild;
  }

  createAlbumCard(album) {
    const html = `
      <div class="album-card rounded-xl bg-white bg-opacity-5 backdrop-blur-sm border border-white border-opacity-10 p-6 cursor-pointer hover:shadow-lg transition-all" data-album-id="${album.album}">
        <div class="text-center">
          <div class="album-cover w-32 h-32 mx-auto mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500 to-blue-600">
            <img src="${window.getAlbumImageUrl(album.album)}" alt="${album.album}" class="w-full h-full object-cover">
          </div>
          <h3 class="text-lg font-bold mb-2">${album.album}</h3>
          <p class="text-sm opacity-70 mb-1">${album.artist}</p>
          <p class="text-xs opacity-50">${album.year || 'Unknown year'} • ${album.songs.length} track${album.songs.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
    `;
    
    const div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstChild;
  }

  createRecentSongCard(song, index) {
    const html = `
      <div class="bento-item recent-song-card cursor-pointer hover:scale-105 transition-transform duration-300" data-song-index="${index}">
        <div class="flex items-center p-4 h-full">
          <div class="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-gray-500 to-gray-700 flex-shrink-0">
            <img src="${song.cover || window.getAlbumImageUrl(song.album)}" alt="${song.title}" class="w-full h-full object-cover">
          </div>
          <div class="ml-4 min-w-0 flex-1">
            <h4 class="text-sm font-semibold truncate">${song.title}</h4>
            <p class="text-xs opacity-70 truncate">${song.artist}</p>
            <p class="text-xs opacity-50 truncate">${song.album}</p>
          </div>
          <div class="ml-2 flex-shrink-0">
            <svg class="w-4 h-4 opacity-70" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
    `;
    
    const div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstChild;
  }

  // Navigation functions
  nextTrack() {
    if (this.state.queue.length > 0) {
      const nextSong = this.state.queue.shift();
      musicPlayer.playSong(nextSong);
      eventBus.emit('queueUpdated', this.state.queue);
      return;
    }
    
    // Play next song from current album if no queue
    if (this.state.currentSong) {
      const artist = window.music.find(a => a.artist === this.state.currentSong.artist);
      const album = artist?.albums.find(al => al.album === this.state.currentSong.album);
      if (album && album.songs.length > 0) {
        const songIndex = album.songs.findIndex(s => s.title === this.state.currentSong.title);
        const nextSongIndex = (songIndex + 1) % album.songs.length;
        const nextSong = {
          ...album.songs[nextSongIndex],
          artist: artist.artist,
          album: album.album,
          cover: window.getAlbumImageUrl(album.album)
        };
        musicPlayer.playSong(nextSong);
      }
    }
  }

  previousTrack() {
    // Simple previous track implementation
    if (this.state.currentSong) {
      const artist = window.music.find(a => a.artist === this.state.currentSong.artist);
      const album = artist?.albums.find(al => al.album === this.state.currentSong.album);
      if (album && album.songs.length > 0) {
        const songIndex = album.songs.findIndex(s => s.title === this.state.currentSong.title);
        const prevSongIndex = (songIndex - 1 + album.songs.length) % album.songs.length;
        const prevSong = {
          ...album.songs[prevSongIndex],
          artist: artist.artist,
          album: album.album,
          cover: window.getAlbumImageUrl(album.album)
        };
        musicPlayer.playSong(prevSong);
      }
    }
  }

  playAlbum(album) {
    if (album.songs && album.songs.length > 0) {
      const firstSong = {
        ...album.songs[0],
        artist: album.artist,
        album: album.album,
        cover: window.getAlbumImageUrl(album.album)
      };
      
      // Add rest of album to queue
      for (let i = 1; i < album.songs.length; i++) {
        const song = {
          ...album.songs[i],
          artist: album.artist,
          album: album.album,
          cover: window.getAlbumImageUrl(album.album)
        };
        this.state.queue.push(song);
      }
      
      eventBus.emit('queueUpdated', this.state.queue);
      musicPlayer.playSong(firstSong);
    }
  }

  // Utility functions
  getTotalAlbums() {
    if (!window.music) return 0;
    return window.music.reduce((total, artist) => total + artist.albums.length, 0);
  }

  getTotalSongs() {
    if (!window.music) return 0;
    return window.music.reduce((total, artist) => {
      return total + artist.albums.reduce((albumTotal, album) => albumTotal + album.songs.length, 0);
    }, 0);
  }

    loadArtistPage(artist) {
    console.log(`Loading artist page for: ${artist.artist}`);
    // Artist page implementation would go here
  }

  updatePageContent(newContent, callback) {
    const contentWrapper = document.getElementById('dynamic-content');
    if (!contentWrapper) {
      if (callback) callback();
      return;
    }
    
    contentWrapper.classList.add('fade-out');
    
    setTimeout(() => {
      contentWrapper.innerHTML = newContent;
      contentWrapper.classList.remove('fade-out');
      contentWrapper.classList.add('fade-in');
      
      setTimeout(() => {
        contentWrapper.classList.remove('fade-in');
        if (callback) callback();
      }, 300);
    }, 300);
  }

  fadeInContent(element) {
    if (!element) return;
    element.classList.add("content-fade-in");
    setTimeout(() => element.classList.remove("content-fade-in"), 600);
  }

  showNotification(message, type = 'info') {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white transition-all duration-300 ${
      type === 'success' ? 'bg-green-600' : 
      type === 'error' ? 'bg-red-600' : 
      type === 'warning' ? 'bg-yellow-600' : 
      'bg-blue-600'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  cleanup() {
    if (this.initialized) {
      this.initialized = false;
    }
  }
}

// ==========================================
// APPLICATION STARTUP
// ==========================================
let myTunesApp;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    myTunesApp = new MyTunesApp();
    window.myTunesApp = myTunesApp;
    await myTunesApp.initialize();
  } catch (error) {
    console.error("Failed to start MyTunes application:", error);
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (myTunesApp) {
    myTunesApp.cleanup();
  }
});

// Export for global access
export { MyTunesApp };

// ==========================================
// LEGACY GLOBAL EXPORTS (for compatibility)
// ==========================================
window.musicPlayer = musicPlayer;
window.uiManager = uiManager;
window.eventBus = eventBus;