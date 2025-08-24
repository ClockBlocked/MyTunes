




import { eventBus } from './eventBus.js';
import { render } from './blocks.js';

export const uiManager = {
  state: {
    currentTab: "now-playing",
    isPopupVisible: false,
    inactivityTimer: null,
    favoriteArtists: new Set(),
    queue: [],
    recentlyPlayed: [],
    favorites: new Set(),
    playlists: [],
    initialized: false
  },

  initialize: function() {
    if (this.state.initialized) return;
    
    console.log("Initializing UI manager...");
    this.setupEventListeners();
    
    // FIXED: Bind DOM events immediately if DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.bindAllEvents());
    } else {
      // DOM is already ready, bind immediately
      setTimeout(() => this.bindAllEvents(), 100);
    }
    
    this.state.initialized = true;
    eventBus.emit('uiManagerInitialized');
  },



  setupEventListeners: function() {
    eventBus.on('currentSongChanged', (song) => this.updateCurrentSong(song));
    eventBus.on('playStateChanged', (isPlaying) => this.updatePlayState(isPlaying));
    eventBus.on('shuffleModeChanged', (shuffleMode) => this.updateShuffleButton(shuffleMode));
    eventBus.on('repeatModeChanged', (repeatMode) => this.updateRepeatButton(repeatMode));
    eventBus.on('queueUpdated', (queue) => this.updateQueue(queue));
    eventBus.on('recentlyPlayedUpdated', (recent) => this.updateRecentlyPlayed(recent));
    eventBus.on('favoritesUpdated', (favorites) => this.updateFavorites(favorites));
  },
  clearExistingListeners: function() {
    // Clone and replace elements to remove existing listeners
    const elementsToClone = [
      'menu-trigger',
      'now-playing-area', 
      'play-pause-navbar',
      'prev-btn-navbar',
      'next-btn-navbar'
    ];

    elementsToClone.forEach(id => {
      const element = document.getElementById(id);
      if (element && element.parentNode) {
        const newElement = element.cloneNode(true);
        element.parentNode.replaceChild(newElement, element);
      }
    });
  },

  bindAllEvents: function() {
    console.log("🔗 Binding UI events...");
    
    // FIXED: Clear any existing listeners first
    this.clearExistingListeners();
    
    this.bindMenuEvents();
    this.bindPlayerEvents();
    this.bindPopupEvents();
    this.bindKeyboardEvents();
    
    console.log("✅ All UI events bound successfully");
  },
  bindDOMEvents: function() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.bindAllEvents());
    } else {
      this.bindAllEvents();
    }
  },
  bindKeyboardEvents: function() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          eventBus.emit('playPauseRequested');
          break;
        case 'ArrowLeft':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            eventBus.emit('previousTrackRequested');
          }
          break;
        case 'ArrowRight':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            eventBus.emit('nextTrackRequested');
          }
          break;
        case 'Escape':
          this.closeMusicPlayer();
          this.closeDropdownMenu();
          break;
      }
    });
  },
  bindMenuEvents: function() {
    // FIXED: Menu trigger with proper logging
    const menuTrigger = document.getElementById('menu-trigger');
    if (menuTrigger) {
      menuTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("🔧 Menu trigger clicked!");
        this.toggleDropdownMenu();
      });
      console.log("✅ Menu trigger bound");
    } else {
      console.log("❌ Menu trigger not found");
    }

    // Menu close
    const dropdownClose = document.getElementById('dropdown-close');
    if (dropdownClose) {
      dropdownClose.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("🔧 Dropdown close clicked!");
        this.closeDropdownMenu();
      });
    }

    // FIXED: Menu items with proper event handling
    const menuItems = {
      'favorite-songs': () => this.openFavoriteSongs(),
      'favorite-artists': () => this.openFavoriteArtists(),
      'create-playlist': () => this.createNewPlaylist(),
      'recently-played': () => {
        this.openMusicPlayer();
        setTimeout(() => this.switchPopupTab('recent'), 50);
      },
      'queue-view': () => {
        this.openMusicPlayer();
        setTimeout(() => this.switchPopupTab('queue'), 50);
      },
      'shuffle-all': () => this.shuffleAllSongs(),
      'app-settings': () => this.openSettings(),
      'about-app': () => this.showAbout()
    };

    Object.entries(menuItems).forEach(([id, handler]) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log(`🔧 Menu item clicked: ${id}`);
          handler();
          this.closeDropdownMenu();
        });
        console.log(`✅ Menu item bound: ${id}`);
      } else {
        console.log(`❌ Menu item not found: ${id}`);
      }
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
      const dropdownMenu = document.getElementById('dropdown-menu');
      const menuTrigger = document.getElementById('menu-trigger');
      
      if (dropdownMenu && menuTrigger && 
          !dropdownMenu.contains(e.target) && 
          !menuTrigger.contains(e.target)) {
        this.closeDropdownMenu();
      }
    });
  },
  bindPlayerEvents: function() {
    // FIXED: Now playing area with proper logging
    const nowPlayingArea = document.getElementById('now-playing-area');
    if (nowPlayingArea) {
      nowPlayingArea.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("🔧 Now playing area clicked!");
        this.toggleMusicPlayer();
      });
      console.log("✅ Now playing area bound");
    } else {
      console.log("❌ Now playing area not found");
    }

    // Navbar controls
    const playPauseBtn = document.getElementById('play-pause-navbar');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log("🔧 Navbar play/pause clicked!");
        eventBus.emit('playPauseRequested');
      });
      console.log("✅ Navbar play/pause bound");
    }

    const prevBtn = document.getElementById('prev-btn-navbar');
    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log("🔧 Navbar previous clicked!");
        eventBus.emit('previousTrackRequested');
      });
    }

    const nextBtn = document.getElementById('next-btn-navbar');
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log("🔧 Navbar next clicked!");
        eventBus.emit('nextTrackRequested');
      });
    }
  },
  bindPopupEvents: function() {
    // Close button
    const closePlayer = document.getElementById('closePlayer');
    if (closePlayer) {
      closePlayer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("🔧 Close player clicked!");
        this.closeMusicPlayer();
      });
    }

    // Popup tabs
    document.querySelectorAll('.popup-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`🔧 Tab clicked: ${tab.dataset.tab}`);
        this.switchPopupTab(tab.dataset.tab);
      });
    });

    // FIXED: Popup controls with retry mechanism for dynamic content
    setTimeout(() => {
      this.bindPopupControls();
    }, 500);
  },
  bindPopupControls: function() {
    const popupControls = {
      'popup-close': () => this.closeMusicPlayer(),
      'popup-play-pause-btn': () => eventBus.emit('playPauseRequested'),
      'popup-prev-btn': () => eventBus.emit('previousTrackRequested'),
      'popup-next-btn': () => eventBus.emit('nextTrackRequested'),
      'popup-shuffle-btn': () => eventBus.emit('shuffleToggleRequested'),
      'popup-repeat-btn': () => eventBus.emit('repeatToggleRequested'),
      'popup-favorite-btn': () => this.toggleCurrentSongFavorite()
    };

    Object.entries(popupControls).forEach(([id, handler]) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log(`🔧 Popup control clicked: ${id}`);
          handler();
        });
        console.log(`✅ Popup control bound: ${id}`);
      } else {
        console.log(`⚠️ Popup control not found: ${id} (may load later)`);
      }
    });

    // Progress bar
    const progressBar = document.getElementById('popup-progress-bar');
    if (progressBar) {
      progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        eventBus.emit('progressBarClicked', percent);
      });
    }
  },

  toggleDropdownMenu: function() {
    console.log("📋 Toggle dropdown menu");
    const dropdownMenu = document.getElementById('dropdown-menu');
    const menuTrigger = document.getElementById('menu-trigger');
    
    if (dropdownMenu && menuTrigger) {
      const isVisible = dropdownMenu.classList.contains('show');
      console.log(`Dropdown currently ${isVisible ? 'open' : 'closed'}`);
      
      if (isVisible) {
        this.closeDropdownMenu();
      } else {
        this.openDropdownMenu();
      }
    } else {
      console.log("❌ Dropdown elements not found");
    }
  },
  openDropdownMenu: function() {
    const dropdownMenu = document.getElementById('dropdown-menu');
    const menuTrigger = document.getElementById('menu-trigger');
    
    if (dropdownMenu && menuTrigger) {
      this.updateDropdownCounts();
      dropdownMenu.classList.add('show');
      menuTrigger.classList.add('active');
      this.closeMusicPlayer();
      console.log("✅ Dropdown opened");
    }
  },
  closeDropdownMenu: function() {
    const dropdownMenu = document.getElementById('dropdown-menu');
    const menuTrigger = document.getElementById('menu-trigger');
    
    if (dropdownMenu && menuTrigger) {
      dropdownMenu.classList.remove('show');
      menuTrigger.classList.remove('active');
      console.log("✅ Dropdown closed");
    }
  },

  toggleMusicPlayer: function() {
    console.log("🎶 Toggle music player");
    const musicPlayer = document.querySelector('.musicPlayer');
    
    if (musicPlayer) {
      const isVisible = musicPlayer.classList.contains('show');
      console.log(`Music player currently ${isVisible ? 'open' : 'closed'}`);
      
      if (isVisible) {
        this.closeMusicPlayer();
      } else {
        this.openMusicPlayer();
      }
    } else {
      console.log("❌ Music player not found");
    }
  },
  openMusicPlayer: function() {
    const musicPlayer = document.querySelector('.musicPlayer');
    if (musicPlayer) {
      musicPlayer.classList.add('show');
      this.state.isPopupVisible = true;
      this.updatePopupContent();
      console.log("✅ Music player opened");
    }
  },
  closeMusicPlayer: function() {
    const musicPlayer = document.querySelector('.musicPlayer');
    if (musicPlayer) {
      musicPlayer.classList.remove('show');
      this.state.isPopupVisible = false;
      console.log("✅ Music player closed");
    }
  },

  updateDropdownCounts: function() {
    const counts = {
      'favorite-songs-count': this.state.favorites.size,
      'favorite-artists-count': this.state.favoriteArtists.size,
      'recent-count': this.state.recentlyPlayed.length,
      'queue-count': this.state.queue.length
    };

    Object.entries(counts).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });
  },
  updatePopupContent: function() {
    // Update popup with current song info
    eventBus.emit('updatePopupRequested');
  },
  updateQueueTab: function() {
    const queueList = document.getElementById('queue-list');
    if (!queueList) return;

    if (this.state.queue.length === 0) {
      queueList.innerHTML = '<li class="text-sm text-gray-400 py-3 px-4">No songs in queue</li>';
      return;
    }

    queueList.innerHTML = this.state.queue.map((song, index) => 
      this.createQueueItem(song, index)
    ).join('');

    queueList.querySelectorAll('li[data-index]').forEach((item, index) => {
      item.addEventListener('click', () => {
        eventBus.emit('playFromQueue', index);
      });
    });
  },
  updateRecentTab: function() {
    const recentList = document.getElementById('recent-list');
    if (!recentList) return;

    if (this.state.recentlyPlayed.length === 0) {
      recentList.innerHTML = '<li class="text-sm text-gray-400 py-3 px-4">No recently played songs</li>';
      return;
    }

    recentList.innerHTML = this.state.recentlyPlayed.map((song, index) => 
      this.createRecentItem(song, index)
    ).join('');

    recentList.querySelectorAll('li[data-index]').forEach((item, index) => {
      item.addEventListener('click', () => {
        eventBus.emit('playFromRecent', index);
      });
    });
  },

  createQueueItem: function(song, index) {
    return `
      <li data-index="${index}" 
        class="queue-item group relative flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-700 rounded-lg">
        <div class="relative w-12 h-12 shrink-0">
          <img src="${song.cover || window.getAlbumImageUrl(song.album)}" alt="${song.title}"
               class="w-full h-full object-cover rounded-md" />
        </div>
        <div class="flex flex-col overflow-hidden">
          <span class="text-sm font-bold text-white truncate">${song.title}</span>
          <span class="text-xs font-light text-gray-300 truncate">${song.artist}</span>
        </div>
        <div class="ml-auto text-xs text-gray-400">${song.duration || '0:00'}</div>
      </li>
    `;
  },
  createRecentItem: function(song, index) {
    return `
      <li data-index="${index}"
        class="group relative flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-700 rounded-lg">
        <div class="relative w-12 h-12 shrink-0">
          <img src="${song.cover || window.getAlbumImageUrl(song.album)}" alt="${song.title}"
               class="w-full h-full object-cover rounded-md" />
        </div>
        <div class="flex flex-col overflow-hidden">
          <span class="text-sm font-bold text-white truncate">${song.title}</span>
          <span class="text-xs font-light text-gray-300 truncate">${song.artist}</span>
        </div>
        <div class="ml-auto text-xs text-gray-400">${song.duration || '0:00'}</div>
      </li>
    `;
  },

  switchPopupTab: function(tabName) {
    this.state.currentTab = tabName;
    
    document.querySelectorAll('.popup-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    document.querySelectorAll('.popup-tab-content').forEach(content => {
      const shouldShow = content.dataset.tab === tabName;
      content.style.display = shouldShow ? 'block' : 'none';
    });
    
    if (tabName === 'queue') {
      this.updateQueueTab();
    } else if (tabName === 'recent') {
      this.updateRecentTab();
    }
  },
  updateCurrentSong: function(song) {
    this.updateNavbarInfo(song);
    this.updatePopupInfo(song);
  },
  updateNavbarInfo: function(song) {
    const navbarSongTitle = document.getElementById('navbar-song-title');
    const navbarArtist = document.getElementById('navbar-artist');
    const navbarAlbumCover = document.getElementById('navbar-album-cover');
    const nowPlayingArea = document.getElementById('now-playing-area');

    if (navbarSongTitle) navbarSongTitle.textContent = song.title;
    if (navbarArtist) navbarArtist.textContent = song.artist;
    if (navbarAlbumCover) {
      navbarAlbumCover.src = song.cover || window.getAlbumImageUrl(song.album);
    }
    if (nowPlayingArea) nowPlayingArea.classList.add('has-song');

    // Show album cover, hide logo
    const navbarLogo = document.getElementById('navbar-logo');
    if (navbarLogo) navbarLogo.classList.add('hidden');
    if (navbarAlbumCover) navbarAlbumCover.classList.remove('hidden');
  },
  updatePopupInfo: function(song) {
    const popupSongTitle = document.getElementById('popup-song-title');
    const popupArtistName = document.getElementById('popup-artist-name');
    const popupAlbumName = document.getElementById('popup-album-name');
    const popupAlbumCover = document.getElementById('popup-album-cover');

    if (popupSongTitle) popupSongTitle.textContent = song.title;
    if (popupArtistName) popupArtistName.textContent = song.artist;
    if (popupAlbumName) popupAlbumName.textContent = song.album;
    if (popupAlbumCover) {
      popupAlbumCover.src = song.cover || window.getAlbumImageUrl(song.album);
    }
  },
  updatePlayState: function(isPlaying) {
    // Update play/pause buttons
    const playButtons = document.querySelectorAll('.play-button, .play-btn, #popup-play-icon');
    const pauseButtons = document.querySelectorAll('.pause-button, .pause-btn, #popup-pause-icon');
    
    playButtons.forEach(btn => {
      if (btn.style !== undefined) {
        btn.style.display = isPlaying ? 'none' : 'block';
      }
      btn.classList.toggle('hidden', isPlaying);
    });
    
    pauseButtons.forEach(btn => {
      if (btn.style !== undefined) {
        btn.style.display = isPlaying ? 'block' : 'none';
      }
      btn.classList.toggle('hidden', !isPlaying);
    });

    // Update play indicator
    const playIndicator = document.getElementById('play-indicator');
    if (playIndicator) {
      playIndicator.classList.toggle('active', isPlaying);
    }
  },
  updateShuffleButton: function(shuffleMode) {
    const shuffleBtn = document.getElementById('popup-shuffle-btn');
    if (shuffleBtn) {
      shuffleBtn.classList.toggle('active', shuffleMode);
    }
  },
  updateRepeatButton: function(repeatMode) {
    const repeatBtn = document.getElementById('popup-repeat-btn');
    if (repeatBtn) {
      repeatBtn.classList.toggle('active', repeatMode !== 'off');
      if (repeatMode === 'one') {
        repeatBtn.classList.add('repeat-one');
      } else {
        repeatBtn.classList.remove('repeat-one');
      }
    }
  },
  updateQueue: function(queue) {
    this.state.queue = queue;
    this.updateDropdownCounts();
    if (this.state.currentTab === 'queue') {
      this.updateQueueTab();
    }
  },
  updateRecentlyPlayed: function(recent) {
    this.state.recentlyPlayed = recent;
    this.updateDropdownCounts();
    if (this.state.currentTab === 'recent') {
      this.updateRecentTab();
    }
  },
  updateFavorites: function(favorites) {
    this.state.favorites = favorites;
    this.updateDropdownCounts();
  },

  openFavoriteSongs: function() {
    console.log('Opening favorite songs...');
    if (this.state.favorites.size === 0) {
      eventBus.emit('showNotification', 'No favorite songs yet', 'info');
      return;
    }
    // Implementation for favorites view
  },
  openFavoriteArtists: function() {
    console.log('Opening favorite artists...');
    if (this.state.favoriteArtists.size === 0) {
      eventBus.emit('showNotification', 'No favorite artists yet', 'info');
      return;
    }
    // Implementation for favorite artists view
  },
  createNewPlaylist: function() {
    const playlistName = prompt("Enter playlist name:");
    if (playlistName && playlistName.trim()) {
      const playlist = {
        id: Date.now().toString(),
        name: playlistName.trim(),
        songs: [],
        created: new Date().toISOString()
      };
      this.state.playlists.push(playlist);
      eventBus.emit('showNotification', `Created playlist: ${playlist.name}`, 'success');
    }
  },
  shuffleAllSongs: function() {
    console.log('Shuffling all songs...');
    if (!window.music || window.music.length === 0) {
      eventBus.emit('showNotification', 'No music library found', 'warning');
      return;
    }

    const allSongs = [];
    window.music.forEach(artist => {
      artist.albums.forEach(album => {
        album.songs.forEach(song => {
          allSongs.push({
            ...song,
            artist: artist.artist,
            album: album.album,
            cover: window.getAlbumImageUrl(album.album)
          });
        });
      });
    });

    if (allSongs.length === 0) {
      eventBus.emit('showNotification', 'No songs found', 'warning');
      return;
    }

    // Shuffle array
    for (let i = allSongs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allSongs[i], allSongs[j]] = [allSongs[j], allSongs[i]];
    }

    this.state.queue = allSongs.slice(1);
    eventBus.emit('queueUpdated', this.state.queue);
    eventBus.emit('playSongRequested', allSongs[0]);
    eventBus.emit('showNotification', 'Shuffling all songs!', 'success');
  },
  openSettings: function() {
    console.log('Opening settings...');
    eventBus.emit('showNotification', 'Settings coming soon!', 'info');
  },
  showAbout: function() {
    console.log('Showing about...');
    eventBus.emit('showNotification', 'MyTunes Music Player v1.0', 'info');
  },
  toggleCurrentSongFavorite: function() {
    eventBus.emit('toggleCurrentSongFavorite');
  }
};