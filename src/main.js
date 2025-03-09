import { Game } from './classes/Game.js';

// Wait for DOM to be fully loaded before initializing the game
document.addEventListener('DOMContentLoaded', () => {
    // Set up the start overlay functionality
    const startOverlay = document.getElementById('start-overlay');
    const gameLogo = document.getElementById('game-logo');
    let game;

    // When the logo is clicked, start the game
    startOverlay.addEventListener('click', () => {
        // Fade out the overlay
        startOverlay.style.opacity = '0';
        
        // Initialize the game
        game = new Game();
        
        // Add game to window for debugging
        window.game = game;
        
        // After the fade-out animation completes, hide the overlay completely
        setTimeout(() => {
            startOverlay.classList.add('hidden');
        }, 500);
        
        console.log('Aegis Protocol tower defense game started');
    });
    
    console.log('Aegis Protocol tower defense game initialized - click logo to start');
});