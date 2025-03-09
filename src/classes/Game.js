import { Enemy } from './Enemy.js';
import { Tower } from './Tower.js';
import { Base } from './Base.js';

/**
 * Main game controller for the tower defense game
 */
export class Game {
    constructor() {
        // Core game state
        this.credits = 100;
        this.wave = 1;
        this.lives = 10;
        this.gameBoard = document.getElementById('game-board');
        this.boardWidth = this.gameBoard.clientWidth;
        this.boardHeight = this.gameBoard.clientHeight;
        this.isRunning = false;
        this.isPaused = false;
        this.isWaveActive = false;
        this.enemies = [];
        this.towers = [];
        this.selectedTower = null;
        this.gameSpeed = 1;
        this.lastFrameTime = 0;
        
        // Tower placement state
        this.isPlacingTower = false;
        this.placingTowerType = null;
        this.towerGhost = null;
        this.placementValid = false;
        
        // Game path for enemies
        this.path = this.generatePath();
        
        // Create home base at the end of the path
        const basePoint = this.path[this.path.length - 1];
        this.base = new Base(basePoint.x, basePoint.y);
        
        // Position the base element
        this.base.element.style.left = `${this.base.x}px`;
        this.base.element.style.top = `${this.base.y}px`;
        
        // Render the dynamic path
        this.renderPath();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize UI
        this.updateUI();
        
        // Show default panel
        this.showDefaultPanel();
    }
    
    /**
     * Generate a random path that enemies will follow
     * Enemies travel from left side to the base on the right side
     * The path will snake around without intersecting itself
     */
    generatePath() {
        const path = [];
        const gridSize = 40; // Size of each grid cell
        const margin = 80; // Margin from the edges of the board
        
        // Number of columns and rows in our grid
        const cols = Math.floor((this.boardWidth - margin * 2) / gridSize);
        const rows = Math.floor((this.boardHeight - margin * 2) / gridSize);
        
        // Create a grid to track visited cells and prevent path intersection
        const visitedGrid = Array(cols).fill().map(() => Array(rows).fill(false));
        
        // Generate the starting point on the left edge
        const startY = Math.floor(Math.random() * (rows - 4)) + 2; // Stay away from the very top/bottom
        const startGridY = startY;
        
        // Generate the end point on the right edge (where the base will be)
        const endX = cols - 1;
        const endGridY = Math.floor(Math.random() * (rows - 4)) + 2;
        
        // Start point in actual coordinates
        const startX = 0;
        const startRealY = margin + startGridY * gridSize;
        path.push({ x: startX, y: startRealY });
        
        // Current position in grid coordinates
        let currentGridX = 0;
        let currentGridY = startGridY;
        
        // Mark starting position as visited
        visitedGrid[currentGridX][currentGridY] = true;
        
        // Direction vectors: right, up, down (we only allow these three directions)
        const directions = [
            { dx: 1, dy: 0 }, // right
            { dx: 0, dy: -1 }, // up
            { dx: 0, dy: 1 }  // down
        ];
        
        // Preference to move right - weights for direction selection
        const directionWeights = [
            0.7, // right - high preference
            0.15, // up
            0.15  // down
        ];
        
        // Create path until we are at the second-to-last column
        while (currentGridX < endX - 1) {
            // Make a weighted random choice of direction
            let availableDirections = [];
            let availableWeights = [];
            
            // Check which directions are valid moves
            for (let i = 0; i < directions.length; i++) {
                const newGridX = currentGridX + directions[i].dx;
                const newGridY = currentGridY + directions[i].dy;
                
                // Check if the new position is within bounds and not visited
                if (
                    newGridX >= 0 && newGridX < cols &&
                    newGridY >= 0 && newGridY < rows &&
                    !visitedGrid[newGridX][newGridY]
                ) {
                    // Additional check for not getting too close to the edges
                    if (newGridY > 1 && newGridY < rows - 2) {
                        availableDirections.push(directions[i]);
                        availableWeights.push(directionWeights[i]);
                    }
                }
            }
            
            // If no valid moves, break out (shouldn't happen with proper grid size)
            if (availableDirections.length === 0) {
                break;
            }
            
            // Normalize weights based on available directions
            const totalWeight = availableWeights.reduce((sum, weight) => sum + weight, 0);
            const normalizedWeights = availableWeights.map(weight => weight / totalWeight);
            
            // Choose a random direction based on weights
            const random = Math.random();
            let cumulativeWeight = 0;
            let chosenIndex = 0;
            
            for (let i = 0; i < normalizedWeights.length; i++) {
                cumulativeWeight += normalizedWeights[i];
                if (random <= cumulativeWeight) {
                    chosenIndex = i;
                    break;
                }
            }
            
            const chosenDirection = availableDirections[chosenIndex];
            
            // Move to the new position
            currentGridX += chosenDirection.dx;
            currentGridY += chosenDirection.dy;
            
            // Mark as visited
            visitedGrid[currentGridX][currentGridY] = true;
            
            // Convert grid coordinates to actual coordinates and add to path
            const x = margin + currentGridX * gridSize;
            const y = margin + currentGridY * gridSize;
            path.push({ x, y });
        }
        
        // Now move horizontally to the end of the grid
        while (currentGridX < endX) {
            currentGridX++;
            const x = margin + currentGridX * gridSize;
            const y = margin + currentGridY * gridSize;
            path.push({ x, y });
        }
        
        // Add the final endpoint where the base will be
        const baseX = this.boardWidth - 75;
        const baseY = margin + endGridY * gridSize;
        
        // If the last point is not close to the base Y, add an intermediate point
        const lastPathPoint = path[path.length - 1];
        if (Math.abs(lastPathPoint.y - baseY) > gridSize) {
            path.push({ x: baseX - gridSize * 2, y: baseY });
        }
        
        // Add base point
        path.push({ x: baseX, y: baseY });
        
        // Smooth the path by adding intermediate points
        return this.smoothPath(path);
    }
    
    /**
     * Smooths a path by adding intermediate points between sharp turns
     * @param {Array} path - The original path
     * @returns {Array} - The smoothed path
     */
    smoothPath(path) {
        if (path.length <= 2) return path;
        
        const smoothedPath = [path[0]]; // Start with the first point
        
        for (let i = 1; i < path.length - 1; i++) {
            const prev = path[i - 1];
            const current = path[i];
            const next = path[i + 1];
            
            // Add the current point
            smoothedPath.push(current);
            
            // Check if we have a sharp turn
            const dx1 = current.x - prev.x;
            const dy1 = current.y - prev.y;
            const dx2 = next.x - current.x;
            const dy2 = next.y - current.y;
            
            // If we change direction, add intermediate points
            if ((dx1 !== 0 && dy2 !== 0) || (dy1 !== 0 && dx2 !== 0)) {
                // Calculate intermediate points
                const interPoint1 = {
                    x: current.x - dx1 * 0.3,
                    y: current.y - dy1 * 0.3
                };
                
                const interPoint2 = {
                    x: current.x + dx2 * 0.3,
                    y: current.y + dy2 * 0.3
                };
                
                // Insert intermediate points
                smoothedPath.push(interPoint1);
                smoothedPath.push(interPoint2);
            }
        }
        
        // Add the last point
        smoothedPath.push(path[path.length - 1]);
        
        return smoothedPath;
    }
    
    /**
     * Set up event listeners for game controls
     */
    setupEventListeners() {
        // Tower selection buttons
        const towerButtons = document.querySelectorAll('.tower-btn');
        towerButtons.forEach(button => {
            button.addEventListener('click', () => {
                const towerType = button.getAttribute('data-tower');
                this.startTowerPlacement(towerType);
            });
        });
        
        // Base upgrade buttons
        const upgradeButtons = document.querySelectorAll('.upgrade-btn');
        upgradeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const upgradeType = button.getAttribute('data-upgrade');
                this.upgradeBase(upgradeType);
            });
        });
        
        // Game control buttons
        document.getElementById('start-wave').addEventListener('click', () => this.startWave());
        document.getElementById('fast-forward').addEventListener('click', () => this.toggleFastForward());
        document.getElementById('pause-game').addEventListener('click', () => this.togglePause());
        document.getElementById('restart-game').addEventListener('click', () => this.restartGame());
        
        // Game board events for tower placement
        this.gameBoard.addEventListener('mousemove', (e) => {
            if (this.isPlacingTower) {
                this.updateTowerGhost(e.clientX, e.clientY);
            }
        });
        
        this.gameBoard.addEventListener('click', (e) => {
            if (this.isPlacingTower) {
                // Check if it's a valid placement location
                if (this.placementValid) {
                    const rect = this.gameBoard.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    this.finalizeTowerPlacement(x, y);
                }
            } else if (e.target === this.gameBoard) {
                // If not placing tower and clicked on game board, deselect 
                this.deselectAll();
            }
        });
        
        // Base click for info
        document.getElementById('home-base').addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectBase();
        });
        
        // Tower info buttons
        document.getElementById('sell-tower').addEventListener('click', () => {
            if (this.selectedTower) {
                this.sellTower(this.selectedTower);
            }
        });
        
        // Keyboard events (Escape to cancel tower placement)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isPlacingTower) {
                this.cancelTowerPlacement();
            }
        });
    }
    
    /**
     * Start the tower placement process
     * @param {string} towerType - The type of tower to place
     */
    startTowerPlacement(towerType) {
        // Check tower cost
        let cost;
        switch(towerType) {
            case 'plasma': cost = 50; break;
            case 'tesla': cost = 75; break;
            case 'graviton': cost = 100; break;
            default: return;
        }
        
        // Check if player has enough credits
        if (this.credits < cost) {
            alert('Not enough credits!');
            return;
        }
        
        // Set tower placement state
        this.isPlacingTower = true;
        this.placingTowerType = towerType;
        
        // Deselect any selected tower
        this.deselectAll();
        
        // Create ghost tower for placement preview
        this.createTowerGhost(towerType);
    }
    
    /**
     * Create a ghost tower element for placement preview
     * @param {string} towerType - The type of tower being placed
     */
    createTowerGhost(towerType) {
        // Create ghost element if it doesn't exist
        if (!this.towerGhost) {
            this.towerGhost = document.createElement('div');
            this.towerGhost.classList.add('tower-ghost');
            this.gameBoard.appendChild(this.towerGhost);
        }
        
        // Style based on tower type
        this.towerGhost.className = 'tower-ghost'; // Reset classes
        this.towerGhost.classList.add(`tower-ghost-${towerType}`);
        
        // Add tower range indicator
        let towerRange;
        switch(towerType) {
            case 'plasma': towerRange = 200; break;
            case 'tesla': towerRange = 150; break;
            case 'graviton': towerRange = 175; break;
            default: towerRange = 150;
        }
        
        // Create range circle if it doesn't exist
        if (!this.ghostRange) {
            this.ghostRange = document.createElement('div');
            this.ghostRange.classList.add('tower-range');
            this.towerGhost.appendChild(this.ghostRange);
        }
        
        // Update range circle size
        this.ghostRange.style.width = `${towerRange * 2}px`;
        this.ghostRange.style.height = `${towerRange * 2}px`;
        this.ghostRange.style.left = `${-towerRange + 25}px`;
        this.ghostRange.style.top = `${-towerRange + 25}px`;
        this.ghostRange.style.display = 'block';
    }
    
    /**
     * Update the position and validity of the ghost tower
     * @param {number} clientX - The mouse X position
     * @param {number} clientY - The mouse Y position
     */
    updateTowerGhost(clientX, clientY) {
        if (!this.towerGhost) return;
        
        // Get position relative to game board
        const rect = this.gameBoard.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        // Update ghost position
        this.towerGhost.style.left = `${x}px`;
        this.towerGhost.style.top = `${y}px`;
        
        // Check if this is a valid placement
        this.placementValid = this.isValidTowerPosition(x, y);
        
        // Update ghost appearance based on validity
        if (this.placementValid) {
            this.towerGhost.classList.add('valid');
            this.towerGhost.classList.remove('invalid');
        } else {
            this.towerGhost.classList.add('invalid');
            this.towerGhost.classList.remove('valid');
        }
    }
    
    /**
     * Check if the given position is valid for tower placement
     * @param {number} x - The X position
     * @param {number} y - The Y position
     * @returns {boolean} - Whether the position is valid
     */
    isValidTowerPosition(x, y) {
        // Check if position is within game board
        if (x < 25 || x > this.boardWidth - 25 || y < 25 || y > this.boardHeight - 25) {
            return false;
        }
        
        // Check if position is too close to the path
        for (const point of this.path) {
            const dx = x - point.x;
            const dy = y - point.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 40) {
                return false;
            }
        }
        
        // Check if position overlaps with the base
        const baseX = this.base.x;
        const baseY = this.base.y;
        const baseDx = x - baseX;
        const baseDy = y - baseY;
        const baseDistance = Math.sqrt(baseDx * baseDx + baseDy * baseDy);
        if (baseDistance < 75) {
            return false;
        }
        
        // Check if position overlaps with other towers
        for (const tower of this.towers) {
            const towerDx = x - tower.x;
            const towerDy = y - tower.y;
            const towerDistance = Math.sqrt(towerDx * towerDx + towerDy * towerDy);
            if (towerDistance < 50) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Finalize tower placement at the given position
     * @param {number} x - The X position
     * @param {number} y - The Y position
     */
    finalizeTowerPlacement(x, y) {
        // Double-check that the position is valid
        if (!this.isValidTowerPosition(x, y)) {
            return;
        }
        
        // Get tower cost
        let cost;
        switch(this.placingTowerType) {
            case 'plasma': cost = 50; break;
            case 'tesla': cost = 75; break;
            case 'graviton': cost = 100; break;
            default: return;
        }
        
        // Verify player has enough credits and deduct cost
        if (this.credits < cost) {
            // Should never happen due to earlier checks, but as a safeguard
            alert('Not enough credits!');
            this.cancelTowerPlacement();
            return;
        }
        
        // Deduct cost
        this.credits -= cost;
        
        // Create and add tower
        const tower = new Tower(this.placingTowerType, x, y, this);
        this.towers.push(tower);
        
        // End placement mode
        this.cancelTowerPlacement();
        
        // Update UI
        this.updateUI();
    }
    
    /**
     * Cancel tower placement mode
     */
    cancelTowerPlacement() {
        this.isPlacingTower = false;
        this.placingTowerType = null;
        
        // Remove ghost tower
        if (this.towerGhost && this.towerGhost.parentNode) {
            this.towerGhost.parentNode.removeChild(this.towerGhost);
        }
        this.towerGhost = null;
        this.ghostRange = null;
        
        // Show default panel again
        this.showDefaultPanel();
    }
    
    /**
     * Show the default right panel (when nothing is selected)
     */
    showDefaultPanel() {
        // Hide other panels
        document.getElementById('tower-info').classList.add('hidden');
        document.getElementById('base-info').classList.add('hidden');
        
        // Show default panel
        document.getElementById('default-panel').classList.remove('hidden');
    }
    
    /**
     * Select the base to show its details and upgrade options
     */
    selectBase() {
        // Cancel tower placement if active
        if (this.isPlacingTower) {
            this.cancelTowerPlacement();
        }
        
        // Deselect any selected tower
        if (this.selectedTower) {
            this.selectedTower.hideRange();
            this.selectedTower = null;
        }
        
        // Hide other panels
        document.getElementById('default-panel').classList.add('hidden');
        document.getElementById('tower-info').classList.add('hidden');
        
        // Show base info panel
        const baseInfo = document.getElementById('base-info');
        baseInfo.classList.remove('hidden');
        
        // Update base stats display
        const baseStats = document.getElementById('base-stats');
        baseStats.innerHTML = `
            <div>HP: ${Math.round(this.base.hp)} / ${Math.round(this.base.maxHP)}</div>
            <div>Shields: ${Math.round(this.base.shields)} (Level ${this.base.shieldsLevel})</div>
            <div>Energy: ${Math.round(this.base.energy)} (Level ${this.base.energyLevel})</div>
            <div>Tower Rate Boost: ${Math.round((this.base.getTowerRateOfFireBoost() - 1) * 100)}%</div>
            <div>Tower Damage Reduction: ${Math.round(this.base.getTowerDamageReduction() * 100)}%</div>
        `;
        
        // Update upgrade buttons (cost is handled in updateUI)
    }
    
    /**
     * Select a tower to show its details and upgrade options
     * @param {Tower} tower - The tower to select
     */
    selectTower(tower) {
        // Cancel tower placement if active
        if (this.isPlacingTower) {
            this.cancelTowerPlacement();
        }
        
        // Deselect previous tower if any
        if (this.selectedTower) {
            this.selectedTower.hideRange();
        }
        
        // Select new tower
        this.selectedTower = tower;
        tower.showRange();
        
        // Hide other panels
        document.getElementById('default-panel').classList.add('hidden');
        document.getElementById('base-info').classList.add('hidden');
        
        // Show tower info panel
        const towerInfo = document.getElementById('tower-info');
        towerInfo.classList.remove('hidden');
        
        // Update tower stats display
        const towerStats = document.getElementById('tower-stats');
        towerStats.innerHTML = `
            <div>Type: ${this.capitalizeFirstLetter(tower.type)}</div>
            <div>Damage: ${tower.damage.toFixed(1)} (Level ${tower.damageLevel})</div>
            <div>Range: ${tower.range.toFixed(0)} (Level ${tower.rangeLevel})</div>
            <div>Attack Speed: ${tower.attackSpeed.toFixed(1)}/sec (Level ${tower.attackSpeedLevel})</div>
            ${tower.specialization ? `<div>Specialization: ${this.capitalizeFirstLetter(tower.specialization)}</div>` : ''}
        `;
        
        // Clear and recreate the tower upgrades section
        const towerUpgrades = document.getElementById('tower-upgrades');
        towerUpgrades.innerHTML = '<h4 class="section-title">Upgrades</h4>';
        
        // Create upgrade buttons
        const attributes = [
            { id: 'damage', name: 'Damage' },
            { id: 'range', name: 'Range' },
            { id: 'attackSpeed', name: 'Attack Speed' }
        ];
        
        // Create the upgrades section
        const upgradeSection = document.createElement('div');
        upgradeSection.classList.add('tower-attribute-upgrades');
        
        attributes.forEach(attr => {
            const cost = tower.getUpgradeCost(attr.id);
            
            // Create a tooltip container
            const tooltipContainer = document.createElement('div');
            tooltipContainer.classList.add('tooltip');
            
            // Create the button inside the tooltip container
            const button = document.createElement('button');
            button.classList.add('upgrade-btn');
            button.innerHTML = `Upgrade ${attr.name} (${cost})`;
            button.addEventListener('click', () => {
                this.upgradeTower(tower, attr.id);
            });
            
            // Disable if not enough credits
            if (this.credits < cost) {
                button.disabled = true;
            }
            
            // Create tooltip text
            const tooltipText = document.createElement('div');
            tooltipText.classList.add('tooltip-text');
            
            // Get current and next level values
            let currentValue, newValue;
            let effectDescription = '';
            
            switch(attr.id) {
                case 'damage':
                    currentValue = tower.damage.toFixed(1);
                    // Calculate what the new damage would be after upgrade
                    newValue = (tower.baseDamage * (1 + (tower.damageLevel) * 0.2)).toFixed(1);
                    effectDescription = `Increases damage dealt to enemies`;
                    break;
                case 'range':
                    currentValue = tower.range.toFixed(0);
                    // Calculate what the new range would be after upgrade
                    newValue = (tower.baseRange * (1 + (tower.rangeLevel) * 0.2)).toFixed(0);
                    effectDescription = `Increases tower attack range`;
                    break;
                case 'attackSpeed':
                    currentValue = tower.attackSpeed.toFixed(1);
                    // Calculate what the new attack speed would be after upgrade
                    newValue = (tower.baseAttackSpeed * (1 + (tower.attackSpeedLevel) * 0.2)).toFixed(1);
                    effectDescription = `Increases attacks per second`;
                    break;
            }
            
            // Fill tooltip with the upgrade info
            tooltipText.innerHTML = `
                <div class="tooltip-title">Upgrade ${attr.name}</div>
                <div class="tooltip-description">${effectDescription}</div>
                <div class="tooltip-effects">
                    Current: ${currentValue}<br>
                    Next Level: ${newValue}<br>
                    Cost: ${cost} credits
                </div>
            `;
            
            // Add elements to the container
            tooltipContainer.appendChild(button);
            tooltipContainer.appendChild(tooltipText);
            
            // Add the tooltip container to the upgrade section
            upgradeSection.appendChild(tooltipContainer);
        });
        
        // Add upgrade section to tower upgrades
        towerUpgrades.appendChild(upgradeSection);
        
        // Add specialization section title
        const specializationTitle = document.createElement('h4');
        specializationTitle.classList.add('section-title');
        specializationTitle.textContent = 'Specializations';
        towerUpgrades.appendChild(specializationTitle);
        
        // Update specialization options
        const specializationOptions = document.createElement('div');
        specializationOptions.id = 'specialization-options';
        towerUpgrades.appendChild(specializationOptions);
        
        // Only show specialization options if tower isn't already specialized
        if (!tower.specialization) {
            const options = tower.getSpecializationOptions();
            
            options.forEach(option => {
                // Create tooltip container
                const tooltipContainer = document.createElement('div');
                tooltipContainer.classList.add('tooltip');
                
                // Create button inside tooltip container
                const button = document.createElement('button');
                button.classList.add('specialization-btn');
                button.innerHTML = `${option.name} (${option.cost})`;
                button.addEventListener('click', () => {
                    this.specializeTower(tower, option.id, option.cost);
                });
                
                // Disable if not enough credits
                if (this.credits < option.cost) {
                    button.disabled = true;
                }
                
                // Create tooltip text with detailed info
                const tooltipText = document.createElement('div');
                tooltipText.classList.add('tooltip-text');
                
                // Get specific effect descriptions based on tower type and specialization
                let effects = '';
                
                switch(tower.type) {
                    case 'plasma':
                        if (option.id === 'overload') {
                            effects = `• Doubles damage<br>• Reduces attack speed by 30%`;
                        } else if (option.id === 'explosive') {
                            effects = `• Converts to area damage<br>• Hits all enemies within 40 range`;
                        } else if (option.id === 'graviton') {
                            effects = `• Adds 30% slow effect<br>• Slow lasts 1.5 seconds`;
                        }
                        break;
                        
                    case 'tesla':
                        if (option.id === 'voltage') {
                            effects = `• Increases damage by 50%<br>• Increases range by 20%<br>• Targets 4 enemies instead of 3`;
                        } else if (option.id === 'focused') {
                            effects = `• Converts to single-target<br>• Triples damage output`;
                        } else if (option.id === 'electro') {
                            effects = `• Adds 20% slow effect<br>• Slow lasts 1 second`;
                        }
                        break;
                        
                    case 'graviton':
                        if (option.id === 'horizon') {
                            effects = `• Increases slow to 50%<br>• Doubles slow duration to 4 seconds<br>• Affects up to 6 targets<br>• Increases range by 20%`;
                        } else if (option.id === 'singularity') {
                            effects = `• Adds damage over time<br>• 5 damage per tick for 3 seconds`;
                        } else if (option.id === 'railgun') {
                            effects = `• Converts to direct damage<br>• 40 damage per hit<br>• 20% faster attack speed`;
                        }
                        break;
                }
                
                // Fill tooltip with specialization info
                tooltipText.innerHTML = `
                    <div class="tooltip-title">${option.name}</div>
                    <div class="tooltip-description">${option.description}</div>
                    <div class="tooltip-effects">
                        ${effects}<br>
                        Cost: ${option.cost} credits
                    </div>
                `;
                
                // Add elements to container
                tooltipContainer.appendChild(button);
                tooltipContainer.appendChild(tooltipText);
                
                // Add to specialization options
                specializationOptions.appendChild(tooltipContainer);
            });
        } else {
            const message = document.createElement('div');
            message.textContent = 'Tower already specialized';
            specializationOptions.appendChild(message);
        }
        
        // Update sell button
        const sellButton = document.getElementById('sell-tower');
        const sellValue = tower.getSellValue();
        sellButton.textContent = `Sell Tower (${sellValue})`;
        
        // Update sell button tooltip
        const sellTooltipValue = document.getElementById('sell-tower-value');
        if (sellTooltipValue) {
            // Calculate how much of original cost will be returned
            const refundPercentage = Math.floor((sellValue / tower.cost) * 100);
            
            sellTooltipValue.innerHTML = `
                You will receive: ${sellValue} credits<br>
                (${refundPercentage}% of original cost)
            `;
        }
    }
    
    /**
     * Upgrade a tower's attribute
     * @param {Tower} tower - The tower to upgrade
     * @param {string} attribute - The attribute to upgrade
     */
    upgradeTower(tower, attribute) {
        // Get upgrade cost
        const cost = tower.getUpgradeCost(attribute);
        
        // Check if player has enough credits
        if (this.credits < cost) {
            return;
        }
        
        // Deduct cost
        this.credits -= cost;
        
        // Apply upgrade
        tower.upgrade(attribute);
        
        // Update only the tower stats without recreating the entire panel
        const towerStats = document.getElementById('tower-stats');
        towerStats.innerHTML = `
            <div>Type: ${this.capitalizeFirstLetter(tower.type)}</div>
            <div>Damage: ${tower.damage.toFixed(1)} (Level ${tower.damageLevel})</div>
            <div>Range: ${tower.range.toFixed(0)} (Level ${tower.rangeLevel})</div>
            <div>Attack Speed: ${tower.attackSpeed.toFixed(1)}/sec (Level ${tower.attackSpeedLevel})</div>
            ${tower.specialization ? `<div>Specialization: ${this.capitalizeFirstLetter(tower.specialization)}</div>` : ''}
        `;
        
        // Update the upgrade buttons (cost and disabled state)
        const upgradeButtons = document.querySelectorAll('#tower-upgrades .upgrade-btn');
        upgradeButtons.forEach(button => {
            const buttonText = button.textContent;
            const matches = buttonText.match(/Upgrade\s+(\w+)/);
            if (matches && matches.length >= 2) {
                const attrName = matches[1].toLowerCase();
                const attrKey = attrName === 'attack' ? 'attackSpeed' : attrName;
                const newCost = tower.getUpgradeCost(attrKey);
                
                // Update button text
                button.textContent = `Upgrade ${matches[1]} (${newCost})`;
                button.disabled = this.credits < newCost;
                
                // Update tooltip info if found
                const tooltipContainer = button.parentNode;
                if (tooltipContainer && tooltipContainer.classList.contains('tooltip')) {
                    const tooltipText = tooltipContainer.querySelector('.tooltip-text');
                    if (tooltipText) {
                        // Get current and next level values to update tooltip
                        let currentValue, newValue;
                        
                        switch(attrKey) {
                            case 'damage':
                                currentValue = tower.damage.toFixed(1);
                                newValue = (tower.baseDamage * (1 + (tower.damageLevel) * 0.2)).toFixed(1);
                                break;
                            case 'range':
                                currentValue = tower.range.toFixed(0);
                                newValue = (tower.baseRange * (1 + (tower.rangeLevel) * 0.2)).toFixed(0);
                                break;
                            case 'attackSpeed':
                                currentValue = tower.attackSpeed.toFixed(1);
                                newValue = (tower.baseAttackSpeed * (1 + (tower.attackSpeedLevel) * 0.2)).toFixed(1);
                                break;
                        }
                        
                        // Find and update the tooltip-effects div
                        const effectsDiv = tooltipText.querySelector('.tooltip-effects');
                        if (effectsDiv) {
                            effectsDiv.innerHTML = `
                                Current: ${currentValue}<br>
                                Next Level: ${newValue}<br>
                                Cost: ${newCost} credits
                            `;
                        }
                    }
                }
            }
        });
        
        // Update sell value
        const sellButton = document.getElementById('sell-tower');
        const sellValue = tower.getSellValue();
        sellButton.textContent = `Sell Tower (${sellValue})`;
        
        // Update sell button tooltip
        const sellTooltipValue = document.getElementById('sell-tower-value');
        if (sellTooltipValue) {
            // Calculate how much of original cost will be returned
            const refundPercentage = Math.floor((sellValue / tower.cost) * 100);
            
            sellTooltipValue.innerHTML = `
                You will receive: ${sellValue} credits<br>
                (${refundPercentage}% of original cost)
            `;
        }
        
        // Update UI for global stats
        this.updateUI();
    }
    
    /**
     * Deselect everything (towers and base)
     */
    deselectAll() {
        // Deselect tower if any
        if (this.selectedTower) {
            this.selectedTower.hideRange();
            this.selectedTower = null;
        }
        
        // Show default panel
        this.showDefaultPanel();
    }
    
    /**
     * Apply a specialization to a tower
     * @param {Tower} tower - The tower to specialize
     * @param {string} specializationType - The specialization to apply
     * @param {number} cost - The cost of the specialization
     */
    specializeTower(tower, specializationType, cost) {
        // Check if player has enough credits
        if (this.credits < cost) {
            return;
        }
        
        // Deduct cost
        this.credits -= cost;
        
        // Apply specialization
        tower.applySpecialization(specializationType);
        
        // Update tower stats to show new stats
        const towerStats = document.getElementById('tower-stats');
        towerStats.innerHTML = `
            <div>Type: ${this.capitalizeFirstLetter(tower.type)}</div>
            <div>Damage: ${tower.damage.toFixed(1)} (Level ${tower.damageLevel})</div>
            <div>Range: ${tower.range.toFixed(0)} (Level ${tower.rangeLevel})</div>
            <div>Attack Speed: ${tower.attackSpeed.toFixed(1)}/sec (Level ${tower.attackSpeedLevel})</div>
            <div>Specialization: ${this.capitalizeFirstLetter(tower.specialization)}</div>
        `;
        
        // Clear and update specialization section
        const specializationOptions = document.getElementById('specialization-options');
        specializationOptions.innerHTML = '';
        
        // Show the "already specialized" message
        const message = document.createElement('div');
        message.textContent = 'Tower already specialized';
        specializationOptions.appendChild(message);
        
        // Update tower buttons - only need to update costs, not recreate
        const upgradeButtons = document.querySelectorAll('#tower-upgrades .upgrade-btn');
        upgradeButtons.forEach(button => {
            const buttonText = button.textContent;
            const matches = buttonText.match(/Upgrade\s+(\w+)/);
            if (matches && matches.length >= 2) {
                const attrName = matches[1].toLowerCase();
                const attrKey = attrName === 'attack' ? 'attackSpeed' : attrName;
                const newCost = tower.getUpgradeCost(attrKey);
                button.textContent = `Upgrade ${matches[1]} (${newCost})`;
                button.disabled = this.credits < newCost;
            }
        });
        
        // Update sell value
        const sellButton = document.getElementById('sell-tower');
        const sellValue = tower.getSellValue();
        sellButton.textContent = `Sell Tower (${sellValue})`;
        
        // Update sell button tooltip
        const sellTooltipValue = document.getElementById('sell-tower-value');
        if (sellTooltipValue) {
            // Calculate how much of original cost will be returned
            const refundPercentage = Math.floor((sellValue / tower.cost) * 100);
            
            sellTooltipValue.innerHTML = `
                You will receive: ${sellValue} credits<br>
                (${refundPercentage}% of original cost)<br>
                Includes specialization value
            `;
        }
        
        // Update UI for global stats
        this.updateUI();
    }
    
    /**
     * Sell a tower and refund some credits
     * @param {Tower} tower - The tower to sell
     */
    sellTower(tower) {
        // Get sell value
        const sellValue = tower.getSellValue();
        
        // Add credits
        this.credits += sellValue;
        
        // Remove tower from game state
        const index = this.towers.indexOf(tower);
        if (index !== -1) {
            this.towers.splice(index, 1);
        }
        
        // Remove tower element
        tower.destroy();
        
        // Deselect tower
        this.deselectAll();
        
        // Update UI
        this.updateUI();
    }
    
    /**
     * Upgrade the player's base
     * @param {string} upgradeType - The type of upgrade to apply ('shields', 'energy', or 'hp')
     */
    upgradeBase(upgradeType) {
        // Get upgrade cost
        const cost = this.base.getUpgradeCost(upgradeType);
        
        // Check if player has enough credits
        if (this.credits < cost) {
            // Show not enough credits message
            alert('Not enough credits!');
            return;
        }
        
        // Apply upgrade
        if (this.base.upgrade(upgradeType)) {
            // Deduct cost
            this.credits -= cost;
            
            // Update UI
            this.updateUI();
            
            // Update base info if panel is visible
            if (!document.getElementById('base-info').classList.contains('hidden')) {
                this.selectBase();
            }
        }
    }
    
    /**
     * Start a new wave of enemies
     */
    startWave() {
        if (this.isWaveActive) return;
        
        this.isWaveActive = true;
        this.isRunning = true;
        this.isPaused = false;
        
        // Enable game control buttons
        document.getElementById('fast-forward').disabled = false;
        document.getElementById('pause-game').disabled = false;
        
        // Disable start wave button
        document.getElementById('start-wave').disabled = true;
        
        // Cancel tower placement if active
        if (this.isPlacingTower) {
            this.cancelTowerPlacement();
        }
        
        // Generate enemies for this wave
        this.generateWaveEnemies();
        
        // Start the game loop
        if (!this.animationFrameId) {
            this.lastFrameTime = performance.now();
            this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
        }
    }
    
    /**
     * Generate enemies for the current wave
     */
    generateWaveEnemies() {
        // Clear any existing enemies
        this.enemies = [];
        
        // Calculate number of each enemy type based on wave number
        let numSwarmers = Math.floor(this.wave * 1.5);
        let numBrutes = Math.floor(this.wave * 0.8);
        let numJuggernauts = Math.floor(this.wave * 0.4);
        
        // Ensure minimum numbers
        numSwarmers = Math.max(numSwarmers, 3);
        numBrutes = Math.max(numBrutes, this.wave > 1 ? 1 : 0);
        numJuggernauts = Math.max(numJuggernauts, this.wave > 3 ? 1 : 0);
        
        // Create a queue of enemies to spawn
        this.enemyQueue = [];
        
        // Add swarmers
        for (let i = 0; i < numSwarmers; i++) {
            this.enemyQueue.push({ type: 'swarmer', delay: i * 800 + Math.random() * 300 });
        }
        
        // Add brutes
        for (let i = 0; i < numBrutes; i++) {
            this.enemyQueue.push({ type: 'brute', delay: i * 1500 + numSwarmers * 400 + Math.random() * 500 });
        }
        
        // Add juggernauts
        for (let i = 0; i < numJuggernauts; i++) {
            this.enemyQueue.push({ type: 'juggernaut', delay: i * 2500 + (numSwarmers + numBrutes) * 600 + Math.random() * 1000 });
        }
        
        // Sort by delay
        this.enemyQueue.sort((a, b) => a.delay - b.delay);
        
        // Track spawn timing
        this.waveStartTime = performance.now();
    }
    
    /**
     * Toggle fast forward mode
     */
    toggleFastForward() {
        if (this.gameSpeed === 1) {
            this.gameSpeed = 2;
            document.getElementById('fast-forward').textContent = 'Normal Speed';
        } else {
            this.gameSpeed = 1;
            document.getElementById('fast-forward').textContent = 'Fast Forward';
        }
    }
    
    /**
     * Toggle pause state
     */
    togglePause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            document.getElementById('pause-game').textContent = 'Resume';
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        } else {
            document.getElementById('pause-game').textContent = 'Pause';
            this.lastFrameTime = performance.now();
            this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
        }
    }
    
    /**
     * Main game loop
     * @param {number} timestamp - The current time from requestAnimationFrame
     */
    gameLoop(timestamp) {
        // Calculate delta time (adjust for game speed)
        const deltaTime = (timestamp - this.lastFrameTime) * this.gameSpeed;
        this.lastFrameTime = timestamp;
        
        // Spawn new enemies if needed
        this.updateEnemySpawns(timestamp);
        
        // Update all enemies
        this.updateEnemies(deltaTime);
        
        // Update all towers
        this.updateTowers(timestamp);
        
        // Check if wave is complete
        this.checkWaveStatus();
        
        // Continue the game loop if the game is running
        if (this.isRunning && !this.isPaused) {
            this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
        }
    }
    
    /**
     * Spawn new enemies based on the wave timer
     * @param {number} timestamp - The current time
     */
    updateEnemySpawns(timestamp) {
        // Check if there are enemies to spawn
        if (this.enemyQueue && this.enemyQueue.length > 0) {
            const waveElapsedTime = timestamp - this.waveStartTime;
            
            // Spawn all enemies whose delay has passed
            while (this.enemyQueue.length > 0 && this.enemyQueue[0].delay <= waveElapsedTime) {
                const enemyInfo = this.enemyQueue.shift();
                const newEnemy = new Enemy(enemyInfo.type, this.wave, this.path);
                this.enemies.push(newEnemy);
            }
        }
    }
    
    /**
     * Update all enemies
     * @param {number} deltaTime - Time since last update in ms
     */
    updateEnemies(deltaTime) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Move the enemy
            const reachedBase = enemy.move(deltaTime);
            
            if (reachedBase) {
                // Enemy reached the base, deal damage
                const baseSurvived = this.base.takeDamage(10);
                
                if (!baseSurvived) {
                    this.gameOver();
                    return;
                }
                
                // Reduce lives
                this.lives--;
                
                if (this.lives <= 0) {
                    this.gameOver();
                    return;
                }
                
                // Remove the enemy
                enemy.destroy();
                this.enemies.splice(i, 1);
                
                // Update only game stats
                this.updateUI();
            } else if (enemy.isDead) {
                // Remove dead enemies
                this.credits += enemy.currencyValue;
                this.enemies.splice(i, 1);
                
                // Update only the game stats UI (not tower info)
                this.updateUI();
            }
        }
    }
    
    /**
     * Update all towers
     * @param {number} timestamp - The current time
     */
    updateTowers(timestamp) {
        for (const tower of this.towers) {
            tower.update(timestamp);
        }
    }
    
    /**
     * Check if the current wave is complete
     */
    checkWaveStatus() {
        if (this.isWaveActive && this.enemies.length === 0 && this.enemyQueue.length === 0) {
            this.completeWave();
        }
    }
    
    /**
     * Handle the completion of a wave
     */
    completeWave() {
        this.isWaveActive = false;
        
        // Repair the base
        this.base.repair();
        
        // Increment wave number
        this.wave++;
        
        // Add bonus credits
        this.credits += 50 + (this.wave * 10);
        
        // Re-enable the start wave button
        document.getElementById('start-wave').disabled = false;
        
        // Disable game control buttons
        document.getElementById('fast-forward').disabled = true;
        document.getElementById('pause-game').disabled = true;
        
        // Update UI
        this.updateUI();
        
        // Update base info if it's selected
        if (!document.getElementById('base-info').classList.contains('hidden')) {
            this.selectBase();
        }
    }
    
    /**
     * Handle game over state
     */
    gameOver() {
        this.isRunning = false;
        
        // Stop the game loop
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
        
        // Show game over message
        alert(`Game Over! You survived ${this.wave} waves.`);
        
        // Disable game controls but keep restart enabled
        document.getElementById('start-wave').disabled = true;
        document.getElementById('fast-forward').disabled = true;
        document.getElementById('pause-game').disabled = true;
        
        const towerButtons = document.querySelectorAll('.tower-btn');
        towerButtons.forEach(button => button.disabled = true);
        
        const upgradeButtons = document.querySelectorAll('.upgrade-btn');
        upgradeButtons.forEach(button => button.disabled = true);
    }
    
    /**
     * Restart the game to initial state
     */
    restartGame() {
        // Confirm restart
        if (!confirm('Are you sure you want to restart the game? All progress will be lost.')) {
            return;
        }
        
        // Stop any ongoing game loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Clear all enemies
        this.enemies.forEach(enemy => {
            if (enemy.element && enemy.element.parentNode) {
                enemy.element.parentNode.removeChild(enemy.element);
            }
        });
        this.enemies = [];
        this.enemyQueue = [];
        
        // Clear all towers
        this.towers.forEach(tower => tower.destroy());
        this.towers = [];
        
        // Reset game state
        this.credits = 100;
        this.wave = 1;
        this.lives = 10;
        this.isRunning = false;
        this.isPaused = false;
        this.isWaveActive = false;
        this.gameSpeed = 1;
        this.selectedTower = null;
        
        // Cancel tower placement if active
        if (this.isPlacingTower) {
            this.cancelTowerPlacement();
        }
        
        // Generate a new random path
        this.path = this.generatePath();
        
        // Update base position to end of the new path
        const basePoint = this.path[this.path.length - 1];
        this.base.x = basePoint.x;
        this.base.y = basePoint.y;
        this.base.element.style.left = `${this.base.x}px`;
        this.base.element.style.top = `${this.base.y}px`;
        
        // Reset base stats
        this.base.resetToDefault();
        
        // Render the new path
        this.renderPath();
        
        // Show the start overlay again
        const startOverlay = document.getElementById('start-overlay');
        startOverlay.style.opacity = '1';
        startOverlay.classList.remove('hidden');
        
        // Enable controls
        document.getElementById('start-wave').disabled = false;
        document.getElementById('fast-forward').disabled = true;
        document.getElementById('pause-game').disabled = true;
        document.getElementById('fast-forward').textContent = 'Fast Forward';
        document.getElementById('pause-game').textContent = 'Pause';
        
        // Instead of manually enabling all tower buttons,
        // let updateUI handle their state based on credits
        // The player should have 100 credits, which is enough for any tower
        
        // Show default panel
        this.showDefaultPanel();
        
        // Update UI
        this.updateUI();
    }
    
    /**
     * Update global game stats UI elements
     */
    updateUI() {
        // Update credits display
        document.getElementById('credits').textContent = this.credits;
        
        // Update wave display
        document.getElementById('wave').textContent = this.wave;
        
        // Update lives display
        document.getElementById('lives').textContent = this.lives;
        
        // Update base stats display (handled by Base class)
        
        // Update base upgrade buttons if base info is visible
        if (!document.getElementById('base-info').classList.contains('hidden')) {
            const baseUpgradeButtons = document.querySelectorAll('#base-upgrades .upgrade-btn');
            baseUpgradeButtons.forEach(button => {
                const upgradeType = button.getAttribute('data-upgrade');
                const cost = this.base.getUpgradeCost(upgradeType);
                
                button.textContent = `Upgrade ${this.capitalizeFirstLetter(upgradeType)} (${cost})`;
                
                // Enable if enough credits, disable otherwise
                button.disabled = (this.credits < cost);
            });
        }
        
        // Update tower selection buttons if default panel is visible
        if (!document.getElementById('default-panel').classList.contains('hidden')) {
            const towerButtons = document.querySelectorAll('.tower-btn');
            towerButtons.forEach(button => {
                const towerType = button.getAttribute('data-tower');
                let cost;
                
                switch(towerType) {
                    case 'plasma': cost = 50; break;
                    case 'tesla': cost = 75; break;
                    case 'graviton': cost = 100; break;
                }
                
                // Enable if enough credits, disable otherwise
                button.disabled = (this.credits < cost);
            });
        }
        
        // Update tower upgrade and specialization buttons if a tower is selected
        if (this.selectedTower && !document.getElementById('tower-info').classList.contains('hidden')) {
            this.updateTowerInfoButtons();
        }
    }
    
    /**
     * Update only the tower info panel buttons (for upgrades/specializations)
     */
    updateTowerInfoButtons() {
        if (!this.selectedTower) return;
        
        // Update tower upgrade buttons
        const upgradeButtons = document.querySelectorAll('#tower-upgrades .upgrade-btn');
        upgradeButtons.forEach(button => {
            // Extract upgrade type and cost from button text
            const buttonText = button.textContent;
            const matches = buttonText.match(/Upgrade\s+(\w+)\s+\((\d+)\)/);
            if (matches && matches.length >= 3) {
                const attrName = matches[1].toLowerCase();
                // Only update the disabled state, not the content
                const cost = this.selectedTower.getUpgradeCost(attrName === 'attack' ? 'attackSpeed' : attrName);
                button.disabled = (this.credits < cost);
            }
        });
        
        // Update tower specialization buttons
        const specializationButtons = document.querySelectorAll('.specialization-btn');
        specializationButtons.forEach(button => {
            const costMatch = button.textContent.match(/\((\d+)\)/);
            if (costMatch && costMatch.length >= 2) {
                const cost = Number(costMatch[1]);
                button.disabled = (this.credits < cost);
            }
        });
    }
    
    /**
     * Render the path on the game board
     */
    renderPath() {
        const pathContainer = document.getElementById('path');
        
        // Clear any existing path segments
        pathContainer.innerHTML = '';
        
        // Create path segments between each point
        for (let i = 0; i < this.path.length - 1; i++) {
            const start = this.path[i];
            const end = this.path[i + 1];
            
            // Calculate length and angle of this segment
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            
            // Create the path segment
            const segment = document.createElement('div');
            segment.classList.add('path-segment');
            
            // Position and size the segment
            segment.style.width = `${length}px`;
            segment.style.left = `${start.x}px`;
            segment.style.top = `${start.y - 30}px`; // Centered vertically (-30 is half of height)
            segment.style.transform = `rotate(${angle}deg)`;
            
            // Add to the path container
            pathContainer.appendChild(segment);
        }
    }
    
    /**
     * Helper function to capitalize first letter of a string
     * @param {string} str - The string to capitalize
     * @returns {string} - The capitalized string
     */
    capitalizeFirstLetter(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}