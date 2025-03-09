/**
 * Represents an enemy in the tower defense game
 */
export class Enemy {
    /**
     * Create a new enemy
     * @param {string} type - The type of enemy ('swarmer', 'brute', or 'juggernaut')
     * @param {number} level - The current wave level
     * @param {Array} path - The path points the enemy will follow
     */
    constructor(type, level, path) {
        this.type = type;
        this.level = level;
        this.path = path;
        this.pathIndex = 0;
        this.distanceAlongPath = 0;
        this.element = null;
        this.isDead = false;
        this.isSlowed = false;
        this.slowDuration = 0;
        this.slowAmount = 0;
        
        // Set base stats according to type
        this.setBaseStats();
        
        // Apply level-based scaling
        this.applyScaling();
        
        // Create HTML representation
        this.createElement();
        
        // Set starting position
        this.x = path[0].x;
        this.y = path[0].y;
        this.updatePosition();
    }
    
    /**
     * Set the base stats for this enemy based on its type
     */
    setBaseStats() {
        switch(this.type) {
            case 'swarmer':
                this.baseHealth = 50;
                this.baseCurrency = 5;
                this.baseSpeed = 2; // pixels per frame
                this.armor = 0;
                this.damageReduction = 0;
                this.scalingFactor = 1.15;
                this.width = 25;
                this.height = 25;
                break;
            
            case 'brute':
                this.baseHealth = 150;
                this.baseCurrency = 15;
                this.baseSpeed = 1.2; // pixels per frame
                this.armor = 10;
                this.damageReduction = 0.1;
                this.scalingFactor = 1.2;
                this.width = 40;
                this.height = 40;
                break;
                
            case 'juggernaut':
                this.baseHealth = 300;
                this.baseCurrency = 30;
                this.baseSpeed = 0.7; // pixels per frame
                this.armor = 25;
                this.damageReduction = 0.25;
                this.scalingFactor = 1.3;
                this.width = 60;
                this.height = 60;
                break;
        }
    }
    
    /**
     * Apply level-based scaling to the enemy stats
     */
    applyScaling() {
        // Scale health based on wave level
        this.maxHealth = Math.round(this.baseHealth * Math.pow(this.scalingFactor, this.level - 1));
        this.health = this.maxHealth;
        
        // Scale currency drop based on game doc formula
        this.currencyValue = Math.floor((this.baseHealth / 10) + (this.level * 2));
    }
    
    /**
     * Create the HTML element for this enemy
     */
    createElement() {
        this.element = document.createElement('div');
        this.element.classList.add('enemy', `enemy-${this.type}`);
        
        // Add health display
        this.healthBar = document.createElement('div');
        this.healthBar.classList.add('health-bar');
        this.healthBar.style.width = '80%';
        this.healthBar.style.height = '3px';
        this.healthBar.style.backgroundColor = '#27ae60';
        this.healthBar.style.position = 'absolute';
        this.healthBar.style.bottom = '0';
        this.healthBar.style.left = '10%';
        
        this.element.appendChild(this.healthBar);
        
        // Add to the game board
        const enemiesContainer = document.getElementById('enemies-container');
        enemiesContainer.appendChild(this.element);
    }
    
    /**
     * Update the enemy's position on the screen
     */
    updatePosition() {
        if (!this.element) return;
        
        this.element.style.left = `${this.x - this.width / 2}px`;
        this.element.style.top = `${this.y - this.height / 2}px`;
    }
    
    /**
     * Apply a slowdown effect to the enemy
     * @param {number} amount - The percentage to slow (0-1)
     * @param {number} duration - How long the slow lasts in ms
     */
    applySlow(amount, duration) {
        this.isSlowed = true;
        this.slowAmount = amount;
        this.slowDuration = duration;
    }
    
    /**
     * Update the enemy's health bar
     */
    updateHealthBar() {
        const healthPercent = this.health / this.maxHealth * 100;
        this.healthBar.style.width = `${healthPercent * 0.8}%`; // 80% width max
        
        // Change color based on health
        if (healthPercent < 25) {
            this.healthBar.style.backgroundColor = '#e74c3c';
        } else if (healthPercent < 50) {
            this.healthBar.style.backgroundColor = '#f39c12';
        }
    }
    
    /**
     * Deal damage to the enemy
     * @param {number} amount - The amount of damage to deal
     * @returns {boolean} - Whether the enemy died from this damage
     */
    takeDamage(amount) {
        // Apply damage reduction
        const actualDamage = amount * (1 - this.damageReduction);
        this.health -= actualDamage;
        
        // Update health bar
        this.updateHealthBar();
        
        // Check if enemy is dead
        if (this.health <= 0 && !this.isDead) {
            this.die();
            return true;
        }
        
        return false;
    }
    
    /**
     * Handle enemy death
     */
    die() {
        this.isDead = true;
        
        // Add visual effect
        this.element.classList.add('dying');
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }, 300);
        
        // Return currency value to game
        return this.currencyValue;
    }
    
    /**
     * Move the enemy along its path
     * @param {number} deltaTime - Time since last update in ms
     * @returns {boolean} - Whether the enemy reached the base
     */
    move(deltaTime) {
        if (this.isDead) return false;
        
        // Calculate movement speed (with potential slow effect)
        let currentSpeed = this.baseSpeed;
        if (this.isSlowed) {
            currentSpeed *= (1 - this.slowAmount);
            this.slowDuration -= deltaTime;
            
            if (this.slowDuration <= 0) {
                this.isSlowed = false;
            }
        }
        
        // Convert time to frames (assuming 60fps)
        const frameDelta = deltaTime / (1000 / 60);
        const distanceToMove = currentSpeed * frameDelta;
        
        // Move along path
        if (this.pathIndex < this.path.length - 1) {
            const currentPoint = this.path[this.pathIndex];
            const nextPoint = this.path[this.pathIndex + 1];
            
            // Calculate direction and distance to next point
            const dx = nextPoint.x - currentPoint.x;
            const dy = nextPoint.y - currentPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Calculate how far along this segment we are
            this.distanceAlongPath += distanceToMove;
            const progressAlongSegment = this.distanceAlongPath / distance;
            
            if (progressAlongSegment >= 1) {
                // We've reached the next point
                this.pathIndex++;
                this.distanceAlongPath = 0;
                
                // Check if we've reached the base
                if (this.pathIndex >= this.path.length - 1) {
                    return true; // Reached the end of the path (the base)
                }
            } else {
                // We're still moving along this segment
                this.x = currentPoint.x + dx * progressAlongSegment;
                this.y = currentPoint.y + dy * progressAlongSegment;
            }
        }
        
        // Update visual position
        this.updatePosition();
        return false;
    }
    
    /**
     * Clean up this enemy (remove from DOM)
     */
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}