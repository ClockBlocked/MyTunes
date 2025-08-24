// ==========================================
// IMPORTS
// ==========================================
import { music } from '../test.js';
import { render } from './blocks.js';
import { create } from './helpers.js';

// ==========================================
// GLOBAL VARIABLES
// ==========================================
// YouTube and Media Session Variables
let youtubePlayer = null;
let youtubeProgressInterval = null;
let metadataUpdateInterval = null;
let metadataProtectionActive = false;

// Player State Variables
let audioElement = null;
let currentSong = null;
let currentArtist = null;
let currentAlbum = null;
let isPlaying = false;
let duration = 0;
let queue = [];
let recentlyPlayed = [];
let favorites = new Set();
let isDragging = false;
let shuffleMode = false;
let repeatMode = "off";
let rewindInterval = 10;
let fastForwardInterval = 30;
let seekTooltip = null;
let currentIndex = 0;

// UI State Variables
let playlists = [];
let favoriteArtists = new Set();
let currentTab = "now-playing";
let isPopupVisible = false;
let inactivityTimer = null;
let similarArtistsCarousel = null;
let albumSelector = null;
let notifications = [];
let notificationContainer = null;
let historyOverlay = null;
let historyPanel = null;
let historyBtn = null;
let currentNotificationTimeout = null;
let loadingProgress = 0;
let loadingTimer = null;
let currentPage = "home";
let currentPageArtist = null;
let currentPageAlbum = null;
let navbarElements = {};
let popupElements = {};
let uiElements = {};

// ==========================================
// ENHANCED METADATA MANAGEMENT
// ==========================================
const metadataManager = {
  currentMetadata: null,
  protectionInterval: null,
  originalSetMetadata: null,
  hijackAttempts: 0,
  
  initialize: function() {
    // Store original MediaSession methods
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
          src: songData.artwork || songData.albumArt || getAlbumImageUrl(songData.album), 
          sizes: '96x96', 
          type: 'image/jpeg' 
        },
        { 
          src: songData.artwork || songData.albumArt || getAlbumImageUrl(songData.album), 
          sizes: '128x128', 
          type: 'image/jpeg' 
        },
        { 
          src: songData.artwork || songData.albumArt || getAlbumImageUrl(songData.album), 
          sizes: '192x192', 
          type: 'image/jpeg' 
        },
        { 
          src: songData.artwork || songData.albumArt || getAlbumImageUrl(songData.album), 
          sizes: '256x256', 
          type: 'image/jpeg' 
        },
        { 
          src: songData.artwork || songData.albumArt || getAlbumImageUrl(songData.album), 
          sizes: '384x384', 
          type: 'image/jpeg' 
        },
        { 
          src: songData.artwork || songData.albumArt || getAlbumImageUrl(songData.album), 
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
      // Clear existing metadata first
      navigator.mediaSession.metadata = null;
      
      // Apply new metadata
      navigator.mediaSession.metadata = new MediaMetadata(this.currentMetadata);
      
      // Double-apply for good measure
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
    // Clear any existing protection
    this.stopProtection();
    
    // Aggressive metadata protection - multiple strategies
    metadataProtectionActive = true;
    
    // Strategy 1: High-frequency reapplication
    this.protectionInterval = setInterval(() => {
      if (this.currentMetadata && metadataProtectionActive) {
        this.enforceMetadata();
      }
    }, 100); // Check every 100ms
    
    // Strategy 2: Override MediaMetadata constructor
    this.overrideMediaMetadata();
    
    // Strategy 3: Monitor and intercept YouTube metadata changes
    this.monitorMetadataChanges();
  },
  
  stopProtection: function() {
    metadataProtectionActive = false;
    if (this.protectionInterval) {
      clearInterval(this.protectionInterval);
      this.protectionInterval = null;
    }
  },
  
  enforceMetadata: function() {
    if (!this.currentMetadata || !('mediaSession' in navigator)) return;
    
    const currentSession = navigator.mediaSession.metadata;
    
    // Check if metadata has been hijacked
    if (!currentSession || 
        currentSession.title !== this.currentMetadata.title ||
        currentSession.artist !== this.currentMetadata.artist ||
        currentSession.album !== this.currentMetadata.album) {
      
      this.hijackAttempts++;
      
      // Reapply our metadata
      this.applyMetadata();
      
      // If hijacking persists, use more aggressive measures
      if (this.hijackAttempts > 5) {
        this.useAggressiveMeasures();
      }
    } else {
      // Reset counter if metadata is correct
      this.hijackAttempts = 0;
    }
  },
  
  overrideMediaMetadata: function() {
    if (!('mediaSession' in navigator)) return;
    
    try {
      // Intercept MediaMetadata constructor
      const OriginalMediaMetadata = window.MediaMetadata;
      
      window.MediaMetadata = function(data) {
        // If we have custom metadata and protection is active, use ours instead
        if (metadataProtectionActive && metadataManager.currentMetadata) {
          return new OriginalMediaMetadata(metadataManager.currentMetadata);
        }
        return new OriginalMediaMetadata(data);
      };
      
      // Preserve prototype
      window.MediaMetadata.prototype = OriginalMediaMetadata.prototype;
      
    } catch (e) {
      console.error('Failed to override MediaMetadata:', e);
    }
  },
  
  monitorMetadataChanges: function() {
    if (!('mediaSession' in navigator)) return;
    
    try {
      // Use Object.defineProperty to intercept metadata setter
      let descriptor = Object.getOwnPropertyDescriptor(navigator.mediaSession, 'metadata');
      if (!descriptor) {
        descriptor = {
          configurable: true,
          enumerable: true
        };
      }
      
      let internalMetadata = navigator.mediaSession.metadata;
      
      Object.defineProperty(navigator.mediaSession, 'metadata', {
        get: function() {
          return internalMetadata;
        },
        set: function(value) {
          // If protection is active and we have custom metadata
          if (metadataProtectionActive && metadataManager.currentMetadata) {
            // Allow null to clear
            if (value === null) {
              internalMetadata = null;
            } else {
              // Always use our metadata
              internalMetadata = new MediaMetadata(metadataManager.currentMetadata);
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
    // Nuclear option - continuously override metadata
    const rapidOverride = setInterval(() => {
      if (this.currentMetadata && metadataProtectionActive) {
        try {
          navigator.mediaSession.metadata = null;
          navigator.mediaSession.metadata = new MediaMetadata(this.currentMetadata);
        } catch (e) {}
      } else {
        clearInterval(rapidOverride);
      }
    }, 10); // Every 10ms
    
    // Stop after 1 second to prevent performance issues
    setTimeout(() => clearInterval(rapidOverride), 1000);
    
    // Reset hijack counter
    this.hijackAttempts = 0;
  }
};

// ==========================================
// YOUTUBE API SETUP - ENHANCED FOR HIDDEN PLAYBACK
// ==========================================
if (!window.YT) {
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// ==========================================
// YOUTUBE PLAYER FUNCTIONS
// ==========================================
function onYouTubeIframeAPIReady() {
  createHiddenYouTubePlayer();
}

function createHiddenYouTubePlayer() {
  // Create container for YouTube player if it doesn't exist
  let container = document.getElementById('youtube-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'youtube-container';
    // Make container completely invisible and non-interactive
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
  
  // Create player div inside container
  const playerDiv = document.createElement('div');
  playerDiv.id = 'youtube-player';
  container.appendChild(playerDiv);
  
  youtubePlayer = new YT.Player('youtube-player', {
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
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange,
      'onError': onPlayerError
    }
  });
}

function onPlayerReady(event) {
  console.log("YouTube player ready");
  // Set lowest video quality to minimize bandwidth
  event.target.setPlaybackQuality('small');
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    syncGlobalState();
    isPlaying = true;
    updatePlayPauseButtons();
    
    // Immediately enforce our metadata when YouTube starts playing
    if (currentSong) {
      metadataManager.setMetadata(currentSong);
    }
    
    // Start progress updates
    startYouTubeProgressUpdates();
    
  } else if (event.data === YT.PlayerState.PAUSED) {
    isPlaying = false;
    updatePlayPauseButtons();
    updateMediaSessionPlaybackState();
    
  } else if (event.data === YT.PlayerState.ENDED) {
    handleSongEnd();
  }
}

function onPlayerError(event) {
  console.error('YouTube player error:', event.data);
  // Fallback to audio element if YouTube fails
  if (currentSong && audioElement) {
    playAudioFallback(currentSong);
  }
}

// ==========================================
// PLAYBACK CONTROL FUNCTIONS - ENHANCED
// ==========================================
async function playSong(songData) {
  if (!songData) return;

  initPlayer();

  // Visual loading state
  let navbarNowPlaying = document.getElementById('navbar-now-playing');
  if (navbarNowPlaying) navbarNowPlaying.style.opacity = "0.5";
  let navbarSongTitle = document.getElementById("navbar-song-title");
  if (navbarSongTitle) navbarSongTitle.textContent = "Loading...";

  // Update recently played
  if (currentSong) {
    addToRecentlyPlayed(currentSong);
  }

  currentSong = songData;
  currentArtist = songData.artist;
  currentAlbum = songData.album;
  
  // Stop any existing protection before starting new song
  metadataManager.stopProtection();
  
  let isLoaded = false;

  // Stop any current playback
  if (audioElement && audioElement.pause) {
    audioElement.pause();
  }
  if (youtubePlayer && youtubePlayer.stopVideo) {
    youtubePlayer.stopVideo();
  }

  // YouTube playback with enhanced metadata protection
  if (songData.youtube) {
    try {
      // Ensure YouTube player exists
      if (!youtubePlayer) {
        await waitForYouTubePlayer();
      }
      
      // Set metadata BEFORE loading video
      metadataManager.setMetadata(songData);
      
      // Load and play video
      youtubePlayer.loadVideoById({
        videoId: songData.youtube,
        suggestedQuality: 'small',
        startSeconds: 0
      });
      
      // Wait for playback to start
      await waitForYouTubePlayback();
      
      isPlaying = true;
      updatePlayPauseButtons();
      isLoaded = true;
      
      if (youtubePlayer.getDuration) {
        duration = youtubePlayer.getDuration();
      }
      
      // Reapply metadata after video loads
      setTimeout(() => {
        metadataManager.setMetadata(songData);
      }, 100);
      
    } catch (error) {
      console.error('YouTube playback failed:', error);
      // Fallback to audio
      isLoaded = await playAudioFallback(songData);
    }
  } else {
    // Direct audio playback
    isLoaded = await playAudioFallback(songData);
  }

  // Update UI if loaded successfully
  if (isLoaded) {
    updateNowPlayingInfo();
    updateNavbarInfo();
    updateNowPlayingPopupContent();
    updateDropdownCounts();
    
    let navbarLogo = document.getElementById('navbar-logo');
    let navbarAlbumCover = document.getElementById('navbar-album-cover');
    if (navbarLogo) navbarLogo.classList.add("hidden");
    if (navbarAlbumCover) navbarAlbumCover.classList.remove("hidden");
  } else {
    if (navbarSongTitle) navbarSongTitle.textContent = currentSong?.title || "Error";
  }
  
  if (navbarNowPlaying) navbarNowPlaying.style.opacity = "1";
  syncGlobalState();
}

async function waitForYouTubePlayer() {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (youtubePlayer && youtubePlayer.loadVideoById) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 5000);
  });
}

async function waitForYouTubePlayback() {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (youtubePlayer && youtubePlayer.getPlayerState) {
        const state = youtubePlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
          clearInterval(checkInterval);
          resolve();
        }
      }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 5000);
  });
}

async function playAudioFallback(songData) {
  let formats = ['mp3', 'ogg', 'm4a'];
  for (let format of formats) {
    try {
      let songFileName = songData.title.toLowerCase().replace(/\s+/g, '').replace(/[^\w]/g, '');
      let audioUrl = `https://koders.cloud/global/content/audio/${songFileName}.${format}`;
      audioElement.src = audioUrl;
      
      await new Promise((resolve, reject) => {
        audioElement.addEventListener('canplaythrough', resolve, { once: true });
        audioElement.addEventListener('error', reject, { once: true });
      });
      
      await audioElement.play();
      
      // Set metadata for audio playback
      metadataManager.setMetadata(songData);
      
      return true;
    } catch (error) {
      console.error(`Audio playback (${format}) failed:`, error);
    }
  }
  return false;
}

function setupMediaSession() {
  if (!('mediaSession' in navigator)) return;
  
  // Initialize metadata manager
  metadataManager.initialize();
  
  // Clear any existing metadata
  navigator.mediaSession.metadata = null;
  
  // Set up action handlers
  navigator.mediaSession.setActionHandler('play', () => {
    if (!isPlaying) {
      if (youtubePlayer && youtubePlayer.playVideo) {
        youtubePlayer.playVideo();
      } else if (audioElement) {
        audioElement.play();
      }
    }
  });
  
  navigator.mediaSession.setActionHandler('pause', () => {
    if (isPlaying) {
      if (youtubePlayer && youtubePlayer.pauseVideo) {
        youtubePlayer.pauseVideo();
      } else if (audioElement) {
        audioElement.pause();
      }
    }
  });
  
  navigator.mediaSession.setActionHandler('previoustrack', previousTrack);
  navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
  
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (youtubePlayer && youtubePlayer.seekTo) {
      youtubePlayer.seekTo(details.seekTime);
      updateProgress(details.seekTime);
    } else if (audioElement) {
      audioElement.currentTime = details.seekTime;
      updateProgress(details.seekTime);
    }
  });
  
  navigator.mediaSession.setActionHandler('seekbackward', (details) => {
    const skipTime = details.seekOffset || 10;
    skipTime(-skipTime);
  });
  
  navigator.mediaSession.setActionHandler('seekforward', (details) => {
    const skipTime = details.seekOffset || 10;
    skipTime(skipTime);
  });
  
  updateMediaSessionPlaybackState();
}

// ==========================================
// PLAYER INITIALIZATION AND CORE FUNCTIONS
// ==========================================
function initialize() {
  initializeMusicLibrary();
  initPlayer();
  initNavbarElements();
  bindNavbarEvents();
  initNowPlayingPopup();
  
  // Initialize metadata manager
  metadataManager.initialize();
}

function initializeMusicLibrary() {
  window.music = music;
}

function initPlayer() {
  if (audioElement) return;
  
  audioElement = new Audio();
  audioElement.addEventListener('timeupdate', updateProgress);
  audioElement.addEventListener('ended', handleSongEnd);
  audioElement.addEventListener('loadedmetadata', function() {
    duration = audioElement.duration;
    let totalTimeElement = document.getElementById('popup-total-time');
    if (totalTimeElement) {
      totalTimeElement.textContent = formatTime(duration);
    }
  });
  audioElement.addEventListener('play', onPlay);
  audioElement.addEventListener('pause', onPause);
  audioElement.addEventListener('error', function(e) {
    console.error('Audio error:', e);
  });
  
  setupMediaSession();
  createSeekTooltip();
  attachProgressBarEvents();
}

function togglePlayPause() {
  if (!currentSong) return;
  
  if (isPlaying) {
    if (youtubePlayer && youtubePlayer.getPlayerState && youtubePlayer.getPlayerState() === YT.PlayerState.PLAYING) {
      youtubePlayer.pauseVideo();
    } else if (audioElement) {
      audioElement.pause();
    }
  } else {
    if (youtubePlayer && youtubePlayer.getPlayerState && youtubePlayer.getPlayerState() !== YT.PlayerState.PLAYING) {
      youtubePlayer.playVideo();
    } else if (audioElement) {
      audioElement.play().catch(err => console.error('Play error:', err));
    }
  }
}

function onPlay() {
  isPlaying = true;
  updatePlayPauseButtons();
  updateMediaSessionPlaybackState();
  
  // Ensure metadata protection is active
  if (currentSong) {
    metadataManager.setMetadata(currentSong);
  }
}

function onPause() {
  isPlaying = false;
  updatePlayPauseButtons();
  updateMediaSessionPlaybackState();
}

// ==========================================
// TRACK NAVIGATION FUNCTIONS
// ==========================================
function nextTrack() {
  // Stop metadata protection for current track
  metadataManager.stopProtection();
  
  if (queue.length > 0) {
    let nextSong = queue.shift();
    playSong(nextSong);
    updateQueueTab();
    updateDropdownCounts();
    return;
  }
  
  let artist = window.music.find(a => a.artist === currentArtist);
  let album = artist?.albums.find(al => al.album === currentAlbum);
  if (album && album.songs.length > 0) {
    let songIndex = album.songs.findIndex(s => s.title === currentSong.title);
    let nextSongIndex = (songIndex + 1) % album.songs.length;
    let nextSong = {
      ...album.songs[nextSongIndex],
      artist: artist.artist,
      album: album.album,
      cover: getAlbumImageUrl(album.album)
    };
    playSong(nextSong);
  }
  syncGlobalState();
}

function previousTrack() {
  let currentTime = 0;
  if (youtubePlayer && youtubePlayer.getCurrentTime) {
    currentTime = youtubePlayer.getCurrentTime();
  } else if (audioElement) {
    currentTime = audioElement.currentTime;
  }
  
  if (currentTime > 3) {
    if (youtubePlayer && youtubePlayer.seekTo) {
      youtubePlayer.seekTo(0);
    } else if (audioElement) {
      audioElement.currentTime = 0;
    }
    return;
  }
  
  // Stop metadata protection for current track
  metadataManager.stopProtection();
  
  if (recentlyPlayed.length > 0) {
    let prevSong = recentlyPlayed.shift();
    playSong(prevSong);
    updateQueueTab();
    updateDropdownCounts();
    return;
  }
  
  let artist = window.music.find(a => a.artist === currentArtist);
  let album = artist?.albums.find(al => al.album === currentAlbum);
  if (album && album.songs.length > 0) {
    let songIndex = album.songs.findIndex(s => s.title === currentSong.title);
    let prevSongIndex = (songIndex - 1 + album.songs.length) % album.songs.length;
    let prevSong = {
      ...album.songs[prevSongIndex],
      artist: artist.artist,
      album: album.album,
      cover: getAlbumImageUrl(album.album)
    };
    playSong(prevSong);
  }
}

function handleSongEnd() {
  if (repeatMode === 'one') {
    if (youtubePlayer && youtubePlayer.seekTo) {
      youtubePlayer.seekTo(0);
      youtubePlayer.playVideo();
    } else if (audioElement) {
      audioElement.currentTime = 0;
      audioElement.play();
    }
    return;
  }
  
  if (queue.length > 0) {
    nextTrack();
    return;
  }
  
  let artist = window.music.find(a => a.artist === currentArtist);
  let album = artist?.albums.find(al => al.album === currentAlbum);
  if (!album || album.songs.length === 0) {
    stopPlayback();
    return;
  }
  
  let nextSongData = null;
  if (shuffleMode) {
    let randomIndex = Math.floor(Math.random() * album.songs.length);
    nextSongData = album.songs[randomIndex];
  } else if (repeatMode === 'all') {
    let currentSongIndex = album.songs.findIndex(s => s.title === currentSong.title);
    let nextIndex = (currentSongIndex + 1) % album.songs.length;
    nextSongData = album.songs[nextIndex];
  }
  
  if (nextSongData) {
    playSong({
      ...nextSongData,
      artist: artist.artist,
      album: album.album,
      cover: getAlbumImageUrl(album.album)
    });
  } else {
    stopPlayback();
  }
  syncGlobalState();
}

function stopPlayback() {
  if (youtubePlayer && youtubePlayer.stopVideo) {
    youtubePlayer.stopVideo();
  }
  if (audioElement) {
    audioElement.pause();
  }
  isPlaying = false;
  updatePlayPauseButtons();
  
  // Stop metadata protection
  metadataManager.stopProtection();
}

function skipTime(seconds) {
  if (youtubePlayer && youtubePlayer.getCurrentTime) {
    const currentTime = youtubePlayer.getCurrentTime();
    const newTime = Math.max(0, Math.min(youtubePlayer.getDuration(), currentTime + seconds));
    youtubePlayer.seekTo(newTime);
    updateProgress(newTime);
  } else if (audioElement) {
    const newTime = Math.max(0, Math.min(duration, audioElement.currentTime + seconds));
    audioElement.currentTime = newTime;
    updateProgress(newTime);
  }
}

// ==========================================
// PROGRESS AND SEEKING FUNCTIONS
// ==========================================
function startYouTubeProgressUpdates() {
  if (youtubeProgressInterval) {
    clearInterval(youtubeProgressInterval);
  }
  
  youtubeProgressInterval = setInterval(() => {
    if (isPlaying && youtubePlayer && youtubePlayer.getCurrentTime) {
      updateProgress();
      updateMediaSessionPlaybackState();
    }
  }, 500);
}

function updateProgress(time = null) {
  let currentTime;
  let totalDuration;
  
  if (youtubePlayer && youtubePlayer.getCurrentTime) {
    currentTime = time !== null ? time : youtubePlayer.getCurrentTime();
    totalDuration = youtubePlayer.getDuration();
  } else if (audioElement) {
    currentTime = time !== null ? time : audioElement.currentTime;
    totalDuration = duration;
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
  if (currentTimeElement) currentTimeElement.textContent = formatTime(currentTime);
  
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

function updateMediaSessionPlaybackState() {
  if (!('mediaSession' in navigator)) return;
  
  navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  
  try {
    let currentTime = 0;
    let mediaDuration = 0;
    
    if (youtubePlayer && youtubePlayer.getCurrentTime) {
      currentTime = youtubePlayer.getCurrentTime();
      mediaDuration = youtubePlayer.getDuration();
    } else if (audioElement) {
      currentTime = audioElement.currentTime;
      mediaDuration = audioElement.duration;
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

function seekTo(e) {
  if (!currentSong) return;
  const progressBar = document.getElementById('popup-progress-bar');
  if (!progressBar) return;
  
  const rect = progressBar.getBoundingClientRect();
  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  
  if (youtubePlayer && youtubePlayer.getDuration) {
    const newTime = percent * youtubePlayer.getDuration();
    youtubePlayer.seekTo(newTime);
    updateProgress(newTime);
  } else if (audioElement && duration) {
    const newTime = percent * duration;
    audioElement.currentTime = newTime;
    updateProgress(newTime);
  }
}

function startDrag(e) {
  if (!currentSong) return;
  isDragging = true;
  document.body.style.userSelect = 'none';
  e.preventDefault();
}

function onDrag(e) {
  if (!isDragging) return;
  const progressBar = document.getElementById('popup-progress-bar');
  if (!progressBar) return;
  
  const rect = progressBar.getBoundingClientRect();
  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  
  if (youtubePlayer && youtubePlayer.getDuration) {
    const newTime = percent * youtubePlayer.getDuration();
    youtubePlayer.seekTo(newTime);
    updateProgress(newTime);
  } else if (audioElement && duration) {
    const newTime = percent * duration;
    audioElement.currentTime = newTime;
    updateProgress(newTime);
  }
}

function endDrag() {
  isDragging = false;
  document.body.style.userSelect = '';
  hideSeekTooltip();
}

function createSeekTooltip() {
  if (document.getElementById('seek-tooltip')) {
    seekTooltip = document.getElementById('seek-tooltip');
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
    seekTooltip = tooltip;
  }
}

function attachProgressBarEvents() {
  const progressBar = document.getElementById('popup-progress-bar');
  if (!progressBar) return;
  
  const newProgressBar = progressBar.cloneNode(true);
  progressBar.parentNode.replaceChild(newProgressBar, progressBar);
  
  newProgressBar.addEventListener('click', seekTo);
  newProgressBar.addEventListener('mousedown', startDrag);
  newProgressBar.addEventListener('mousemove', updateSeekTooltip);
  newProgressBar.addEventListener('mouseleave', hideSeekTooltip);
  
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', endDrag);
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', endDrag);
}

function updateSeekTooltip(e) {
  if (!seekTooltip) return;
  const progressBar = document.getElementById('popup-progress-bar');
  if (!progressBar) return;
  
  const rect = progressBar.getBoundingClientRect();
  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  let totalDuration = 0;
  
  if (youtubePlayer && youtubePlayer.getDuration) {
    totalDuration = youtubePlayer.getDuration();
  } else if (duration) {
    totalDuration = duration;
  }
  
  if (totalDuration <= 0) return;
  
  const seekTime = percent * totalDuration;
  seekTooltip.textContent = formatTime(seekTime);
  seekTooltip.style.left = `${e.clientX}px`;
  seekTooltip.style.top = `${e.clientY - 30}px`;
  seekTooltip.style.opacity = '1';
}

function hideSeekTooltip() {
  if (seekTooltip) {
    seekTooltip.style.opacity = '0';
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function getAlbumImageUrl(albumName) {
  // Replace with your actual album art URL logic
  return `/images/albums/${albumName.toLowerCase().replace(/\s+/g, '-')}.png`;
}

function addToRecentlyPlayed(song) {
  // Add song to recently played list
  recentlyPlayed.unshift(song);
  // Keep only last 50 songs
  if (recentlyPlayed.length > 50) {
    recentlyPlayed = recentlyPlayed.slice(0, 50);
  }
}


function updatePlayPauseButtons() {
  // Update all play/pause buttons in the UI
  const playButtons = document.querySelectorAll('.play-button, .play-btn');
  const pauseButtons = document.querySelectorAll('.pause-button, .pause-btn');
  
  playButtons.forEach(btn => {
    btn.style.display = isPlaying ? 'none' : 'block';
  });
  
  pauseButtons.forEach(btn => {
    btn.style.display = isPlaying ? 'block' : 'none';
  });
}

// ==========================================
// CLEANUP FUNCTIONS
// ==========================================
function cleanup() {
  // Stop all intervals
  if (youtubeProgressInterval) {
    clearInterval(youtubeProgressInterval);
    youtubeProgressInterval = null;
  }
  
  if (metadataUpdateInterval) {
    clearInterval(metadataUpdateInterval);
    metadataUpdateInterval = null;
  }
  
  // Stop metadata protection
  metadataManager.stopProtection();
  
  // Destroy YouTube player
  if (youtubePlayer && youtubePlayer.destroy) {
    youtubePlayer.destroy();
    youtubePlayer = null;
  }
  
  // Pause audio
  if (audioElement) {
    audioElement.pause();
    audioElement.src = '';
  }
}

// ==========================================
// EXPORT OR INITIALIZE
// ==========================================
// Make YouTube API callback available globally
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}



// ==========================================
// QUEUE AND PLAYLIST MANAGEMENT
// ==========================================
function addToQueue(song, position = null) {
  if (position !== null) queue.splice(position, 0, song);
  else queue.push(song);
  updateQueueTab();
  updateDropdownCounts();
  syncGlobalState();
}

function playFromQueue(index) {
  if (index >= 0 && index < queue.length) {
    let song = queue.splice(index, 1)[0];
    playSong(song);
  }
}

function playFromRecent(index) {
  if (index >= 0 && index < recentlyPlayed.length) {
    playSong(recentlyPlayed[index]);
  }
}

function toggleCurrentSongFavorite() {
  if (!currentSong) return;
  let songId = currentSong.id;
  if (favorites.has(songId)) {
    favorites.delete(songId);
  } else {
    favorites.add(songId);
  }
  updateNowPlayingButtons();
  updateDropdownCounts();
}

function toggleShuffle() {
  shuffleMode = !shuffleMode;
  let popupShuffleBtn = document.getElementById('popup-shuffle-btn');
  if (popupShuffleBtn) {
    popupShuffleBtn.classList.toggle('active', shuffleMode);
  }
  
  showNotification(`Shuffle ${shuffleMode ? 'enabled' : 'disabled'}`);
}

function toggleRepeat() {
  if (repeatMode === 'off') {
    repeatMode = 'all';
  } else if (repeatMode === 'all') {
    repeatMode = 'one';
  } else {
    repeatMode = 'off';
  }
  
  let popupRepeatBtn = document.getElementById('popup-repeat-btn');
  if (popupRepeatBtn) {
    popupRepeatBtn.classList.toggle('active', repeatMode !== 'off');
    
    // Update icon or tooltip based on repeat mode
    if (repeatMode === 'one') {
      popupRepeatBtn.classList.add('repeat-one');
    } else {
      popupRepeatBtn.classList.remove('repeat-one');
    }
  }
  
  showNotification(`Repeat ${repeatMode === 'off' ? 'disabled' : repeatMode === 'all' ? 'all songs' : 'current song'}`);
}

// ==========================================
// NAVBAR UI FUNCTIONS
// ==========================================
function initNavbarElements() {
  let enhancedIds = [
    "will-hide-menu", "menu-trigger", "dropdown-menu", "dropdown-close", "now-playing-area", 
    "play-indicator", "prev-btn-navbar", "next-btn-navbar", "play-pause-navbar", 
    "play-icon-navbar", "pause-icon-navbar",
    "favorite-songs", "favorite-artists", "create-playlist", "recently-played", 
    "queue-view", "search-music", "shuffle-all", "app-settings", "about-app", 
    "favorite-songs-count", "favorite-artists-count", "recent-count", "queue-count"
  ];

  enhancedIds.forEach(function(id) {
    let camelCaseId = id.replace(/-(\w)/g, function(_, c) { return c.toUpperCase(); });
    navbarElements[camelCaseId] = document.getElementById(id);
  });

  return navbarElements;
}

function bindNavbarEvents() {
  bindMenuEvents();
  bindMenuItemEvents();
  bindNowPlayingEvents();
  bindControlEvents();
  bindPageEvents();
}

function bindMenuEvents() {
  let menuTrigger = document.getElementById('menu-trigger');
  let dropdownClose = document.getElementById('dropdown-close');
  let willHideMenu = document.getElementById('will-hide-menu');
  
  if (menuTrigger) menuTrigger.addEventListener("click", toggleDropdownMenu);
  if (dropdownClose) dropdownClose.addEventListener("click", closeDropdownMenu);
  if (willHideMenu) willHideMenu.addEventListener("click", closeDropdownMenu);
}

function bindMenuItemEvents() {
  let menuActions = {
    'favorite-songs': openFavoriteSongs,
    'favorite-artists': openFavoriteArtists,
    'create-playlist': createNewPlaylist,
    'recently-played': function() {
      openNowPlayingPopup();
      setTimeout(function() { switchPopupTab("recent"); }, 50);
    },
    'queue-view': function() {
      openNowPlayingPopup();
      setTimeout(function() { switchPopupTab("queue"); }, 50);
    },
    'search-music': openSearch,
    'shuffle-all': shuffleAllSongs,
    'app-settings': openSettings,
    'about-app': showAbout
  };

  Object.entries(menuActions).forEach(function([id, action]) {
    let element = document.getElementById(id);
    if (element) element.addEventListener("click", action);
  });

  let themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) themeToggle.addEventListener("click", enhancedThemeToggle);
}

function bindNowPlayingEvents() {
  let nowPlayingArea = document.getElementById('now-playing-area');
  let navbarAlbumCover = document.getElementById('navbar-album-cover');
  
  if (nowPlayingArea) nowPlayingArea.addEventListener("click", toggleMusicPlayer);
  if (navbarAlbumCover) {
    navbarAlbumCover.addEventListener("click", function(e) {
      e.stopPropagation();
      toggleMusicPlayer();
    });
  }
}

function bindControlEvents() {
  let controlActions = {
    'play-pause-navbar': function(e) {
      e.stopPropagation();
      togglePlayPause();
    },
    'prev-btn-navbar': function(e) {
      e.stopPropagation();
      previousTrack();
    },
    'next-btn-navbar': function(e) {
      e.stopPropagation();
      nextTrack();
    }
  };

  Object.entries(controlActions).forEach(function([id, action]) {
    let element = document.getElementById(id);
    if (element) element.addEventListener("click", action);
  });
}

function bindPageEvents() {
  document.addEventListener("click", function(e) {
    let dropdownMenu = document.getElementById('dropdown-menu');
    let menuTrigger = document.getElementById('menu-trigger');
    if (dropdownMenu && !dropdownMenu.contains(e.target) && !menuTrigger?.contains(e.target)) {
      closeDropdownMenu();
    }
    
    let nowPlayingPopup = document.getElementById('now-playing-popup');
    let nowPlayingArea = document.getElementById('now-playing-area');
    if (isPopupVisible && nowPlayingPopup && !nowPlayingPopup.contains(e.target) && !nowPlayingArea?.contains(e.target)) {
      closeNowPlayingPopup();
    }
  });
  document.addEventListener("keydown", handleKeyboardShortcuts);

  document.addEventListener('click', function(e) {
    let navItem = e.target.closest('[data-nav]');
    if (!navItem) return;
    
    e.preventDefault();
    let navType = navItem.dataset.nav;
    
    closeDropdownMenu();
    
    switch (navType) {
      case 'home':
        loadHomePage();
        break;
      case 'allArtists':
        loadAllArtistsPage();
        break;
      case 'artist':
        let artistName = navItem.dataset.artist;
        if (artistName && window.siteMap) {
          window.siteMap.navigateTo('artist', { artist: artistName });
        }
        break;
      case 'album':
        let artist = navItem.dataset.artist;
        let album = navItem.dataset.album;
        if (artist && album && window.siteMap) {
          window.siteMap.navigateTo('album', { artist, album });
        }
        break;
    }
  });

  document.addEventListener('click', function(e) {
    if (e.target.closest('#global-search-trigger')) {
      e.preventDefault();
      closeDropdownMenu();
      if (window.siteMap) {
        window.siteMap.openSearchDialog();
      }
    }
  });
}

function toggleDropdownMenu() {
  let dropdownMenu = document.getElementById('dropdown-menu');
  let menuTrigger = document.getElementById('menu-trigger');
  let isVisible = dropdownMenu?.classList.contains("show");
  
  if (isVisible) {
    closeDropdownMenu();
  } else {
    openDropdownMenu();
  }
}

function openDropdownMenu() {
  let dropdownMenu = document.getElementById('dropdown-menu');
  let menuTrigger = document.getElementById('menu-trigger');
  
  if (!dropdownMenu || !menuTrigger) return;
  updateDropdownCounts();
  dropdownMenu.classList.add("show");
  menuTrigger.classList.add("active");
  closeNowPlayingPopup();
}

function closeDropdownMenu() {
  let dropdownMenu = document.getElementById('dropdown-menu');
  let menuTrigger = document.getElementById('menu-trigger');
  
  if (!dropdownMenu || !menuTrigger) return;
  dropdownMenu.classList.remove("show");
  menuTrigger.classList.remove("active");
}

function updateDropdownCounts() {
  let counts = {
    'favorite-songs-count': favorites.size,
    'favorite-artists-count': favoriteArtists.size,
    'recent-count': recentlyPlayed.length,
    'queue-count': queue.length
  };

  Object.entries(counts).forEach(function([id, value]) {
    let element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  });
}

// ==========================================
// MUSIC PLAYER UI FUNCTIONS
// ==========================================
function initNowPlayingPopup() {
  cachePopupElements();
  bindPopupEvents();
}

function cachePopupElements() {
  let elementIds = [
    'now-playing-popup', 'popup-close', 'popup-album-cover', 'popup-song-title',
    'popup-artist-name', 'popup-album-name', 'popup-current-time', 'popup-total-time',
    'popup-progress-bar', 'popup-progress-fill', 'popup-progress-thumb',
    'popup-play-pause-btn', 'popup-play-icon', 'popup-pause-icon',
    'popup-prev-btn', 'popup-next-btn', 'popup-shuffle-btn', 'popup-repeat-btn',
    'popup-favorite-btn', 'queue-list', 'recent-list'
  ];

  elementIds.forEach(function(id) {
    let camelCaseId = id.replace(/-(\w)/g, function(_, c) { return c.toUpperCase(); });
    popupElements[camelCaseId] = document.getElementById(id);
  });
}

function bindPopupEvents() {
  document.querySelectorAll('.popup-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      switchPopupTab(tab.dataset.tab);
      resetInactivityTimer();
    });
  });

  let popupClose = document.getElementById('popup-close');
  let popupPlayPauseBtn = document.getElementById('popup-play-pause-btn');
  let popupPrevBtn = document.getElementById('popup-prev-btn');
  let popupNextBtn = document.getElementById('popup-next-btn');
  let popupShuffleBtn = document.getElementById('popup-shuffle-btn');
  let popupRepeatBtn = document.getElementById('popup-repeat-btn');
  let popupFavoriteBtn = document.getElementById('popup-favorite-btn');
  let progressBar = document.getElementById('popup-progress-bar');
  let progressThumb = document.getElementById('popup-progress-thumb');

  if (popupClose) popupClose.addEventListener('click', closeNowPlayingPopup);
  if (popupPlayPauseBtn) popupPlayPauseBtn.addEventListener('click', togglePlayPause);
  if (popupPrevBtn) popupPrevBtn.addEventListener('click', previousTrack);
  if (popupNextBtn) popupNextBtn.addEventListener('click', nextTrack);
  if (popupShuffleBtn) popupShuffleBtn.addEventListener('click', toggleShuffle);
  if (popupRepeatBtn) popupRepeatBtn.addEventListener('click', toggleRepeat);
  if (popupFavoriteBtn) popupFavoriteBtn.addEventListener('click', toggleCurrentSongFavorite);

  if (progressBar) {
    progressBar.addEventListener('click', seekTo);
  }
  if (progressThumb) {
    progressThumb.addEventListener('mousedown', startDrag);
  }

  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', endDrag);

  document.addEventListener('keydown', function(e) {
    if (!isPopupVisible) return;
    handlePopupKeyboard(e);
  });
}

function openNowPlayingPopup() {
  let nowPlayingPopup = document.getElementById('musicPlayer');
  if (!nowPlayingPopup) return;
  
  updateNowPlayingPopupContent();
  switchPopupTab('now-playing');
  startInactivityTimer();
  closeDropdownMenu();
  isPopupVisible = true;
}

function closeNowPlayingPopup() {
  let nowPlayingPopup = document.getElementById('musicPlayer');
  if (!nowPlayingPopup) return;
  
  clearInactivityTimer();
  isPopupVisible = false;
}

function toggleNowPlayingPopup() {
  isPopupVisible ? closeNowPlayingPopup() : openNowPlayingPopup();
}

function closeMusicPlayer() {
  const closePlayerEl = document.getElementById('closePlayer');
  const musicPlayer = document.querySelector('.musicPlayer');
    
  if (closePlayerEl && musicPlayer) {
    closePlayerEl.addEventListener('click', () => {
      musicPlayer.classList.remove('show');
    });
  }
}

// Fix for the musicPlayer toggle
function toggleMusicPlayer() {
  const musicPlayer = document.querySelector('.musicPlayer');
  
  if (musicPlayer) {
    musicPlayer.classList.toggle('show');
  }
}

function switchPopupTab(tabName) {
  currentTab = tabName;
  
  document.querySelectorAll('.popup-tab').forEach(function(tab) {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  document.querySelectorAll('.popup-tab-content').forEach(function(content) {
    let shouldShow = content.dataset.tab === tabName;
    content.style.display = shouldShow ? 'block' : 'none';
  });
  
  if (tabName === 'queue') {
    updateQueueTab();
  } else if (tabName === 'recent') {
    updateRecentTab();
  }
}

function updateNowPlayingPopupContent() {
  if (!currentSong) return;

  let popupAlbumCover = document.getElementById('popup-album-cover');
  let popupSongTitle = document.getElementById('popup-song-title');
  let popupArtistName = document.getElementById('popup-artist-name');
  let popupAlbumName = document.getElementById('popup-album-name');
  let totalTime = document.getElementById('popup-total-time');

  if (popupAlbumCover) {
    // Add animation class
    popupAlbumCover.classList.add('animate__animated', 'animate__zoomIn');
    setTimeout(() => {
      popupAlbumCover.classList.remove('animate__animated', 'animate__zoomIn');
    }, 300);
    
    loadImageWithFallback(
      popupAlbumCover,
      getAlbumImageUrl(currentSong.album),
      getDefaultAlbumImage(),
      'album'
    );
  }

  // Add animation to text elements
  [popupSongTitle, popupArtistName, popupAlbumName].forEach(el => {
    if (el) {
      el.classList.add('animate__animated', 'animate__fadeIn');
      setTimeout(() => {
        el.classList.remove('animate__animated', 'animate__fadeIn');
      }, 300);
    }
  });

  if (popupSongTitle) popupSongTitle.textContent = currentSong.title;
  if (popupArtistName) popupArtistName.textContent = currentSong.artist;
  if (popupAlbumName) popupAlbumName.textContent = currentSong.album;
  
  let totalDuration = 0;
  if (youtubePlayer && youtubePlayer.getDuration) {
    totalDuration = youtubePlayer.getDuration();
  } else {
    totalDuration = duration;
  }
  
  if (totalTime) totalTime.textContent = formatTime(totalDuration);

  updateNowPlayingButtons();
  
  // Start progress updates for YouTube
  if (youtubePlayer && youtubePlayer.getCurrentTime) {
    clearInterval(window.youtubeProgressInterval);
    window.youtubeProgressInterval = setInterval(() => {
      if (isPlaying) {
        updateProgress();
      }
    }, 500);
  }
}

function updateNowPlayingButtons() {
  let popupPlayIcon = document.getElementById('popup-play-icon');
  let popupPauseIcon = document.getElementById('popup-pause-icon');
  let popupShuffleBtn = document.getElementById('popup-shuffle-btn');
  let popupRepeatBtn = document.getElementById('popup-repeat-btn');
  let popupFavoriteBtn = document.getElementById('popup-favorite-btn');

  if (popupPlayIcon && popupPauseIcon) {
    popupPlayIcon.classList.toggle('hidden', isPlaying);
    popupPauseIcon.classList.toggle('hidden', !isPlaying);
  }

  if (popupShuffleBtn) {
    popupShuffleBtn.classList.toggle('active', shuffleMode);
  }

  if (popupRepeatBtn) {
    popupRepeatBtn.classList.toggle('active', repeatMode !== 'off');
  }

  if (popupFavoriteBtn && currentSong) {
    let isFavorite = favorites.has(currentSong.id);
    popupFavoriteBtn.classList.toggle('active', isFavorite);
  }
}

function updateNowPlayingInfo() {
  if (!currentSong) return;
  updateNowPlayingPopupContent();
}

function updateNavbarInfo() {
  let navbarAlbumCover = document.getElementById('navbar-album-cover');
  let navbarArtist = document.getElementById('navbar-artist');
  let navbarSongTitle = document.getElementById('navbar-song-title');
  let playIndicator = document.getElementById('play-indicator');
  let nowPlayingArea = document.getElementById('now-playing-area');
  
  if (!currentSong || !navbarAlbumCover || !navbarArtist || !navbarSongTitle) return;
  
  loadImageWithFallback(
    navbarAlbumCover,
    getAlbumImageUrl(currentSong.album),
    getDefaultAlbumImage(),
    'album'
  );
  
  navbarArtist.textContent = currentSong.artist;
  let title = currentSong.title;
  navbarSongTitle.classList.toggle("marquee", title.length > 25);
  navbarSongTitle.textContent = title;

  if (playIndicator) {
    playIndicator.classList.toggle("active", isPlaying);
  }
  if (nowPlayingArea) {
    nowPlayingArea.classList.add("has-song");
  }
}

function startInactivityTimer() {
  resetInactivityTimer();
}

function resetInactivityTimer() {
  clearInactivityTimer();
  if (currentTab !== 'now-playing') {
    inactivityTimer = setTimeout(function() {
      switchPopupTab('now-playing');
    }, 10000);
  }
}

function clearInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}

function handlePopupKeyboard(e) {
  let keyActions = {
    'ArrowLeft': switchToPrevTab,
    'ArrowRight': switchToNextTab,
    '1': function() { switchPopupTab('now-playing'); },
    '2': function() { switchPopupTab('queue'); },
    '3': function() { switchPopupTab('recent'); },
    'Escape': closeNowPlayingPopup
  };

  if (keyActions[e.key]) {
    e.preventDefault();
    keyActions[e.key]();
    resetInactivityTimer();
  }
}

function switchToPrevTab() {
  let tabs = ['now-playing', 'queue', 'recent'];
  let currentIndex = tabs.indexOf(currentTab);
  let prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
  switchPopupTab(tabs[prevIndex]);
}

function switchToNextTab() {
  let tabs = ['now-playing', 'queue', 'recent'];
  let currentIndex = tabs.indexOf(currentTab);
  let nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
  switchPopupTab(tabs[nextIndex]);
}

// ==========================================
// TAB MANAGEMENT FUNCTIONS
// ==========================================
/**
function updateQueueTab() {
  const queueList = document.getElementById('queue-list');
  if (!queueList) return;

  if (queue.length === 0) {
    queueList.innerHTML = '<li class="text-sm text-gray-400 py-3 px-4">No songs in queue</li>';
    return;
  }

  // Add animation class to the container
  queueList.classList.add('animate__animated', 'animate__fadeIn');
  setTimeout(() => {
    queueList.classList.remove('animate__animated', 'animate__fadeIn');
  }, 300);

  queueList.innerHTML = queue.map((song, index) => {
    const isCurrentSong = currentSong && song.id === currentSong.id;

    return `
      <li data-index="${index}" 
        class="queue-item group relative flex items-center gap-4 px-4 py-3 cursor-pointer transition-all duration-300 ease-in-out 
               ${isCurrentSong ? 'bg-gray-800' : 'hover:bg-gray-700'} rounded-lg"
        style="animation-delay: ${index * 50}ms">

        <div class="relative w-12 h-12 shrink-0">
          <img src="${song.cover || getAlbumImageUrl(song.album)}" alt="${song.title}"
               class="w-full h-full object-cover rounded-md transition-all duration-500 ease-in-out" />

          <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 
                    group-hover:opacity-100 transition-opacity duration-300 ease-in-out rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>

        <div class="flex flex-col overflow-hidden">
          <span class="text-sm font-bold text-white truncate">${song.title}</span>
          <span class="text-xs font-light text-gray-300 truncate">${song.artist}</span>
        </div>

        <div class="ml-auto text-xs text-gray-400">${song.duration || '0:00'}</div>
      </li>
    `;
  }).join('');

  queueList.querySelectorAll('li[data-index]').forEach((item, index) => {
    item.addEventListener('click', () => {
      // Add click animation
      item.classList.add('animate__animated', 'animate__pulse');
      setTimeout(() => {
        item.classList.remove('animate__animated', 'animate__pulse');
      }, 300);
      
      playFromQueue(index);
    });
  });
}

function updateRecentTab() {
  const recentList = document.getElementById('recent-list');
  if (!recentList) return;

  if (recentlyPlayed.length === 0) {
    recentList.innerHTML = '<li class="text-sm text-gray-400 py-3 px-4">No recently played songs</li>';
    return;
  }

  recentList.innerHTML = recentlyPlayed.map((song, index) => {
    const isCurrentSong = currentSong && song.id === currentSong.id;

    return `
      <li data-index="${index}"
        class="group relative flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors duration-300 ease-in-out 
               ${isCurrentSong ? 'bg-gray-800' : 'hover:bg-gray-700'} rounded-lg">

        <div class="relative w-12 h-12 shrink-0">
          <img src="${song.cover || getAlbumImageUrl(song.album)}" alt="${song.title}"
               class="w-full h-full object-cover rounded-md transition duration-500 ease-in-out" />

          <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 
                    group-hover:opacity-100 transition-opacity duration-700 ease-in-out rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>

        <div class="flex flex-col overflow-hidden">
          <span class="text-sm font-bold text-white truncate">${song.title}</span>
          <span class="text-xs font-light text-gray-300 truncate">${song.artist}</span>
        </div>

        <div class="ml-auto text-xs text-gray-400">${song.duration || '0:00'}</div>
      </li>
    `;
  }).join('');

  recentList.querySelectorAll('li[data-index]').forEach((item, index) => {
    item.addEventListener('click', () => playFromRecent(index));
  });
}
**/

// ==========================================
// MENU ITEM ACTION FUNCTIONS
// ==========================================
function openFavoriteSongs() {
  closeDropdownMenu();
  if (favorites.size === 0) return;
}

function openFavoriteArtists() {
  closeDropdownMenu();
  if (favoriteArtists.size === 0) {
    showNotification("No favorite artists yet");
    return;
  }
}

function createNewPlaylist() {
  closeDropdownMenu();
  let playlistName = prompt("Enter playlist name:");
  if (playlistName && playlistName.trim()) {
    let playlist = {
      id: Date.now().toString(),
      name: playlistName.trim(),
      songs: [],
      created: new Date().toISOString(),
    };
    playlists.push(playlist);
    showNotification(`Created playlist: ${playlist.name}`);
  }
}

function openSearch() {
  closeDropdownMenu();
}

function shuffleAllSongs() {
  closeDropdownMenu();
  if (!window.music || window.music.length === 0) {
    showNotification("No music library found");
    return;
  }

  let allSongs = [];
  window.music.forEach(function(artist) {
    artist.albums.forEach(function(album) {
      album.songs.forEach(function(song) {
        allSongs.push({
          ...song,
          artist: artist.artist,
          album: album.album,
          cover: getAlbumImageUrl(album.album),
        });
      });
    });
  });

  if (allSongs.length === 0) {
    showNotification("No songs found");
    return;
  }

  for (let i = allSongs.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [allSongs[i], allSongs[j]] = [allSongs[j], allSongs[i]];
  }

  queue = allSongs.slice(1);
  playSong(allSongs[0]);
  shuffleMode = true;
  updateDropdownCounts();
}

function openSettings() {
  closeDropdownMenu();
}

function showAbout() {
  closeDropdownMenu();
}

// ==========================================
// THEME AND KEYBOARD FUNCTIONS
// ==========================================
function enhancedThemeToggle() {
  let html = document.documentElement;
  if (html.classList.contains("light")) {
    html.classList.remove("light");
    html.classList.remove("medium");
    updateThemeIcon("dark");
  } else if (html.classList.contains("medium")) {
    html.classList.remove("medium");
    html.classList.add("light");
    updateThemeIcon("light");
  } else {
    html.classList.add("medium");
    updateThemeIcon("medium");
  }
}

function updateThemeIcon(theme) {
  let themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    let icons = {
            dark: '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 116.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>',
      medium: '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2L13 9h7l-5.5 4 2 7L10 16l-6.5 4 2-7L1 9h7l2-7z"/></svg>',
      light: '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/></svg>'
    };
    themeToggle.innerHTML = icons[theme];
  }
}

function handleKeyboardShortcuts(e) {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  let keyActions = {
    " ": function() {
      e.preventDefault();
      togglePlayPause();
    },
    ArrowLeft: function() {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        previousTrack();
      }
    },
    ArrowRight: function() {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        nextTrack();
      }
    },
    n: function() {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        openNowPlayingPopup();
      }
    },
    m: function() {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        toggleDropdownMenu();
      }
    },
    s: function() {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        toggleShuffle();
      }
    },
    f: function() {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        toggleCurrentSongFavorite();
      }
    },
    r: function() {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        toggleRepeat();
      }
    },
    Escape: function() {
      closeNowPlayingPopup();
      closeDropdownMenu();
    }
  };

  if (keyActions[e.key]) {
    keyActions[e.key]();
  }
}

// ==========================================
// NOTIFICATION SYSTEM
// ==========================================
function initializeNotifications() {
  if (!notificationContainer) {
    notificationContainer = document.createElement("div");
    notificationContainer.className = "fixed z-50 right-4 bottom-4 space-y-2 max-w-sm";
    document.body.appendChild(notificationContainer);
    
    historyOverlay = document.createElement("div");
    historyOverlay.className = "hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center";
    document.body.appendChild(historyOverlay);
    
    historyPanel = document.createElement("div");
    historyPanel.className = "bg-[#161b22] text-white rounded-lg shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto p-4 space-y-2";
    historyOverlay.appendChild(historyPanel);
    
    historyBtn = document.createElement("button");
    historyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
    historyBtn.className = "fixed bottom-4 left-4 z-50";
    historyBtn.addEventListener("click", function() {
      updateNotificationHistory();
      historyOverlay.classList.remove("hidden");
    });
    document.body.appendChild(historyBtn);
    
    historyOverlay.addEventListener("click", function(e) {
      if (e.target === historyOverlay) historyOverlay.classList.add("hidden");
    });
  }
  
  notifications = notifications || [];
  currentNotificationTimeout = null;
}

function showNotification(message, type = "info", undoCallback = null) {
  if (!notificationContainer) {
    initializeNotifications();
  }
  
  let typeStyles = {
    info: "bg-[#316dca] border-[#265db5] text-white",
    success: "bg-[#238636] border-[#2ea043] text-white", 
    warning: "bg-[#bb8009] border-[#d29922] text-white",
    error: "bg-[#da3633] border-[#f85149] text-white"
  };
  
  let noteIndex = notifications.length;
  let note = { message, type, undo: undoCallback };
  notifications.push(note);
  
  let notification = document.createElement("div");
  notification.className = `relative border px-5 py-4 rounded-md shadow-md flex items-start justify-between gap-4 text-md ${typeStyles[type] || typeStyles.info}`;
  
  let msgSpan = document.createElement("span");
  msgSpan.className = "flex-1";
  msgSpan.innerText = message;
  notification.appendChild(msgSpan);
  
  let actions = document.createElement("div");
  actions.className = "absolute top-5 bottom-5 right-2 flex items-center space-x-2";
  
  if (undoCallback) {
    let undo = document.createElement("button");
    undo.innerHTML = '<svg class="w-5 h-5 text-white hover:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>';
    undo.addEventListener("click", function() {
      if (typeof undoCallback === "function") {
        undoCallback();
        removeNotification(notification);
      }
    });
    actions.appendChild(undo);
  }
  
  let close = document.createElement("button");
  close.innerHTML = '<svg class="w-5 h-5 text-white hover:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>';
  close.addEventListener("click", function() { removeNotification(notification); });
  actions.appendChild(close);
  notification.appendChild(actions);
  
  notification.addEventListener("mouseenter", function() {
    actions.classList.remove("hidden");
  });
  notification.addEventListener("mouseleave", function() {
    if (!historyOverlay || historyOverlay.classList.contains("hidden")) return;
    actions.classList.add("hidden");
  });
  
  notificationContainer.appendChild(notification);
  
  if (currentNotificationTimeout) clearTimeout(currentNotificationTimeout);
  currentNotificationTimeout = setTimeout(function() { removeNotification(notification); }, 5000);
  
  return notification;
}

function removeNotification(element) {
  element.classList.add("opacity-0", "translate-y-2", "transition-all", "duration-300");
  setTimeout(function() { element.remove(); }, 300);
}

function updateNotificationHistory() {
  if (!historyPanel) return;
  
  historyPanel.innerHTML = "";
  let typeStyles = {
    info: "bg-[#316dca] border-[#265db5] text-white",
    success: "bg-[#238636] border-[#2ea043] text-white", 
    warning: "bg-[#bb8009] border-[#d29922] text-white",
    error: "bg-[#da3633] border-[#f85149] text-white"
  };
  
  notifications.forEach(function(note, i) {
    let el = document.createElement("div");
    el.className = `relative border px-3 py-2 rounded-md shadow-md flex items-start justify-between gap-4 text-sm mb-2 ${typeStyles[note.type] || typeStyles.info}`;
    
    let msgSpan = document.createElement("span");
    msgSpan.className = "flex-1";
    msgSpan.innerText = note.message;
    el.appendChild(msgSpan);
    
    let actions = document.createElement("div");
    actions.className = "hidden absolute -top-3 right-1 flex items-center space-x-2";
    
    if (typeof note.undo === "function") {
      let undo = document.createElement("button");
      undo.innerHTML = '<svg class="w-5 h-5 text-white hover:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>';
      undo.disabled = i !== notifications.length - 1;
      if (undo.disabled) undo.classList.add("opacity-30", "cursor-not-allowed");
      undo.addEventListener("click", function() {
        note.undo();
        el.remove();
        notifications = notifications.filter(function(_, index) { return index !== i; });
      });
      actions.appendChild(undo);
    }
    
    let close = document.createElement("button");
    close.innerHTML = '<svg class="w-5 h-5 text-white hover:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>';
    close.addEventListener("click", function() {
      el.remove();
      notifications = notifications.filter(function(_, index) { return index !== i; });
    });
    
    actions.appendChild(close);
    el.appendChild(actions);
    
    el.addEventListener("mouseenter", function() {
      actions.classList.remove("hidden");
    });
    el.addEventListener("mouseleave", function() {
      actions.classList.add("hidden");
    });
    
    historyPanel.appendChild(el);
  });
  
  if (notifications.length === 0) {
    let emptyState = document.createElement("div");
    emptyState.className = "text-center py-6 text-gray-400";
    emptyState.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p>No notifications yet</p>
    `;
    historyPanel.appendChild(emptyState);
  }
}

// ==========================================
// LOADING SYSTEM
// ==========================================
function showLoadingBar() {
  if (document.getElementById("global-loading-bar")) return;
  
  loadingProgress = 0;
  let loadingBar = createElementFromHTML('<div id="global-loading-bar" class="loading-bar"></div>');
  if (loadingBar) {
    document.body.appendChild(loadingBar);
    
    setTimeout(function() {
      loadingBar.classList.add('active');
      startLoadingProgress();
    }, 10);
  }
}

function startLoadingProgress() {
  let loadingBar = document.getElementById("global-loading-bar");
  if (!loadingBar) return;
  
  loadingProgress = 0;
  updateLoadingProgress();
  
  loadingTimer = setInterval(function() {
    if (loadingProgress < 90) {
      let increment = loadingProgress < 30 ? 15 : loadingProgress < 60 ? 8 : 3;
      loadingProgress = Math.min(90, loadingProgress + increment);
      updateLoadingProgress();
    }
  }, 150);
}

function updateLoadingProgress() {
  let loadingBar = document.getElementById("global-loading-bar");
  if (loadingBar) {
    loadingBar.style.transform = `scaleX(${loadingProgress / 100})`;
  }
}

function completeLoadingBar() {
  if (loadingTimer) {
    clearInterval(loadingTimer);
    loadingTimer = null;
  }
  
  let loadingBar = document.getElementById("global-loading-bar");
  if (loadingBar) {
    loadingProgress = 100;
    loadingBar.style.transform = 'scaleX(1)';
    
    setTimeout(function() {
      loadingBar.classList.add('complete');
      setTimeout(function() { loadingBar.remove(); }, 400);
    }, 100);
  }
}

function hideLoadingBar() {
  completeLoadingBar();
}

// ==========================================
// PAGE LOADING AND NAVIGATION
// ==========================================
function showLoading() {
  let loadingOverlay = document.getElementById('content-loading');
  if (loadingOverlay) {
    loadingOverlay.classList.remove('hidden');
  }
  showLoadingBar();
}

function hideLoading() {
  let loadingOverlay = document.getElementById('content-loading');
  if (loadingOverlay) {
    loadingOverlay.classList.add('hidden');
  }
  completeLoadingBar();
}

function clearPageContent(callback) {
  let contentWrapper = document.getElementById('dynamic-content');
  if (!contentWrapper) {
    if (callback) callback();
    return;
  }
  
  contentWrapper.classList.add('fade-out');
  
  setTimeout(function() {
    contentWrapper.innerHTML = '';
    contentWrapper.classList.remove('fade-out');
    if (callback) callback();
  }, 300);
}

function updatePageContent(newContent, callback) {
  let contentWrapper = document.getElementById('dynamic-content');
  if (!contentWrapper) {
    if (callback) callback();
    return;
  }
  
  contentWrapper.classList.add('fade-out');
  
  setTimeout(function() {
    contentWrapper.innerHTML = newContent;
    contentWrapper.classList.remove('fade-out');
    
    contentWrapper.classList.add('fade-in');
    
    setTimeout(function() {
      contentWrapper.classList.remove('fade-in');
      if (callback) callback();
    }, 300);
  }, 300);
}
/**
function showSkeletonLoader(element, height, count) {
  if (!element) return;
  element.innerHTML = "";
  for (let i = 0; i < count; i++) {
    let skeleton = document.createElement("div");
    skeleton.className = "skeleton";
    skeleton.style.height = height;
    element.appendChild(skeleton);
  }
}
**/
function fadeInContent(element) {
  if (!element) return;
  element.classList.add("content-fade-in");
  setTimeout(function() { element.classList.remove("content-fade-in"); }, 600);
}

// ==========================================
// HOME PAGE FUNCTIONS
// ==========================================
/**
function loadHomePage() {
  currentPage = "home";
  
  showLoading();
  
  updateBreadcrumbs([]);
  
  let homeContent = `
    <div class="text-center py-8 md:py-12">
      <h1 class="text-4xl md:text-5xl font-bold mb-6 gradient-text">Discover Amazing Music</h1>
      <p class="text-lg md:text-xl text-gray-400 mb-8 md:mb-12 max-w-2xl mx-auto">Explore artists, albums, and songs from your personal library with an immersive listening experience</p>
    </div>
    <h2 class="text-2xl md:text-3xl font-bold mb-6 md:mb-8 px-4">Featured Artists</h2>
    <div id="featured-artists" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 px-4"></div>
  `;
  
  updatePageContent(homeContent, function() {
    renderRandomArtists();
    completeLoadingBar();
    hideLoading();
  });
}
**/

function renderRandomArtists() {
  let featuredArtists = document.getElementById('featured-artists');
  if (!window.music || window.music.length === 0) {
    if (featuredArtists) featuredArtists.innerHTML = "<p>No music library found.</p>";
    return;
  }
  
  let shuffled = [...window.music].sort(function() { return 0.5 - Math.random(); });
  let randomArtists = shuffled.slice(0, 4);
  if (featuredArtists) featuredArtists.innerHTML = "";
  
  randomArtists.forEach(function(artist) {
    let artistElement = createElementFromHTML(
      renderTemplate("artistCard", {
        id: artist.id,
        artist: artist.artist,
        genre: artist.genre,
        cover: getArtistImageUrl(artist.artist),
        albumCount: artist.albums.length,
      })
    );
    
    let artistImage = artistElement?.querySelector('.artist-avatar');
    if (artistImage) {
      let artistImageUrl = getArtistImageUrl(artist.artist);
      let fallbackUrl = getDefaultArtistImage();
      loadImageWithFallback(artistImage, artistImageUrl, fallbackUrl, 'artist');
    }
    
    if (artistElement && featuredArtists) {
      artistElement.addEventListener("click", function() { loadArtistPage(artist); });
      featuredArtists.appendChild(artistElement);
    }
  });
  
  if (featuredArtists) fadeInContent(featuredArtists);
}

// ==========================================
// ARTIST PAGE FUNCTIONS
// ==========================================
function loadArtistPage(artist) {
  currentPage = "artist";
  currentPageArtist = artist;
  
  showLoading();
  
  updateBreadcrumbs([
    {
      type: 'artists',
      params: {},
      url: '/artists',
      text: 'Discography',
      icon: `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>`
    },
    {
      type: 'artist',
      params: { artist: artist.artist },
      url: `/artist/${normalizeForUrl(artist.artist)}/`,
      text: artist.artist
    }
  ]);
  
  clearPageContent(function() {
    let skeleton = `<div class="skeleton w-full h-[400px] rounded-lg"></div>`;
    let dynamicContent = document.getElementById('dynamic-content');
    if (dynamicContent) dynamicContent.innerHTML = skeleton;
    
    setTimeout(function() {
      let artistContent = renderTemplate("enhancedArtist", {
        artist: artist.artist,
        genre: artist.genre,
        cover: getArtistImageUrl(artist.artist),
        albumCount: artist.albums.length,
        songCount: getTotalSongs(artist),
      });
      
      updatePageContent(artistContent, function() {
        let artistHeader = document.getElementById('artist-header');
        let headerToggle = document.getElementById('header-toggle');
        
        if (artistHeader && headerToggle) {
          let toggleHeader = function() {
            artistHeader.classList.toggle('collapsed');
          };
          
          headerToggle.addEventListener('click', toggleHeader);
          
          let keyHandler = function(e) {
            if (e.altKey && e.key === 'h' && artistHeader) {
              toggleHeader();
            }
          };
          
          if (window.currentHeaderKeyHandler) {
            document.removeEventListener('keydown', window.currentHeaderKeyHandler);
          }
          
          document.addEventListener('keydown', keyHandler);
          window.currentHeaderKeyHandler = keyHandler;
        }
        
        let artistHeaderImage = document.querySelector('.artist-avatar img');
        if (artistHeaderImage) {
          let artistImageUrl = getArtistImageUrl(artist.artist);
          let fallbackUrl = getDefaultArtistImage();
          loadImageWithFallback(artistHeaderImage, artistImageUrl, fallbackUrl, 'artist');
        }
        
        let similarContainer = document.getElementById("similar-artists-container");
        if (similarContainer && artist.similar) {
          let showSimilar = new SimilarArtistsCarousel(similarContainer);
          
          for (let i = 0; i < artist.similar.length; i++) {
            let similarArtistName = artist.similar[i];
            
            let similarArtistData = window.music?.find(function(a) { return a.artist === similarArtistName; });
            
            if (!similarArtistData) {
              similarArtistData = {
                artist: similarArtistName,
                id: `similar-${i}`,
                albums: [],
                genre: "Unknown"
              };
            }
            
            setTimeout(function() {
              showSimilar.addArtist(similarArtistData);
            }, i * 50);
          }
        }
        
        let albumsContainer = document.getElementById("albums-container");
        if (albumsContainer && artist.albums?.length > 0) {
          let viewAlbum = new AlbumSelector(albumsContainer, artist);
        }
        
        completeLoadingBar();
        bindDynamicPageEvents();
        hideLoading();
      });
    }, 800);
  });
}

// ==========================================
// ARTISTS PAGE FUNCTIONS
// ==========================================
/**
function loadAllArtistsPage() {
  currentPage = "allArtists";
  
  showLoading();
  
  updateBreadcrumbs([
    {
      type: 'allArtists',
      params: {},
      url: '/artists/',
      text: 'Artists'
    }
  ]);
  
  let allArtistsContent = `
    <div class="page-header px-4 sm:px-6 py-4">
      <div class="filter-controls mb-6 flex flex-wrap gap-4 items-center">
        <div class="search-wrapper relative flex-grow max-w-md">
          <input type="text" id="artist-search" 
                 class="w-full bg-bg-subtle border border-border-subtle rounded-lg py-2 px-4 pl-10 text-fg-default focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
                 placeholder="Search artists...">
          <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-fg-muted" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"></path>
          </svg>
        </div>
        <div id="genre-filters" class="genre-filters flex flex-wrap gap-2"></div>
        <div class="view-toggle ml-auto">
          <button id="grid-view-btn" class="p-2 rounded-lg bg-bg-subtle hover:bg-bg-muted active:bg-accent-primary transition-colors">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
            </svg>
          </button>
          <button id="list-view-btn" class="p-2 rounded-lg bg-bg-subtle hover:bg-bg-muted transition-colors">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    <div id="artists-grid" class="artists-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 px-4 sm:px-6"></div>
  `;
  
  updatePageContent(allArtistsContent, function() {
    let artistsGrid = document.getElementById('artists-grid');
    showSkeletonLoader(artistsGrid, "220px", 10);
    
    setTimeout(function() {
      renderAllArtists(artistsGrid);
      setupArtistFilters();
      completeLoadingBar();
      let dynamicContent = document.getElementById('dynamic-content');
      if (dynamicContent) fadeInContent(dynamicContent);
      hideLoading();
    }, 800);
  });
}
**/

function renderAllArtists(container) {
  if (!container || !window.music) return;
  
  container.innerHTML = '';
  
  window.music.forEach(function(artist) {
    let artistElement = createElementFromHTML(
      `<div class="artist-card" data-artist-id="${artist.id}" data-nav="artist" data-artist="${artist.artist}">
        <div class="text-center">
          <div class="artist-avatar w-28 h-28 mx-auto mb-4 rounded-full overflow-hidden">
            <img src="${getArtistImageUrl(artist.artist)}" alt="${artist.artist}" class="w-full h-full object-cover">
          </div>
          <h3 class="text-lg font-bold mb-2">${artist.artist}</h3>
          <div class="genre-tag inline-block px-3 py-1 bg-blue-600 bg-opacity-30 rounded-full text-xs font-medium mb-3">${artist.genre || 'Unknown'}</div>
          <p class="text-sm opacity-70">${artist.albums.length} album${artist.albums.length !== 1 ? 's' : ''}</p>
        </div>
      </div>`
    );
    
    let artistImage = artistElement?.querySelector('.artist-avatar img');
    if (artistImage) {
      let artistImageUrl = getArtistImageUrl(artist.artist);
      let fallbackUrl = getDefaultArtistImage();
      loadImageWithFallback(artistImage, artistImageUrl, fallbackUrl, 'artist');
    }
    
    if (artistElement) {
      container.appendChild(artistElement);
      
      artistElement.addEventListener('click', function() {
        window.siteMap.navigateTo('artist', { artist: artist.artist });
      });
    }
  });
}

function setupArtistFilters() {
  let genres = new Set();
  window.music?.forEach(function(artist) {
    if (artist.genre) genres.add(artist.genre);
  });
  
  let genreFilters = document.getElementById('genre-filters');
  if (genreFilters) {
    genreFilters.innerHTML = `<div class="genre-tag active" data-genre="all">All Genres</div>`;
    
    Array.from(genres).sort().forEach(function(genre) {
      let genreTag = document.createElement('div');
      genreTag.className = 'genre-tag';
      genreTag.dataset.genre = genre;
      genreTag.textContent = genre;
      genreFilters.appendChild(genreTag);
    });
    
    genreFilters.querySelectorAll('.genre-tag').forEach(function(tag) {
      tag.addEventListener('click', function() {
        genreFilters.querySelectorAll('.genre-tag').forEach(function(t) { t.classList.remove('active'); });
        tag.classList.add('active');
        
        let genre = tag.dataset.genre;
        filterArtistsByGenre(genre);
      });
    });
  }
  
  let searchInput = document.getElementById('artist-search');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      filterArtistsBySearch(searchInput.value);
    });
  }
  
  let gridViewBtn = document.getElementById('grid-view-btn');
  let listViewBtn = document.getElementById('list-view-btn');
  let artistsGrid = document.getElementById('artists-grid');
  
  if (gridViewBtn && listViewBtn && artistsGrid) {
    gridViewBtn.addEventListener('click', function() {
      gridViewBtn.classList.add('active', 'bg-accent-primary', 'text-white');
      listViewBtn.classList.remove('active', 'bg-accent-primary', 'text-white');
      
      artistsGrid.classList.remove('list-view');
      artistsGrid.classList.add('grid-view');
      
      localStorage.setItem('artistsViewMode', 'grid');
    });
    
    listViewBtn.addEventListener('click', function() {
      listViewBtn.classList.add('active', 'bg-accent-primary', 'text-white');
      gridViewBtn.classList.remove('active', 'bg-accent-primary', 'text-white');
      
      artistsGrid.classList.remove('grid-view');
      artistsGrid.classList.add('list-view');
      
      localStorage.setItem('artistsViewMode', 'list');
    });
    
    let savedViewMode = localStorage.getItem('artistsViewMode') || 'grid';
    if (savedViewMode === 'list') {
      listViewBtn.click();
    } else {
      gridViewBtn.click();
    }
  }
}

function filterArtistsByGenre(genre) {
  let artistsGrid = document.getElementById('artists-grid');
  let artists = artistsGrid?.querySelectorAll('.artist-card');
  
  if (!artistsGrid || !artists) return;
  
  if (genre === 'all') {
    artists.forEach(function(artist) { artist.style.display = ''; });
  } else {
    artists.forEach(function(artist) {
      let artistGenre = artist.querySelector('.genre-tag')?.textContent;
      artist.style.display = artistGenre === genre ? '' : 'none';
    });
  }
}

function filterArtistsBySearch(query) {
  if (!query) {
    let activeGenre = document.querySelector('.genre-tag.active')?.dataset.genre || 'all';
    return filterArtistsByGenre(activeGenre);
  }
  
  let artistsGrid = document.getElementById('artists-grid');
  let artists = artistsGrid?.querySelectorAll('.artist-card');
  
  if (!artistsGrid || !artists) return;
  
  let searchQuery = query.toLowerCase().trim();
  
  artists.forEach(function(artist) {
    let artistName = artist.querySelector('h3')?.textContent?.toLowerCase() || '';
    artist.style.display = artistName.includes(searchQuery) ? '' : 'none';
  });
}
/**
function updateBreadcrumbs(items = []) {
  let breadcrumbList = document.querySelector(".breadcrumb-list");
  if (!breadcrumbList) return;

  let prevItems = breadcrumbList.querySelectorAll(".breadcrumb-item");
  let prevSeparators = breadcrumbList.querySelectorAll(".breadcrumb-separator");

  let newLast = items[items.length - 1];
  let prevLast = prevItems[prevItems.length - 1];
  let prevLastText = prevLast?.textContent?.trim();

  let lastChanged = !prevLast || prevLastText !== newLast?.text;

  if (lastChanged && prevLast && prevSeparators.length > 0) {
    let prevSeparator = prevSeparators[prevSeparators.length - 1];

    prevLast.classList.add("fade-out-breadcrumb");
    prevSeparator.classList.add("fade-out-breadcrumb");

    setTimeout(function() {
      breadcrumbList.removeChild(prevLast);
      breadcrumbList.removeChild(prevSeparator);

      let newSeparator = document.createElement("li");
      newSeparator.className = "breadcrumb-separator fade-in-breadcrumb";
      newSeparator.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      `;
      breadcrumbList.appendChild(newSeparator);

      let newItem = document.createElement("li");
      newItem.className = "breadcrumb-item fade-in-breadcrumb";
      newItem.innerHTML = `<h4 aria-current="page">${newLast.text}</h4>`;
      breadcrumbList.appendChild(newItem);
    }, 400);
  } else {
    breadcrumbList.innerHTML = "";

    let homeItem = document.createElement("li");
    homeItem.className = "breadcrumb-item";
    homeItem.innerHTML = `
      <a href="/" class="breadcrumb" data-nav="home">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 
                0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <h4 class="hidden md:inline">Home</h4>
      </a>
    `;
    breadcrumbList.appendChild(homeItem);

    items.forEach(function(item, index) {
      let separator = document.createElement("li");
      separator.className = "breadcrumb-separator";
      separator.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      `;
      breadcrumbList.appendChild(separator);

      let listItem = document.createElement("li");
      listItem.className = "breadcrumb-item";

      if (index === items.length - 1) {
        listItem.innerHTML = `<h4 aria-current="page">${item.text}</h4>`;
      } else {
        listItem.innerHTML = `
          <a href="${item.url}" class="breadcrumb" 
             data-nav="${item.type}" ${Object.entries(item.params)
                 .map(function([k, v]) { return `data-${k}="${v}"`; })
                 .join(" ")}>
            <h4>${item.text}</h4>
          </a>
        `;
      }

      breadcrumbList.appendChild(listItem);
    });
  }
}
**/
// ==========================================
// TEMPLATE RENDERING
// ==========================================

/**
function renderTemplate(templateName, data) {
  switch (templateName) {
    case "artistCard":
      return `
        <div class="artist-card rounded-xl bg-white bg-opacity-5 backdrop-blur-sm border border-white border-opacity-10 p-6 cursor-pointer hover:shadow-lg transition-all" data-artist-id="${data.id}">
          <div class="text-center">
            <div class="artist-avatar w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600">
              <img src="${data.cover}" alt="${data.artist}" class="w-full h-full object-cover">
            </div>
            <h3 class="text-lg font-bold mb-2">${data.artist}</h3>
            <div class="genre-tag inline-block px-3 py-1 bg-blue-600 bg-opacity-30 rounded-full text-xs font-medium mb-3">${data.genre}</div>
            <p class="text-sm opacity-70">${data.albumCount} album${data.albumCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
      `;
    case "enhancedArtist":
      return `
        <div class="artistTop">
          <div class="artist-header" id="artist-header">
            <div class="content-wrapper">
              <div class="artist-avatar">
                <img src="${data.cover}" alt="${data.artist}">
              </div>
              <div class="artist-info">
                <h1>${data.artist}</h1>
                <div class="metadata-tags">
                  <span>${data.genre}</span>
                  <span>${data.albumCount} Albums</span>
                  <span>${data.songCount} Songs</span>
                </div>
                <div class="action-buttons">
                  <button class="play">▶️ Play All</button>
                  <button class="follow">⭐ Follow</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="content-offset">
          <div class="similar-artists-section">
            <h2>Similar Artists</h2>
            <div id="similar-artists-container"></div>
          </div>
          <div class="albums-section">
            <h2>Albums</h2>
            <div id="albums-container" class="albums-grid"></div>
          </div>
        </div>
      `;
    case "singleAlbumCard":
      return `
        <div class="album-card p-0 rounded-2xl bg-white bg-opacity-5 backdrop-blur-sm border border-white border-opacity-5">
          <div class="albumFade" data-album-id="${data.albumId}">
            <div class="gap-6 items-center md:items-start">
              <div class="album-image relative flex-shrink-0">
                <button class="play-album absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition transform hover:scale-105">
                  <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
              <div class="flex-1 artistBottom">
                <h3 class="text-2xl font-bold mb-2">${data.album}</h3>
                <p class="text-sm opacity-70 mb-4">${data.year || 'Unknown year'} • ${data.songCount} Tracks</p>
              </div>
            </div>
          </div>
          <div class="songs-container" id="songs-container-${data.albumId}"></div>
        </div>
      `;
    case "songItem":
      return `
        <div class="song-item group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-5 transition cursor-pointer" data-song='${data.songData}'>
          <div class="flex items-center flex-1 min-w-0 gap-4">
            <span class="text-sm opacity-50 w-4 text-center">${data.trackNumber}</span>
            <div class="truncate">
              <p class="text-sm font-medium truncate">${data.title}</p>
              <p class="text-xs opacity-60">${data.duration}</p>
            </div>
          </div>
          <div class="song-toolbar flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button class="p-1.5 rounded-full hover:bg-white hover:bg-opacity-10" data-action="favorite" title="Add to favorites">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            </button>
            <button class="p-1.5 rounded-full hover:bg-white hover:bg-opacity-10" data-action="play-next" title="Play next">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z"/></svg>
            </button>
            <button class="p-1.5 rounded-full hover:bg-white hover:bg-opacity-10" data-action="add-queue" title="Add to queue">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/></svg>
            </button>
            <button class="p-1.5 rounded-full hover:bg-white hover:bg-opacity-10" data-action="share" title="Share">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"/></svg>
            </button>
          </div>
        </div>
      `;
    default:
      return "";
  }
}
**/

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function getArtistImageUrl(artistName) {
  if (!artistName) return getDefaultArtistImage();
  let normalizedName = normalizeNameForUrl(artistName);
  return `https://koders.cloud/global/content/images/artistPortraits/${normalizedName}.png`;
}
function normalizeNameForUrl(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function normalizeForUrl(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '');
}

function getDefaultArtistImage() {
  return 'https://koders.cloud/global/content/images/artistPortraits/default-artist.png';
}

function getDefaultAlbumImage() {
  return 'https://koders.cloud/global/content/images/albumCovers/default-album.png';
}

function loadImageWithFallback(imgElement, primaryUrl, fallbackUrl, type = 'image') {
  if (!imgElement) return;

  let testImage = new Image();
  
  testImage.onload = function() {
    imgElement.src = primaryUrl;
    imgElement.classList.remove('image-loading', 'image-error');
    imgElement.classList.add('image-loaded');
  };
  
  testImage.onerror = function() {
    let fallbackImage = new Image();
    
    fallbackImage.onload = function() {
      imgElement.src = fallbackUrl;
      imgElement.classList.remove('image-loading');
      imgElement.classList.add('image-loaded', 'image-fallback');
    };
    
    fallbackImage.onerror = function() {
      imgElement.classList.remove('image-loading');
      imgElement.classList.add('image-error');
      imgElement.src = generatePlaceholderImage(type);
    };
    
    fallbackImage.src = fallbackUrl;
  };
  
  imgElement.classList.add('image-loading');
  imgElement.classList.remove('image-loaded', 'image-error', 'image-fallback');
  testImage.src = primaryUrl;
}

function generatePlaceholderImage(type) {
  let isArtist = type === 'artist';
  let bgColor = isArtist ? '#4F46E5' : '#059669';
  let icon = isArtist ? 
    '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>' :
    '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>';
  
  let svg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="${bgColor}"/>
    <svg x="75" y="75" width="50" height="50" viewBox="0 0 24 24" fill="white">
      ${icon}
    </svg>
  </svg>`;
  
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

function parseDuration(durationStr) {
  if (typeof durationStr !== "string") return 0;
  let parts = durationStr.split(":").map(Number);
  return parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) ? parts[0] * 60 + parts[1] : 0;
}


function getTotalSongs(artist) {
  return artist.albums.reduce(function(total, album) { return total + album.songs.length; }, 0);
}

async function shareSong(song) {
  let shareData = {
    title: `${song.title} by ${song.artist}`,
    text: `Check out "${song.title}" by ${song.artist}`,
    url: window.location.href,
  };
  
  try {
    if (navigator.share && navigator.canShare(shareData)) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareData.text);
    }
  } catch (err) {
    console.error("Share/Copy failed:", err);
  }
}

function createElementFromHTML(htmlString) {
  let div = document.createElement("div");
  div.innerHTML = htmlString.trim();
  return div.firstChild;
}

function bindDynamicPageEvents() {
  document.querySelectorAll(".song-item").forEach(function(item) {
    let newItem = item.cloneNode(true);
    item.parentNode.replaceChild(newItem, item);
    
    newItem.addEventListener("click", function(e) {
      if (!e.target.closest(".song-toolbar")) {
        try {
          let songData = JSON.parse(newItem.dataset.song);
          playSong(songData);
        } catch (err) {
          console.error("Failed to parse song data:", err);
        }
      }
    });
  });
  
  document.querySelectorAll(".song-toolbar button").forEach(function(button) {
    button.addEventListener("click", function(e) {
      e.stopPropagation();
      let action = button.dataset.action;
      if (action) handleToolbarAction(action, button);
    });
  });
  
  let playArtistBtn = document.querySelector(".play-artist");
  if (playArtistBtn) {
    playArtistBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      playAllArtistSongs();
    });
  }
  
  if (window.HSStaticMethods) window.HSStaticMethods.autoInit();
}

function handleToolbarAction(action, button) {
  let songItem = button.closest(".song-item");
  if (!songItem) return;
  
  try {
    let songData = JSON.parse(songItem.dataset.song);
    let songId = songData.id;
    
    switch (action) {
      case "favorite":
        if (favorites.has(songId)) {
          favorites.delete(songId);
          button.classList.remove("active");
        } else {
          favorites.add(songId);
          button.classList.add("active");
        }
        break;
      case "play-next":
        addToQueue(songData, 0);
        break;
      case "add-queue":
        addToQueue(songData);
        break;
      case "share":
        shareSong(songData);
        break;
    }
  } catch (err) {
    console.error("Toolbar action failed:", err);
  }
}

// ==========================================
// SIMILAR ARTISTS & ALBUM CLASSES
// ==========================================
function SimilarArtistsCarousel(container) {
  this.container = container;
  this.scrollContainer = null;
  this.leftArrow = null;
  this.rightArrow = null;
  this.scrollPosition = 0;
  this.maxScroll = 0;
  this.itemWidth = 136;
  this.visibleItems = 0;
  
  this.init();
}

SimilarArtistsCarousel.prototype.init = function() {
  if (!this.container) return;
  
  this.container.innerHTML = `
    <div class="similar-artists-carousel">
      <button class="carousel-arrow left disabled" aria-label="Scroll left">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/>
        </svg>
      </button>
      <div class="similar-artists-container" id="similar-artists-scroll-container"></div>
      <button class="carousel-arrow right" aria-label="Scroll right">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
        </svg>
      </button>
    </div>
  `;
  
  this.scrollContainer = this.container.querySelector('#similar-artists-scroll-container');
  this.leftArrow = this.container.querySelector('.carousel-arrow.left');
  this.rightArrow = this.container.querySelector('.carousel-arrow.right');
  
  this.bindEvents();
  this.calculateDimensions();
};

SimilarArtistsCarousel.prototype.bindEvents = function() {
  let self = this;
  if (this.leftArrow) {
    this.leftArrow.addEventListener('click', function() { self.scrollLeft(); });
  }
  
  if (this.rightArrow) {
    this.rightArrow.addEventListener('click', function() { self.scrollRight(); });
  }
  
  if (this.scrollContainer) {
    this.scrollContainer.addEventListener('scroll', function() {
      self.updateArrowStates();
    });
  }
  
  window.addEventListener('resize', function() {
    self.calculateDimensions();
  });
};

SimilarArtistsCarousel.prototype.calculateDimensions = function() {
  if (!this.scrollContainer) return;
  
  let containerWidth = this.scrollContainer.parentElement.clientWidth - 100;
  this.visibleItems = Math.floor(containerWidth / this.itemWidth);
  
  let totalItems = this.scrollContainer.children.length;
  this.maxScroll = Math.max(0, (totalItems - this.visibleItems) * this.itemWidth);
  
  this.updateArrowStates();
};

SimilarArtistsCarousel.prototype.scrollLeft = function() {
  if (!this.scrollContainer) return;
  let scrollAmount = this.visibleItems * this.itemWidth;
  this.scrollContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
};

SimilarArtistsCarousel.prototype.scrollRight = function() {
  if (!this.scrollContainer) return;
  let scrollAmount = this.visibleItems * this.itemWidth;
  this.scrollContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
};

SimilarArtistsCarousel.prototype.updateArrowStates = function() {
  let scrollLeft = this.scrollContainer.scrollLeft;
  let scrollWidth = this.scrollContainer.scrollWidth;
  let clientWidth = this.scrollContainer.clientWidth;

  this.leftArrow.classList.toggle('disabled', scrollLeft <= 0);
  this.rightArrow.classList.toggle('disabled', scrollLeft + clientWidth >= scrollWidth - 1);
};

SimilarArtistsCarousel.prototype.addArtist = function(artistData) {
  if (!this.scrollContainer) return;
  
  let artistElement = this.createArtistCard(artistData);
  this.scrollContainer.appendChild(artistElement);
  this.calculateDimensions();
  
  this.bindArtistEvents(artistElement, artistData);
};

SimilarArtistsCarousel.prototype.createArtistCard = function(artistData) {
  let htmlString = render.artist("PopOvers", {
    artist: artistData.artist,
    id: artistData.id,
    albums: artistData.albums
  });
  
  let artistPopover = create(htmlString);
  return artistPopover;
};   

SimilarArtistsCarousel.prototype.bindArtistEvents = function(artistElement, artistData) {
  let hoverTimeout;
  let originalPopover = artistElement.querySelector('.artist-popover');
  let portal = document.querySelector('.popover-portal');

  if (!portal || !originalPopover) return;

  let activePopover = null;

  let showPopover = function() {
    let rect = artistElement.getBoundingClientRect();

    activePopover = originalPopover.cloneNode(true);
    activePopover.classList.add('visible');

    activePopover.style.position = 'absolute';
    activePopover.style.top = `${window.scrollY + rect.top - 12}px`;
    activePopover.style.left = `${window.scrollX + rect.left + rect.width / 2}px`;
    activePopover.style.transform = 'translate(-50%, -100%)';
    activePopover.style.zIndex = '100000000';

    portal.appendChild(activePopover);

    let seeArtistBtn = activePopover.querySelector('.popover-button');
    if (seeArtistBtn) {
      seeArtistBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (activePopover) activePopover.remove();

        let artist = window.music?.find(function(a) { return a.artist === artistData.artist; });
        if (artist) {
          loadArtistPage(artist);
        }
      });
    }
  };

  let hidePopover = function() {
    clearTimeout(hoverTimeout);
    if (activePopover) {
      activePopover.remove();
      activePopover = null;
    }
  };

  artistElement.addEventListener('mouseenter', function() {
    clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(showPopover, 300);
  });

  artistElement.addEventListener('mouseleave', function() {
    clearTimeout(hoverTimeout);
    setTimeout(hidePopover, 150);
  });
};

SimilarArtistsCarousel.prototype.clear = function() {
  if (this.scrollContainer) {
    this.scrollContainer.innerHTML = '';
    this.scrollPosition = 0;
    this.maxScroll = 0;
    this.updateArrowStates();
  }
};

function AlbumSelector(container, artist) {
  this.container = container;
  this.artist = artist;
  this.currentAlbumIndex = 0;
  this.albumContent = null;
  
  this.init();
}

AlbumSelector.prototype.init = function() {
  if (!this.container || !this.artist?.albums?.length) return;
  
  this.currentAlbumIndex = this.findLatestAlbumIndex();
  
  this.render();
  this.bindEvents();
};

AlbumSelector.prototype.findLatestAlbumIndex = function() {
  if (this.artist.albums.some(function(album) { return album.year; })) {
    let self = this;
    return this.artist.albums.reduce(function(latestIndex, album, index) {
      let currentYear = parseInt(album.year) || 0;
      let latestYear = parseInt(self.artist.albums[latestIndex].year) || 0;
      return currentYear > latestYear ? index : latestIndex;
    }, 0);
  }
  
  return this.artist.albums.length - 1;
};

AlbumSelector.prototype.render = function() {
  this.container.innerHTML = `
    <div class="album-selector-tabs" id="album-tabs"></div>      
    <div class="album-selector-container">
      <div class="single-album-display">
        <div class="album-content" id="album-content"></div>
      </div>
    </div>
  `;
  
  this.renderTabs();
  this.renderCurrentAlbum();
};

AlbumSelector.prototype.renderTabs = function() {
  let tabsContainer = this.container.querySelector('#album-tabs');
  if (!tabsContainer) return;
  
  let self = this;
  this.artist.albums.forEach(function(album, index) {
    let isActive = index === self.currentAlbumIndex;
    let tabElement = createElementFromHTML(`
      <button class="album-tab ${isActive ? 'active' : ''}" data-album-index="${index}">
        ${album.album}
        ${album.year ? `<span class="text-xs opacity-70 ml-1">(${album.year})</span>` : ''}
      </button>
    `);
    
    tabsContainer.appendChild(tabElement);
  });
};

AlbumSelector.prototype.bindEvents = function() {
  let tabsContainer = this.container.querySelector('#album-tabs');
  if (!tabsContainer) return;
  
  let self = this;
  tabsContainer.addEventListener('click', function(e) {
    let tabButton = e.target.closest('.album-tab');
    if (!tabButton) return;
    
    let albumIndex = parseInt(tabButton.dataset.albumIndex);
    if (albumIndex !== self.currentAlbumIndex) {
      self.switchToAlbum(albumIndex);
    }
  });
};

AlbumSelector.prototype.switchToAlbum = function(albumIndex) {
  if (albumIndex < 0 || albumIndex >= this.artist.albums.length) return;

  let albumContent = this.container.querySelector('#album-content');
  if (!albumContent) return;

  albumContent.classList.add('hideSongs');

  let self = this;
  setTimeout(function() {
    self.updateActiveTabs(albumIndex);
    self.currentAlbumIndex = albumIndex;
    self.renderCurrentAlbum();

    albumContent.classList.remove('hideSongs');
    albumContent.classList.add('showSongs');

    setTimeout(function() {
      albumContent.classList.remove('showSongs');
    }, 600);

  }, 500);
};

AlbumSelector.prototype.updateActiveTabs = function(activeIndex) {
  let tabs = this.container.querySelectorAll('.album-tab');
  tabs.forEach(function(tab, index) {
    tab.classList.toggle('active', index === activeIndex);
  });
};
/**
AlbumSelector.prototype.renderCurrentAlbum = function() {
  let albumContent = this.container.querySelector('#album-content');
  if (!albumContent) return;

  let album = this.artist.albums[this.currentAlbumIndex];
  if (!album) return;

  let albumId = album.album.replace(/\s+/g, "-").toLowerCase();
  let albumCoverUrl = getAlbumImageUrl(album.album);

  albumContent.innerHTML = renderTemplate("singleAlbumCard", {
    album: album.album,
    cover: albumCoverUrl,
    year: album.year,
    songCount: album.songs.length,
    albumId: albumId,
  });

  let fadeContainer = document.querySelector(`.albumFade[data-album-id="${albumId}"]`);
  if (fadeContainer) {
    fadeContainer.style.setProperty('--album-cover', `url('${albumCoverUrl}')`);
  }

  let albumCoverImage = albumContent.querySelector('.album-cover');
  if (albumCoverImage) {
    let fallbackUrl = getDefaultAlbumImage();
    loadImageWithFallback(albumCoverImage, albumCoverUrl, fallbackUrl, 'album');
  }

  let songsContainer = albumContent.querySelector(`#songs-container-${albumId}`);
  if (songsContainer) {
    album.songs.forEach(function(song, index) {
      let songData = { 
        ...song, 
        artist: this.artist.artist, 
        album: album.album, 
        cover: albumCoverUrl 
      };
      let songHtml = renderTemplate("songItem", {
        trackNumber: index + 1,
        title: song.title,
        duration: song.duration,
        id: song.id,
        songData: JSON.stringify(songData).replace(/"/g, "&quot;"),
        youtubeid: song.youtube,
      });
      songsContainer.insertAdjacentHTML("beforeend", songHtml);
    }.bind(this));
  }

  this.bindSongEvents(albumContent);
};    
**/
AlbumSelector.prototype.bindSongEvents = function(container) {
  container.querySelectorAll(".song-item").forEach(function(item) {
    item.addEventListener("click", function(e) {
      if (!e.target.closest(".song-toolbar")) {
        try {
          let songData = JSON.parse(item.dataset.song);
          playSong(songData);
        } catch (err) {
          console.error("Failed to parse song data:", err);
        }
      }
    });
  });
  
  container.querySelectorAll(".song-toolbar button").forEach(function(button) {
    button.addEventListener("click", function(e) {
      e.stopPropagation();
      let action = button.dataset.action;
      if (action) handleToolbarAction(action, button);
    });
  });
  
  let playAlbumBtn = container.querySelector(".play-album");
  if (playAlbumBtn) {
    playAlbumBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      this.playCurrentAlbum();
    }.bind(this));
  }
};

AlbumSelector.prototype.playCurrentAlbum = function() {
  let album = this.artist.albums[this.currentAlbumIndex];
  if (!album) return;
  
  queue = [];
  album.songs.forEach(function(song) {
    addToQueue({ 
      ...song, 
      artist: this.artist.artist, 
      album: album.album, 
      cover: getAlbumImageUrl(album.album) 
    });
  }.bind(this));
  
  if (queue.length > 0) {
    playSong(queue.shift());
  }
};

// ==========================================
// STATE SYNCHRONIZATION
// ==========================================
function syncGlobalState() {
  window.currentSong = currentSong;
  window.isPlaying = isPlaying;
  window.currentTime = audioElement ? audioElement.currentTime : youtubePlayer && youtubePlayer.getCurrentTime ? youtubePlayer.getCurrentTime() : 0;
  window.duration = duration;
  window.queue = queue;
  window.recentlyPlayed = recentlyPlayed;
  window.favorites = favorites;
  window.getAlbumImageUrl = getAlbumImageUrl;
  window.getDefaultAlbumImage = getDefaultAlbumImage;
  window.loadImageWithFallback = loadImageWithFallback;
  window.formatTime = formatTime;
  window.showNotification = showNotification;
  
  window.navbarModule = {
    openNowPlayingPopup: openNowPlayingPopup,
    closeNowPlayingPopup: closeNowPlayingPopup,
    toggleDropdownMenu: toggleDropdownMenu,
    openDropdownMenu: openDropdownMenu,
    closeDropdownMenu: closeDropdownMenu,
    updateDropdownCounts: updateDropdownCounts,
    getNavbarState: getNavbarState,
    setNavbarState: setNavbarState
  };
}

function getNavbarState() {
  return {
    playlists: playlists,
    favoriteArtists: favoriteArtists
  };
}

function setNavbarState(state) {
  if (state.playlists !== undefined) playlists = state.playlists;
  if (state.favoriteArtists !== undefined) favoriteArtists = state.favoriteArtists;
}

function createPopoverPortal() {
  let portal = document.getElementById('popover-portal');
  if (!portal) {
    portal = document.createElement('div');
    portal.id = 'popover-portal';
    portal.className = 'popover-portal';
    document.body.appendChild(portal);
  }
  return portal;
}

function initializeTheme() {
  let savedTheme = localStorage.getItem('theme-preference');
  if (savedTheme === 'light') {
    document.documentElement.classList.add('light');
  }
  
  let themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.removeEventListener("click", function() {});
    themeToggle.addEventListener("click", enhancedThemeToggle);
  }
}

// ==========================================
// MUSIC PLAYER SETUP
// ==========================================
function initMusicPlayer() {
  // Initialize the music player controls and UI
  const musicPlayer = document.querySelector('.musicPlayer');
  const closePlayerEl = document.getElementById('closePlayer');
  const nowPlayingArea = document.getElementById('now-playing-area');
  
  if (nowPlayingArea) {
    // Remove any existing event listeners to prevent duplicates
    const newNowPlayingArea = nowPlayingArea.cloneNode(true);
    nowPlayingArea.parentNode.replaceChild(newNowPlayingArea, nowPlayingArea);
    
    // Add event listener to toggle the music player when now-playing-area is clicked
    newNowPlayingArea.addEventListener('click', function() {
      if (musicPlayer) {
        musicPlayer.classList.toggle('show');
      }
    });
  }
  
  if (closePlayerEl && musicPlayer) {
    // Remove any existing event listeners to prevent duplicates
    const newClosePlayerEl = closePlayerEl.cloneNode(true);
    closePlayerEl.parentNode.replaceChild(newClosePlayerEl, closePlayerEl);
    
    // Add event listener to close the music player
    newClosePlayerEl.addEventListener('click', function() {
      musicPlayer.classList.remove('show');
    });
  }
}
/**
function addNavigationToMenu() {
  let dropdownMenu = document.querySelector('#dropdown-menu');
  if (!dropdownMenu) return;
  
  if (dropdownMenu.querySelector('[data-nav="home"]')) return;
  
  let navigationSection = document.createElement('div');
  navigationSection.className = 'dropdown-section';
  navigationSection.innerHTML = `
    <h3 class="section-title">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
      </svg>
      Navigation
    </h3>
    <div class="dropdown-item willHideMenu" data-nav="home">
      <div class="dropdown-item-icon">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
        </svg>
      </div>
      <div class="dropdown-item-content">
        <p class="dropdown-item-title">Home</p>
        <p class="dropdown-item-subtitle">Featured music and new releases</p>
      </div>
    </div>
    <div class="dropdown-item willHideMenu" data-nav="allArtists">
      <div class="dropdown-item-icon">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 13a3.005 3.005 0 013.75 2.094A5.972 5.972 0 0122 18v3h-6z"/>
        </svg>
      </div>
      <div class="dropdown-item-content">
        <p class="dropdown-item-title">All Artists</p>
        <p class="dropdown-item-subtitle">Browse all artists in the library</p>
      </div>
    </div>
    <div class="dropdown-item willHideMenu" id="global-search-trigger">
      <div class="dropdown-item-icon">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
        </svg>
      </div>
      <div class="dropdown-item-content">
        <p class="dropdown-item-title">Search</p>
        <p class="dropdown-item-subtitle">Find artists, albums, and songs</p>
      </div>
    </div>
  `;
  
  let firstSection = dropdownMenu.querySelector('.dropdown-section');
  if (firstSection) {
    firstSection.after(navigationSection);
  } else {
    dropdownMenu.appendChild(navigationSection);
  }
}
**/


function initUIElements() {
  let ids = [
    "home-page", "artist-page", "featured-artists", "navbar", "navbar-logo", 
    "navbar-album-cover", "navbar-now-playing", "navbar-song-title", "navbar-artist", 
    "breadcrumb", "breadcrumb-home", "breadcrumb-artist", "breadcrumb-album", 
    "theme-toggle"
  ];

  ids.forEach(function(id) {
    let camelCaseId = id.replace(/-(\w)/g, function(_, c) { return c.toUpperCase(); });
    uiElements[camelCaseId] = document.getElementById(id);
  });

  let featuredArtists = document.getElementById('featured-artists');
  if (!featuredArtists) {
    console.warn("Featured artists element not found in the DOM");
  }
}

function bindUIEvents() {
  let navbar = document.getElementById('navbar');
  let breadcrumbHome = document.getElementById('breadcrumb-home');
  let navbarAlbumCover = document.getElementById('navbar-album-cover');
  let navbarSongTitle = document.getElementById('navbar-song-title');
  
  window.addEventListener("scroll", function() {
    if (navbar) navbar.classList.toggle("floating", window.scrollY > 50);
  });

  if (breadcrumbHome) breadcrumbHome.addEventListener("click", loadHomePage);
  if (navbarAlbumCover) navbarAlbumCover.addEventListener("click", toggleMusicPlayer);
  if (navbarSongTitle) navbarSongTitle.addEventListener("click", toggleMusicPlayer);
}



// ==========================================
// SITE MAP FUNCTIONALITY
// ==========================================
function SiteMap() {
  this.routes = {
    home: {
      pattern: /^\/$/,
      handler: loadHomePage
    },
    artist: {
      pattern: /^\/artist\/(.+)$/,
      handler: function(params) {
        let artistName = params.artist || this.getParameterByName('artist', window.location.href);
        let artistData = window.music?.find(function(a) { return a.artist === artistName; });
        if (artistData) {
          loadArtistPage(artistData);
        } else {
          this.navigateTo('home');
        }
      }.bind(this)
    },
    allArtists: {
      pattern: /^\/artists$/,
      handler: loadAllArtistsPage
    }
  };
  
  this.handleInitialRoute();
  
  window.addEventListener('popstate', function(event) {
    this.handleRoute(window.location.pathname + window.location.search);
  }.bind(this));
  
  this.bindNavigationEvents();
}

SiteMap.prototype.handleInitialRoute = function() {
  let path = window.location.pathname + window.location.search;
  this.handleRoute(path);
};

SiteMap.prototype.handleRoute = function(path) {
  let matchedRoute = false;
  
  for (let key in this.routes) {
    let route = this.routes[key];
    let match = path.match(route.pattern);
    
    if (match) {
      let params = {};
      
      if (key === 'artist') {
        params.artist = decodeURIComponent(match[1]);
      }
      
      route.handler(params);
      matchedRoute = true;
      break;
    }
  }
  
  if (!matchedRoute) {
    loadHomePage();
  }
};

SiteMap.prototype.navigateTo = function(routeName, params = {}) {
  let url;
  
  switch (routeName) {
    case 'home':
      url = '/';
      break;
    case 'artist':
      url = `/artist/${encodeURIComponent(params.artist)}`;
      break;
    case 'allArtists':
      url = '/artists';
      break;
    default:
      url = '/';
  }
  
  window.history.pushState({}, '', url);
  
  if (this.routes[routeName]) {
    this.routes[routeName].handler(params);
  }
};

SiteMap.prototype.getParameterByName = function(name, url) {
  name = name.replace(/[\[\]]/g, '\\$&');
  let regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
  let results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

SiteMap.prototype.bindNavigationEvents = function() {
  document.addEventListener('click', function(e) {
    if (e.target.id === 'global-search-trigger') {
      this.openSearchDialog();
    }
  }.bind(this));
};
/**
SiteMap.prototype.openSearchDialog = function() {
  if (!document.getElementById('search-dialog')) {
    let searchDialog = document.createElement('div');
    searchDialog.id = 'search-dialog';
    searchDialog.className = 'search-dialog hidden';
    
    searchDialog.innerHTML = `
      <div class="search-dialog-content rounded-md shadow-xl overflow-hidden">
        <form id="global-search-form" class="relative">
          <input type="text" id="global-search-input" placeholder="Search for artists, albums, or songs..." 
                 class="w-full py-4 px-5 text-lg text-fg-default bg-bg-subtle border-none focus:outline-none focus:ring-0">
          <button type="submit" class="absolute right-4 top-1/2 transform -translate-y-1/2 bg-accent-primary hover:bg-accent-secondary text-white p-2 rounded-md">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"></path>
            </svg>
          </button>
        </form>
        
        <div class="recent-searches px-5 py-4 border-t border-border-muted">
          <h3 class="text-sm font-medium text-fg-muted mb-2">Recent Searches</h3>
          <div id="recent-searches-list" class="space-y-2">
            <p class="text-sm text-fg-subtle">No recent searches</p>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(searchDialog);
    
    searchDialog.addEventListener('click', function(e) {
      if (e.target === searchDialog) {
        this.closeSearchDialog();
      }
    }.bind(this));
    
    let searchForm = document.getElementById('global-search-form');
    searchForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      let query = document.getElementById('global-search-input').value.trim();
      if (query) {
        this.closeSearchDialog();
        this.navigateTo('search', { query });
        this.addRecentSearch(query);
      }
    }.bind(this));
    
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && !document.getElementById('search-dialog').classList.contains('hidden')) {
        this.closeSearchDialog();
      }
    }.bind(this));
    
    this.updateRecentSearchesList();
  }
  
  let dialog = document.getElementById('search-dialog');
  dialog.classList.remove('hidden');
  dialog.classList.add('search-dialog-opening');
  
  setTimeout(function() {
    dialog.classList.remove('search-dialog-opening');
  }, 400);
  
  document.body.style.overflow = 'hidden';
};
**/
SiteMap.prototype.closeSearchDialog = function() {
  let dialog = document.getElementById('search-dialog');
  if (dialog && !dialog.classList.contains('hidden')) {
    dialog.classList.add('search-dialog-closing');
    
    setTimeout(function() {
      dialog.classList.remove('search-dialog-closing');
      dialog.classList.add('hidden');
      document.body.style.overflow = '';
    }, 300);
  }
};

SiteMap.prototype.addRecentSearch = function(query) {
  let recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
  
  recentSearches = recentSearches.filter(function(item) { return item !== query; });
  
  recentSearches.unshift(query);
  
  recentSearches = recentSearches.slice(0, 5);
  
  localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
  
  this.updateRecentSearchesList();
};
/**
SiteMap.prototype.updateRecentSearchesList = function() {
  let list = document.getElementById('recent-searches-list');
  if (!list) return;
  
  let recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
  
  if (recentSearches.length === 0) {
    list.innerHTML = `<p class="text-sm text-fg-subtle">No recent searches</p>`;
    return;
  }
  
  list.innerHTML = recentSearches.map(function(query) {
    return `
      <div class="recent-search-item flex justify-between items-center group">
        <button class="recent-search-btn text-sm py-1 text-fg-default hover:text-accent-primary flex-grow text-left truncate" data-query="${query}">
          <span class="inline-block mr-2 opacity-60">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </span>
          ${query}
        </button>
        <button class="remove-search-btn p-1.5 opacity-0 group-hover:opacity-100 transition-opacity" data-query="${query}">
          <svg class="w-3.5 h-3.5 text-fg-muted hover:text-fg-default" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');
  
  list.querySelectorAll('.recent-search-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      let query = btn.dataset.query;
      this.closeSearchDialog();
      this.navigateTo('search', { query });
    }.bind(this));
  }.bind(this));
  
  list.querySelectorAll('.remove-search-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      let query = btn.dataset.query;
      
      let recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      recentSearches = recentSearches.filter(function(item) { return item !== query; });
      localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
      
      this.updateRecentSearchesList();
    }.bind(this));
  }.bind(this));
};
**/
// ==========================================
// APP INITIALIZATION
// ==========================================
// ==========================================
// APP INITIALIZATION
// ==========================================
function initializeApp() {
  try {
    // Log current user and time information
    console.log(`User: ClockBlocked | Time: 2025-08-18 12:10:11`);
    
    // Step 1: Initialize the music library data
    initializeMusicLibrary();
    
    // Step 2: Initialize UI elements and cache DOM references
    initUIElements();
    initNavbarElements();
    
    // Step 3: Initialize the audio player
    initPlayer();
    
    // Step 4: Set up the now playing popup
    initNowPlayingPopup();
    
    // Step 5: Initialize the music player UI controls
    initMusicPlayer();
    
    // Step 6: Add navigation items to menu
    addNavigationToMenu();
    
    // Step 7: Bind event handlers
    bindUIEvents();
    bindNavbarEvents();
    
    // Step 8: Load initial page content
    loadHomePage();
    
    // Step 9: Set up theme
    initializeTheme();
    
    // Step 10: Create portal for popovers
    createPopoverPortal();
    
    // Step 11: Reset UI state
    let nowPlayingArea = document.getElementById("now-playing-area");
    if (nowPlayingArea) {
      nowPlayingArea.classList.remove("has-song");
    }
    
    // Step 12: Update counts and sync state
    updateDropdownCounts();
    syncGlobalState();
    
    console.log("Enhanced Music Player initialized successfully");
  } catch (error) {
    console.error("Enhanced initialization failed:", error.name, error.message, error.stack);
  }
}

// ==========================================
// APP LAUNCH
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
  try {
    // Initialize site map first
    window.siteMap = new SiteMap();
    
    // Then initialize the main app
    initializeApp();
  } catch (error) {
    console.error("Application startup failed:", error.name, error.message, error.stack);
  }
});

// ==========================================
// APP LAUNCH
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
  // Initialize site map first if needed
  window.siteMap = new SiteMap();
  
  // Then initialize the main app
  initializeApp();
});

// ==========================================
// EXPORTS
// ==========================================
export { getArtistImageUrl, getTotalSongs, getAlbumImageUrl, formatTime };    















// In global.js, replace your renderTemplate function with this:
function renderTemplate(templateName, data) {
  switch (templateName) {
    case "artistCard":
      return render.artist("card", data);
    case "enhancedArtist":
      return render.artist("enhancedArtist", data);
    case "singleAlbumCard":
      return render.album("singleAlbumCard", data);
    case "songItem":
      return render.track("songItem", data);
    default:
      console.warn(`Unknown template: ${templateName}`);
      return "";
  }
}

// Replace loadHomePage with:
function loadHomePage() {
  currentPage = "home";
  
  showLoading();
  
  updateBreadcrumbs([]);
  
  let homeContent = render.page("home");
  
  updatePageContent(homeContent, function() {
    renderRandomArtists();
    completeLoadingBar();
    hideLoading();
  });
}

// Replace loadAllArtistsPage with:
function loadAllArtistsPage() {
  currentPage = "allArtists";
  
  showLoading();
  
  updateBreadcrumbs([{
    type: 'allArtists',
    params: {},
    url: '/artists/',
    text: 'Artists'
  }]);
  
  let allArtistsContent = render.page("allArtists");
  
  updatePageContent(allArtistsContent, function() {
    let artistsGrid = document.getElementById('artists-grid');
    showSkeletonLoader(artistsGrid, "220px", 10);
    
    setTimeout(function() {
      renderAllArtists(artistsGrid);
      setupArtistFilters();
      completeLoadingBar();
      let dynamicContent = document.getElementById('dynamic-content');
      if (dynamicContent) fadeInContent(dynamicContent);
      hideLoading();
    }, 800);
  });
}

// Replace updateQueueTab with:
function updateQueueTab() {
  const queueList = document.getElementById('queue-list');
  if (!queueList) return;

  if (queue.length === 0) {
    queueList.innerHTML = render.queue.empty();
    return;
  }

  // Add animation class to the container
  queueList.classList.add('animate__animated', 'animate__fadeIn');
  setTimeout(() => {
    queueList.classList.remove('animate__animated', 'animate__fadeIn');
  }, 300);

  queueList.innerHTML = queue.map((song, index) => 
    render.queue.item(song, index, currentSong)
  ).join('');

  queueList.querySelectorAll('li[data-index]').forEach((item, index) => {
    item.addEventListener('click', () => {
      // Add click animation
      item.classList.add('animate__animated', 'animate__pulse');
      setTimeout(() => {
        item.classList.remove('animate__animated', 'animate__pulse');
      }, 300);
      
      playFromQueue(index);
    });
  });
}

// Replace updateRecentTab with:
function updateRecentTab() {
  const recentList = document.getElementById('recent-list');
  if (!recentList) return;

  if (recentlyPlayed.length === 0) {
    recentList.innerHTML = render.queue.empty();
    return;
  }

  recentList.innerHTML = recentlyPlayed.map((song, index) => 
    render.queue.recentItem(song, index, currentSong)
  ).join('');

  recentList.querySelectorAll('li[data-index]').forEach((item, index) => {
    item.addEventListener('click', () => playFromRecent(index));
  });
}

// Replace addNavigationToMenu with:
function addNavigationToMenu() {
  let dropdownMenu = document.querySelector('#dropdown-menu');
  if (!dropdownMenu) return;
  
  if (dropdownMenu.querySelector('[data-nav="home"]')) return;
  
  let navigationSection = document.createElement('div');
  navigationSection.innerHTML = render.ui("navigationMenu");
  
  let firstSection = dropdownMenu.querySelector('.dropdown-section');
  if (firstSection) {
    firstSection.after(navigationSection.firstChild);
  } else {
    dropdownMenu.appendChild(navigationSection.firstChild);
  }
}

// Replace SiteMap.prototype.openSearchDialog with:
SiteMap.prototype.openSearchDialog = function() {
  if (!document.getElementById('search-dialog')) {
    let searchDialog = document.createElement('div');
    searchDialog.id = 'search-dialog';
    searchDialog.className = 'search-dialog hidden';
    
    searchDialog.innerHTML = render.search.dialog();
    
    document.body.appendChild(searchDialog);
    
    searchDialog.addEventListener('click', function(e) {
      if (e.target === searchDialog) {
        this.closeSearchDialog();
      }
    }.bind(this));
    
    let searchForm = document.getElementById('global-search-form');
    searchForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      let query = document.getElementById('global-search-input').value.trim();
      if (query) {
        this.closeSearchDialog();
        this.navigateTo('search', { query });
        this.addRecentSearch(query);
      }
    }.bind(this));
    
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && !document.getElementById('search-dialog').classList.contains('hidden')) {
        this.closeSearchDialog();
      }
    }.bind(this));
    
    this.updateRecentSearchesList();
  }
  
  let dialog = document.getElementById('search-dialog');
  dialog.classList.remove('hidden');
  dialog.classList.add('search-dialog-opening');
  
  setTimeout(function() {
    dialog.classList.remove('search-dialog-opening');
  }, 400);
  
  document.body.style.overflow = 'hidden';
};

// Replace SiteMap.prototype.updateRecentSearchesList with:
SiteMap.prototype.updateRecentSearchesList = function() {
  let list = document.getElementById('recent-searches-list');
  if (!list) return;
  
  let recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
  
  if (recentSearches.length === 0) {
    list.innerHTML = `<p class="text-sm text-fg-subtle">No recent searches</p>`;
    return;
  }
  
  list.innerHTML = recentSearches.map(query => 
    render.search.recentSearchItem(query)
  ).join('');
  
  list.querySelectorAll('.recent-search-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      let query = btn.dataset.query;
      this.closeSearchDialog();
      this.navigateTo('search', { query });
    }.bind(this));
  }.bind(this));
  
  list.querySelectorAll('.remove-search-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      let query = btn.dataset.query;
      
      let recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      recentSearches = recentSearches.filter(function(item) { return item !== query; });
      localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
      
      this.updateRecentSearchesList();
    }.bind(this));
  }.bind(this));
};

// Replace updateBreadcrumbs with:
function updateBreadcrumbs(items = []) {
  let breadcrumbList = document.querySelector(".breadcrumb-list");
  if (!breadcrumbList) return;

  let prevItems = breadcrumbList.querySelectorAll(".breadcrumb-item");
  let prevSeparators = breadcrumbList.querySelectorAll(".breadcrumb-separator");

  let newLast = items[items.length - 1];
  let prevLast = prevItems[prevItems.length - 1];
  let prevLastText = prevLast?.textContent?.trim();

  let lastChanged = !prevLast || prevLastText !== newLast?.text;

  if (lastChanged && prevLast && prevSeparators.length > 0) {
    let prevSeparator = prevSeparators[prevSeparators.length - 1];

    prevLast.classList.add("fade-out-breadcrumb");
    prevSeparator.classList.add("fade-out-breadcrumb");

    setTimeout(function() {
      breadcrumbList.removeChild(prevLast);
      breadcrumbList.removeChild(prevSeparator);

      let newSeparator = create(render.ui("breadcrumbSeparator"));
      breadcrumbList.appendChild(newSeparator);

      let newItem = create(render.ui("breadcrumbItem", {
        text: newLast.text,
        active: true
      }));
      breadcrumbList.appendChild(newItem);
    }, 400);
  } else {
    breadcrumbList.innerHTML = "";

    // Add home item
    let homeItem = create(render.ui("breadcrumbItem", {
      url: "/",
      type: "home",
      text: "Home",
      hideOnMobile: true,
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 
              0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />`
    }));
    breadcrumbList.appendChild(homeItem);

    // Add each breadcrumb item
    items.forEach(function(item, index) {
      let separator = create(render.ui("breadcrumbSeparator"));
      breadcrumbList.appendChild(separator);

      let isLast = index === items.length - 1;
      let itemElement = create(render.ui("breadcrumbItem", {
        text: item.text,
        url: !isLast ? item.url : null,
        type: !isLast ? item.type : null,
        params: !isLast ? item.params : null,
        active: isLast,
        icon: item.icon
      }));
      breadcrumbList.appendChild(itemElement);
    });
  }
}

// Replace showSkeletonLoader with:
function showSkeletonLoader(element, height, count) {
  if (!element) return;
  element.innerHTML = "";
  for (let i = 0; i < count; i++) {
    let skeleton = create(render.ui("skeletonLoader", { height }));
    element.appendChild(skeleton);
  }
}

AlbumSelector.prototype.renderCurrentAlbum = function() {
  let albumContent = this.container.querySelector('#album-content');
  if (!albumContent) return;

  let album = this.artist.albums[this.currentAlbumIndex];
  if (!album) return;

  let albumId = album.album.replace(/\s+/g, "-").toLowerCase();
  let albumCoverUrl = getAlbumImageUrl(album.album);

  albumContent.innerHTML = render.album("singleAlbumCard", {
    album: album.album,
    cover: albumCoverUrl,
    year: album.year,
    songCount: album.songs.length,
    albumId: albumId,
  });

  let fadeContainer = document.querySelector(`.albumFade[data-album-id="${albumId}"]`);
  if (fadeContainer) {
    fadeContainer.style.setProperty('--album-cover', `url('${albumCoverUrl}')`);
  }

  let albumCoverImage = albumContent.querySelector('.album-cover');
  if (albumCoverImage) {
    let fallbackUrl = getDefaultAlbumImage();
    loadImageWithFallback(albumCoverImage, albumCoverUrl, fallbackUrl, 'album');
  }

  let songsContainer = albumContent.querySelector(`#songs-container-${albumId}`);
  if (songsContainer) {
    album.songs.forEach(function(song, index) {
      let songData = { 
        ...song, 
        artist: this.artist.artist, 
        album: album.album, 
        cover: albumCoverUrl 
      };
      
      let songHtml = render.track("songItem", {
        trackNumber: index + 1,
        title: song.title,
        duration: song.duration,
        id: song.id,
        songData: JSON.stringify(songData).replace(/"/g, "&quot;"),
        youtubeid: song.youtube,
      });
      
      songsContainer.insertAdjacentHTML("beforeend", songHtml);
    }.bind(this));
  }

  this.bindSongEvents(albumContent);
};
