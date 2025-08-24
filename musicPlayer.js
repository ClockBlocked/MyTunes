// ==========================================
// MUSIC PLAYER CORE MODULE
// ==========================================
import { music } from './library.js';
import { eventBus } from './eventBus.js';

export const musicPlayer = {
  // Player state
  state: {
    audioElement: null,
    currentSong: null,
    currentArtist: null,
    currentAlbum: null,
    isPlaying: false,
    duration: 0,
    shuffleMode: false,
    repeatMode: "off",
    isDragging: false,
    currentIndex: 0,
    initialized: false
  },

  // Core initialization
  initialize: function() {
    if (this.state.initialized) return;
    
    console.log("Initializing music player...");
    this.initPlayer();
    this.setupEventListeners();
    this.state.initialized = true;
    eventBus.emit('musicPlayerInitialized');
  },

  initPlayer: function() {
    if (this.state.audioElement) return;
    
    const audio = new Audio();
    audio.addEventListener('timeupdate', () => eventBus.emit('progressUpdate'));
    audio.addEventListener('ended', () => eventBus.emit('songEnded'));
    audio.addEventListener('loadedmetadata', () => {
      this.state.duration = audio.duration;
      eventBus.emit('durationChanged', this.state.duration);
    });
    audio.addEventListener('play', () => this.onPlay());
    audio.addEventListener('pause', () => this.onPause());
    audio.addEventListener('error', (e) => console.error('Audio error:', e));
    
    this.state.audioElement = audio;
    this.setupMediaSession();
    this.createSeekTooltip();
    this.attachProgressBarEvents();
  },

  setupEventListeners: function() {
    eventBus.on('playPauseRequested', () => this.togglePlayPause());
    eventBus.on('nextTrackRequested', () => this.nextTrack());
    eventBus.on('previousTrackRequested', () => this.previousTrack());
    eventBus.on('shuffleToggleRequested', () => this.toggleShuffle());
    eventBus.on('repeatToggleRequested', () => this.toggleRepeat());
    eventBus.on('seekRequested', (time) => this.seekTo(time));
  },

  onPlay: function() {
    this.state.isPlaying = true;
    eventBus.emit('playStateChanged', true);
    
    if (this.state.currentSong) {
      this.setMediaSessionMetadata(this.state.currentSong);
    }
  },
// ==========================================
// MUSIC PLAYER CORE MODULE
// ==========================================
import { youtubePlayer } from './youtubePlayer.js';
import { mediaSession } from './mediaSession.js';
import { playbackControls } from './playbackControls.js';
import { queueManager } from './queueManager.js';
import { uiManager } from './uiManager.js';
import { storageManager } from './storageManager.js';
import { notificationSystem } from './notificationSystem.js';
…    },

    createElementFromHTML: function(htmlString) {
      const div = document.createElement("div");
      div.innerHTML = htmlString.trim();
      return div.firstChild;
    }
  }
};
  onPause: function() {
    this.state.isPlaying = false;
    eventBus.emit('playStateChanged', false);
  },

  // Core playback functionality
  async playSong(songData) {
    if (!songData) return;

    console.log(`Playing song: ${songData.title} by ${songData.artist}`);
    
    // Update recently played
    if (this.state.currentSong) {
      eventBus.emit('addToRecentlyPlayed', this.state.currentSong);
    }

    this.state.currentSong = songData;
    this.state.currentArtist = songData.artist;
    this.state.currentAlbum = songData.album;
    
    eventBus.emit('currentSongChanged', songData);
    
    let isLoaded = false;
    this.stopCurrentPlayback();

    // Try YouTube first if available
    if (songData.youtube) {
      try {
        isLoaded = await this.playYouTube(songData);
      } catch (error) {
        console.error('YouTube playback failed:', error);
        isLoaded = await this.playAudioFallback(songData);
      }
    } else {
      isLoaded = await this.playAudioFallback(songData);
    }

    if (isLoaded) {
      eventBus.emit('songLoaded', songData);
    } else {
      eventBus.emit('songLoadFailed', songData);
    }
  },

  async playYouTube(songData) {
    // Simplified YouTube playback - will be handled by YouTube module
    eventBus.emit('playYouTubeRequested', songData);
    return true;
  },

  stopCurrentPlayback: function() {
    if (this.state.audioElement) {
      this.state.audioElement.pause();
    }
    eventBus.emit('stopYouTubeRequested');
  },

  async playAudioFallback(songData) {
    const formats = ['mp3', 'ogg', 'm4a'];
    for (const format of formats) {
      try {
        const songFileName = songData.title.toLowerCase().replace(/\s+/g, '').replace(/[^\w]/g, '');
        const audioUrl = `https://koders.cloud/global/content/audio/${songFileName}.${format}`;
        this.state.audioElement.src = audioUrl;
        
        await new Promise((resolve, reject) => {
          this.state.audioElement.addEventListener('canplaythrough', resolve, { once: true });
          this.state.audioElement.addEventListener('error', reject, { once: true });
        });
        
        await this.state.audioElement.play();
        this.setMediaSessionMetadata(songData);
        return true;
      } catch (error) {
        console.error(`Audio playback (${format}) failed:`, error);
      }
    }
    return false;
  },

  togglePlayPause: function() {
    if (!this.state.currentSong) return;
    
    if (this.state.isPlaying) {
      if (this.state.audioElement) {
        this.state.audioElement.pause();
      }
      eventBus.emit('pauseYouTubeRequested');
    } else {
      if (this.state.audioElement) {
        this.state.audioElement.play().catch(err => console.error('Play error:', err));
      }
      eventBus.emit('playYouTubeRequested');
    }
  },

  nextTrack: function() {
    eventBus.emit('nextTrackRequested');
  },

  previousTrack: function() {
    eventBus.emit('previousTrackRequested');
  },

  toggleShuffle: function() {
    this.state.shuffleMode = !this.state.shuffleMode;
    eventBus.emit('shuffleModeChanged', this.state.shuffleMode);
    eventBus.emit('showNotification', `Shuffle ${this.state.shuffleMode ? 'enabled' : 'disabled'}`);
  },

  toggleRepeat: function() {
    if (this.state.repeatMode === 'off') {
      this.state.repeatMode = 'all';
    } else if (this.state.repeatMode === 'all') {
      this.state.repeatMode = 'one';
    } else {
      this.state.repeatMode = 'off';
    }
    
    eventBus.emit('repeatModeChanged', this.state.repeatMode);
    
    const message = this.state.repeatMode === 'off' ? 'disabled' : 
                   this.state.repeatMode === 'all' ? 'all songs' : 'current song';
    eventBus.emit('showNotification', `Repeat ${message}`);
  },

  seekTo: function(time) {
    if (this.state.audioElement) {
      this.state.audioElement.currentTime = time;
    }
    eventBus.emit('seekYouTubeRequested', time);
  },

  // Media Session Setup
  setupMediaSession: function() {
    if (!('mediaSession' in navigator)) return;
    
    navigator.mediaSession.setActionHandler('play', () => {
      eventBus.emit('playPauseRequested');
    });
    
    navigator.mediaSession.setActionHandler('pause', () => {
      eventBus.emit('playPauseRequested');
    });
    
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      eventBus.emit('previousTrackRequested');
    });
    
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      eventBus.emit('nextTrackRequested');
    });
  },

  setMediaSessionMetadata: function(songData) {
    if (!('mediaSession' in navigator)) return;
    
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: songData.title || 'Unknown Song',
        artist: songData.artist || 'Unknown Artist',
        album: songData.album || 'Unknown Album',
        artwork: [
          { 
            src: songData.artwork || this.getAlbumImageUrl(songData.album), 
            sizes: '512x512', 
            type: 'image/jpeg' 
          }
        ]
      });
    } catch (e) {
      console.error('Failed to set media session metadata:', e);
    }
  },

  // Progress and seeking
  createSeekTooltip: function() {
    // Implementation for seek tooltip
  },

  attachProgressBarEvents: function() {
    // Will be handled by UI manager
    eventBus.on('progressBarClicked', (percent) => {
      let totalDuration = 0;
      if (this.state.audioElement) {
        totalDuration = this.state.duration;
      }
      
      if (totalDuration > 0) {
        const newTime = percent * totalDuration;
        this.seekTo(newTime);
      }
    });
  },

  // Utility functions
  getAlbumImageUrl: function(albumName) {
    if (!albumName) return this.getDefaultAlbumImage();
    const normalizedName = this.normalizeNameForUrl(albumName);
    return `https://koders.cloud/global/content/images/albumCovers/${normalizedName}.png`;
  },

  getArtistImageUrl: function(artistName) {
    if (!artistName) return this.getDefaultArtistImage();
    const normalizedName = this.normalizeNameForUrl(artistName);
    return `https://koders.cloud/global/content/images/artistPortraits/${normalizedName}.png`;
  },

  normalizeNameForUrl: function(name) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '');
  },

  getDefaultArtistImage: function() {
    return 'https://koders.cloud/global/content/images/artistPortraits/default-artist.png';
  },

  getDefaultAlbumImage: function() {
    return 'https://koders.cloud/global/content/images/albumCovers/default-album.png';
  },

  formatTime: function(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  },

  getTotalSongs: function(artist) {
    return artist.albums.reduce((total, album) => total + album.songs.length, 0);
  }
};

// Initialize music library
window.music = music;

// Global exports for compatibility
window.getAlbumImageUrl = musicPlayer.getAlbumImageUrl.bind(musicPlayer);
window.getArtistImageUrl = musicPlayer.getArtistImageUrl.bind(musicPlayer);
window.getTotalSongs = musicPlayer.getTotalSongs.bind(musicPlayer);
window.formatTime = musicPlayer.formatTime.bind(musicPlayer);