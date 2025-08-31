import { music } from '../modules/library.js';
import { render, create } from '../pageModules/blocks.js';
import { 
  IDS, CLASSES, ROUTES, THEMES, STORAGE_KEYS, ICONS, AUDIO_FORMATS, 
  REPEAT_MODES, NOTIFICATION_TYPES, $, $byId 
} from './siteMap.js';

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
let repeatMode = REPEAT_MODES.OFF;
let seekTooltip = null;
let currentIndex = 0;
let playlists = [];
let favoriteArtists = new Set();
let favoriteAlbums = new Set();
let isPopupVisible = false;
let currentTab = "now-playing";
let inactivityTimer = null;
let notificationContainer = null;
let notifications = [];
let currentNotificationTimeout = null;
let navbarElements = {};
let popupElements = {};
let uiElements = {};
let siteMapInstance = null;
let homePageManagerInstance = null;

function initializeMusicApp() {
  window.music = music;
  
  initPlayer();
  initializeFromLocalStorage();
  initializeUIController();
  initializeSiteMap();
  bindGlobalEvents();
  resetUIState();
}

function initPlayer() {
  if (audioElement) return;
  
  audioElement = new Audio();
  audioElement.addEventListener('timeupdate', updateProgress);
  audioElement.addEventListener('ended', handleSongEnd);
  audioElement.addEventListener('loadedmetadata', () => {
    duration = audioElement.duration;
    let totalTimeElement = $byId(IDS.popupTotalTime);
    if (totalTimeElement) {
      totalTimeElement.textContent = formatTime(duration);
    }
  });
  audioElement.addEventListener('play', onPlay);
  audioElement.addEventListener('pause', onPause);
  audioElement.addEventListener('error', (e) => {
    console.error('Audio error:', e);
  });
  
  setupMediaSession();
  createSeekTooltip();
  attachProgressBarEvents();
}

function setupMediaSession() {
  if (!('mediaSession' in navigator)) return;
  
  navigator.mediaSession.metadata = null;
  
  navigator.mediaSession.setActionHandler('play', () => {
    if (!isPlaying && audioElement) {
      audioElement.play();
    }
  });
  
  navigator.mediaSession.setActionHandler('pause', () => {
    if (isPlaying && audioElement) {
      audioElement.pause();
    }
  });
  
  navigator.mediaSession.setActionHandler('previoustrack', previousTrack);
  navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
  
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (audioElement) {
      audioElement.currentTime = details.seekTime;
      updateProgress();
    }
  });
  
  navigator.mediaSession.setActionHandler('seekbackward', (details) => {
    const skipTime = details.seekOffset || 10;
    skipTimeFunction(-skipTime);
  });
  
  navigator.mediaSession.setActionHandler('seekforward', (details) => {
    const skipTime = details.seekOffset || 10;
    skipTimeFunction(skipTime);
  });
  
  updateMediaSessionPlaybackState(isPlaying);
}

function setMetadata(songData) {
  if (!('mediaSession' in navigator)) return;
  
  const metadata = {
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
  
  try {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.metadata = new MediaMetadata(metadata);
  } catch (e) {
    console.error('Metadata update failed:', e);
  }
}

function updateMediaSessionPlaybackState(playing) {
  if (!('mediaSession' in navigator)) return;
  
  navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  
  try {
    let currentTime = 0;
    let mediaDuration = 0;
    
    if (audioElement) {
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

async function playSong(songData) {
  if (!songData) return;

  initPlayer();

  let navbarNowPlaying = $byId(IDS.nowPlayingArea);
  if (navbarNowPlaying) navbarNowPlaying.style.opacity = "0.5";
  let navbarSongTitle = $byId(IDS.navbarSongTitle);
  if (navbarSongTitle) navbarSongTitle.textContent = "Loading...";

  if (currentSong) {
    addToRecentlyPlayed(currentSong);
  }

  currentSong = songData;
  currentArtist = songData.artist;
  currentAlbum = songData.album;
  
  if (audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
  }

  const isLoaded = await playAudioFile(songData);

  if (isLoaded) {
    updateNowPlayingInfo();
    updateNavbarInfo();
    updateMusicPlayerContent();
    updateDropdownCounts();
    
    let navbarAlbumCover = $byId(IDS.navbarAlbumCover);
    let svgElement = navbarAlbumCover?.querySelector('svg');
    
    if (navbarAlbumCover && svgElement) {
      svgElement.style.transition = 'opacity 0.5s ease';
      svgElement.style.opacity = '0';
      
      setTimeout(() => {
        let coverImage = navbarAlbumCover.querySelector('img');
        if (coverImage) {
          coverImage.style.transition = 'opacity 0.5s ease';
          coverImage.style.opacity = '1';
        }
      }, 500);
    }
  } else {
    if (navbarSongTitle) navbarSongTitle.textContent = currentSong?.title || "Error";
  }
  
  if (navbarNowPlaying) navbarNowPlaying.style.opacity = "1";
  syncGlobalState();
}

async function playAudioFile(songData) {
  for (let format of AUDIO_FORMATS) {
    try {
      let songFileName = songData.title.toLowerCase().replace(/\s+/g, '').replace(/[^\w]/g, '');
      let audioUrl = `https://koders.cloud/global/content/audio/${songFileName}.${format}`;
      
      audioElement.src = audioUrl;
      
      await new Promise((resolve, reject) => {
        const loadHandler = () => {
          audioElement.removeEventListener('canplaythrough', loadHandler);
          audioElement.removeEventListener('error', errorHandler);
          resolve();
        };
        
        const errorHandler = (e) => {
          audioElement.removeEventListener('canplaythrough', loadHandler);
          audioElement.removeEventListener('error', errorHandler);
          reject(e);
        };
        
        audioElement.addEventListener('canplaythrough', loadHandler, { once: true });
        audioElement.addEventListener('error', errorHandler, { once: true });
        
        if (audioElement.readyState >= 3) {
          loadHandler();
        }
      });
      
      await audioElement.play();
      setMetadata(songData);
      return true;
    } catch (error) {
      console.error(`Audio playback (${format}) failed:`, error);
    }
  }
  showNotification("Could not load audio file");
  return false;
}

function togglePlayPause() {
  if (!currentSong) return;
  
  if (isPlaying) {
    audioElement.pause();
  } else {
    audioElement.play().catch(err => console.error('Play error:', err));
  }
}

function onPlay() {
  isPlaying = true;
  updatePlayPauseButtons();
  updateMediaSessionPlaybackState(true);
  
  if (currentSong) {
    setMetadata(currentSong);
  }
}

function onPause() {
  isPlaying = false;
  updatePlayPauseButtons();
  updateMediaSessionPlaybackState(false);
}

function nextTrack() {
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
  let currentTime = audioElement ? audioElement.currentTime : 0;
  
  if (currentTime > 3) {
    if (audioElement) {
      audioElement.currentTime = 0;
    }
    return;
  }
  
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
  if (repeatMode === REPEAT_MODES.ONE) {
    if (audioElement) {
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
  } else if (repeatMode === REPEAT_MODES.ALL) {
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
  if (audioElement) {
    audioElement.pause();
  }
  isPlaying = false;
  updatePlayPauseButtons();
}

function skipTimeFunction(seconds) {
  if (audioElement) {
    const newTime = Math.max(0, Math.min(duration, audioElement.currentTime + seconds));
    audioElement.currentTime = newTime;
    updateProgress();
  }
}

function updateProgress() {
  if (!audioElement) return;
  
  let currentTime = audioElement.currentTime;
  let totalDuration = duration;
  
  if (isNaN(totalDuration) || totalDuration <= 0) return;
  
  const percent = (currentTime / totalDuration) * 100;
  const progressFill = $byId(IDS.popupProgressFill);
  const progressThumb = $byId(IDS.popupProgressThumb);
  const currentTimeElement = $byId(IDS.popupCurrentTime);
  
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
      console.warn('Media session position state not supported:', e);
    }
  }
}

function seekTo(e) {
  if (!currentSong || !audioElement) return;
  const progressBar = $byId(IDS.popupProgressBar);
  if (!progressBar) return;
  
  const rect = progressBar.getBoundingClientRect();
  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  
  const newTime = percent * duration;
  audioElement.currentTime = newTime;
  updateProgress();
}

function addToQueue(song, position = null) {
  if (position !== null) queue.splice(position, 0, song);
  else queue.push(song);
  
  try {
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
  } catch (error) {
    console.error('Error saving queue:', error);
  }
  
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
  
  try {
    localStorage.setItem(STORAGE_KEYS.FAVORITE_SONGS, JSON.stringify(Array.from(favorites)));
  } catch (error) {
    console.error('Error saving favorite songs:', error);
  }
}

function toggleShuffle() {
  shuffleMode = !shuffleMode;
  let popupShuffleBtn = $byId(IDS.popupShuffleBtn);
  if (popupShuffleBtn) {
    popupShuffleBtn.classList.toggle(CLASSES.active, shuffleMode);
  }
  
  showNotification(`Shuffle ${shuffleMode ? 'enabled' : 'disabled'}`);
}

function toggleRepeat() {
  if (repeatMode === REPEAT_MODES.OFF) {
    repeatMode = REPEAT_MODES.ALL;
  } else if (repeatMode === REPEAT_MODES.ALL) {
    repeatMode = REPEAT_MODES.ONE;
  } else {
    repeatMode = REPEAT_MODES.OFF;
  }
  
  let popupRepeatBtn = $byId(IDS.popupRepeatBtn);
  if (popupRepeatBtn) {
    popupRepeatBtn.classList.toggle(CLASSES.active, repeatMode !== REPEAT_MODES.OFF);
    
    if (repeatMode === REPEAT_MODES.ONE) {
      popupRepeatBtn.classList.add(CLASSES.repeatOne);
    } else {
      popupRepeatBtn.classList.remove(CLASSES.repeatOne);
    }
  }
  
  showNotification(`Repeat ${repeatMode === REPEAT_MODES.OFF ? 'disabled' : repeatMode === REPEAT_MODES.ALL ? 'all songs' : 'current song'}`);
}

function addToRecentlyPlayed(song) {
  recentlyPlayed.unshift(song);
  if (recentlyPlayed.length > 50) {
    recentlyPlayed = recentlyPlayed.slice(0, 50);
  }
  
  try {
    localStorage.setItem(STORAGE_KEYS.RECENTLY_PLAYED, JSON.stringify(recentlyPlayed.slice(0, 20)));
  } catch (error) {
    console.error('Error saving recently played:', error);
  }
}

function shuffleAllSongs() {
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

function toggleFavoriteArtist(artistName) {
  if (!artistName) return;
  
  if (favoriteArtists.has(artistName)) {
    favoriteArtists.delete(artistName);
  } else {
    favoriteArtists.add(artistName);
  }
  
  try {
    localStorage.setItem(STORAGE_KEYS.FAVORITE_ARTISTS, JSON.stringify(Array.from(favoriteArtists)));
  } catch (error) {
    console.error('Error saving favorite artists:', error);
  }
  
  updateDropdownCounts();
}

function toggleFavoriteAlbum(artistName, albumName) {
  if (!artistName || !albumName) return;
  
  const albumId = `${artistName}-${albumName}`.toLowerCase().replace(/\s+/g, '-');
  
  if (favoriteAlbums.has(albumId)) {
    favoriteAlbums.delete(albumId);
  } else {
    favoriteAlbums.add(albumId);
  }
  
  try {
    localStorage.setItem(STORAGE_KEYS.FAVORITE_ALBUMS, JSON.stringify(Array.from(favoriteAlbums)));
  } catch (error) {
    console.error('Error saving favorite albums:', error);
  }
}

function initializeFromLocalStorage() {
  try {
    const favoriteSongs = localStorage.getItem(STORAGE_KEYS.FAVORITE_SONGS);
    if (favoriteSongs) {
      favorites = new Set(JSON.parse(favoriteSongs));
    }
    
    const favoriteArtistsData = localStorage.getItem(STORAGE_KEYS.FAVORITE_ARTISTS);
    if (favoriteArtistsData) {
      favoriteArtists = new Set(JSON.parse(favoriteArtistsData));
    }
    
    const favoriteAlbumsData = localStorage.getItem(STORAGE_KEYS.FAVORITE_ALBUMS);
    if (favoriteAlbumsData) {
      favoriteAlbums = new Set(JSON.parse(favoriteAlbumsData));
    }
    
    const recentlyPlayedData = localStorage.getItem(STORAGE_KEYS.RECENTLY_PLAYED);
    if (recentlyPlayedData) {
      recentlyPlayed = JSON.parse(recentlyPlayedData);
    }
    
    const playlistsData = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
    if (playlistsData) {
      playlists = JSON.parse(playlistsData);
    }
    
    const queueData = localStorage.getItem(STORAGE_KEYS.QUEUE);
    if (queueData) {
      queue = JSON.parse(queueData);
    }
  } catch (error) {
    console.error('Error initializing from localStorage:', error);
  }
}

function initializeUIController() {
  initNavbarElements();
  bindNavbarEvents();
  initMusicPlayer();
  initializeNotifications();
}

function initNavbarElements() {
  let enhancedIds = [
    IDS.willHideMenu, IDS.menuTrigger, IDS.dropdownMenu, IDS.dropdownClose, IDS.nowPlayingArea, 
    IDS.playIndicator, IDS.prevBtnNavbar, IDS.nextBtnNavbar, IDS.playPauseNavbar, 
    IDS.playIconNavbar, IDS.pauseIconNavbar,
    IDS.favoriteSongs, IDS.favoriteArtists, IDS.createPlaylist, IDS.recentlyPlayed, 
    IDS.queueView, IDS.searchMusic, IDS.shuffleAll, IDS.appSettings, IDS.aboutApp, 
    IDS.favoriteSongsCount, IDS.favoriteArtistsCount, IDS.recentCount, IDS.queueCount
  ];

  enhancedIds.forEach((id) => {
    let camelCaseId = id.replace(/-(\w)/g, (_, c) => c.toUpperCase());
    navbarElements[camelCaseId] = $byId(id);
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
  let menuTrigger = $byId(IDS.menuTrigger);
  let dropdownClose = $byId(IDS.dropdownClose);
  let willHideMenu = $byId(IDS.willHideMenu);
  
  if (menuTrigger) menuTrigger.addEventListener("click", toggleDropdownMenu);
  if (dropdownClose) dropdownClose.addEventListener("click", closeDropdownMenu);
  if (willHideMenu) willHideMenu.addEventListener("click", closeDropdownMenu);
}

function bindMenuItemEvents() {
  let menuActions = {
    [IDS.favoriteSongs]: openFavoriteSongs,
    [IDS.favoriteArtists]: openFavoriteArtists,
    [IDS.createPlaylist]: createNewPlaylist,
    [IDS.recentlyPlayed]: function() {
      openMusicPlayer();
      setTimeout(function() { switchPopupTab("recent"); }, 50);
    },
    [IDS.queueView]: function() {
      openMusicPlayer();
      setTimeout(function() { switchPopupTab("queue"); }, 50);
    },
    [IDS.searchMusic]: openSearch,
    [IDS.shuffleAll]: shuffleAllSongs,
    [IDS.appSettings]: openSettings,
    [IDS.aboutApp]: showAbout
  };

  Object.entries(menuActions).forEach(function([id, action]) {
    let element = $byId(id);
    if (element) element.addEventListener("click", action);
  });

  let themeToggle = $byId(IDS.themeToggle);
  if (themeToggle) themeToggle.addEventListener("click", enhancedThemeToggle);
}

function enhancedThemeToggle() {
  let html = document.documentElement;
  if (html.classList.contains(CLASSES.light)) {
    html.classList.remove(CLASSES.light);
    html.classList.remove(CLASSES.medium);
    updateThemeIcon(THEMES.DARK);
  } else if (html.classList.contains(CLASSES.medium)) {
    html.classList.remove(CLASSES.medium);
    html.classList.add(CLASSES.light);
    updateThemeIcon(THEMES.LIGHT);
  } else {
    html.classList.add(CLASSES.medium);
    updateThemeIcon(THEMES.MEDIUM);
  }
}

function updateThemeIcon(theme) {
  let themeToggle = $byId(IDS.themeToggle);
  if (themeToggle) {
    themeToggle.innerHTML = ICONS[theme];
  }
}

function bindNowPlayingEvents() {
  let nowPlayingArea = $byId(IDS.nowPlayingArea);
  let navbarAlbumCover = $byId(IDS.navbarAlbumCover);
  
  if (nowPlayingArea) nowPlayingArea.addEventListener("click", toggleMusicPlayer);
  if (navbarAlbumCover) {
    navbarAlbumCover.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMusicPlayer();
    });
  }
}

function bindControlEvents() {
  const playPauseNavbar = $byId(IDS.playPauseNavbar);
  const prevBtnNavbar = $byId(IDS.prevBtnNavbar);
  const nextBtnNavbar = $byId(IDS.nextBtnNavbar);

  if (playPauseNavbar) {
    playPauseNavbar.removeEventListener('click', handlePlayPauseClick);
    playPauseNavbar.addEventListener('click', handlePlayPauseClick);
  }
  
  if (prevBtnNavbar) {
    prevBtnNavbar.removeEventListener('click', handlePrevClick);
    prevBtnNavbar.addEventListener('click', handlePrevClick);
  }
  
  if (nextBtnNavbar) {
    nextBtnNavbar.removeEventListener('click', handleNextClick);
    nextBtnNavbar.addEventListener('click', handleNextClick);
  }
}

function handlePlayPauseClick(e) {
  e.stopPropagation();
  console.log("Play/pause button clicked");
  togglePlayPause();
}

function handlePrevClick(e) {
  e.stopPropagation();
  previousTrack();
}

function handleNextClick(e) {
  e.stopPropagation();
  nextTrack();
}

function bindPageEvents() {
  document.addEventListener("click", (e) => {
    let dropdownMenu = $byId(IDS.dropdownMenu);
    let menuTrigger = $byId(IDS.menuTrigger);
    if (dropdownMenu && !dropdownMenu.contains(e.target) && !menuTrigger?.contains(e.target)) {
      closeDropdownMenu();
    }
    
    let nowPlayingArea = $byId(IDS.nowPlayingArea);
    if (isPopupVisible && musicPlayer && !musicPlayer.contains(e.target) && !nowPlayingArea?.contains(e.target)) {
      closeMusicPlayer();
    }
  });
  
  document.addEventListener("keydown", handleKeyboardShortcuts);

  document.addEventListener('click', (e) => {
    let navItem = e.target.closest('[data-nav]');
    if (!navItem) return;
    
    e.preventDefault();
    let navType = navItem.dataset.nav;
    
    closeDropdownMenu();
    
    if (siteMapInstance) {
      switch (navType) {
        case ROUTES.HOME:
          siteMapInstance.navigateTo(ROUTES.HOME);
          break;
        case ROUTES.ALL_ARTISTS:
          siteMapInstance.navigateTo(ROUTES.ALL_ARTISTS);
          break;
        case ROUTES.ARTIST:
          let artistName = navItem.dataset.artist;
          if (artistName) {
            siteMapInstance.navigateTo(ROUTES.ARTIST, { artist: artistName });
          }
          break;
        case ROUTES.ALBUM:
          let artist = navItem.dataset.artist;
          let album = navItem.dataset.album;
          if (artist && album) {
            siteMapInstance.navigateTo(ROUTES.ALBUM, { artist, album });
          }
          break;
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('#' + IDS.globalSearchTrigger)) {
      e.preventDefault();
      closeDropdownMenu();
      if (siteMapInstance) {
        siteMapInstance.openSearchDialog();
      }
    }
  });
}

function initMusicPlayer() {
  cachePopupElements();
  bindPopupEvents();
}

function cachePopupElements() {
  let elementIds = [
    IDS.nowPlayingPopup, IDS.popupClose, IDS.popupAlbumCover, IDS.popupSongTitle,
    IDS.popupArtistName, IDS.popupAlbumName, IDS.popupCurrentTime, IDS.popupTotalTime,
    IDS.popupProgressBar, IDS.popupProgressFill, IDS.popupProgressThumb,
    IDS.popupPlayPauseBtn, IDS.popupPlayIcon, IDS.popupPauseIcon,
    IDS.popupPrevBtn, IDS.popupNextBtn, IDS.popupShuffleBtn, IDS.popupRepeatBtn,
    IDS.popupFavoriteBtn, IDS.queueList, IDS.recentList
  ];

  elementIds.forEach((id) => {
    let camelCaseId = id.replace(/-(\w)/g, (_, c) => c.toUpperCase());
    popupElements[camelCaseId] = $byId(id);
  });
}

function bindPopupEvents() {
  document.querySelectorAll('.popup-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      switchPopupTab(tab.dataset.tab);
      resetInactivityTimer();
    });
  });

  let popupClose = $byId(IDS.popupClose);
  let popupPlayPauseBtn = $byId(IDS.popupPlayPauseBtn);
  let popupPrevBtn = $byId(IDS.popupPrevBtn);
  let popupNextBtn = $byId(IDS.popupNextBtn);
  let popupShuffleBtn = $byId(IDS.popupShuffleBtn);
  let popupRepeatBtn = $byId(IDS.popupRepeatBtn);
  let popupFavoriteBtn = $byId(IDS.popupFavoriteBtn);
  let progressBar = $byId(IDS.popupProgressBar);
  let progressThumb = $byId(IDS.popupProgressThumb);

  if (popupClose) popupClose.addEventListener('click', closeMusicPlayer);
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

  document.addEventListener('keydown', (e) => {
    if (!isPopupVisible) return;
    handlePopupKeyboard(e);
  });
}

function toggleDropdownMenu() {
  let dropdownMenu = $byId(IDS.dropdownMenu);
  let menuTrigger = $byId(IDS.menuTrigger);
  let isVisible = dropdownMenu?.classList.contains(CLASSES.show);
  
  if (isVisible) {
    closeDropdownMenu();
  } else {
    openDropdownMenu();
  }
}

function openDropdownMenu() {
  let dropdownMenu = $byId(IDS.dropdownMenu);
  let menuTrigger = $byId(IDS.menuTrigger);
  
  if (!dropdownMenu || !menuTrigger) return;
  updateDropdownCounts();
  dropdownMenu.classList.add(CLASSES.show);
  menuTrigger.classList.add(CLASSES.active);
  closeMusicPlayer();
}

function closeDropdownMenu() {
  let dropdownMenu = $byId(IDS.dropdownMenu);
  let menuTrigger = $byId(IDS.menuTrigger);
  
  if (!dropdownMenu || !menuTrigger) return;
  dropdownMenu.classList.remove(CLASSES.show);
  menuTrigger.classList.remove(CLASSES.active);
}

function updateDropdownCounts() {
  let counts = {
    [IDS.favoriteSongsCount]: favorites.size,
    [IDS.favoriteArtistsCount]: favoriteArtists.size,
    [IDS.recentCount]: recentlyPlayed.length,
    [IDS.queueCount]: queue.length
  };

  Object.entries(counts).forEach(function([id, value]) {
    let element = $byId(id);
    if (element) {
      element.textContent = value;
    }
  });
}

function openMusicPlayer() {
  let musicPlayer = $byId(IDS.musicPlayer);
  if (!musicPlayer) return;
  
  updateMusicPlayerContent();
  switchPopupTab('now-playing');
  startInactivityTimer();
  closeDropdownMenu();
  isPopupVisible = true;
}

function closeMusicPlayer() {
  let musicPlayer = $byId(IDS.musicPlayer);
  if (!musicPlayer) return;
  
  clearInactivityTimer();
  isPopupVisible = false;
}

function toggleMusicPlayer() {
  const musicPlayer = document.querySelector('.musicPlayer');
  
  if (musicPlayer) {
    musicPlayer.classList.toggle(CLASSES.show);
  }
}

function switchPopupTab(tabName) {
  currentTab = tabName;
  
  document.querySelectorAll('.popup-tab').forEach(function(tab) {
    tab.classList.toggle(CLASSES.active, tab.dataset.tab === tabName);
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

function updateMusicPlayerContent() {
  if (!currentSong) return;

  let popupAlbumCover = $byId(IDS.popupAlbumCover);
  let popupSongTitle = $byId(IDS.popupSongTitle);
  let popupArtistName = $byId(IDS.popupArtistName);
  let popupAlbumName = $byId(IDS.popupAlbumName);
  let totalTime = $byId(IDS.popupTotalTime);

  if (popupAlbumCover) {
    popupAlbumCover.classList.add(...CLASSES.animateZoomIn.split(' '));
    setTimeout(() => {
      popupAlbumCover.classList.remove(...CLASSES.animateZoomIn.split(' '));
    }, 300);
    
    loadImageWithFallback(
      popupAlbumCover,
      getAlbumImageUrl(currentSong.album),
      getDefaultAlbumImage(),
      'album'
    );
  }

  [popupSongTitle, popupArtistName, popupAlbumName].forEach(el => {
    if (el) {
      el.classList.add(...CLASSES.animateFadeIn.split(' '));
      setTimeout(() => {
        el.classList.remove(...CLASSES.animateFadeIn.split(' '));
      }, 300);
    }
  });

  if (popupSongTitle) popupSongTitle.textContent = currentSong.title;
  if (popupArtistName) popupArtistName.textContent = currentSong.artist;
  if (popupAlbumName) popupAlbumName.textContent = currentSong.album;
  
  if (totalTime) totalTime.textContent = formatTime(duration);

  updateNowPlayingButtons();
}

function updateNowPlayingButtons() {
  if (!currentSong) return;
  
  let popupPlayIcon = $byId(IDS.popupPlayIcon);
  let popupPauseIcon = $byId(IDS.popupPauseIcon);
  let popupShuffleBtn = $byId(IDS.popupShuffleBtn);
  let popupRepeatBtn = $byId(IDS.popupRepeatBtn);
  let popupFavoriteBtn = $byId(IDS.popupFavoriteBtn);

  if (popupPlayIcon && popupPauseIcon) {
    popupPlayIcon.classList.toggle(CLASSES.hidden, isPlaying);
    popupPauseIcon.classList.toggle(CLASSES.hidden, !isPlaying);
  }

  if (popupShuffleBtn) {
    popupShuffleBtn.classList.toggle(CLASSES.active, shuffleMode);
  }

  if (popupRepeatBtn) {
    popupRepeatBtn.classList.toggle(CLASSES.active, repeatMode !== REPEAT_MODES.OFF);
    popupRepeatBtn.classList.toggle(CLASSES.repeatOne, repeatMode === REPEAT_MODES.ONE);
  }

  if (popupFavoriteBtn) {
    let isFavorite = favorites.has(currentSong.id);
    popupFavoriteBtn.classList.toggle(CLASSES.active, isFavorite);
  }
}

function updateNowPlayingInfo() {
  if (!currentSong) return;
  updateMusicPlayerContent();
}

function updateNavbarInfo() {
  if (!currentSong) return;
  
  let navbarAlbumCover = $byId(IDS.navbarAlbumCover);
  let navbarArtist = $byId(IDS.navbarArtist);
  let navbarSongTitle = $byId(IDS.navbarSongTitle);
  let playIndicator = $byId(IDS.playIndicator);
  let nowPlayingArea = $byId(IDS.nowPlayingArea);
  
  if (!navbarAlbumCover || !navbarArtist || !navbarSongTitle) return;
  
  loadImageWithFallback(
    navbarAlbumCover,
    getAlbumImageUrl(currentSong.album),
    getDefaultAlbumImage(),
    'album'
  );
  
  navbarArtist.textContent = currentSong.artist;
  let title = currentSong.title;
  navbarSongTitle.classList.toggle(CLASSES.marquee, title.length > 25);
  navbarSongTitle.textContent = title;

  if (playIndicator) {
    playIndicator.classList.toggle(CLASSES.active, isPlaying);
  }
  if (nowPlayingArea) {
    nowPlayingArea.classList.add(CLASSES.hasSong);
  }
}

function updatePlayPauseButtons() {
  console.log("Updating play/pause buttons, isPlaying:", isPlaying);
  
  const playIconNavbar = $byId(IDS.playIconNavbar);
  const pauseIconNavbar = $byId(IDS.pauseIconNavbar);
  
  if (playIconNavbar && pauseIconNavbar) {
    if (isPlaying) {
      playIconNavbar.style.display = 'none';
      pauseIconNavbar.style.display = 'block';
    } else {
      playIconNavbar.style.display = 'block';
      pauseIconNavbar.style.display = 'none';
    }
  }
  
  const popupPlayIcon = $byId(IDS.popupPlayIcon);
  const popupPauseIcon = $byId(IDS.popupPauseIcon);
  
  if (popupPlayIcon && popupPauseIcon) {
    popupPlayIcon.classList.toggle(CLASSES.hidden, isPlaying);
    popupPauseIcon.classList.toggle(CLASSES.hidden, !isPlaying);
  }
  
  const playButtons = document.querySelectorAll('.play-button, .play-btn');
  const pauseButtons = document.querySelectorAll('.pause-button, .pause-btn');
  
  playButtons.forEach(btn => {
    btn.style.display = isPlaying ? 'none' : 'block';
  });
  
  pauseButtons.forEach(btn => {
    btn.style.display = isPlaying ? 'block' : 'none';
  });
}

function updateQueueTab() {
  const queueList = $byId(IDS.queueList);
  if (!queueList) return;

  if (queue.length === 0) {
    queueList.innerHTML = render.queue.empty();
    return;
  }

  queueList.classList.add(...CLASSES.animateFadeIn.split(' '));
  setTimeout(() => {
    queueList.classList.remove(...CLASSES.animateFadeIn.split(' '));
  }, 300);

  queueList.innerHTML = queue.map((song, index) => 
    render.queue.item(song, index, currentSong)
  ).join('');

  queueList.querySelectorAll('li[data-index]').forEach((item, index) => {
    item.addEventListener('click', () => {
      item.classList.add(...CLASSES.animatePulse.split(' '));
      setTimeout(() => {
        item.classList.remove(...CLASSES.animatePulse.split(' '));
      }, 300);
      
      playFromQueue(index);
    });
  });
}

function updateRecentTab() {
  const recentList = $byId(IDS.recentList);
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

function startInactivityTimer() {
  resetInactivityTimer();
}

function resetInactivityTimer() {
  clearInactivityTimer();
  if (currentTab !== 'now-playing') {
    inactivityTimer = setTimeout(() => {
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
    '1': () => { switchPopupTab('now-playing'); },
    '2': () => { switchPopupTab('queue'); },
    '3': () => { switchPopupTab('recent'); },
    'Escape': closeMusicPlayer
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

function createSeekTooltip() {
  if ($byId(IDS.seekTooltip)) {
    seekTooltip = $byId(IDS.seekTooltip);
    return;
  }
  
  const tooltip = document.createElement('div');
  tooltip.id = IDS.seekTooltip;
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
  
  const container = $byId(IDS.musicPlayer);
  if (container) {
    container.appendChild(tooltip);
    seekTooltip = tooltip;
  }
}

function attachProgressBarEvents() {
  const progressBar = $byId(IDS.popupProgressBar);
  if (!progressBar) return;
  
  const newProgressBar = progressBar.cloneNode(true);
  progressBar.parentNode.replaceChild(newProgressBar, progressBar);
  
  newProgressBar.addEventListener('click', seekTo);
  newProgressBar.addEventListener('mousedown', startDrag);
  newProgressBar.addEventListener('mousemove', updateSeekTooltip);
  newProgressBar.addEventListener('mouseleave', hideSeekTooltip);
}

function startDrag(e) {
  if (!currentSong) return;
  
  isDragging = true;
  document.body.style.userSelect = 'none';
  e.preventDefault();
}

function onDrag(e) {
  if (!isDragging) return;
  seekTo(e);
}

function endDrag() {
  isDragging = false;
  document.body.style.userSelect = '';
  hideSeekTooltip();
}

function updateSeekTooltip(e) {
  if (!seekTooltip) return;
  const progressBar = $byId(IDS.popupProgressBar);
  if (!progressBar) return;
  
  const rect = progressBar.getBoundingClientRect();
  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  
  if (duration <= 0) return;
  
  const seekTime = percent * duration;
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

function handleKeyboardShortcuts(e) {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  let keyActions = {
    " ": () => {
      e.preventDefault();
      togglePlayPause();
    },
    ArrowLeft: () => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        previousTrack();
      }
    },
    ArrowRight: () => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        nextTrack();
      }
    },
    n: () => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        openMusicPlayer();
      }
    },
    m: () => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        toggleDropdownMenu();
      }
    },
    s: () => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        toggleShuffle();
      }
    },
    f: () => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        toggleCurrentSongFavorite();
      }
    },
    r: () => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        toggleRepeat();
      }
    },
    Escape: () => {
      closeMusicPlayer();
      closeDropdownMenu();
    }
  };

  if (keyActions[e.key]) {
    keyActions[e.key]();
  }
}

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
    showNotification(`Created playlist: ${playlist.name}`);
  }
}

function openSearch() {
  closeDropdownMenu();
}

function openSettings() {
  closeDropdownMenu();
}

function showAbout() {
  closeDropdownMenu();
}

function initializeNotifications() {
  if (!notificationContainer) {
    notificationContainer = document.createElement("div");
    notificationContainer.className = "fixed z-50 right-4 bottom-4 space-y-2 max-w-sm";
    document.body.appendChild(notificationContainer);
    
    let historyOverlay = document.createElement("div");
    historyOverlay.className = "hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center";
    document.body.appendChild(historyOverlay);
    
    let historyPanel = document.createElement("div");
    historyPanel.className = "bg-[#161b22] text-white rounded-lg shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto p-4 space-y-2";
    historyOverlay.appendChild(historyPanel);
    
    let historyBtn = document.createElement("button");
    historyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
    historyBtn.className = "fixed bottom-4 left-4 z-50";
    historyBtn.addEventListener("click", () => {
      updateNotificationHistory();
      historyOverlay.classList.remove(CLASSES.hidden);
    });
    document.body.appendChild(historyBtn);
    
    historyOverlay.addEventListener("click", (e) => {
      if (e.target === historyOverlay) historyOverlay.classList.add(CLASSES.hidden);
    });
  }
  
  notifications = notifications || [];
  currentNotificationTimeout = null;
}

function showNotification(message, type = NOTIFICATION_TYPES.INFO, undoCallback = null) {
  if (!notificationContainer) {
    initializeNotifications();
  }
  
  let typeStyles = {
    [NOTIFICATION_TYPES.INFO]: "bg-[#316dca] border-[#265db5] text-white",
    [NOTIFICATION_TYPES.SUCCESS]: "bg-[#238636] border-[#2ea043] text-white", 
    [NOTIFICATION_TYPES.WARNING]: "bg-[#bb8009] border-[#d29922] text-white",
    [NOTIFICATION_TYPES.ERROR]: "bg-[#da3633] border-[#f85149] text-white"
  };
  
  let noteIndex = notifications.length;
  let note = { message, type, undo: undoCallback };
  notifications.push(note);
  
  let notification = document.createElement("div");
  notification.className = `relative border px-5 py-4 rounded-md shadow-md flex items-start justify-between gap-4 text-md ${typeStyles[type] || typeStyles[NOTIFICATION_TYPES.INFO]}`;
  
  let msgSpan = document.createElement("span");
  msgSpan.className = "flex-1";
  msgSpan.innerText = message;
  notification.appendChild(msgSpan);
  
  let actions = document.createElement("div");
  actions.className = "absolute top-5 bottom-5 right-2 flex items-center space-x-2";
  
  if (undoCallback) {
    let undo = document.createElement("button");
    undo.innerHTML = '<svg class="w-5 h-5 text-white hover:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>';
    undo.addEventListener("click", () => {
      if (typeof undoCallback === "function") {
        undoCallback();
        removeNotification(notification);
      }
    });
    actions.appendChild(undo);
  }
  
  let close = document.createElement("button");
  close.innerHTML = ICONS.close;
  close.addEventListener("click", () => { removeNotification(notification); });
  actions.appendChild(close);
  notification.appendChild(actions);
  
  notification.addEventListener("mouseenter", () => {
    actions.classList.remove(CLASSES.hidden);
  });
  notification.addEventListener("mouseleave", () => {
    if (!document.querySelector('.popover-portal') || document.querySelector('.popover-portal').classList.contains(CLASSES.hidden)) return;
    actions.classList.add(CLASSES.hidden);
  });
  
  notificationContainer.appendChild(notification);
  
  if (currentNotificationTimeout) clearTimeout(currentNotificationTimeout);
  currentNotificationTimeout = setTimeout(() => { removeNotification(notification); }, 5000);
  
  return notification;
}

function removeNotification(element) {
  element.classList.add("opacity-0", "translate-y-2", "transition-all", "duration-300");
  setTimeout(() => { element.remove(); }, 300);
}

function updateNotificationHistory() {
  let historyPanel = document.querySelector('.popover-portal');
  if (!historyPanel) return;
  
  historyPanel.innerHTML = "";
  let typeStyles = {
    [NOTIFICATION_TYPES.INFO]: "bg-[#316dca] border-[#265db5] text-white",
    [NOTIFICATION_TYPES.SUCCESS]: "bg-[#238636] border-[#2ea043] text-white", 
    [NOTIFICATION_TYPES.WARNING]: "bg-[#bb8009] border-[#d29922] text-white",
    [NOTIFICATION_TYPES.ERROR]: "bg-[#da3633] border-[#f85149] text-white"
  };
  
  notifications.forEach((note, i) => {
    let el = document.createElement("div");
    el.className = `relative border px-3 py-2 rounded-md shadow-md flex items-start justify-between gap-4 text-sm mb-2 ${typeStyles[note.type] || typeStyles[NOTIFICATION_TYPES.INFO]}`;
    
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
      undo.addEventListener("click", () => {
        note.undo();
        el.remove();
        notifications = notifications.filter((_, index) => index !== i);
      });
      actions.appendChild(undo);
    }
    
    let close = document.createElement("button");
    close.innerHTML = ICONS.close;
    close.addEventListener("click", () => {
      el.remove();
      notifications = notifications.filter((_, index) => index !== i);
    });
    
    actions.appendChild(close);
    el.appendChild(actions);
    
    el.addEventListener("mouseenter", () => {
      actions.classList.remove(CLASSES.hidden);
    });
    el.addEventListener("mouseleave", () => {
      actions.classList.add(CLASSES.hidden);
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

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function getAlbumImageUrl(albumName) {
  if (!albumName) return getDefaultAlbumImage();
  return `https://koders.cloud/global/content/images/albumCovers/${albumName.toLowerCase().replace(/\s+/g, '-')}.png`;
}

function getArtistImageUrl(artistName) {
  if (!artistName) return getDefaultArtistImage();
  let normalizedName = normalizeNameForUrl(artistName);
  return `https://koders.cloud/global/content/images/artistPortraits/${normalizedName}.png`;
}

function getDefaultArtistImage() {
  return 'https://koders.cloud/global/content/images/artistPortraits/default-artist.png';
}

function getDefaultAlbumImage() {
  return 'https://koders.cloud/global/content/images/albumCovers/default-album.png';
}

function normalizeNameForUrl(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

function normalizeForUrl(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '');
}

function loadImageWithFallback(imgElement, primaryUrl, fallbackUrl, type = 'image') {
  if (!imgElement) return;

  let testImage = new Image();
  
  testImage.onload = function() {
    imgElement.src = primaryUrl;
    imgElement.classList.remove(CLASSES.imageLoading, CLASSES.imageError);
    imgElement.classList.add(CLASSES.imageLoaded);
  };
  
  testImage.onerror = function() {
    let fallbackImage = new Image();
    
    fallbackImage.onload = function() {
      imgElement.src = fallbackUrl;
      imgElement.classList.remove(CLASSES.imageLoading);
      imgElement.classList.add(CLASSES.imageLoaded, CLASSES.imageFallback);
    };
    
    fallbackImage.onerror = function() {
      imgElement.classList.remove(CLASSES.imageLoading);
      imgElement.classList.add(CLASSES.imageError);
      imgElement.src = generatePlaceholderImage(type);
    };
    
    fallbackImage.src = fallbackUrl;
  };
  
  imgElement.classList.add(CLASSES.imageLoading);
  imgElement.classList.remove(CLASSES.imageLoaded, CLASSES.imageError, CLASSES.imageFallback);
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

function getTotalSongs(artist) {
  return artist.albums.reduce((total, album) => total + album.songs.length, 0);
}

function parseDuration(durationStr) {
  if (typeof durationStr !== "string") return 0;
  let parts = durationStr.split(":").map(Number);
  return parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) ? parts[0] * 60 + parts[1] : 0;
}

function createElementFromHTML(htmlString) {
  let div = document.createElement("div");
  div.innerHTML = htmlString.trim();
  return div.firstChild;
}

function initializeSiteMap() {
  siteMapInstance = {
    routes: {
      [ROUTES.HOME]: {
        pattern: /^\/$/,
        handler: loadHomePage
      },
      [ROUTES.ARTIST]: {
        pattern: /^\/artist\/(.+)$/,
        handler: (params) => {
          let artistName = params.artist || getParameterByName('artist', window.location.href);
          let artistData = window.music?.find(a => a.artist === artistName);
          if (artistData) {
            loadArtistPage(artistData);
          } else {
            navigateTo(ROUTES.HOME);
          }
        }
      },
      [ROUTES.ALL_ARTISTS]: {
        pattern: /^\/artists$/,
        handler: loadAllArtistsPage
      }
    },
    
    handleInitialRoute: function() {
      let path = window.location.pathname + window.location.search;
      this.handleRoute(path);
    },
    
    handleRoute: function(path) {
      let matchedRoute = false;
      
      for (let key in this.routes) {
        let route = this.routes[key];
        let match = path.match(route.pattern);
        
        if (match) {
          let params = {};
          
          if (key === ROUTES.ARTIST) {
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
    },
    
    navigateTo: function(routeName, params = {}) {
      let url;
      
      switch (routeName) {
        case ROUTES.HOME:
          url = '/';
          break;
        case ROUTES.ARTIST:
          url = `/artist/${encodeURIComponent(params.artist)}`;
          break;
        case ROUTES.ALL_ARTISTS:
          url = '/artists';
          break;
        default:
          url = '/';
      }
      
      window.history.pushState({}, '', url);
      
      if (this.routes[routeName]) {
        this.routes[routeName].handler(params);
      }
      
      showLoading();
    },
    
    showLoading: function() {
      let contentLoading = $byId(IDS.contentLoading);
      if (contentLoading) {
        contentLoading.classList.remove(CLASSES.hidden);
        
        setTimeout(() => {
          contentLoading.classList.add(CLASSES.hidden);
        }, 800);
      }
    },
    
    openSearchDialog: function() {
      if (!$byId(IDS.searchDialog)) {
        let searchDialog = document.createElement('div');
        searchDialog.id = IDS.searchDialog;
        searchDialog.className = 'search-dialog hidden';
        
        searchDialog.innerHTML = render.search.dialog();
        
        document.body.appendChild(searchDialog);
        
        searchDialog.addEventListener('click', (e) => {
          if (e.target === searchDialog) {
            this.closeSearchDialog();
          }
        });
        
        let searchForm = $byId(IDS.globalSearchForm);
        searchForm.addEventListener('submit', (e) => {
          e.preventDefault();
          
          let query = $byId(IDS.globalSearchInput).value.trim();
          if (query) {
            this.closeSearchDialog();
            this.navigateTo(ROUTES.SEARCH, { query });
            addRecentSearch(query);
          }
        });
        
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && !$byId(IDS.searchDialog).classList.contains(CLASSES.hidden)) {
            this.closeSearchDialog();
          }
        });
        
        updateRecentSearchesList();
      }
      
      let dialog = $byId(IDS.searchDialog);
      dialog.classList.remove(CLASSES.hidden);
      dialog.classList.add(CLASSES.searchDialogOpening);
      
      setTimeout(() => {
        dialog.classList.remove(CLASSES.searchDialogOpening);
      }, 400);
      
      document.body.style.overflow = 'hidden';
    },
    
    closeSearchDialog: function() {
      let dialog = $byId(IDS.searchDialog);
      if (dialog && !dialog.classList.contains(CLASSES.hidden)) {
        dialog.classList.add(CLASSES.searchDialogClosing);
        
        setTimeout(() => {
          dialog.classList.remove(CLASSES.searchDialogClosing);
          dialog.classList.add(CLASSES.hidden);
          document.body.style.overflow = '';
        }, 300);
      }
    },
    
    updateBreadcrumb: function(items) {
      const breadcrumbList = document.querySelector('.breadcrumb-list');
      if (!breadcrumbList) return;
      
      breadcrumbList.innerHTML = '';
      
      items.forEach((item, index) => {
        if (index > 0) {
          const separator = document.createElement('li');
          separator.innerHTML = render.ui("breadcrumbSeparator");
          breadcrumbList.appendChild(separator);
        }
        
        const breadcrumbItem = document.createElement('li');
        breadcrumbItem.innerHTML = render.ui("breadcrumbItem", item);
        breadcrumbList.appendChild(breadcrumbItem);
      });
    }
  };
  
  function navigateTo(routeName, params = {}) {
    siteMapInstance.navigateTo(routeName, params);
  }
  
  function showLoading() {
    siteMapInstance.showLoading();
  }
  
  function getParameterByName(name, url) {
    name = name.replace(/[\[\]]/g, '\\$&');
    let regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
    let results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
  }
  
  function addRecentSearch(query) {
    let recentSearches = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES) || '[]');
    
    recentSearches = recentSearches.filter(item => item !== query);
    
    recentSearches.unshift(query);
    
    recentSearches = recentSearches.slice(0, 5);
    
    localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(recentSearches));
    
    updateRecentSearchesList();
  }
  
  function updateRecentSearchesList() {
    let list = $byId(IDS.recentSearchesList);
    if (!list) return;
    
    let recentSearches = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES) || '[]');
    
    if (recentSearches.length === 0) {
      list.innerHTML = `<p class="text-sm text-fg-subtle">No recent searches</p>`;
      return;
    }
    
    list.innerHTML = recentSearches.map(query => 
      render.search.recentSearchItem(query)
    ).join('');
    
    list.querySelectorAll('.recent-search-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        let query = btn.dataset.query;
        siteMapInstance.closeSearchDialog();
        siteMapInstance.navigateTo(ROUTES.SEARCH, { query });
      });
    });
    
    list.querySelectorAll('.remove-search-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        let query = btn.dataset.query;
        
        let recentSearches = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES) || '[]');
        recentSearches = recentSearches.filter(item => item !== query);
        localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(recentSearches));
        
        updateRecentSearchesList();
      });
    });
  }
  
  function loadHomePage() {
    if (homePageManagerInstance) {
      const dynamicContent = $byId(IDS.dynamicContent);
      if (dynamicContent) {
        dynamicContent.innerHTML = '';
      }
      
      showLoading();
      
      setTimeout(() => {
        homePageManagerInstance.renderHomePage();
        siteMapInstance.updateBreadcrumb([
          { text: 'Home', type: 'home', url: '/', active: true }
        ]);
      }, 200);
    }
  }
  
  function loadArtistPage(artistData) {
    const dynamicContent = $byId(IDS.dynamicContent);
    if (!dynamicContent) return;
    
    showLoading();
    
    dynamicContent.innerHTML = '';
    
    setTimeout(() => {
      const artistPage = document.createElement('div');
      artistPage.className = 'artist-page';
      artistPage.innerHTML = render.artist("enhancedArtist", {
        artist: artistData.artist,
        cover: getArtistImageUrl(artistData.artist),
        genre: artistData.genre || 'Various',
        albumCount: artistData.albums.length,
        songCount: getTotalSongs(artistData)
      });
      
      dynamicContent.appendChild(artistPage);
      
      const albumsContainer = $byId(IDS.albumsContainer);
      if (albumsContainer) {
        albumsContainer.innerHTML = `<h2 class="section-title text-2xl font-bold mb-6">Albums</h2>`;
        
        const albumsGrid = document.createElement('div');
        albumsGrid.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6';
        
        artistData.albums.forEach(album => {
          const albumCard = document.createElement('div');
          albumCard.className = 'album-card animate__animated animate__fadeIn';
          albumCard.style.animationDelay = '0.2s';
          
          albumCard.innerHTML = render.album("card", {
            albumId: `${artistData.artist}-${album.album}`.replace(/\s+/g, '-').toLowerCase(),
            album: album.album,
            cover: getAlbumImageUrl(album.album),
            year: album.year || 'Unknown',
            songCount: album.songs.length
          });
          
          albumsGrid.appendChild(albumCard);
          
          const songsContainer = albumCard.querySelector('.songs-container');
          if (songsContainer) {
            album.songs.forEach((song, index) => {
              const songItem = document.createElement('div');
              songItem.innerHTML = render.track("row", {
                trackNumber: index + 1,
                title: song.title,
                duration: song.duration || '0:00',
                songData: JSON.stringify({
                  ...song,
                  artist: artistData.artist,
                  album: album.album,
                  cover: getAlbumImageUrl(album.album)
                })
              });
              
              songsContainer.appendChild(songItem.firstChild);
            });
            
            songsContainer.querySelectorAll('.song-item').forEach(songItem => {
              songItem.addEventListener('click', () => {
                try {
                  const songData = JSON.parse(songItem.dataset.song);
                  playSong(songData);
                } catch (error) {
                  console.error('Error playing song:', error);
                }
              });
              
              songItem.querySelectorAll('[data-action]').forEach(actionBtn => {
                actionBtn.addEventListener('click', (e) => {
                  e.stopPropagation();
                  const action = actionBtn.dataset.action;
                  const songData = JSON.parse(songItem.dataset.song);
                  
                  switch (action) {
                    case 'favorite':
                      toggleFavoriteSong(songData.id);
                      break;
                    case 'play-next':
                      addToQueue(songData, 0);
                      showNotification('Added to play next');
                      break;
                    case 'add-queue':
                      addToQueue(songData);
                      showNotification('Added to queue');
                      break;
                    case 'share':
                      showNotification('Share functionality coming soon');
                      break;
                  }
                });
              });
            });
          }
          
          const playAlbumBtn = albumCard.querySelector('.play-album');
          if (playAlbumBtn) {
            playAlbumBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              
              queue = [];
              
              album.songs.slice(1).forEach(song => {
                addToQueue({
                  ...song,
                  artist: artistData.artist,
                  album: album.album,
                  cover: getAlbumImageUrl(album.album)
                });
              });
              
              if (album.songs.length > 0) {
                playSong({
                  ...album.songs[0],
                  artist: artistData.artist,
                  album: album.album,
                  cover: getAlbumImageUrl(album.album)
                });
              }
            });
          }
        });
        
        albumsContainer.appendChild(albumsGrid);
      }
      
      siteMapInstance.updateBreadcrumb([
        { text: 'Home', type: 'home', url: '/' },
        { text: artistData.artist, type: 'artist', url: `/artist/${encodeURIComponent(artistData.artist)}`, active: true }
      ]);
      
      const playButton = document.querySelector('.artist-header .play');
      if (playButton) {
        playButton.addEventListener('click', () => {
          const allSongs = [];
          artistData.albums.forEach(album => {
            album.songs.forEach(song => {
              allSongs.push({
                ...song,
                artist: artistData.artist,
                album: album.album,
                cover: getAlbumImageUrl(album.album)
              });
            });
          });
          
          if (allSongs.length > 0) {
            queue = [];
            
            allSongs.slice(1).forEach(song => {
              addToQueue(song);
            });
            
            playSong(allSongs[0]);
          }
        });
      }
      
      const followButton = document.querySelector('.artist-header .follow');
      if (followButton) {
        const isFavorite = favoriteArtists.has(artistData.artist);
        followButton.textContent = isFavorite ? 'Unfavorite' : 'Favorite';
        followButton.classList.toggle(CLASSES.active, isFavorite);
        
        followButton.addEventListener('click', () => {
          const wasFavorite = favoriteArtists.has(artistData.artist);
          toggleFavoriteArtist(artistData.artist);
          const isFavorite = favoriteArtists.has(artistData.artist);
          
          followButton.textContent = isFavorite ? 'Unfavorite' : 'Favorite';
          followButton.classList.toggle(CLASSES.active, isFavorite);
          
          showNotification(
            isFavorite ? `Added ${artistData.artist} to favorites` : `Removed ${artistData.artist} from favorites`,
            isFavorite ? NOTIFICATION_TYPES.SUCCESS : NOTIFICATION_TYPES.INFO
          );
        });
      }
    }, 300);
  }
  
  function loadAllArtistsPage() {
    const dynamicContent = $byId(IDS.dynamicContent);
    if (!dynamicContent || !window.music) return;
    
    showLoading();
    
    dynamicContent.innerHTML = '';
    
    setTimeout(() => {
      dynamicContent.innerHTML = render.page("allArtists");
      
      const artistsGrid = $byId(IDS.artistsGrid);
      if (artistsGrid) {
        window.music.forEach((artist, index) => {
          const artistCard = document.createElement('div');
          artistCard.className = 'animate__animated animate__fadeIn';
          artistCard.style.animationDelay = `${0.05 * index}s`;
          
          artistCard.innerHTML = render.artist("card", {
            id: artist.artist.replace(/\s+/g, '-').toLowerCase(),
            artist: artist.artist,
            cover: getArtistImageUrl(artist.artist),
            genre: artist.genre || 'Various',
            albumCount: artist.albums.length
          });
          
          artistsGrid.appendChild(artistCard);
          
          artistCard.querySelector('.artist-card').addEventListener('click', () => {
            siteMapInstance.navigateTo(ROUTES.ARTIST, { artist: artist.artist });
          });
        });
      }
      
      siteMapInstance.updateBreadcrumb([
        { text: 'Home', type: 'home', url: '/' },
        { text: 'All Artists', type: 'allArtists', url: '/artists', active: true }
      ]);
      
      const artistSearch = $byId(IDS.artistSearch);
      if (artistSearch) {
        artistSearch.addEventListener('input', (e) => {
          const query = e.target.value.toLowerCase().trim();
          
          document.querySelectorAll('.artist-card').forEach(card => {
            const artistName = card.querySelector('h3').textContent.toLowerCase();
            const genreTag = card.querySelector('.genre-tag').textContent.toLowerCase();
            
            const matches = artistName.includes(query) || genreTag.includes(query);
            card.parentElement.style.display = matches ? 'block' : 'none';
          });
        });
      }
      
      const genreFilters = $byId(IDS.genreFilters);
      if (genreFilters) {
        const genres = new Set();
        window.music.forEach(artist => {
          if (artist.genre) genres.add(artist.genre);
        });
        
        genreFilters.innerHTML = '';
        Array.from(genres).sort().forEach(genre => {
          const genreBtn = document.createElement('button');
          genreBtn.className = 'px-3 py-1 text-xs font-medium rounded-full bg-bg-subtle hover:bg-bg-muted transition-colors';
          genreBtn.textContent = genre;
          
          genreBtn.addEventListener('click', () => {
            genreBtn.classList.toggle(CLASSES.active);
            genreBtn.classList.toggle('bg-accent-primary');
            genreBtn.classList.toggle('text-white');
            
            const activeFilters = Array.from(genreFilters.querySelectorAll('.' + CLASSES.active)).map(btn => btn.textContent.toLowerCase());
            
            document.querySelectorAll('.artist-card').forEach(card => {
              const cardGenre = card.querySelector('.genre-tag').textContent.toLowerCase();
              
              if (activeFilters.length === 0 || activeFilters.includes(cardGenre)) {
                card.parentElement.style.display = 'block';
              } else {
                card.parentElement.style.display = 'none';
              }
            });
          });
          
          genreFilters.appendChild(genreBtn);
        });
      }
    }, 300);
  }
  
  window.addEventListener('popstate', (event) => {
    siteMapInstance.handleRoute(window.location.pathname + window.location.search);
  });
  
  siteMapInstance.handleInitialRoute();
  
  window.siteMap = siteMapInstance;
}

function initializeHomePageManager() {
  homePageManagerInstance = {
    renderHomePage: function() {
      const dynamicContent = $byId(IDS.dynamicContent);
      if (!dynamicContent) return;
      
      dynamicContent.innerHTML = '';
      
      dynamicContent.innerHTML = `
        <div class="home-page-header text-center py-8 md:py-12">
          <h1 class="text-4xl md:text-5xl font-bold mb-6 gradient-text">Your Music Universe</h1>
          <p class="text-lg md:text-xl text-gray-400 mb-8 md:mb-12 max-w-2xl mx-auto">Discover your personal collection with an immersive listening experience</p>
        </div>
        
        <div class="bento-grid px-4 md:px-6 gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <div class="bento-card col-span-full md:col-span-1">
            <div class="card-header">
              <h2 class="text-xl font-bold">Recently Played</h2>
              <a href="#" class="text-blue-400 hover:text-blue-300 text-sm" data-view="recent">View All</a>
            </div>
            <div id="${IDS.recentlyPlayedSection}" class="card-content">
              <div class="skeleton-loader"></div>
            </div>
          </div>
          
          <div class="bento-card col-span-full md:col-span-2">
            <div class="card-header">
              <h2 class="text-xl font-bold">Discover Albums</h2>
              <a href="#" class="text-blue-400 hover:text-blue-300 text-sm" data-view="albums">Explore More</a>
            </div>
            <div id="${IDS.randomAlbumsSection}" class="card-content">
              <div class="skeleton-loader"></div>
            </div>
          </div>
          
          <div class="bento-card col-span-full md:col-span-1">
            <div class="card-header">
              <h2 class="text-xl font-bold">Favorite Artists</h2>
              <a href="#" class="text-blue-400 hover:text-blue-300 text-sm" data-view="favorite-artists">View All</a>
            </div>
            <div id="${IDS.favoriteArtistsSection}" class="card-content">
              <div class="skeleton-loader"></div>
            </div>
          </div>
          
          <div class="bento-card col-span-full md:col-span-1">
            <div class="card-header">
              <h2 class="text-xl font-bold">Your Playlists</h2>
              <a href="#" class="text-blue-400 hover:text-blue-300 text-sm" data-view="playlists">View All</a>
            </div>
            <div id="${IDS.playlistsSection}" class="card-content">
              <div class="skeleton-loader"></div>
            </div>
          </div>
          
          <div class="bento-card col-span-full md:col-span-1">
            <div class="card-header">
              <h2 class="text-xl font-bold">Favorite Songs</h2>
              <a href="#" class="text-blue-400 hover:text-blue-300 text-sm" data-view="favorite-songs">View All</a>
            </div>
            <div id="${IDS.favoriteSongsSection}" class="card-content">
              <div class="skeleton-loader"></div>
            </div>
          </div>
        </div>
      `;
      
      addHomePageStyles();
      
      setTimeout(() => renderRecentlyPlayed(), 100);
      setTimeout(() => renderRandomAlbums(), 300);
      setTimeout(() => renderFavoriteArtists(), 500);
      setTimeout(() => renderPlaylists(), 700);
      setTimeout(() => renderFavoriteSongs(), 900);
      
      bindHomePageEvents();
    }
  };
  
  function addHomePageStyles() {
    if ($byId('bento-grid-styles')) return;
    
    const styleEl = document.createElement('style');
    styleEl.id = 'bento-grid-styles';
    styleEl.textContent = `
      .bento-grid {
        display: grid;
        gap: 1.5rem;
      }
      
      .bento-card {
        background: rgba(30, 41, 59, 0.5);
        border-radius: 1rem;
        padding: 1.5rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      
      .bento-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      }
      
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .card-content {
        min-height: 200px;
      }
      
      .skeleton-loader {
        height: 200px;
        background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
        border-radius: 0.5rem;
      }
      
      @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(styleEl);
  }
  
  function renderRecentlyPlayed() {
    const container = $byId(IDS.recentlyPlayedSection);
    if (!container) return;
    
    if (!recentlyPlayed || recentlyPlayed.length === 0) {
      container.innerHTML = renderEmptyState('No recently played tracks', 'music-note');
      return;
    }
    
    const recentTracks = recentlyPlayed.slice(0, 5);
    
    let html = `<div class="recent-tracks">`;
    
    recentTracks.forEach((track, index) => {
      html += `
        <div class="recent-track" data-song='${JSON.stringify(track).replace(/"/g, '&quot;')}' style="animation-delay: ${index * 100}ms;">
          <img src="${getAlbumImageUrl(track.album)}" alt="${track.title}" class="track-art">
          <div class="track-info">
            <div class="track-title">${track.title}</div>
            <div class="track-artist" data-artist="${track.artist}">${track.artist}</div>
          </div>
          <div class="track-play">
            <button class="play-button" aria-label="Play">
              ${ICONS.play}
            </button>
          </div>
        </div>
      `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
    
    container.querySelectorAll('.recent-track').forEach(track => {
      track.addEventListener('click', () => {
        try {
          const songData = JSON.parse(track.dataset.song);
          playSong(songData);
        } catch (error) {
          console.error('Error playing track:', error);
        }
      });
    });
    
    container.querySelectorAll('.track-artist').forEach(artistEl => {
      artistEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const artistName = artistEl.dataset.artist;
        if (siteMapInstance) {
          siteMapInstance.navigateTo(ROUTES.ARTIST, { artist: artistName });
        }
      });
    });
  }
  
  function renderRandomAlbums() {
    const container = $byId(IDS.randomAlbumsSection);
    if (!container) return;
    
    const albums = getRandomAlbums(6);
    
    if (!albums || albums.length === 0) {
      container.innerHTML = renderEmptyState('No albums found', 'album');
      return;
    }
    
    let html = `<div class="album-grid">`;
    
    albums.forEach((album, index) => {
      html += `
        <div class="album-card" style="animation-delay: ${index * 100}ms;">
          <img src="${getAlbumImageUrl(album.album)}" alt="${album.album}" class="album-cover">
          <div class="album-overlay">
            <button class="play-button" data-album='${JSON.stringify({artist: album.artist, album: album.album}).replace(/"/g, '&quot;')}' aria-label="Play album">
              ${ICONS.play}
            </button>
          </div>
          <div class="album-info">
            <div class="album-title">${album.album}</div>
            <div class="album-artist" data-artist="${album.artist}">${album.artist}</div>
          </div>
        </div>
      `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
    
    container.querySelectorAll('.play-button').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        try {
          const albumData = JSON.parse(button.dataset.album);
          playAlbum(albumData.artist, albumData.album);
        } catch (error) {
          console.error('Error playing album:', error);
        }
      });
    });
    
    container.querySelectorAll('.album-artist').forEach(artistEl => {
      artistEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const artistName = artistEl.dataset.artist;
        if (siteMapInstance) {
          siteMapInstance.navigateTo(ROUTES.ARTIST, { artist: artistName });
        }
      });
    });
  }
  
  function renderFavoriteArtists() {
    const container = $byId(IDS.favoriteArtistsSection);
    if (!container) return;
    
    if (!favoriteArtists || favoriteArtists.size === 0) {
      container.innerHTML = renderEmptyState('No favorite artists', 'artist');
      return;
    }
    
    const artists = Array.from(favoriteArtists).slice(0, 6);
    
    let html = `<div class="artist-grid">`;
    
    artists.forEach((artistName, index) => {
      const artistData = window.music.find(a => a.artist === artistName);
      if (!artistData) return;
      
      html += `
        <div class="artist-card" data-artist="${artistName}" style="animation-delay: ${index * 100}ms;">
          <img src="${getArtistImageUrl(artistName)}" alt="${artistName}" class="artist-avatar">
          <div class="artist-name">${artistName}</div>
        </div>
      `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
    
    container.querySelectorAll('.artist-card').forEach(artistEl => {
      artistEl.addEventListener('click', () => {
        const artistName = artistEl.dataset.artist;
        if (siteMapInstance) {
          siteMapInstance.navigateTo(ROUTES.ARTIST, { artist: artistName });
        }
      });
    });
  }
  
  function renderPlaylists() {
    const container = $byId(IDS.playlistsSection);
    if (!container) return;
    
    let html = '';
    
    if (!playlists || playlists.length === 0) {
      html = renderEmptyState('No playlists yet', 'playlist');
    } else {
      html = `<div class="playlists-list">`;
      
      const displayPlaylists = playlists.slice(0, 3);
      
      displayPlaylists.forEach((playlist, index) => {
        html += `
          <div class="playlist-card" data-playlist-id="${playlist.id}" style="animation-delay: ${index * 100}ms;">
            <div class="playlist-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v2H3v-2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
              </svg>
            </div>
            <div class="playlist-info">
              <div class="playlist-name">${playlist.name}</div>
              <div class="playlist-tracks">${playlist.songs?.length || 0} tracks</div>
            </div>
          </div>
        `;
      });
      
      html += `</div>`;
    }
    
    html += `
      <button class="create-playlist-btn">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        Create Playlist
      </button>
    `;
    
    container.innerHTML = html;
    
    container.querySelectorAll('.playlist-card').forEach(playlistEl => {
      playlistEl.addEventListener('click', () => {
        const playlistId = playlistEl.dataset.playlistId;
        openPlaylist(playlistId);
      });
    });
    
    const createBtn = container.querySelector('.create-playlist-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        createNewPlaylistHomePage();
      });
    }
  }
  
  function renderFavoriteSongs() {
    const container = $byId(IDS.favoriteSongsSection);
    if (!container) return;
    
    if (!favorites || favorites.size === 0) {
      container.innerHTML = renderEmptyState('No favorite songs', 'heart');
      return;
    }
    
    const songs = getSongsByIds(Array.from(favorites).slice(0, 5));
    
    let html = `<div class="recent-tracks">`;
    
    songs.forEach((song, index) => {
      html += `
        <div class="recent-track" data-song='${JSON.stringify(song).replace(/"/g, '&quot;')}' style="animation-delay: ${index * 100}ms;">
          <img src="${getAlbumImageUrl(song.album)}" alt="${song.title}" class="track-art">
          <div class="track-info">
            <div class="track-title">${song.title}</div>
            <div class="track-artist" data-artist="${song.artist}">${song.artist}</div>
          </div>
          <div class="track-play">
            <button class="play-button" aria-label="Play">
              ${ICONS.play}
            </button>
          </div>
        </div>
      `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
    
    container.querySelectorAll('.recent-track').forEach(track => {
      track.addEventListener('click', () => {
        try {
          const songData = JSON.parse(track.dataset.song);
          playSong(songData);
        } catch (error) {
          console.error('Error playing track:', error);
        }
      });
    });
    
    container.querySelectorAll('.track-artist').forEach(artistEl => {
      artistEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const artistName = artistEl.dataset.artist;
        if (siteMapInstance) {
          siteMapInstance.navigateTo(ROUTES.ARTIST, { artist: artistName });
        }
      });
    });
  }
  
  function bindHomePageEvents() {
    document.querySelectorAll('[data-view]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.dataset.view;
        
        switch (view) {
          case 'recent':
            openRecentlyPlayedPage();
            break;
          case 'albums':
            openAllAlbumsPage();
            break;
          case 'favorite-artists':
            openFavoriteArtistsPage();
            break;
          case 'playlists':
            openPlaylistsPage();
            break;
          case 'favorite-songs':
            openFavoriteSongsPage();
            break;
        }
      });
    });
  }
  
  function getRandomAlbums(count = 6) {
    if (!window.music) return [];
    
    const allAlbums = [];
    window.music.forEach(artist => {
      artist.albums.forEach(album => {
        allAlbums.push({
          artist: artist.artist,
          album: album.album,
          cover: getAlbumImageUrl(album.album),
          songs: album.songs
        });
      });
    });
    
    const shuffled = [...allAlbums].sort(() => 0.5 - Math.random());
    
    return shuffled.slice(0, count);
  }
  
  function getSongsByIds(ids) {
    if (!window.music || !ids.length) return [];
    
    const songs = [];
    
    window.music.forEach(artist => {
      artist.albums.forEach(album => {
        album.songs.forEach(song => {
          if (ids.includes(song.id)) {
            songs.push({
              ...song,
              artist: artist.artist,
              album: album.album,
              cover: getAlbumImageUrl(album.album)
            });
          }
        });
      });
    });
    
    return songs;
  }
  
  function playAlbum(artistName, albumName) {
    if (!window.music) return;
    
    const artist = window.music.find(a => a.artist === artistName);
    if (!artist) return;
    
    const album = artist.albums.find(a => a.album === albumName);
    if (!album) return;
    
    queue = [];
    
    album.songs.slice(1).forEach(song => {
      addToQueue({
        ...song,
        artist: artistName,
        album: albumName,
        cover: getAlbumImageUrl(albumName)
      });
    });
    
    if (album.songs.length > 0) {
      playSong({
        ...album.songs[0],
        artist: artistName,
        album: albumName,
        cover: getAlbumImageUrl(albumName)
      });
    }
  }
  
  function createNewPlaylistHomePage() {
    const playlistName = prompt("Enter playlist name:");
    if (!playlistName || !playlistName.trim()) return;
    
    const newPlaylist = {
      id: Date.now().toString(),
      name: playlistName.trim(),
      created: new Date().toISOString(),
      songs: []
    };
    
    playlists.push(newPlaylist);
    saveToLocalStorage(STORAGE_KEYS.PLAYLISTS, playlists);
    
    renderPlaylists();
    
    showNotification(`Playlist "${playlistName}" created`, NOTIFICATION_TYPES.SUCCESS);
  }
  
  function openPlaylist(playlistId) {
    console.log('Open playlist:', playlistId);
  }
  
  function openRecentlyPlayedPage() {
    console.log('Open recently played page');
  }
  
  function openAllAlbumsPage() {
    console.log('Open all albums page');
  }
  
  function openFavoriteArtistsPage() {
    console.log('Open favorite artists page');
  }
  
  function openPlaylistsPage() {
    console.log('Open playlists page');
  }
  
  function openFavoriteSongsPage() {
    console.log('Open favorite songs page');
  }
  
  function saveToLocalStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Error saving to localStorage (${key}):`, error);
      return false;
    }
  }
  
  function loadFromLocalStorage(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error loading from localStorage (${key}):`, error);
      return null;
    }
  }
  
  function renderEmptyState(message, iconType) {
    const icons = {
      'music-note': '<path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>',
      'album': '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>',
      'artist': '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>',
      'playlist': '<path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"/>',
      'heart': '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>',
    };
    
    return `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="empty-icon">
          ${icons[iconType] || icons['music-note']}
        </svg>
        <p>${message}</p>
      </div>
    `;
  }
}

function getCurrentSong() {
  return currentSong;
}

function getIsPlaying() {
  return isPlaying;
}

function getQueue() {
  return queue;
}

function getRecentlyPlayed() {
  return recentlyPlayed;
}

function getFavorites() {
  return favorites;
}

function getFavoriteArtists() {
  return favoriteArtists;
}

function getFavoriteAlbums() {
  return favoriteAlbums;
}

function getDuration() {
  return duration;
}

function toggleFavoriteSong(songId) {
  if (!songId) return false;
  
  if (favorites.has(songId)) {
    favorites.delete(songId);
  } else {
    favorites.add(songId);
  }
  
  try {
    localStorage.setItem(STORAGE_KEYS.FAVORITE_SONGS, JSON.stringify(Array.from(favorites)));
    return true;
  } catch (error) {
    console.error('Error saving favorite songs:', error);
    return false;
  }
}

function initializeTheme() {
  let savedTheme = localStorage.getItem(STORAGE_KEYS.THEME_PREFERENCE);
  if (savedTheme === THEMES.LIGHT) {
    document.documentElement.classList.add(CLASSES.light);
  }
  
  let themeToggle = $byId(IDS.themeToggle);
  if (themeToggle) {
    themeToggle.removeEventListener("click", enhancedThemeToggle);
    themeToggle.addEventListener("click", enhancedThemeToggle);
  }
}

function bindGlobalEvents() {
  document.addEventListener('DOMContentLoaded', () => {
    createPopoverPortal();
    initializeTheme();
  });
}

function resetUIState() {
  let nowPlayingArea = $byId(IDS.nowPlayingArea);
  if (nowPlayingArea) {
    nowPlayingArea.classList.remove(CLASSES.hasSong);
  }
  
  updateDropdownCounts();
  syncGlobalState();
}

function createPopoverPortal() {
  let portal = $byId(IDS.popoverPortal);
  if (!portal) {
    portal = document.createElement('div');
    portal.id = IDS.popoverPortal;
    portal.className = 'popover-portal';
    document.body.appendChild(portal);
  }
  return portal;
}

function syncGlobalState() {
  window.currentSong = currentSong;
  window.isPlaying = isPlaying;
  window.currentTime = audioElement ? audioElement.currentTime : 0;
  window.duration = duration;
  window.queue = queue;
  window.recentlyPlayed = recentlyPlayed;
  window.favorites = favorites;
  window.favoriteArtists = favoriteArtists;
  window.favoriteAlbums = favoriteAlbums;
  window.getAlbumImageUrl = getAlbumImageUrl;
  window.getDefaultAlbumImage = getDefaultAlbumImage;
  window.loadImageWithFallback = loadImageWithFallback;
  window.formatTime = formatTime;
  window.showNotification = showNotification;
  window.playerController = {
    playSong: playSong,
    togglePlayPause: togglePlayPause,
    nextTrack: nextTrack,
    previousTrack: previousTrack,
    addToQueue: addToQueue,
    toggleFavoriteArtist: toggleFavoriteArtist,
    toggleFavoriteAlbum: toggleFavoriteAlbum,
    toggleCurrentSongFavorite: toggleCurrentSongFavorite,
    favorites: favorites,
    favoriteArtists: favoriteArtists,
    favoriteAlbums: favoriteAlbums,
    queue: queue,
    recentlyPlayed: recentlyPlayed,
    currentSong: currentSong,
    isPlaying: isPlaying,
    shuffleMode: shuffleMode,
    repeatMode: repeatMode,
    duration: duration,
    audioElement: audioElement,
    uiController: {
      showNotification: showNotification,
      updateDropdownCounts: updateDropdownCounts,
      enhancedThemeToggle: enhancedThemeToggle
    }
  };
  
  window.navbarModule = {
    openNowPlayingPopup: openMusicPlayer,
    closeNowPlayingPopup: closeMusicPlayer,
    toggleDropdownMenu: toggleDropdownMenu,
    openDropdownMenu: openDropdownMenu,
    closeDropdownMenu: closeDropdownMenu,
    updateDropdownCounts: updateDropdownCounts,
    getNavbarState: () => ({
      playlists: playlists,
      favoriteArtists: favoriteArtists
    }),
    setNavbarState: (state) => {
      if (state.playlists !== undefined) playlists = state.playlists;
      if (state.favoriteArtists !== undefined) favoriteArtists = state.favoriteArtists;
    }
  };
}

function cleanup() {
  if (audioElement) {
    audioElement.pause();
    audioElement.src = '';
    audioElement.removeEventListener('timeupdate', updateProgress);
    audioElement.removeEventListener('ended', handleSongEnd);
    audioElement.removeEventListener('play', onPlay);
    audioElement.removeEventListener('pause', onPause);
  }
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

function getAlbumImageUrlFunction(albumName) {
  return getAlbumImageUrl(albumName);
}

function saveToLocalStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error);
    return false;
  }
}

function loadFromLocalStorage(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Error loading from localStorage (${key}):`, error);
    return null;
  }
}

function exportConstants() {
  return {
    IDS,
    CLASSES,
    ROUTES,
    THEMES,
    STORAGE_KEYS,
    ICONS,
    AUDIO_FORMATS,
    REPEAT_MODES,
    NOTIFICATION_TYPES,
    $,
    $byId
  };
}

function exportFunctions() {
  return {
    initializeMusicApp,
    playSong,
    togglePlayPause,
    nextTrack,
    previousTrack,
    addToQueue,
    shuffleAllSongs,
    toggleCurrentSongFavorite,
    toggleFavoriteArtist,
    toggleFavoriteAlbum,
    getCurrentSong,
    getIsPlaying,
    getQueue,
    getRecentlyPlayed,
    getFavorites,
    getFavoriteArtists,
    getFavoriteAlbums,
    getDuration,
    showNotification,
    formatTime,
    getAlbumImageUrl,
    getArtistImageUrl,
    getDefaultAlbumImage,
    getDefaultArtistImage,
    loadImageWithFallback,
    generatePlaceholderImage,
    getTotalSongs,
    parseDuration,
    createElementFromHTML,
    normalizeNameForUrl,
    normalizeForUrl,
    updatePlayPauseButtons,
    updateNowPlayingInfo,
    updateNavbarInfo,
    updateMusicPlayerContent,
    updateDropdownCounts,
    updateQueueTab,
    updateRecentTab,
    updateNowPlayingButtons,
    openMusicPlayer,
    closeMusicPlayer,
    toggleMusicPlayer,
    switchPopupTab,
    toggleDropdownMenu,
    openDropdownMenu,
    closeDropdownMenu,
    enhancedThemeToggle,
    initializeTheme,
    bindGlobalEvents,
    resetUIState,
    createPopoverPortal,
    syncGlobalState,
    cleanup,
    saveToLocalStorage,
    loadFromLocalStorage,
    exportConstants,
    exportFunctions
  };
}

window.musicAppExports = {
  constants: exportConstants(),
  functions: exportFunctions()
};

window.addEventListener('load', () => {
  initializeMusicApp();
  initializeHomePageManager();
});

document.addEventListener('DOMContentLoaded', () => {
  const app = {
    initialize: initializeMusicApp
  };
  app.initialize();
});