// ==========================================
// QUEUE AND PLAYLIST MANAGEMENT
// ==========================================
import { musicPlayer } from './musicPlayer.js';
import { uiManager } from './uiManager.js';

export const queueManager = {
  // Queue management
  queue: {
    items: [],

    add: function(song, position = null) {
      if (position !== null) {
        this.items.splice(position, 0, song);
      } else {
        this.items.push(song);
      }
      uiManager.queue.updateTab();
      uiManager.dropdown.updateCounts();
      musicPlayer.playback.syncGlobalState();
    },

    shift: function() {
      const song = this.items.shift();
      uiManager.queue.updateTab();
      uiManager.dropdown.updateCounts();
      return song;
    },

    playFromIndex: function(index) {
      if (index >= 0 && index < this.items.length) {
        const song = this.items.splice(index, 1)[0];
        musicPlayer.playback.playSong(song);
      }
    },

    clear: function() {
      this.items = [];
      uiManager.queue.updateTab();
      uiManager.dropdown.updateCounts();
    },

    shuffle: function() {
      for (let i = this.items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
      }
      uiManager.queue.updateTab();
    }
  },

  // Recently played management
  recentlyPlayed: {
    items: [],

    add: function(song) {
      this.items.unshift(song);
      if (this.items.length > 50) {
        this.items = this.items.slice(0, 50);
      }
      uiManager.dropdown.updateCounts();
    },

    shift: function() {
      const song = this.items.shift();
      uiManager.dropdown.updateCounts();
      return song;
    },

    playFromIndex: function(index) {
      if (index >= 0 && index < this.items.length) {
        musicPlayer.playback.playSong(this.items[index]);
      }
    },

    clear: function() {
      this.items = [];
      uiManager.dropdown.updateCounts();
    }
  },

  // Favorites management
  favorites: {
    items: new Set(),

    toggle: function(songId) {
      if (this.items.has(songId)) {
        this.items.delete(songId);
        return false;
      } else {
        this.items.add(songId);
        return true;
      }
    },

    add: function(songId) {
      this.items.add(songId);
      uiManager.dropdown.updateCounts();
    },

    remove: function(songId) {
      this.items.delete(songId);
      uiManager.dropdown.updateCounts();
    },

    has: function(songId) {
      return this.items.has(songId);
    },

    clear: function() {
      this.items.clear();
      uiManager.dropdown.updateCounts();
    },

    toggleCurrent: function() {
      if (!musicPlayer.state.currentSong) return;
      
      const songId = musicPlayer.state.currentSong.id;
      const isFavorite = this.toggle(songId);
      
      uiManager.popup.updateButtons();
      uiManager.dropdown.updateCounts();
      
      return isFavorite;
    }
  },

  // Playlist management
  playlists: {
    items: [],

    create: function(name) {
      const playlist = {
        id: Date.now().toString(),
        name: name.trim(),
        songs: [],
        created: new Date().toISOString(),
      };
      this.items.push(playlist);
      return playlist;
    },

    addSongToPlaylist: function(playlistId, song) {
      const playlist = this.items.find(p => p.id === playlistId);
      if (playlist) {
        playlist.songs.push(song);
        return true;
      }
      return false;
    },

    removeSongFromPlaylist: function(playlistId, songIndex) {
      const playlist = this.items.find(p => p.id === playlistId);
      if (playlist && songIndex >= 0 && songIndex < playlist.songs.length) {
        playlist.songs.splice(songIndex, 1);
        return true;
      }
      return false;
    },

    deletePlaylist: function(playlistId) {
      const index = this.items.findIndex(p => p.id === playlistId);
      if (index !== -1) {
        this.items.splice(index, 1);
        return true;
      }
      return false;
    },

    playPlaylist: function(playlistId) {
      const playlist = this.items.find(p => p.id === playlistId);
      if (playlist && playlist.songs.length > 0) {
        queueManager.queue.clear();
        playlist.songs.slice(1).forEach(song => {
          queueManager.queue.add(song);
        });
        musicPlayer.playback.playSong(playlist.songs[0]);
      }
    }
  },

  // Utility functions
  utilities: {
    shuffleAllSongs: function() {
      if (!window.music || window.music.length === 0) {
        return false;
      }

      const allSongs = [];
      window.music.forEach(artist => {
        artist.albums.forEach(album => {
          album.songs.forEach(song => {
            allSongs.push({
              ...song,
              artist: artist.artist,
              album: album.album,
              cover: musicPlayer.utilities.getAlbumImageUrl(album.album),
            });
          });
        });
      });

      if (allSongs.length === 0) {
        return false;
      }

      // Shuffle array
      for (let i = allSongs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allSongs[i], allSongs[j]] = [allSongs[j], allSongs[i]];
      }

      queueManager.queue.items = allSongs.slice(1);
      musicPlayer.playback.playSong(allSongs[0]);
      musicPlayer.state.shuffleMode = true;
      uiManager.dropdown.updateCounts();
      
      return true;
    },

    playAlbum: function(artist, albumName) {
      const artistData = window.music.find(a => a.artist === artist);
      const album = artistData?.albums.find(al => al.album === albumName);
      
      if (!album || album.songs.length === 0) {
        return false;
      }
      
      queueManager.queue.clear();
      album.songs.slice(1).forEach(song => {
        queueManager.queue.add({ 
          ...song, 
          artist: artist, 
          album: albumName, 
          cover: musicPlayer.utilities.getAlbumImageUrl(albumName) 
        });
      });
      
      if (album.songs.length > 0) {
        musicPlayer.playback.playSong({
          ...album.songs[0],
          artist: artist,
          album: albumName,
          cover: musicPlayer.utilities.getAlbumImageUrl(albumName)
        });
      }
      
      return true;
    },

    playArtist: function(artistName) {
      const artist = window.music.find(a => a.artist === artistName);
      if (!artist || !artist.albums.length) {
        return false;
      }
      
      const allSongs = [];
      artist.albums.forEach(album => {
        album.songs.forEach(song => {
          allSongs.push({
            ...song,
            artist: artist.artist,
            album: album.album,
            cover: musicPlayer.utilities.getAlbumImageUrl(album.album)
          });
        });
      });
      
      if (allSongs.length === 0) {
        return false;
      }
      
      queueManager.queue.items = allSongs.slice(1);
      musicPlayer.playback.playSong(allSongs[0]);
      uiManager.dropdown.updateCounts();
      
      return true;
    }
  }
};