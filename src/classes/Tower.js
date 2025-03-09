/**
 * Represents a tower in the tower defense game
 */
export class Tower {
    /**
     * Create a new tower
     * @param {string} type - The type of tower ('plasma', 'tesla', or 'graviton')
     * @param {number} x - The x position on the game board
     * @param {number} y - The y position on the game board
     * @param {object} gameState - Reference to the game state for targeting enemies
     */
    constructor(type, x, y, gameState) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.gameState = gameState;
        this.element = null;
        this.rangeElement = null;
        this.target = null;
        this.specialization = null;
        this.lastAttackTime = 0;
        
        // Upgrade levels (starts at level 1)
        this.rangeLevel = 1;
        this.damageLevel = 1;
        this.attackSpeedLevel = 1;
        
        // Set base stats according to type
        this.setBaseStats();
        
        // Create HTML representation
        this.createElement();
    }
    
    /**
     * Set the base stats for this tower based on its type
     */
    setBaseStats() {
        switch(this.type) {
            case 'plasma':
                this.baseDamage = 25;
                this.baseRange = 200;
                this.baseAttackSpeed = 2; // attacks per second
                this.attackType = 'single';
                this.cost = 50;
                break;
            
            case 'tesla':
                this.baseDamage = 10;
                this.baseRange = 150;
                this.baseAttackSpeed = 1.5;
                this.attackType = 'multi'; // Can attack multiple targets at once
                this.maxTargets = 3;       // Up to 3 enemies at once
                this.cost = 75;
                break;
                
            case 'graviton':
                this.baseDamage = 0;
                this.baseRange = 175;
                this.baseAttackSpeed = 1;
                this.attackType = 'multi-debuff'; // Can affect multiple targets
                this.slowAmount = 0.3; // 30% slow
                this.slowDuration = 2000; // 2 seconds
                this.maxTargets = 4; // Up to 4 enemies at once
                this.cost = 100;
                break;
        }
        
        // Apply modifiers based on upgrade levels
        this.updateStats();
    }
    
    /**
     * Update the tower's stats based on upgrade levels and specialization
     */
    updateStats() {
        // Each level adds 20% to the base stat
        let damageMultiplier = 1 + (this.damageLevel - 1) * 0.2;
        let rangeMultiplier = 1 + (this.rangeLevel - 1) * 0.2;
        let attackSpeedMultiplier = 1 + (this.attackSpeedLevel - 1) * 0.2;
        
        // Calculate base values first
        this.damage = this.baseDamage * damageMultiplier;
        this.range = this.baseRange * rangeMultiplier;
        this.attackSpeed = this.baseAttackSpeed * attackSpeedMultiplier;
        
        // Apply specialization effects on top of leveled stats
        if (this.specialization) {
            switch(this.type) {
                case 'plasma':
                    if (this.specialization === 'overload') {
                        this.damage *= 2;  // Double the upgraded damage
                        this.attackSpeed *= 0.7;  // 70% of the upgraded attack speed
                    } else if (this.specialization === 'explosive') {
                        this.attackType = 'aoe';
                        this.aoeRadius = 40;
                    } else if (this.specialization === 'graviton') {
                        this.slowAmount = 0.3;
                        this.slowDuration = 1500;
                    }
                    break;
                    
                case 'tesla':
                    if (this.specialization === 'voltage') {
                        this.damage *= 1.5;       // 150% of the upgraded damage
                        this.maxTargets = 4;      // Increase to 4 targets at once
                        this.range *= 1.2;        // 20% more range
                    } else if (this.specialization === 'focused') {
                        this.attackType = 'single';
                        this.damage *= 3;  // 300% of the upgraded damage
                    } else if (this.specialization === 'electro') {
                        this.slowAmount = 0.2;
                        this.slowDuration = 1000;
                    }
                    break;
                    
                case 'graviton':
                    if (this.specialization === 'horizon') {
                        this.slowAmount = 0.5;  // 50% slow
                        this.slowDuration = 4000; // 4 seconds
                        this.maxTargets = 6;     // Increased to 6 targets
                        this.range *= 1.2;      // 20% increased range
                    } else if (this.specialization === 'singularity') {
                        this.attackType = 'dot';  // Damage over time
                        // Base damage for DoT effect, scales with level
                        this.damage = 5 * damageMultiplier;
                        this.dotDuration = 3000;
                    } else if (this.specialization === 'railgun') {
                        this.attackType = 'single';
                        // Base damage for railgun, scales with level
                        this.damage = 40 * damageMultiplier;
                        this.attackSpeed *= 1.2;  // 120% of the upgraded attack speed
                    }
                    break;
            }
        }
        
        // Update range indicator if it exists
        if (this.rangeElement) {
            this.rangeElement.style.width = `${this.range * 2}px`;
            this.rangeElement.style.height = `${this.range * 2}px`;
            this.rangeElement.style.left = `${-this.range + 25}px`;
            this.rangeElement.style.top = `${-this.range + 25}px`;
        }
    }
    
    /**
     * Upgrade a specific attribute of the tower
     * @param {string} attribute - The attribute to upgrade ('range', 'damage', or 'attackSpeed')
     * @returns {number} - The cost of the upgrade
     */
    upgrade(attribute) {
        let level = 1;
        
        // Determine which attribute to upgrade and get current level
        switch(attribute) {
            case 'range':
                level = this.rangeLevel || 1;
                this.rangeLevel = level + 1;
                break;
            case 'damage':
                level = this.damageLevel || 1;
                this.damageLevel = level + 1;
                break;
            case 'attackSpeed':
                level = this.attackSpeedLevel || 1;
                this.attackSpeedLevel = level + 1;
                break;
            default:
                return 25; // Default cost if attribute is not recognized
        }
        
        // Update stats based on new levels
        this.updateStats();
        
        // Calculate upgrade cost (scales with level)
        return Math.floor(25 * Math.pow(1.4, level - 1));
    }
    
    /**
     * Get the upgrade cost for a specific attribute
     * @param {string} attribute - The attribute to check ('range', 'damage', or 'attackSpeed')
     * @returns {number} - The cost of the upgrade
     */
    getUpgradeCost(attribute) {
        let level;
        
        // Determine which attribute to upgrade and get current level
        switch(attribute) {
            case 'range':
                level = this.rangeLevel;
                break;
            case 'damage':
                level = this.damageLevel;
                break;
            case 'attackSpeed':
                level = this.attackSpeedLevel;
                break;
            default:
                return 25; // Default cost if attribute is not recognized
        }
        
        // Ensure level is valid
        if (level === undefined || level < 1) {
            level = 1;
        }
        
        // Calculate upgrade cost (scales with level)
        return Math.floor(25 * Math.pow(1.4, level - 1));
    }
    
    /**
     * Create the HTML element for this tower
     */
    createElement() {
        // Create tower element
        this.element = document.createElement('div');
        this.element.classList.add('tower', `tower-${this.type}`);
        this.element.style.left = `${this.x - 25}px`; // 25 = half of tower width
        this.element.style.top = `${this.y - 25}px`;
        
        // Create range indicator (hidden by default)
        this.rangeElement = document.createElement('div');
        this.rangeElement.classList.add('tower-range');
        this.rangeElement.style.width = `${this.range * 2}px`;
        this.rangeElement.style.height = `${this.range * 2}px`;
        this.rangeElement.style.left = `${-this.range + 25}px`; // Center range on tower
        this.rangeElement.style.top = `${-this.range + 25}px`;
        this.rangeElement.style.display = 'none';
        
        // Add to DOM
        this.element.appendChild(this.rangeElement);
        const towersContainer = document.getElementById('towers-container');
        towersContainer.appendChild(this.element);
        
        // Add click event for tower selection
        this.element.addEventListener('click', () => {
            this.gameState.selectTower(this);
        });
    }
    
    /**
     * Show the range indicator for this tower
     */
    showRange() {
        if (this.rangeElement) {
            this.rangeElement.style.display = 'block';
        }
    }
    
    /**
     * Hide the range indicator for this tower
     */
    hideRange() {
        if (this.rangeElement) {
            this.rangeElement.style.display = 'none';
        }
    }
    
    /**
     * Apply a specialization to this tower
     * @param {string} specializationType - The specialization type to apply
     */
    applySpecialization(specializationType) {
        this.specialization = specializationType;
        
        // Use updateStats to apply specialization effects on top of current upgrades
        this.updateStats();
        
        // Update tower appearance based on specialization
        this.element.classList.add(`tower-${this.type}-${specializationType}`);
    }
    
    /**
     * Find a target within range
     * @returns {Object|null} - The target enemy or null if none found
     */
    findTarget() {
        const enemies = this.gameState.enemies;
        let closestEnemy = null;
        let closestDistance = Infinity;
        
        // Find closest enemy in range
        for (const enemy of enemies) {
            if (enemy.isDead) continue;
            
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.range && distance < closestDistance) {
                closestEnemy = enemy;
                closestDistance = distance;
            }
        }
        
        return closestEnemy;
    }
    
    /**
     * Attack an enemy
     * @param {Enemy} enemy - The enemy to attack
     * @param {number} currentTime - The current game time in ms
     */
    attack(enemy, currentTime) {
        // Check if tower can attack based on attack speed
        const attackInterval = 1000 / this.attackSpeed; // Convert attacks/sec to ms
        if (currentTime - this.lastAttackTime < attackInterval) {
            return;
        }
        
        this.lastAttackTime = currentTime;
        
        // Special case for Tesla Disruptor - multi-target lightning
        if (this.type === 'tesla') {
            this.createTeslaChainEffect(enemy);
            return;
        }
        
        // Special case for Graviton Manipulator - multi-target slow
        if (this.type === 'graviton') {
            this.createGravitonMultiEffect(enemy);
            return;
        }
        
        // Create a projectile or effect based on tower type
        this.createAttackEffect(enemy);
        
        // Apply damage based on attack type
        if (this.attackType === 'single') {
            enemy.takeDamage(this.damage);
        } else if (this.attackType === 'aoe') {
            // Find all enemies in AOE radius
            const enemies = this.gameState.enemies;
            const targetX = enemy.x;
            const targetY = enemy.y;
            
            for (const nearbyEnemy of enemies) {
                if (nearbyEnemy.isDead) continue;
                
                const dx = nearbyEnemy.x - targetX;
                const dy = nearbyEnemy.y - targetY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= this.aoeRadius) {
                    nearbyEnemy.takeDamage(this.damage);
                }
            }
        } else if (this.attackType === 'debuff') {
            // Apply slow effect
            enemy.applySlow(this.slowAmount, this.slowDuration);
        } else if (this.attackType === 'dot') {
            // Apply damage over time effect
            this.applyDotEffect(enemy);
        }
    }
    
    /**
     * Create a multi-target lightning effect for Tesla Disruptor
     * @param {Enemy} primaryEnemy - The primary target enemy
     */
    createTeslaChainEffect(primaryEnemy) {
        const gameBoard = document.getElementById('game-board');
        const enemies = this.gameState.enemies.filter(e => !e.isDead); // Get all alive enemies
        
        // Track the enemies we'll hit
        const targets = [];
        
        // First, add the primary target
        targets.push(primaryEnemy);
        
        // Get the max number of targets we can hit simultaneously
        const maxTargets = this.specialization === 'voltage' ? 4 : 3;
        
        // Find additional targets within range of the tower (not the primary enemy)
        for (const potentialTarget of enemies) {
            // Skip the primary target or dead enemies
            if (potentialTarget === primaryEnemy || potentialTarget.isDead) continue;
            
            // Calculate distance from tower to potential target
            const dx = potentialTarget.x - this.x;
            const dy = potentialTarget.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Add targets within tower range, up to max targets
            if (distance <= this.range && targets.length < maxTargets) {
                targets.push(potentialTarget);
            }
            
            // Stop if we've hit our max
            if (targets.length >= maxTargets) break;
        }
        
        // Now attack all selected targets
        for (let i = 0; i < targets.length; i++) {
            const target = targets[i];
            
            // Create lightning bolt from tower to each target
            this.createLightningBolt(this.x, this.y, target.x, target.y, gameBoard);
            
            // Create impact effect at each target
            this.createImpactEffect(target.x, target.y, gameBoard);
            
            // Apply damage to each target
            target.takeDamage(this.damage);
            
            // Add slight delay between each bolt for visual effect
            setTimeout(() => {}, i * 20);
        }
    }
    
    /**
     * Create a lightning bolt visual effect between two points
     * @param {number} x1 - Source X position
     * @param {number} y1 - Source Y position
     * @param {number} x2 - Target X position
     * @param {number} y2 - Target Y position
     * @param {HTMLElement} gameBoard - The game board element
     * @param {number} [opacity=1] - The opacity of the lightning (0-1)
     */
    createLightningBolt(x1, y1, x2, y2, gameBoard, opacity = 1) {
        // Create lightning effect
        const lightning = document.createElement('div');
        lightning.classList.add('projectile', 'projectile-tesla');
        lightning.style.position = 'absolute';
        
        // Calculate angle and length
        const dx = x2 - x1;
        const dy = y2 - y1;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // Style lightning with opacity
        lightning.style.width = `${length}px`;
        lightning.style.height = '3px';
        lightning.style.backgroundColor = `rgba(46, 204, 113, ${0.7 * opacity})`;
        lightning.style.boxShadow = `0 0 10px rgba(46, 204, 113, ${0.9 * opacity})`;
        lightning.style.transformOrigin = 'left center';
        lightning.style.transform = `translate(${x1}px, ${y1}px) rotate(${angle}deg)`;
        lightning.style.zIndex = '4';
        
        gameBoard.appendChild(lightning);
        
        // Make lightning zigzag effect
        for (let i = 0; i < 3; i++) {
            const segment = document.createElement('div');
            segment.style.position = 'absolute';
            segment.style.width = '100%';
            segment.style.height = '100%';
            segment.style.top = `${Math.random() * 3 - 1.5}px`;
            segment.style.backgroundColor = `rgba(255, 255, 255, ${0.8 * opacity})`;
            segment.style.clipPath = 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)';
            lightning.appendChild(segment);
        }
        
        // Remove after animation
        setTimeout(() => {
            if (lightning.parentNode) {
                lightning.parentNode.removeChild(lightning);
            }
        }, 200);
    }
    
    /**
     * Create an impact effect at a target position
     * @param {number} x - Target X position
     * @param {number} y - Target Y position
     * @param {HTMLElement} gameBoard - The game board element
     * @param {number} [opacity=1] - The opacity of the impact (0-1)
     */
    createImpactEffect(x, y, gameBoard, opacity = 1) {
        // Add impact effect at target position
        const impact = document.createElement('div');
        impact.classList.add('tesla-impact');
        impact.style.position = 'absolute';
        impact.style.left = `${x}px`;
        impact.style.top = `${y}px`;
        impact.style.width = '30px';
        impact.style.height = '30px';
        impact.style.borderRadius = '50%';
        impact.style.backgroundColor = `rgba(46, 204, 113, ${0.3 * opacity})`;
        impact.style.boxShadow = `0 0 20px rgba(46, 204, 113, ${0.7 * opacity})`;
        impact.style.transform = 'translate(-50%, -50%) scale(0)';
        impact.style.transition = 'transform 0.2s ease-out';
        impact.style.zIndex = '3';
        
        gameBoard.appendChild(impact);
        
        // Animate the impact
        setTimeout(() => {
            impact.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 10);
        
        // Remove after animation
        setTimeout(() => {
            if (impact.parentNode) {
                impact.parentNode.removeChild(impact);
            }
        }, 200);
    }
    
    /**
     * Create a multi-target graviton effect
     * @param {Enemy} primaryEnemy - The primary target enemy
     */
    createGravitonMultiEffect(primaryEnemy) {
        const gameBoard = document.getElementById('game-board');
        const enemies = this.gameState.enemies.filter(e => !e.isDead); // Get all alive enemies
        
        // Track the enemies we'll hit
        const targets = [];
        
        // First, add the primary target
        targets.push(primaryEnemy);
        
        // Get the max number of targets we can hit simultaneously
        // More targets with horizon specialization
        const maxTargets = this.specialization === 'horizon' ? 6 : 4;
        
        // Find additional targets within range of the tower (not just the primary enemy)
        for (const potentialTarget of enemies) {
            // Skip the primary target or dead enemies
            if (potentialTarget === primaryEnemy || potentialTarget.isDead) continue;
            
            // Calculate distance from tower to potential target
            const dx = potentialTarget.x - this.x;
            const dy = potentialTarget.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Add targets within tower range, up to max targets
            if (distance <= this.range && targets.length < maxTargets) {
                targets.push(potentialTarget);
            }
            
            // Stop if we've hit our max
            if (targets.length >= maxTargets) break;
        }
        
        // Create the main pulse effect around the tower
        this.createGravitonPulseEffect(gameBoard);
        
        // Now apply slow effect to all selected targets
        for (let i = 0; i < targets.length; i++) {
            const target = targets[i];
            
            // Create target marker on each affected enemy
            this.createGravitonTargetMarker(target.x, target.y, gameBoard);
            
            // Apply slow effect to each target
            target.applySlow(this.slowAmount, this.slowDuration);
            
            // Add slight delay between each target for visual effect
            setTimeout(() => {}, i * 20);
        }
    }
    
    /**
     * Create the main pulse effect for Graviton tower
     * @param {HTMLElement} gameBoard - The game board element
     */
    createGravitonPulseEffect(gameBoard) {
        // Create graviton pulse effect
        const pulse = document.createElement('div');
        pulse.classList.add('projectile', 'projectile-graviton');
        pulse.style.position = 'absolute';
        pulse.style.left = `${this.x}px`;
        pulse.style.top = `${this.y}px`;
        pulse.style.width = '0';
        pulse.style.height = '0';
        pulse.style.borderRadius = '50%';
        pulse.style.backgroundColor = 'rgba(52, 152, 219, 0.2)';
        pulse.style.boxShadow = '0 0 20px rgba(52, 152, 219, 0.4)';
        pulse.style.transform = 'translate(-50%, -50%)';
        pulse.style.transition = 'width 0.5s ease-out, height 0.5s ease-out';
        pulse.style.zIndex = '2';
        
        gameBoard.appendChild(pulse);
        
        // Animate pulse
        setTimeout(() => {
            pulse.style.width = `${this.range * 2}px`;
            pulse.style.height = `${this.range * 2}px`;
        }, 10);
        
        // Remove after animation
        setTimeout(() => {
            if (pulse.parentNode) {
                pulse.parentNode.removeChild(pulse);
            }
        }, 500);
    }
    
    /**
     * Create a target marker for an enemy affected by Graviton
     * @param {number} x - Target X position
     * @param {number} y - Target Y position
     * @param {HTMLElement} gameBoard - The game board element
     */
    createGravitonTargetMarker(x, y, gameBoard) {
        // Add target marker on enemy
        const targetMarker = document.createElement('div');
        targetMarker.classList.add('graviton-target');
        targetMarker.style.position = 'absolute';
        targetMarker.style.left = `${x}px`;
        targetMarker.style.top = `${y}px`;
        targetMarker.style.width = '25px';
        targetMarker.style.height = '25px';
        targetMarker.style.borderRadius = '50%';
        targetMarker.style.border = '2px solid rgba(52, 152, 219, 0.7)';
        targetMarker.style.boxShadow = '0 0 10px rgba(52, 152, 219, 0.5)';
        targetMarker.style.transform = 'translate(-50%, -50%) scale(0)';
        targetMarker.style.transition = 'transform 0.3s ease-out';
        targetMarker.style.zIndex = '3';
        
        gameBoard.appendChild(targetMarker);
        
        // Animate target marker
        setTimeout(() => {
            targetMarker.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 100);
        
        // Remove after animation
        setTimeout(() => {
            if (targetMarker.parentNode) {
                targetMarker.parentNode.removeChild(targetMarker);
            }
        }, 500);
    }
    
    /**
     * Create a visual attack effect
     * @param {Enemy} enemy - The target enemy
     */
    createAttackEffect(enemy) {
        const gameBoard = document.getElementById('game-board');
        
        if (this.type === 'plasma') {
            // Create plasma projectile
            const projectile = document.createElement('div');
            projectile.classList.add('projectile', 'projectile-plasma');
            projectile.style.width = '8px';
            projectile.style.height = '8px';
            projectile.style.backgroundColor = '#f1c40f';
            projectile.style.borderRadius = '50%';
            projectile.style.position = 'absolute';
            projectile.style.left = `${this.x}px`;
            projectile.style.top = `${this.y}px`;
            projectile.style.transition = 'all 0.2s linear';
            projectile.style.zIndex = '5';
            projectile.style.boxShadow = '0 0 8px #f1c40f';
            
            gameBoard.appendChild(projectile);
            
            // Animate to enemy position
            setTimeout(() => {
                projectile.style.left = `${enemy.x}px`;
                projectile.style.top = `${enemy.y}px`;
            }, 10);
            
            // Remove after animation
            setTimeout(() => {
                if (projectile.parentNode) {
                    projectile.parentNode.removeChild(projectile);
                }
            }, 250);
            
        } else if (this.type === 'tesla') {
            // Tesla attacks are now handled by createTeslaChainEffect
            // This branch should not be reached, but keeping for safety
            console.log('Tesla attack incorrectly routed to createAttackEffect');
            
        } else if (this.type === 'graviton') {
            // Graviton attacks are now handled by createGravitonMultiEffect
            // This branch should not be reached, but keeping for safety
            console.log('Graviton attack incorrectly routed to createAttackEffect');
        }
    }
    
    /**
     * Apply a damage over time effect to an enemy
     * @param {Enemy} enemy - The enemy to affect
     */
    applyDotEffect(enemy) {
        const dotDuration = this.dotDuration || 3000; // Default 3 seconds
        const tickInterval = 500; // Damage every 500ms
        const damagePerTick = this.damage;
        
        let elapsed = 0;
        
        // Apply visual effect
        enemy.element.classList.add('dot-effect');
        
        // Set up interval for damage ticks
        const dotInterval = setInterval(() => {
            elapsed += tickInterval;
            
            // Apply damage tick
            if (!enemy.isDead) {
                enemy.takeDamage(damagePerTick);
            }
            
            // Check if effect is complete
            if (elapsed >= dotDuration || enemy.isDead) {
                clearInterval(dotInterval);
                if (enemy.element) {
                    enemy.element.classList.remove('dot-effect');
                }
            }
        }, tickInterval);
    }
    
    /**
     * Update the tower (find targets and attack)
     * @param {number} currentTime - The current game time in ms
     */
    update(currentTime) {
        // Find a target if we don't have one or current target is dead
        if (!this.target || this.target.isDead) {
            this.target = this.findTarget();
        }
        
        // Check if target is still in range
        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > this.range) {
                this.target = this.findTarget();
            }
        }
        
        // Attack target if we have one
        if (this.target) {
            this.attack(this.target, currentTime);
        }
    }
    
    /**
     * Get the value if this tower is sold
     * @returns {number} - The sell value
     */
    getSellValue() {
        let value = this.cost;

        // Add value for upgrade levels
        const upgradeLevels = (this.rangeLevel - 1) + (this.damageLevel - 1) + (this.attackSpeedLevel - 1);
        const upgradeValue = upgradeLevels * 15;

        // Add value for specialization
        const specializationValue = this.specialization ? 100 : 0;
        
        return Math.floor(value + upgradeValue + specializationValue);
    }
    
    /**
     * Get specialization options for this tower
     * @returns {Array} - Array of specialization info
     */
    getSpecializationOptions() {
        switch(this.type) {
            case 'plasma':
                return [
                    { id: 'overload', name: 'Plasma Overload', description: 'Doubles damage, slows attack speed', cost: 100 },
                    { id: 'explosive', name: 'Explosive Shot', description: 'Adds splash damage', cost: 100 },
                    { id: 'graviton', name: 'Graviton Rounds', description: 'Slows enemies by 30%', cost: 100 }
                ];
            
            case 'tesla':
                return [
                    { id: 'voltage', name: 'High Voltage', description: 'Increases damage, range, and targets four enemies', cost: 100 },
                    { id: 'focused', name: 'Focused Lightning', description: 'Converts to high burst single-target', cost: 100 },
                    { id: 'electro', name: 'Electro-Gravitic Pulse', description: 'Adds 20% slow effect', cost: 100 }
                ];
            
            case 'graviton':
                return [
                    { id: 'horizon', name: 'Event Horizon', description: 'Stronger slow effect on more targets', cost: 100 },
                    { id: 'singularity', name: 'Singularity Collapse', description: 'Deals damage over time', cost: 100 },
                    { id: 'railgun', name: 'Kinetic Railgun', description: 'Becomes a direct-damage railgun', cost: 100 }
                ];
        }
    }
    
    /**
     * Clean up this tower (remove from DOM)
     */
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}