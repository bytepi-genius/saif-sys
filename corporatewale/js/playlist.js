/**
 * CorporateWale - Playlist Module
 * Version: 1.0.0
 */

(function() {
    'use strict';

    const playlistContainer = document.getElementById('playlistContainer');
    const playlistCount = document.getElementById('playlistCount');

    let songs = [];
    let activeIndex = 0;

    // ===== SET SONGS =====
    function setSongs(songsData) {
        songs = songsData || [];
    }

    // ===== RENDER PLAYLIST =====
    function render(playlist, activeIdx) {
        const data = playlist || songs;
        activeIndex = activeIdx || activeIndex || 0;

        playlistContainer.innerHTML = '';

        if (!data || data.length === 0) {
            playlistContainer.innerHTML = `
                <div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">
                    <i class="fas fa-music" style="font-size: 1.5rem; display: block; margin-bottom: 0.5rem;"></i>
                    No songs available.
                </div>
            `;
            playlistCount.textContent = '0 songs';
            return;
        }

        playlistCount.textContent = `${data.length} songs`;

        data.forEach((song, idx) => {
            const item = document.createElement('div');
            item.className = `playlist-item ${idx === activeIndex ? 'active' : ''}`;
            item.dataset.index = idx;

            item.innerHTML = `
                <span class="idx">${String(idx + 1).padStart(2, '0')}</span>
                <span class="info">
                    <span class="title">${song.title || 'Untitled'}</span>
                    <span class="artist">${song.artist || 'Unknown'}</span>
                </span>
                ${idx === activeIndex ? '<span class="playing-indicator"><i class="fas fa-volume-up"></i></span>' : ''}
            `;

            item.addEventListener('click', () => {
                if (window.Player) {
                    window.Player.loadSong(idx);
                }
            });

            playlistContainer.appendChild(item);
        });

        // Scroll to active
        const activeItem = playlistContainer.querySelector('.playlist-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }

    // ===== SET ACTIVE INDEX =====
    function setActiveIndex(index) {
        activeIndex = index;
        render(songs, activeIndex);
    }

    // ===== EXPOSE =====
    window.Playlist = {
        setSongs,
        render,
        setActiveIndex
    };

})();