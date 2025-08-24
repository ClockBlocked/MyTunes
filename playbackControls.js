// ==========================================
// PLAYBACK CONTROLS MODULE
// ==========================================
import { musicPlayer } from './musicPlayer.js';
import { queueManager } from './queueManager.js';
import { youtubePlayer } from './youtubePlayer.js';
import { mediaSession } from './mediaSession.js';

export const playbackControls = {
  // Track navigation
  navigation: {
    nextTrack: function() {
      mediaSession.metadata.stopProtection();
      
      if (queueManager.queue.items.length > 0) {
        const nextSong = queueManager.queue.shift();
        musicPlayer.playback.playSong(nextSong);
        return;
      }
      
      const artist = window.music.find(a => a.artist === musicPlayer.state.currentArtist);
      const album = artist?.albums.find(al => al.album === musicPlayer.state.currentAlbum);
      if (album && album.songs.length > 0) {
        const songIndex = album.songs.findIndex(s => s.title === musicPlayer.state.currentSong.title);
        const nextSongIndex = (songIndex + 1) % album.songs.length;
        const nextSong = {
          ...album.songs[nextSongIndex],
          artist: artist.artist,
          album: album.album,
          cover: musicPlayer.utilities.getAlbumImageUrl(album.album)
        };
        musicPlayer.playback.playSong(nextSong);
      }
      musicPlayer.playback.syncGlobalState();
    },

    previousTrack: function() {
      let currentTime = 0;
      if (youtubePlayer.controls.getCurrentTime) {
        currentTime = youtubePlayer.controls.getCurrentTime();
      } else if (musicPlayer.state.audioElement) {
        currentTime = musicPlayer.state.audioElement.currentTime;
      }
      
      if (currentTime > 3) {
        playbackControls.seek.seekTo(0);
        return;
      }
      
      mediaSession.metadata.stopProtection();
      
      if (queueManager.recentlyPlayed.items.length > 0) {
        const prevSong = queueManager.recentlyPlayed.shift();
        musicPlayer.playback.playSong(prevSong);
        return;
      }
      
      const artist = window.music.find(a => a.artist === musicPlayer.state.currentArtist);
      const album = artist?.albums.find(al => al.album === musicPlayer.state.currentAlbum);
      if (album && album.songs.length > 0) {
        const songIndex = album.songs.findIndex(s => s.title === musicPlayer.state.currentSong.title);
        const prevSongIndex = (songIndex - 1 + album.songs.length) % album.songs.length;
        const prevSong = {
          ...album.songs[prevSongIndex],
          artist: artist.artist,
          album: album.album,
          cover: musicPlayer.utilities.getAlbumImageUrl(album.album)
        };
        musicPlayer.playback.playSong(prevSong);
      }
    },

    handleSongEnd: function() {
      if (musicPlayer.state.repeatMode === 'one') {
        playbackControls.seek.seekTo(0);
        youtubePlayer.controls.play();
        if (musicPlayer.state.audioElement) {
          musicPlayer.state.audioElement.play();
        }
        return;
      }
      
      if (queueManager.queue.items.length > 0) {
        playbackControls.navigation.nextTrack();
        return;
      }
      
      const artist = window.music.find(a => a.artist === musicPlayer.state.currentArtist);
      const album = artist?.albums.find(al => al.album === musicPlayer.state.currentAlbum);
      if (!album || album.songs.length === 0) {
        musicPlayer.playback.stop();
        return;
      }
      
      let nextSongData = null;
      if (musicPlayer.state.shuffleMode) {
        const randomIndex = Math.floor(Math.random() * album.songs.length);
        nextSongData = album.songs[randomIndex];
      } else if (musicPlayer.state.repeatMode === 'all') {
        const currentSongIndex = album.songs.findIndex(s => s.title === musicPlayer.state.currentSong.title);
        const nextIndex = (currentSongIndex + 1) % album.songs.length;
        nextSongData = album.songs[nextIndex];
      }
      
      if (nextSongData) {
        musicPlayer.playback.playSong({
          ...nextSongData,
          artist: artist.artist,
          album: album.album,
          cover: musicPlayer.utilities.getAlbumImageUrl(album.album)
        });
      } else {
        musicPlayer.playback.stop();
      }
      musicPlayer.playback.syncGlobalState();
    }
  },

  // Seeking and progress
  seek: {
    seekTooltip: null,

    createSeekTooltip: function() {
      if (document.getElementById('seek-tooltip')) {
        this.seekTooltip = document.getElementById('seek-tooltip');
        return;
      }
      
      const tooltip = document.createElement('div');
      tooltip.id = 'seek-tooltip';
      Object.assign(tooltip.style, {
        position: 'absolute',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        fontSize: '12px',
        padding: '4px 8px',
        borderRadius: '4px',
        pointerEvents: 'none',
        opacity: '0',
        transform: 'translateX(-50%)',
        transition: 'opacity 0.2s',
        zIndex: '100'
      });
      
      const container = document.getElementById('musicPlayer');
      if (container) {
        container.appendChild(tooltip);
        this.seekTooltip = tooltip;
      }
    },

    attachProgressBarEvents: function() {
      const progressBar = document.getElementById('popup-progress-bar');
      if (!progressBar) return;
      
      const newProgressBar = progressBar.cloneNode(true);
      progressBar.parentNode.replaceChild(newProgressBar, progressBar);
      
      newProgressBar.addEventListener('click', this.handleSeekClick.bind(this));
      newProgressBar.addEventListener('mousedown', this.startDrag.bind(this));
      newProgressBar.addEventListener('mousemove', this.updateSeekTooltip.bind(this));
      newProgressBar.addEventListener('mouseleave', this.hideSeekTooltip.bind(this));
      
      document.removeEventListener('mousemove', this.onDrag);
      document.removeEventListener('mouseup', this.endDrag);
      document.addEventListener('mousemove', this.onDrag.bind(this));
      document.addEventListener('mouseup', this.endDrag.bind(this));
    },

    handleSeekClick: function(e) {
      if (!musicPlayer.state.currentSong) return;
      const progressBar = document.getElementById('popup-progress-bar');
      if (!progressBar) return;
      
      const rect = progressBar.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      
      if (youtubePlayer.controls.getDuration) {
        const newTime = percent * youtubePlayer.controls.getDuration();
        youtubePlayer.controls.seekTo(newTime);
        this.updateProgress(newTime);
      } else if (musicPlayer.state.audioElement && musicPlayer.state.duration) {
        const newTime = percent * musicPlayer.state.duration;
        musicPlayer.state.audioElement.currentTime = newTime;
        this.updateProgress(newTime);
      }
    },

    seekTo: function(time) {
      if (youtubePlayer.controls.seekTo) {
        youtubePlayer.controls.seekTo(time);
        this.updateProgress(time);
      } else if (musicPlayer.state.audioElement) {
        musicPlayer.state.audioElement.currentTime = time;
        this.updateProgress(time);
      }
    },

    skipTime: function(seconds) {
      let currentTime = 0;
      let totalDuration = 0;
      
      if (youtubePlayer.controls.getCurrentTime) {
        currentTime = youtubePlayer.controls.getCurrentTime();
        totalDuration = youtubePlayer.controls.getDuration();
      } else if (musicPlayer.state.audioElement) {
        currentTime = musicPlayer.state.audioElement.currentTime;
        totalDuration = musicPlayer.state.duration;
      }
      
      const newTime = Math.max(0, Math.min(totalDuration, currentTime + seconds));
      this.seekTo(newTime);
    },

    startDrag: function(e) {
      if (!musicPlayer.state.currentSong) return;
      musicPlayer.state.isDragging = true;
      document.body.style.userSelect = 'none';
      e.preventDefault();
    },

    onDrag: function(e) {
      if (!musicPlayer.state.isDragging) return;
      this.handleSeekClick(e);
    },

    endDrag: function() {
      musicPlayer.state.isDragging = false;
      document.body.style.userSelect = '';
      this.hideSeekTooltip();
    },

    updateSeekTooltip: function(e) {
      if (!this.seekTooltip) return;
      const progressBar = document.getElementById('popup-progress-bar');
      if (!progressBar) return;
      
      const rect = progressBar.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      let totalDuration = 0;
      
      if (youtubePlayer.controls.getDuration) {
        totalDuration = youtubePlayer.controls.getDuration();
      } else if (musicPlayer.state.duration) {
        totalDuration = musicPlayer.state.duration;
      }
      
      if (totalDuration <= 0) return;
      
      const seekTime = percent * totalDuration;
      this.seekTooltip.textContent = musicPlayer.utilities.formatTime(seekTime);
      this.seekTooltip.style.left = `${e.clientX}px`;
      this.seekTooltip.style.top = `${e.clientY - 30}px`;
      this.seekTooltip.style.opacity = '1';
    },

    hideSeekTooltip: function() {
      if (this.seekTooltip) {
        this.seekTooltip.style.opacity = '0';
      }
    }
  },

  // Progress tracking
  progress: {
    updateProgress: function(time = null) {
      let currentTime;
      let totalDuration;
      
      if (youtubePlayer.controls.getCurrentTime) {
        currentTime = time !== null ? time : youtubePlayer.controls.getCurrentTime();
        totalDuration = youtubePlayer.controls.getDuration();
      } else if (musicPlayer.state.audioElement) {
        currentTime = time !== null ? time : musicPlayer.state.audioElement.currentTime;
        totalDuration = musicPlayer.state.duration;
      } else {
        return;
      }
      
      if (isNaN(totalDuration) || totalDuration <= 0) return;
      
      const percent = (currentTime / totalDuration) * 100;
      const progressFill = document.getElementById('popup-progress-fill');
      const progressThumb = document.getElementById('popup-progress-thumb');
      const currentTimeElement = document.getElementById('popup-current-time');
      
      if (progressFill) progressFill.style.width = `${percent}%`;
      if (progressThumb) progressThumb.style.left = `${percent}%`;
      if (currentTimeElement) currentTimeElement.textContent = musicPlayer.utilities.formatTime(currentTime);
      
      if ("mediaSession" in navigator) {
        try {
          navigator.mediaSession.setPositionState({
            duration: totalDuration,
            playbackRate: 1,
            position: currentTime
          });
        } catch (e) {
          console.error('Position state error:', e);
        }
      }
    }
  }
};