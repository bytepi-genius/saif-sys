/**
 * CorporateWale - Main Application
 */

(function() {
    'use strict';

    const loader = document.getElementById('loader');
    const hamburger = document.getElementById('hamburger');
    const nav = document.getElementById('mainNav');
    const exploreBtn = document.getElementById('exploreBtn');

    function hideLoader() { 
        if (loader) loader.classList.add('hide'); 
    }

    function init() {
        console.log('🚀 CorporateWale initializing...');

        Promise.all([
            fetch('json/audio.json').then(function(r) { return r.json(); }).catch(function() { return { songs: [] }; }),
            fetch('json/background.json').then(function(r) { return r.json(); }).catch(function() { return { backgrounds: [] }; }),
            fetch('json/motivation.json').then(function(r) { return r.json(); }).catch(function() { return { messages: [] }; })
        ]).then(function(data) {
            console.log('✅ All data loaded');

            if (window.Player) window.Player.init(data[0].songs || []);
            if (window.Background) window.Background.init(data[1]);
            if (window.Motivation) window.Motivation.init(data[2]);
            if (window.Stats) window.Stats.init();

            hideLoader();
            setupNav();
            setupExploreBtn();
        }).catch(function(error) {
            console.error('❌ Error:', error);
            hideLoader();
        });

        setTimeout(hideLoader, 5000);
    }

    // ===== NAVIGATION SETUP (FIXED) =====
    function setupNav() {
        // Hamburger menu toggle
        if (hamburger) {
            hamburger.addEventListener('click', function() { 
                nav.classList.toggle('open'); 
            });
        }
        
        // Navigation links
        document.querySelectorAll('.nav-link').forEach(function(link) {
            link.addEventListener('click', function(e) {
                // Check if it's a normal link (has href and not #)
                const href = this.getAttribute('href');
                if (href && href !== '#' && href !== '' && !href.startsWith('#')) {
                    // Let browser handle navigation
                    return;
                }
                
                e.preventDefault();
                if (this.dataset.section === 'player') {
                    const playerSection = document.getElementById('playerSection');
                    if (playerSection) {
                        playerSection.scrollIntoView({ behavior: 'smooth' });
                    }
                }
                if (nav) nav.classList.remove('open');
            });
        });
    }

    // ===== EXPLORE BUTTON =====
    function setupExploreBtn() {
        if (exploreBtn) {
            exploreBtn.addEventListener('click', function() {
                const playerSection = document.getElementById('playerSection');
                if (playerSection) {
                    playerSection.scrollIntoView({ behavior: 'smooth' });
                }
                if (window.Player) {
                    const currentSong = window.Player.getCurrentSong();
                    if (!currentSong) {
                        window.Player.loadSong(0);
                    }
                    setTimeout(function() {
                        window.Player.togglePlay();
                    }, 300);
                }
            });
        }
    }

    document.addEventListener('DOMContentLoaded', init);

})();