import { CasinoManager } from './CasinoManager.js';

document.addEventListener('DOMContentLoaded', () => {
    const casino = new CasinoManager();
    casino.init();
    
    // Expose for debugging if needed
    window.casino = casino;
});
