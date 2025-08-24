


import { 
  getArtistImageUrl,
  getTotalSongs,
  getAlbumImageUrl,
  formatTime }
from './global.js';



export const render = {
  // ARTIST TEMPLATES
  artist: function(templateName, data) {
    switch (templateName) {
      case "PopOvers":
        const artistName = data.artist;
        const artistId = data.id || '';
        const artistImage = getArtistImageUrl(artistName);
        const totalAlbums = data.albums?.length || 0;
        const totalSongs = getTotalSongs(data) || 0;

        return `
<div class="similar-artist-card" data-artist-name="${artistName}">
  <div class="similar-artist-image">
    <img 
      src="${artistImage}" 
      alt="${artistName}" 
      class="w-full h-full object-cover artist-avatar"
    />
    <div class="artist-image-overlay"></div>
  </div>
  
  <div class="similar-artist-name">
    ${artistName}
  </div>
  
  <div class="artist-popover">
    <div class="popover-header">
      <div class="popover-artist-name">${artistName}</div>
    </div>
    
    <div class="popover-stats">
      <div class="stat-item">
        <span class="stat-value">${totalAlbums}</span>
        <span class="stat-label">Albums</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${totalSongs}</span>
        <span class="stat-label">Songs</span>
      </div>
    </div>
    
    <div class="popover-footer">
      <button class="popover-button" data-artist-id="${artistId}">
        View Artist
      </button>
    </div>
  </div>
</div>`;
      
      
      case "card":
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
      
      case "header":
        return `
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
                  <button class="play">Play All</button>
                  <button class="follow">Favorite</button>
                </div>
              </div>
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
                    <button class="play">Play All</button>
                    <button class="follow">Favorite</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="content-offset">
            <div class="albums-section">
        
              <div id="albums-container" class="albums-grid"></div>
            </div>
            
            
                        <div class="similar-artists-section">
        
              <div id="similar-artists-container"></div>
            </div>

          </div>
        `;
        
      default:
        console.warn(`Unknown artist template: ${templateName}`);
        return "";
    }
  },
  
  // ALBUM TEMPLATES
  album: function(templateName, data) {
    switch (templateName) {
      case "card":
        return `
          <div class="album-card p-0 rounded-2xl bg-white bg-opacity-5 backdrop-blur-sm border border-white border-opacity-5">
            <div class="albumFade" data-album-id="${data.albumId}">
              <div class="gap-6 items-center md:items-start">
                <div class="album-image relative flex-shrink-0">
                  <img src="${data.cover}" alt="${data.album}" class="album-cover w-full h-full object-cover rounded-md">
                  <button class="play-album absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition transform hover:scale-105">
                    <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
                <div class="flex-1 artistBottom">
                  <h3 class="text-2xl font-bold mb-2">${data.album}</h3>
                  <p class="text-sm opacity-70 mb-4">${data.year || 'Unknown year'} â€¢ ${data.songCount} Tracks</p>
                </div>
              </div>
            </div>
            <div class="songs-container" id="songs-container-${data.albumId}"></div>
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
                  <p class="text-sm opacity-70 mb-4">${data.year || 'Unknown year'} â€¢ ${data.songCount} Tracks</p>
                </div>
              </div>
            </div>
            <div class="songs-container" id="songs-container-${data.albumId}"></div>
          </div>
        `;
        
      case "grid":
        return data.albums.map(album => `
          <div class="album-grid-item" data-album="${album.album}" data-artist="${data.artist}">
            <div class="album-cover-container">
              <img src="${getAlbumImageUrl(album.album)}" alt="${album.album}" class="album-cover">
              <div class="album-actions">
                <button class="play-button">â–¶</button>
              </div>
            </div>
            <div class="album-info">
              <h3>${album.album}</h3>
              <p>${data.artist}</p>
              <span>${album.year || ''}</span>
            </div>
          </div>
        `).join('');
        
      default:
        console.warn(`Unknown album template: ${templateName}`);
        return "";
    }
  },
  
  // SONG/TRACK TEMPLATES
  track: function(templateName, data) {
    switch (templateName) {
      case "row":
        return `
          <div class="song-item group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-5 transition cursor-pointer" data-song='${JSON.stringify(data.songData).replace(/"/g, "&quot;")}'>
            <div class="flex items-center flex-1 min-w-0 gap-4">
              <span class="text-sm opacity-50 w-4 text-center">${data.trackNumber}</span>
              <div class="truncate">
                <p class="text-sm font-medium truncate">${data.title}</p>
                <p class="text-xs opacity-60">${data.duration}</p>
              </div>
            </div>
            <div class="song-toolbar flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button class="p-1.5 rounded-full hover:bg-white hover:bg-opacity-10" data-action="favorite" title="Add to favorites">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.539 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
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
        
      case "nowPlaying":
        return `
          <div class="now-playing-card">
            <div class="album-art">
              <img src="${data.cover}" alt="${data.album}">
            </div>
            <div class="track-info">
              <h3 class="track-title">${data.title}</h3>
              <p class="track-artist">${data.artist}</p>
              <p class="track-album">${data.album}</p>
            </div>
            <div class="progress-container">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${data.progress}%"></div>
              </div>
              <div class="time-display">
                <span class="current-time">${formatTime(data.currentTime)}</span>
                <span class="duration">${formatTime(data.duration)}</span>
              </div>
            </div>
          </div>
        `;
        
      default:
        console.warn(`Unknown track template: ${templateName}`);
        return "";
    }
  },
  
  // PAGE TEMPLATES
  page: function(templateName, data) {
    switch (templateName) {
      case "home":
        return `
          <div class="text-center py-8 md:py-12">
            <h1 class="text-4xl md:text-5xl font-bold mb-6 gradient-text">Discover Amazing Music</h1>
            <p class="text-lg md:text-xl text-gray-400 mb-8 md:mb-12 max-w-2xl mx-auto">Explore artists, albums, and songs from your personal library with an immersive listening experience</p>
          </div>
          <h2 class="text-2xl md:text-3xl font-bold mb-6 md:mb-8 px-4">Featured Artists</h2>
          <div id="featured-artists" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 px-4"></div>
        `;
        
      case "allArtists":
        return `
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
        
      default:
        console.warn(`Unknown page template: ${templateName}`);
        return "";
    }
  },
  
  // UI COMPONENTS TEMPLATES
  ui: function(templateName, data) {
    switch(templateName) {
      case "navigationMenu":
        return `
          <div class="dropdown-section">
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
          </div>
        `;
      
      case "skeletonLoader":
        return `<div class="skeleton w-full h-[${data.height || '400px'}] rounded-lg"></div>`;
        
      case "breadcrumbItem":
        return `
          <li class="breadcrumb-item ${data.active ? 'active' : ''}">
            ${data.url ? 
              `<a href="${data.url}" class="breadcrumb" data-nav="${data.type}" ${Object.entries(data.params || {}).map(([k, v]) => `data-${k}="${v}"`).join(" ")}>
                ${data.icon ? 
                  `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    ${data.icon}
                  </svg>` 
                : ''}
                <h4 class="${data.hideOnMobile ? 'hidden md:inline' : ''}">${data.text}</h4>
              </a>` 
            : 
              `<h4 aria-current="page">${data.text}</h4>`
            }
          </li>
        `;
        
      case "breadcrumbSeparator":
        return `
          <li class="breadcrumb-separator">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </li>
        `;
        
      default:
        console.warn(`Unknown UI template: ${templateName}`);
        return "";
    }
  },
  
  // PLAYLIST TEMPLATES
  playlist: function(templateName, data) {
    switch (templateName) {
      case "card":
        return `
          <div class="playlist-card">
            <div class="playlist-cover">
              <div class="cover-image" style="background-image: url('${data.cover}')"></div>
              <div class="play-button">
                <svg viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
              <div class="track-count">${data.trackCount} tracks</div>
            </div>
            <div class="playlist-info">
              <h3>${data.name}</h3>
              <p>Created by ${data.owner}</p>
            </div>
          </div>
        `;
        
      case "header":
        return `
          <div class="playlist-header">
            <div class="cover-image" style="background-image: url('${data.cover}')"></div>
            <div class="playlist-details">
              <span class="type-label">PLAYLIST</span>
              <h1>${data.name}</h1>
              <p class="description">${data.description}</p>
              <div class="meta">
                <span class="owner">${data.owner}</span>
                <span class="track-count">${data.trackCount} songs</span>
                <span class="duration">${formatDuration(data.totalDuration)}</span>
              </div>
              <div class="actions">
                <button class="play-button">Play</button>
                <button class="follow-button">Favorite</button>
              </div>
            </div>
          </div>
        `;
        
      default:
        console.warn(`Unknown playlist template: ${templateName}`);
        return "";
    }
  },
  
  // QUEUE TEMPLATES
  queue: {
    item: function(song, index, currentSong) {
      return `
        <li data-index="${index}" 
            class="queue-item group relative flex items-center gap-4 px-4 py-3 cursor-pointer transition-all duration-300 ease-in-out 
                  ${currentSong && song.id === currentSong.id ? 'bg-gray-800' : 'hover:bg-gray-700'} rounded-lg"
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
    },
    
    empty: function() {
      return '<li class="text-sm text-gray-400 py-3 px-4">No songs in queue</li>';
    },
    
    recentItem: function(song, index, currentSong) {
      return `
        <li data-index="${index}"
          class="group relative flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors duration-300 ease-in-out 
                ${currentSong && song.id === currentSong.id ? 'bg-gray-800' : 'hover:bg-gray-700'} rounded-lg">

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
    }
  },
  
  // NOTIFICATION TEMPLATES
  notification: function(type, message, undoable) {
    const icons = {
      info: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12zm-1-5a1 1 0 011-1h1V8h-1a1 1 0 110-2h2a1 1 0 011 1v3a1 1 0 01-1 1h-1v1h1a1 1 0 110 2h-2a1 1 0 01-1-1v-3z"/></svg>',
      error: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12zm-1-5a1 1 0 011-1h1V8h-1a1 1 0 110-2h2a1 1 0 011 1v3a1 1 0 01-1 1h-1v1h1a1 1 0 110 2h-2a1 1 0 01-1-1v-3z"/></svg>',
      success: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm3.707 5.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>'
    };
    
    return `
      <div class="notification ${type}">
        <div class="notification-icon">
          ${icons[type] || icons.info}
        </div>
        <div class="notification-message">
          ${message}
        </div>
        ${undoable ? `
          <button class="notification-undo">
            Undo
          </button>
        ` : ''}
        <button class="notification-close">
          &times;
        </button>
      </div>
    `;
  },
  
  // SEARCH TEMPLATES
  search: {
    resultItem: (item) => {
      const icon = {
        artist: '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 12.094A5.973 5.973 0 004 15v1H1v-1a3 3 0 013.75-2.906z"/></svg>',
        album: '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/></svg>',
        song: '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z"/></svg>'
      };
      
      return `
        <div class="search-result-item" data-type="${item.type}" data-id="${item.id}">
          <div class="result-icon">
            ${icon[item.type] || icon.song}
          </div>
          <div class="result-info">
            <h4>${item.title}</h4>
            <p>${item.subtitle}</p>
          </div>
          <div class="result-meta">
            ${item.meta || ''}
          </div>
        </div>
      `;
    },
    
    dialog: function() {
      return `
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
    },
    
    recentSearchItem: function(query) {
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
    }
  },
  
  // Helper methods
  artistPopover: function(data) {
    return `
      <div class="artist-popover">
        <div class="popover-header">
          <div class="popover-artist-name">${data.artist}</div>
        </div>
        <div class="popover-stats">
          <div class="stat-item">
            <span class="stat-value">${data.albums?.length || 0}</span>
            <span class="stat-label">Albums</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${getTotalSongs(data) || 0}</span>
            <span class="stat-label">Songs</span>
          </div>
        </div>
        <div class="popover-footer">
          <button class="popover-button" data-artist-id="${data.id}">
            View Artist
          </button>
        </div>
      </div>
    `;
  }
};
export const dropdown = {
  // Dropdown menu template
  menu: function() {
    return `
      <!-- Dropdown Menu -->
      <div class="dropdown-menu" id="dropdown-menu">
        <div class="dropdown-header">
          <h3 class="dropdown-title">Music Library</h3>
          <button class="dropdown-close" id="dropdown-close">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <div class="dropdown-section">
          <h4 class="section-title">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
            </svg>
            Favorites
          </h4>

          <div class="dropdown-item" id="favorite-songs">
            <div class="dropdown-item-icon">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="dropdown-item-content">
              <div class="dropdown-item-title">Favorite Songs</div>
              <div class="dropdown-item-subtitle">Your liked tracks</div>
            </div>
            <div class="dropdown-item-badge" id="favorite-songs-count">0</div>
          </div>

          <div class="dropdown-item" id="favorite-artists">
            <div class="dropdown-item-icon">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12a3 3 0 00-3-3H2a1 1 0 100 2h4a1 1 0 011 1v.5a1 1 0 102 0V12zm3-8a3 3 0 100 6 3 3 0 000-6zm-1 4a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </div>
            <div class="dropdown-item-content">
              <div class="dropdown-item-title">Favorite Artists</div>
              <div class="dropdown-item-subtitle">Artists you follow</div>
            </div>
            <div class="dropdown-item-badge" id="favorite-artists-count">0</div>
          </div>
        </div>

        <div class="dropdown-section">
          <h4 class="section-title">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
            Library
          </h4>

          <div class="dropdown-item" id="recently-played">
            <div class="dropdown-item-icon">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="dropdown-item-content">
              <div class="dropdown-item-title">Recent Plays</div>
              <div class="dropdown-item-subtitle">Recently played songs</div>
            </div>
            <div class="dropdown-item-badge" id="recent-count">0</div>
          </div>

          <div class="dropdown-item" id="queue-view">
            <div class="dropdown-item-icon">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
              </svg>
            </div>
            <div class="dropdown-item-content">
              <div class="dropdown-item-title">Up Next</div>
              <div class="dropdown-item-subtitle">Songs in queue</div>
            </div>
            <div class="dropdown-item-badge" id="queue-count">0</div>
          </div>
        </div>

        <div class="dropdown-section">
          <h4 class="section-title">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
            Playlists
          </h4>

          <div class="dropdown-item" id="create-playlist">
            <div class="dropdown-item-icon">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="dropdown-item-content">
              <div class="dropdown-item-title">Create Playlist</div>
              <div class="dropdown-item-subtitle">Make a new playlist</div>
            </div>
          </div>

          <div id="playlists-list">
            <div class="empty-state" id="playlists-empty">
              <div class="empty-state-icon">
                <svg class="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
              <div class="empty-state-text">
                No playlists yet.<br />
                Create your first playlist!
              </div>
            </div>
          </div>
        </div>

        <div class="dropdown-section">
          <h4 class="section-title">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
            </svg>
            Actions
          </h4>

          <div class="dropdown-item" id="shuffle-all">
            <div class="dropdown-item-icon">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="dropdown-item-content">
              <div class="dropdown-item-title">Shuffle All</div>
              <div class="dropdown-item-subtitle">Play all songs randomly</div>
            </div>
          </div>
        </div>

        <div class="dropdown-section">
          <h4 class="section-title">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
            </svg>
            Settings
          </h4>

          <div class="dropdown-item" id="app-settings">
            <div class="dropdown-item-icon">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="dropdown-item-content">
              <div class="dropdown-item-title">Preferences</div>
              <div class="dropdown-item-subtitle">App settings & options</div>
            </div>
          </div>

          <div class="dropdown-item" id="about-app">
            <div class="dropdown-item-icon">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="dropdown-item-content">
              <div class="dropdown-item-title">About</div>
              <div class="dropdown-item-subtitle">Version & information</div>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  
  // Function to inject dropdown into the DOM
  inject: function(containerId = 'dropdown-container') {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container with ID '${containerId}' not found`);
      return false;
    }
    
    container.innerHTML = this.menu();
    this.attachEventListeners();
    return true;
  },
  
  // Function to attach event listeners
  attachEventListeners: function() {
    // Close button
    const closeBtn = document.getElementById('dropdown-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hide();
      });
    }
    
    // Add click handlers for menu items
    const menuItems = document.querySelectorAll('.dropdown-item');
    menuItems.forEach(item => {
      item.addEventListener('click', function() {
        console.log('Menu item clicked:', this.id);
        // You can add specific functionality for each menu item here
      });
    });
  },
  
  // Function to show dropdown
  show: function() {
    const dropdown = document.getElementById('dropdown-menu');
    if (dropdown) {
      dropdown.style.display = 'block';
    }
  },
  
  // Function to hide dropdown
  hide: function() {
    const dropdown = document.getElementById('dropdown-menu');
    if (dropdown) {
      dropdown.style.display = 'none';
    }
  },
  
  // Function to toggle dropdown visibility
  toggle: function() {
    const dropdown = document.getElementById('dropdown-menu');
    if (dropdown) {
      if (dropdown.style.display === 'none') {
        this.show();
      } else {
        this.hide();
      }
    }
  }
};

export function create(htmlString) {
  const div = document.createElement('div');
  div.innerHTML = htmlString.trim();
  return div.firstChild;
}

function formatDuration(seconds) {
  if (isNaN(seconds) || seconds === null) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  const remainingSecs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${remainingMins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  } else {
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  }
}
