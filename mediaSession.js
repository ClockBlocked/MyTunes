// ==========================================
// MEDIA SESSION AND METADATA MANAGEMENT
// ==========================================
import { musicPlayer } from './musicPlayer.js';
import { playbackControls } from './playbackControls.js';

export const mediaSession = {
  // Metadata management
  metadata: {
    currentMetadata: null,
    protectionInterval: null,
    originalSetMetadata: null,
    hijackAttempts: 0,
    protectionActive: false,

    initialize: function() {
      if ('mediaSession' in navigator) {
        this.originalSetMetadata = Object.getOwnPropertyDescriptor(
          MediaMetadata.prototype, 
          'constructor'
        );
      }
    },

    setMetadata: function(songData) {
      if (!('mediaSession' in navigator)) return;
      
      this.currentMetadata = {
        title: songData.title || 'Unknown Song',
        artist: songData.artist || 'Unknown Artist',
        album: songData.album || 'Unknown Album',
        artwork: [
          { 
            src: songData.artwork || songData.albumArt || musicPlayer.utilities.getAlbumImageUrl(songData.album), 
            sizes: '96x96', 
            type: 'image/jpeg' 
          },
          { 
            src: songData.artwork || songData.albumArt || musicPlayer.utilities.getAlbumImageUrl(songData.album), 
            sizes: '128x128', 
            type: 'image/jpeg' 
          },
          { 
            src: songData.artwork || songData.albumArt || musicPlayer.utilities.getAlbumImageUrl(songData.album), 
            sizes: '192x192', 
            type: 'image/jpeg' 
          },
          { 
            src: songData.artwork || songData.albumArt || musicPlayer.utilities.getAlbumImageUrl(songData.album), 
            sizes: '256x256', 
            type: 'image/jpeg' 
          },
          { 
            src: songData.artwork || songData.albumArt || musicPlayer.utilities.getAlbumImageUrl(songData.album), 
            sizes: '384x384', 
            type: 'image/jpeg' 
          },
          { 
            src: songData.artwork || songData.albumArt || musicPlayer.utilities.getAlbumImageUrl(songData.album), 
            sizes: '512x512', 
            type: 'image/jpeg' 
          }
        ]
      };
      
      this.applyMetadata();
      this.startProtection();
    },

    applyMetadata: function() {
      if (!this.currentMetadata || !('mediaSession' in navigator)) return;
      
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.metadata = new MediaMetadata(this.currentMetadata);
        
        setTimeout(() => {
          if (this.currentMetadata) {
            navigator.mediaSession.metadata = new MediaMetadata(this.currentMetadata);
          }
        }, 50);
        
      } catch (e) {
        console.error('Metadata update failed:', e);
      }
    },

    startProtection: function() {
      this.stopProtection();
      
      this.protectionActive = true;
      
      this.protectionInterval = setInterval(() => {
        if (this.currentMetadata && this.protectionActive) {
          this.enforceMetadata();
        }
      }, 100);
      
      this.overrideMediaMetadata();
      this.monitorMetadataChanges();
    },

    stopProtection: function() {
      this.protectionActive = false;
      if (this.protectionInterval) {
        clearInterval(this.protectionInterval);
        this.protectionInterval = null;
      }
    },

    enforceMetadata: function() {
      if (!this.currentMetadata || !('mediaSession' in navigator)) return;
      
      const currentSession = navigator.mediaSession.metadata;
      
      if (!currentSession || 
          currentSession.title !== this.currentMetadata.title ||
          currentSession.artist !== this.currentMetadata.artist ||
          currentSession.album !== this.currentMetadata.album) {
        
        this.hijackAttempts++;
        this.applyMetadata();
        
        if (this.hijackAttempts > 5) {
          this.useAggressiveMeasures();
        }
      } else {
        this.hijackAttempts = 0;
      }
    },

    overrideMediaMetadata: function() {
      if (!('mediaSession' in navigator)) return;
      
      try {
        const OriginalMediaMetadata = window.MediaMetadata;
        const self = this;
        
        window.MediaMetadata = function(data) {
          if (self.protectionActive && self.currentMetadata) {
            return new OriginalMediaMetadata(self.currentMetadata);
          }
          return new OriginalMediaMetadata(data);
        };
        
        window.MediaMetadata.prototype = OriginalMediaMetadata.prototype;
        
      } catch (e) {
        console.error('Failed to override MediaMetadata:', e);
      }
    },

    monitorMetadataChanges: function() {
      if (!('mediaSession' in navigator)) return;
      
      try {
        const descriptor = Object.getOwnPropertyDescriptor(navigator.mediaSession, 'metadata') || {
          configurable: true,
          enumerable: true
        };
        
        let internalMetadata = navigator.mediaSession.metadata;
        const self = this;
        
        Object.defineProperty(navigator.mediaSession, 'metadata', {
          get: function() {
            return internalMetadata;
          },
          set: function(value) {
            if (self.protectionActive && self.currentMetadata) {
              if (value === null) {
                internalMetadata = null;
              } else {
                internalMetadata = new MediaMetadata(self.currentMetadata);
              }
            } else {
              internalMetadata = value;
            }
          },
          configurable: true,
          enumerable: true
        });
        
      } catch (e) {
        console.error('Failed to monitor metadata changes:', e);
      }
    },

    useAggressiveMeasures: function() {
      const self = this;
      const rapidOverride = setInterval(() => {
        if (self.currentMetadata && self.protectionActive) {
          try {
            navigator.mediaSession.metadata = null;
            navigator.mediaSession.metadata = new MediaMetadata(self.currentMetadata);
          } catch (e) {}
        } else {
          clearInterval(rapidOverride);
        }
      }, 10);
      
      setTimeout(() => clearInterval(rapidOverride), 1000);
      this.hijackAttempts = 0;
    }
  },

  // Media Session setup and controls
  initialize: function() {
    this.metadata.initialize();
  },

  setup: function() {
    if (!('mediaSession' in navigator)) return;
    
    navigator.mediaSession.metadata = null;
    this.setupActionHandlers();
    this.updatePlaybackState();
  },

  setupActionHandlers: function() {
    if (!('mediaSession' in navigator)) return;
    
    navigator.mediaSession.setActionHandler('play', () => {
      if (!musicPlayer.state.isPlaying) {
        musicPlayer.playback.togglePlayPause();
      }
    });
    
    navigator.mediaSession.setActionHandler('pause', () => {
      if (musicPlayer.state.isPlaying) {
        musicPlayer.playback.togglePlayPause();
      }
    });
    
    navigator.mediaSession.setActionHandler('previoustrack', playbackControls.navigation.previousTrack);
    navigator.mediaSession.setActionHandler('nexttrack', playbackControls.navigation.nextTrack);
    
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      playbackControls.seek.seekTo(details.seekTime);
    });
    
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const skipTime = details.seekOffset || 10;
      playbackControls.seek.skipTime(-skipTime);
    });
    
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const skipTime = details.seekOffset || 10;
      playbackControls.seek.skipTime(skipTime);
    });
  },

  updatePlaybackState: function() {
    if (!('mediaSession' in navigator)) return;
    
    navigator.mediaSession.playbackState = musicPlayer.state.isPlaying ? 'playing' : 'paused';
    
    try {
      let currentTime = 0;
      let mediaDuration = 0;
      
      if (window.youtubePlayer && window.youtubePlayer.getCurrentTime) {
        currentTime = window.youtubePlayer.getCurrentTime();
        mediaDuration = window.youtubePlayer.getDuration();
      } else if (musicPlayer.state.audioElement) {
        currentTime = musicPlayer.state.audioElement.currentTime;
        mediaDuration = musicPlayer.state.audioElement.duration;
      }
      
      if (mediaDuration > 0 && !isNaN(mediaDuration)) {
        navigator.mediaSession.setPositionState({
          duration: mediaDuration,
          playbackRate: 1.0,
          position: currentTime
        });
      }
    } catch (e) {
      console.error('Failed to update position state:', e);
    }
  }
};