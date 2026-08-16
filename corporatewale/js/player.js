/**
 * CorporateWale - Audio Player Module
 * FIXED: Auto-play on Next/Previous
 */

(function() {
    'use strict';

    const audio = new Audio();
    let songs = [];
    let currentIndex = 0;
    let isPlaying = false;
    let volume = 0.8;
    let repeatMode = 0;
    let randomMode = false;
    let isChanging = false;
    let shouldAutoPlay = false; // ✅ NEW: Track if auto-play should happen

    const playBtn = document.getElementById('playBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const stopBtn = document.getElementById('stopBtn');
    const randomBtn = document.getElementById('randomBtn');
    const repeatBtn = document.getElementById('repeatBtn');
    const progressFill = document.getElementById('progressFill');
    const progressBar = document.getElementById('progressBar');
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeIcon = document.getElementById('volumeIcon');
    const nowTitle = document.getElementById('nowTitle');
    const nowArtist = document.getElementById('nowArtist');
    const nowDescription = document.getElementById('nowDescription');
    const waveform = document.getElementById('waveform');
    const miniPlayBtn = document.getElementById('miniPlayBtn');
    const miniTitle = document.getElementById('miniTitle');
    const miniArtist = document.getElementById('miniArtist');
    const miniProgressFill = document.getElementById('miniProgressFill');

    function formatTime(seconds) {
        if (!seconds || isNaN(seconds) || seconds === Infinity) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return mins + ':' + (secs < 10 ? '0' : '') + secs;
    }

    function updatePlayButton() {
        playBtn.innerHTML = '<i class="fas ' + (isPlaying ? 'fa-pause' : 'fa-play') + '"></i>';
        miniPlayBtn.innerHTML = '<i class="fas ' + (isPlaying ? 'fa-pause' : 'fa-play') + '"></i>';
    }

    function updateNowPlaying(song) {
        nowTitle.textContent = song.title || '—';
        nowArtist.textContent = song.artist || '—';
        nowDescription.textContent = song.description || '';
        miniTitle.textContent = song.title || '—';
        miniArtist.textContent = song.artist || '—';
    }

    function updateProgress() {
        if (audio.duration) {
            const pct = (audio.currentTime / audio.duration) * 100;
            progressFill.style.width = pct + '%';
            miniProgressFill.style.width = Math.min(pct, 100) + '%';
            currentTimeEl.textContent = formatTime(audio.currentTime);
        }
    }

    function updateVolumeIcon() {
        if (audio.muted || volume === 0) volumeIcon.className = 'fas fa-volume-mute';
        else if (volume < 0.5) volumeIcon.className = 'fas fa-volume-down';
        else volumeIcon.className = 'fas fa-volume-up';
    }

    function updateRepeatUI() {
        const icons = ['fa-repeat', 'fa-repeat-1', 'fa-repeat'];
        repeatBtn.innerHTML = '<i class="fas ' + icons[repeatMode] + '"></i>';
        repeatBtn.classList.toggle('active-btn', repeatMode !== 0);
    }

    // ===== LOAD SONG (FIXED) =====
    function loadSong(index, autoPlay = false) {
        if (!songs || songs.length === 0 || isChanging) return;
        if (index < 0) index = songs.length - 1;
        if (index >= songs.length) index = 0;
        if (index === currentIndex && audio.src) {
            updateNowPlaying(songs[currentIndex]);
            return;
        }

        isChanging = true;
        currentIndex = index;
        const song = songs[currentIndex];
        if (!song) { isChanging = false; return; }

        // ✅ Store auto-play preference
        shouldAutoPlay = autoPlay;

        // Load new song
        audio.pause();
        audio.currentTime = 0;
        audio.src = song.file;
        audio.load();
        audio.volume = volume;

        updateNowPlaying(song);
        waveform.classList.add('paused');
        updatePlayButton();

        // ✅ Auto-play if needed
        if (shouldAutoPlay) {
            setTimeout(function() {
                audio.play().then(function() {
                    isPlaying = true;
                    updatePlayButton();
                    waveform.classList.remove('paused');
                    console.log('▶️ Auto-playing: ' + songs[currentIndex].title);
                }).catch(function(err) {
                    console.warn('⚠️ Auto-play blocked:', err);
                    // Retry on user click
                    document.addEventListener('click', function playOnClick() {
                        audio.play().catch(function() {});
                        document.removeEventListener('click', playOnClick);
                    }, { once: true });
                });
            }, 400);
        }

        setTimeout(function() { isChanging = false; }, 500);
        console.log('🎵 Loaded: ' + song.title + (shouldAutoPlay ? ' (auto-play)' : ''));
    }

    // ===== TOGGLE PLAY =====
    function togglePlay() {
        if (!audio.src && songs.length > 0) {
            loadSong(0, true);
            return;
        }
        if (!audio.src || !songs.length) return;
        if (isPlaying) {
            audio.pause();
            isPlaying = false;
            updatePlayButton();
            waveform.classList.add('paused');
            shouldAutoPlay = false;
        } else {
            audio.play().then(function() {
                isPlaying = true;
                updatePlayButton();
                waveform.classList.remove('paused');
                shouldAutoPlay = true;
                console.log('▶️ Playing: ' + songs[currentIndex].title);
            }).catch(function(err) {
                console.warn('⚠️ Play blocked:', err);
            });
        }
    }

    // ===== NEXT SONG =====
    function nextSong() {
        if (!songs.length || isChanging) return;
        let idx;
        if (randomMode) {
            let attempts = 0;
            do {
                idx = Math.floor(Math.random() * songs.length);
                attempts++;
            } while (idx === currentIndex && songs.length > 1 && attempts < 10);
        } else {
            idx = currentIndex + 1;
            if (idx >= songs.length) idx = 0;
        }
        // ✅ Pass isPlaying status to auto-play
        loadSong(idx, isPlaying);
    }

    // ===== PREVIOUS SONG =====
    function previousSong() {
        if (!songs.length || isChanging) return;
        let idx;
        if (randomMode) {
            let attempts = 0;
            do {
                idx = Math.floor(Math.random() * songs.length);
                attempts++;
            } while (idx === currentIndex && songs.length > 1 && attempts < 10);
        } else {
            idx = currentIndex - 1;
            if (idx < 0) idx = songs.length - 1;
        }
        // ✅ Pass isPlaying status to auto-play
        loadSong(idx, isPlaying);
    }

    function stopSong() {
        audio.pause();
        audio.currentTime = 0;
        isPlaying = false;
        shouldAutoPlay = false;
        updatePlayButton();
        progressFill.style.width = '0%';
        miniProgressFill.style.width = '0%';
        currentTimeEl.textContent = '0:00';
        waveform.classList.add('paused');
    }

    function getCurrentSong() { return songs[currentIndex] || null; }

    function toggleRandom() {
        randomMode = !randomMode;
        randomBtn.classList.toggle('active-btn', randomMode);
        localStorage.setItem('corporatewale_random', randomMode);
    }

    function toggleRepeat() {
        repeatMode = (repeatMode + 1) % 3;
        localStorage.setItem('corporatewale_repeat', repeatMode);
        updateRepeatUI();
    }

    function restoreState() {
        const sv = localStorage.getItem('corporatewale_volume');
        if (sv !== null) { volume = parseFloat(sv);
            volumeSlider.value = volume * 100;
            audio.volume = volume; }
        const sr = localStorage.getItem('corporatewale_repeat');
        if (sr !== null) { repeatMode = parseInt(sr);
            updateRepeatUI(); }
        const srd = localStorage.getItem('corporatewale_random');
        if (srd !== null) { randomMode = srd === 'true';
            randomBtn.classList.toggle('active-btn', randomMode); }
    }

    function init(songsData) {
        songs = songsData || [];
        restoreState();
        console.log('🎵 Songs loaded: ' + songs.length);

        playBtn.addEventListener('click', togglePlay);
        prevBtn.addEventListener('click', previousSong);
        nextBtn.addEventListener('click', nextSong);
        stopBtn.addEventListener('click', stopSong);
        randomBtn.addEventListener('click', toggleRandom);
        repeatBtn.addEventListener('click', toggleRepeat);
        miniPlayBtn.addEventListener('click', function(e) { e.stopPropagation();
            togglePlay(); });

        volumeSlider.addEventListener('input', function(e) {
            volume = parseFloat(e.target.value) / 100;
            audio.volume = volume;
            localStorage.setItem('corporatewale_volume', volume);
            updateVolumeIcon();
        });
        volumeIcon.addEventListener('click', function() { audio.muted = !audio.muted;
            updateVolumeIcon(); });

        progressBar.addEventListener('click', function(e) {
            const rect = progressBar.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            if (audio.duration) audio.currentTime = pct * audio.duration;
        });

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('loadedmetadata', function() {
            totalTimeEl.textContent = formatTime(audio.duration);
            audio.volume = volume;
        });
        audio.addEventListener('play', function() {
            isPlaying = true;
            updatePlayButton();
            waveform.classList.remove('paused');
        });
        audio.addEventListener('pause', function() {
            isPlaying = false;
            updatePlayButton();
            waveform.classList.add('paused');
        });
        audio.addEventListener('ended', function() {
            if (isChanging) return;
            if (repeatMode === 1) {
                audio.currentTime = 0;
                audio.play().catch(function() {});
            } else {
                setTimeout(function() { nextSong(); }, 500);
            }
        });
        audio.addEventListener('error', function(e) {
            console.warn('⚠️ Audio error:', e);
            if (!isChanging) setTimeout(function() { nextSong(); }, 500);
        });

        document.addEventListener('keydown', function(e) {
            if (e.target.tagName === 'INPUT') return;
            switch (e.key) {
                case ' ':
                case 'Space':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    nextSong();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    previousSong();
                    break;
                case 'r':
                case 'R':
                    toggleRandom();
                    break;
                case 's':
                case 'S':
                    stopSong();
                    break;
                case 'm':
                case 'M':
                    audio.muted = !audio.muted;
                    updateVolumeIcon();
                    break;
            }
        });

        updateVolumeIcon();

        if (songs.length > 0) {
            // ✅ Load first song but DO NOT auto-play
            loadSong(0, false);
            console.log('💡 Click "Start Listening" or Play button to begin');
        }
    }

    window.Player = {
        init: init,
        loadSong: loadSong,
        togglePlay: togglePlay,
        nextSong: nextSong,
        previousSong: previousSong,
        stopSong: stopSong,
        getCurrentSong: getCurrentSong,
        audio: audio
    };

})();