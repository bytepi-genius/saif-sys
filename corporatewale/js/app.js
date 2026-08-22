/**
 * CorporateWale - Main Application
 */

(function() {
    'use strict';

    const loader = document.getElementById('loader');
    const hamburger = document.getElementById('hamburger');
    const nav = document.getElementById('mainNav');
    const exploreBtn = document.getElementById('exploreBtn');

    function hideLoader() { loader.classList.add('hide'); }

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

   function setupNav() {
    hamburger.addEventListener('click', function() { nav.classList.toggle('open'); });
    
    document.querySelectorAll('.nav-link').forEach(function(link) {
        link.addEventListener('click', function(e) {
            // Allow normal navigation for external links
            if (this.getAttribute('href') && this.getAttribute('href') !== '#') {
                // Let the browser handle the navigation
                return;
            }
            
            e.preventDefault();
            if (this.dataset.section === 'player') {
                document.getElementById('playerSection').scrollIntoView({ behavior: 'smooth' });
            }
            nav.classList.remove('open');
        });
    });
}

    function setupExploreBtn() {
        exploreBtn.addEventListener('click', function() {
            document.getElementById('playerSection').scrollIntoView({ behavior: 'smooth' });
            if (window.Player) {
                const currentSong = window.Player.getCurrentSong();
                if (!currentSong) {
                    window.Player.loadSong(0);
                }
                // ✅ Play the song
                setTimeout(function() {
                    window.Player.togglePlay();
                }, 300);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', init);

})();