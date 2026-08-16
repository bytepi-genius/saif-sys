/**
 * CorporateWale - Background Play Module
 */

(function() {
    'use strict';

    function init() {
        setupVisibilityAPI();
        setupPageLifecycle();
        setupAudioFocus();
        console.log('🎵 Background Play initialized');
    }

    function setupVisibilityAPI() {
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                updateUIOnReturn();
            }
        });
    }

    function setupPageLifecycle() {
        document.addEventListener('resume', function() {
            updateUIOnReturn();
        });
    }

    function setupAudioFocus() {
        if (navigator.mediaSession) {
            navigator.mediaSession.setActionHandler('play', function() {
                if (window.Player) window.Player.togglePlay();
            });
            navigator.mediaSession.setActionHandler('pause', function() {
                if (window.Player) window.Player.togglePlay();
            });
            navigator.mediaSession.setActionHandler('previoustrack', function() {
                if (window.Player) window.Player.previousSong();
            });
            navigator.mediaSession.setActionHandler('nexttrack', function() {
                if (window.Player) window.Player.nextSong();
            });
            console.log('📱 Media Session API initialized');
        }
    }

    function updateUIOnReturn() {
        const waveform = document.getElementById('waveform');
        if (waveform && window.Player && window.Player.audio) {
            if (!window.Player.audio.paused) {
                waveform.classList.remove('paused');
            } else {
                waveform.classList.add('paused');
            }
        }

        if (window.PlayerControls) {
            window.PlayerControls.updateMiniPlayButton();
            window.PlayerControls.updateMiniProgress();
        }
    }

    window.BackgroundPlay = {
        init: init,
        updateUIOnReturn: updateUIOnReturn
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();