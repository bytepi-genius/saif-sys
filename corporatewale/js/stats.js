/**
 * CorporateWale - Session Statistics Module
 */

(function() {
    'use strict';

    const sessionSongs = document.getElementById('sessionSongs');
    const sessionTime = document.getElementById('sessionTime');
    let songCount = 0;
    let startTime = Date.now();
    let timerInterval = null;

    function updateDisplay() { sessionSongs.textContent = songCount; }

    function updateTime() {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        sessionTime.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    }

    function init() {
        const savedSongs = localStorage.getItem('corporatewale_session_songs');
        if (savedSongs !== null) songCount = parseInt(savedSongs) || 0;
        const savedTime = localStorage.getItem('corporatewale_session_start');
        if (savedTime !== null) startTime = parseInt(savedTime) || Date.now();
        updateDisplay();
        updateTime();
        timerInterval = setInterval(updateTime, 1000);
    }

    function songPlayed() { songCount++;
        localStorage.setItem('corporatewale_session_songs', songCount);
        updateDisplay(); }

    function songStarted() {}

    window.Stats = {
        init: init,
        songPlayed: songPlayed,
        songStarted: songStarted
    };

})();