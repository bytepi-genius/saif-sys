/**
 * CorporateWale - Player Controls Module
 */

(function() {
    'use strict';

    const minimizeBtn = document.getElementById('minimizeBtn');
    const closePlayerBtn = document.getElementById('closePlayerBtn');
    const miniPlayer = document.getElementById('miniPlayer');
    const miniPlayBtn = document.getElementById('miniPlayBtn');
    const miniCloseBtn = document.getElementById('miniCloseBtn');
    const miniTitle = document.getElementById('miniTitle');
    const miniArtist = document.getElementById('miniArtist');
    const miniProgressFill = document.getElementById('miniProgressFill');

    let isMinimized = false;
    let isClosed = false;

    function saveState() {
        localStorage.setItem('corporatewale_player_state', JSON.stringify({
            isMinimized: isMinimized,
            isClosed: isClosed
        }));
    }

    function restorePlayer() {
        isMinimized = false;
        isClosed = false;
        const pa = document.querySelector('.player-area');
        if (pa) { pa.style.display = 'grid';
            pa.classList.remove('hidden'); }
        miniPlayer.classList.remove('visible');
        miniPlayer.classList.add('hidden');
        minimizeBtn.innerHTML = '<i class="fas fa-minus-circle"></i>';
        closePlayerBtn.innerHTML = '<i class="fas fa-times-circle"></i>';
        saveState();
    }

    function minimizePlayer() {
        isMinimized = true;
        isClosed = false;
        const pa = document.querySelector('.player-area');
        if (pa) { pa.style.display = 'none';
            pa.classList.add('hidden'); }
        miniPlayer.classList.remove('hidden');
        miniPlayer.classList.add('visible');
        minimizeBtn.innerHTML = '<i class="fas fa-expand"></i>';
        closePlayerBtn.innerHTML = '<i class="fas fa-times-circle"></i>';
        saveState();
    }

    function closePlayer() {
        isClosed = true;
        isMinimized = false;
        if (window.Player && window.Player.audio) { window.Player.audio.pause(); }
        const pa = document.querySelector('.player-area');
        if (pa) { pa.style.display = 'none';
            pa.classList.add('hidden'); }
        miniPlayer.classList.remove('visible');
        miniPlayer.classList.add('hidden');
        closePlayerBtn.innerHTML = '<i class="fas fa-play-circle"></i>';
        minimizeBtn.innerHTML = '<i class="fas fa-minus-circle"></i>';
        saveState();
    }

    function updateMiniInfo(song) {
        if (!song) return;
        miniTitle.textContent = song.title || '—';
        miniArtist.textContent = song.artist || '—';
    }

    function updateMiniPlayButton() {
        if (!window.Player || !window.Player.audio) return;
        const isPlaying = !window.Player.audio.paused;
        miniPlayBtn.innerHTML = '<i class="fas ' + (isPlaying ? 'fa-pause' : 'fa-play') + '"></i>';
    }

    function updateMiniProgress() {
        if (!miniProgressFill || !window.Player || !window.Player.audio) return;
        const audio = window.Player.audio;
        if (audio.duration && !isNaN(audio.duration)) {
            const pct = (audio.currentTime / audio.duration) * 100;
            miniProgressFill.style.width = Math.min(pct, 100) + '%';
        }
    }

    // Setup events
    minimizeBtn.addEventListener('click', function() {
        if (isMinimized) { restorePlayer(); } else { minimizePlayer(); }
    });

    closePlayerBtn.addEventListener('click', function() {
        if (isClosed) { restorePlayer(); } else { closePlayer(); }
    });

    miniPlayBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (window.Player) { window.Player.togglePlay(); }
        updateMiniPlayButton();
    });

    miniCloseBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        closePlayer();
    });

    miniPlayer.addEventListener('click', function(e) {
        if (e.target.closest('button')) return;
        if (isMinimized || isClosed) { restorePlayer(); }
    });

    // Restore state
    const saved = localStorage.getItem('corporatewale_player_state');
    if (saved) {
        try {
            const state = JSON.parse(saved);
            if (state.isClosed) { closePlayer(); } else if (state.isMinimized) { minimizePlayer(); }
        } catch (e) {}
    }

    window.PlayerControls = {
        restorePlayer: restorePlayer,
        minimizePlayer: minimizePlayer,
        closePlayer: closePlayer,
        updateMiniInfo: updateMiniInfo,
        updateMiniPlayButton: updateMiniPlayButton,
        updateMiniProgress: updateMiniProgress
    };

})();