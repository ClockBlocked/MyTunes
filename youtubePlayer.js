// ==========================================
// YOUTUBE PLAYER INTEGRATION
// ==========================================
import { musicPlayer } from './musicPlayer.js';
import { mediaSession } from './mediaSession.js';
import { playbackControls } from './playbackControls.js';

export const youtubePlayer = {
  // YouTube player state
  player: null,
  progressInterval: null,

  // Initialization
  initialization: {
    initialize: function() {
      if (!window.YT) {
        this.loadYouTubeAPI();
      }
      
      window.onYouTubeIframeAPIReady = youtubePlayer.initialization.onAPIReady;
    },

    loadYouTubeAPI: function() {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    },

    onAPIReady: function() {
      youtubePlayer.initialization.createHiddenPlayer();
    },

    createHiddenPlayer: function() {
      let container = document.getElementById('youtube-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'youtube-container';
        Object.assign(container.style, {
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: '0',
          pointerEvents: 'none',
          visibility: 'hidden',
          overflow: 'hidden'
        });
        document.body.appendChild(container);
      }
      
      const playerDiv = document.createElement('div');
      playerDiv.id = 'youtube-player';
      container.appendChild(playerDiv);
      
      youtubePlayer.player = new YT.Player('youtube-player', {
        height: '1',
        width: '1',
        playerVars: {
          'autoplay': 1,
          'controls': 0,
          'disablekb': 1,
          'fs': 0,
          'iv_load_policy': 3,
          'modestbranding': 1,
          'playsinline': 1,
          'enablejsapi': 1,
          'origin': window.location.origin,
          'widget_referrer': window.location.href
        },
        events: {
          'onReady': youtubePlayer.events.onPlayerReady,
          'onStateChange': youtubePlayer.events.onPlayerStateChange,
          'onError': youtubePlayer.events.onPlayerError
        }
      });
    }
  },

  // Event handlers
  events: {
    onPlayerReady: function(event) {
      console.log("YouTube player ready");
      event.target.setPlaybackQuality('small');
    },

    onPlayerStateChange: function(event) {
      if (event.data === YT.PlayerState.PLAYING) {
        musicPlayer.playback.syncGlobalState();
        musicPlayer.state.isPlaying = true;
        musicPlayer.utilities.updatePlayPauseButtons();
        
        if (musicPlayer.state.currentSong) {
          mediaSession.metadata.setMetadata(musicPlayer.state.currentSong);
        }
        
        youtubePlayer.progress.startUpdates();
        
      } else if (event.data === YT.PlayerState.PAUSED) {
        musicPlayer.state.isPlaying = false;
        musicPlayer.utilities.updatePlayPauseButtons();
        mediaSession.updatePlaybackState();
        
      } else if (event.data === YT.PlayerState.ENDED) {
        playbackControls.navigation.handleSongEnd();
      }
    },

    onPlayerError: function(event) {
      console.error('YouTube player error:', event.data);
      if (musicPlayer.state.currentSong && musicPlayer.state.audioElement) {
        musicPlayer.playback.playAudioFallback(musicPlayer.state.currentSong);
      }
    }
  },

  // Playback controls
  playback: {
    async playVideo(songData) {
      if (!youtubePlayer.player) {
        await youtubePlayer.utilities.waitForPlayer();
      }
      
      mediaSession.metadata.setMetadata(songData);
      
      youtubePlayer.player.loadVideoById({
        videoId: songData.youtube,
        suggestedQuality: 'small',
        startSeconds: 0
      });
      
      await youtubePlayer.utilities.waitForPlayback();
      
      musicPlayer.state.isPlaying = true;
      musicPlayer.utilities.updatePlayPauseButtons();
      
      if (youtubePlayer.player.getDuration) {
        musicPlayer.state.duration = youtubePlayer.player.getDuration();
      }
      
      setTimeout(() => {
        mediaSession.metadata.setMetadata(songData);
      }, 100);
    }
  },

  // Controls
  controls: {
    play: function() {
      if (youtubePlayer.player && youtubePlayer.player.playVideo) {
        youtubePlayer.player.playVideo();
      }
    },

    pause: function() {
      if (youtubePlayer.player && youtubePlayer.player.pauseVideo) {
        youtubePlayer.player.pauseVideo();
      }
    },

    stop: function() {
      if (youtubePlayer.player && youtubePlayer.player.stopVideo) {
        youtubePlayer.player.stopVideo();
      }
    },

    seekTo: function(time) {
      if (youtubePlayer.player && youtubePlayer.player.seekTo) {
        youtubePlayer.player.seekTo(time);
      }
    },

    getCurrentTime: function() {
      if (youtubePlayer.player && youtubePlayer.player.getCurrentTime) {
        return youtubePlayer.player.getCurrentTime();
      }
      return 0;
    },

    getDuration: function() {
      if (youtubePlayer.player && youtubePlayer.player.getDuration) {
        return youtubePlayer.player.getDuration();
      }
      return 0;
    }
  },

  // Progress tracking
  progress: {
    startUpdates: function() {
      if (youtubePlayer.progressInterval) {
        clearInterval(youtubePlayer.progressInterval);
      }
      
      youtubePlayer.progressInterval = setInterval(() => {
        if (musicPlayer.state.isPlaying && youtubePlayer.player && youtubePlayer.player.getCurrentTime) {
          playbackControls.progress.updateProgress();
          mediaSession.updatePlaybackState();
        }
      }, 500);
    },

    stopUpdates: function() {
      if (youtubePlayer.progressInterval) {
        clearInterval(youtubePlayer.progressInterval);
        youtubePlayer.progressInterval = null;
      }
    }
  },

  // Utilities
  utilities: {
    async waitForPlayer() {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (youtubePlayer.player && youtubePlayer.player.loadVideoById) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 5000);
      });
    },

    async waitForPlayback() {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (youtubePlayer.player && youtubePlayer.player.getPlayerState) {
            const state = youtubePlayer.player.getPlayerState();
            if (state === YT.PlayerState.PLAYING) {
              clearInterval(checkInterval);
              resolve();
            }
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 5000);
      });
    }
  },

  // Cleanup
  cleanup: function() {
    this.progress.stopUpdates();
    
    if (this.player && this.player.destroy) {
      this.player.destroy();
      this.player = null;
    }
  }
};