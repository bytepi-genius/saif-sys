/**
 * CorporateWale - Background Theme Module
 */

(function() {
    'use strict';

    const body = document.body;
    const bgToggleBtn = document.getElementById('bgToggleBtn');
    let backgrounds = [];
    let currentIndex = 0;

    function applyBackground(index) {
        if (!backgrounds || backgrounds.length === 0) return;
        const theme = backgrounds[index];
        if (!theme) return;
        body.style.backgroundImage = "url('" + theme.image + "')";
        body.style.backgroundSize = 'cover';
        body.style.backgroundPosition = 'center';
        body.style.backgroundRepeat = 'no-repeat';
        body.style.backgroundAttachment = 'fixed';
        body.style.backgroundColor = '#0b0e1a';
        console.log('🎨 Applied: ' + theme.name);
    }

    function init(data) {
        if (data && data.backgrounds && data.backgrounds.length > 0) {
            backgrounds = data.backgrounds;
            console.log('✅ Loaded ' + backgrounds.length + ' backgrounds');
        } else {
            console.warn('⚠️ No backgrounds found');
            return;
        }
        const saved = localStorage.getItem('corporatewale_background_index');
        if (saved !== null) {
            currentIndex = parseInt(saved);
            if (currentIndex >= backgrounds.length) currentIndex = 0;
        }
        applyBackground(currentIndex);
        bgToggleBtn.addEventListener('click', function() {
            currentIndex = (currentIndex + 1) % backgrounds.length;
            applyBackground(currentIndex);
            localStorage.setItem('corporatewale_background_index', currentIndex);
            const theme = backgrounds[currentIndex];
            this.innerHTML = '<i class="fas fa-check"></i> ' + theme.name;
            setTimeout(function() {
                bgToggleBtn.innerHTML = '<i class="fas fa-palette"></i> Change Background';
            }, 1200);
        });
    }

    window.Background = { init: init };

})();