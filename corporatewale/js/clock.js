/**
 * CorporateWale - Clock Module
 */

(function() {
    'use strict';

    const clockDisplay = document.getElementById('clockDisplay');

    function updateClock() {
        const now = new Date();
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        const dateStr = now.toLocaleDateString('en-US', options);
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        clockDisplay.textContent = dateStr + ', ' + timeStr;
    }

    updateClock();
    setInterval(updateClock, 1000);

})();