/**
 * Represents the player's home base in the tower defense game
 */
export class Base {
    /**
     * Create a new home base
     * @param {number} x - The x position on the game board
     * @param {number} y - The y position on the game board
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.element = null;
        
        // Set base stats
        this.maxHP = 500;
        this.hp = this.maxHP;
        this.shields = 100;
        this.energy = 100;
        
        // Track upgrade levels
        this.shieldsLevel = 1;
        this.energyLevel = 1;
        this.hpLevel = 1;
        
        // Create HTML representation
        this.createElement();
    }
    
    /**
     * Create the HTML element for the base
     */
    createElement() {
        // The base element is created in HTML, we just need to get a reference to it
        this.element = document.getElementById('home-base');
        
        // Update stats display
        this.updateStatsDisplay();
    }
    
    /**
     * Update the base's stats display
     */
    updateStatsDisplay() {
        document.getElementById('base-hp').textContent = this.hp;
        document.getElementById('base-shields').textContent = this.shields;
        document.getElementById('base-energy').textContent = this.energy;
    }
    
    /**
     * Take damage when enemies reach the base
     * @param {number} amount - The amount of damage to take
     * @returns {boolean} - Whether the base is still alive
     */
    takeDamage(amount) {
        this.hp -= amount;
        
        // Apply visual effect
        this.element.classList.add('taking-damage');
        setTimeout(() => {
            this.element.classList.remove('taking-damage');
        }, 300);
        
        if (this.hp <= 0) {
            this.hp = 0;
            this.updateStatsDisplay();
            return false; // Base destroyed
        }
        
        this.updateStatsDisplay();
        return true; // Base still alive
    }
    
    /**
     * Repair the base using shields points between waves
     */
    repair() {
        // Calculate repair amount based on shields level
        const repairPoints = this.shields;
        this.hp = Math.min(this.maxHP, this.hp + repairPoints);
        
        // Apply visual effect
        this.element.classList.add('repairing');
        setTimeout(() => {
            this.element.classList.remove('repairing');
        }, 1000);
        
        this.updateStatsDisplay();
    }
    
    /**
     * Get the cost to upgrade a specific attribute
     * @param {string} attribute - The attribute to upgrade ('shields', 'energy', or 'hp')
     * @returns {number} - The upgrade cost
     */
    getUpgradeCost(attribute) {
        let level;
        const baseCost = 100;
        
        switch(attribute) {
            case 'shields':
                level = this.shieldsLevel;
                break;
            case 'energy':
                level = this.energyLevel;
                break;
            case 'hp':
                level = this.hpLevel;
                break;
            default:
                return 0;
        }
        
        // Apply exponential cost scaling as specified in game design
        return Math.floor(baseCost * Math.pow(1.3, level - 1));
    }
    
    /**
     * Upgrade a specific attribute of the base
     * @param {string} attribute - The attribute to upgrade ('shields', 'energy', or 'hp')
     * @returns {boolean} - Whether the upgrade was successful
     */
    upgrade(attribute) {
        switch(attribute) {
            case 'shields':
                this.shieldsLevel++;
                // Update shields based on level as per game doc
                if (this.shieldsLevel <= 5) {
                    this.shields = 100 + (this.shieldsLevel - 1) * 37.5; // Linear to 250 at level 5
                } else {
                    this.shields = 250 + (this.shieldsLevel - 5) * 70; // Steeper to 600 at level 10
                }
                break;
                
            case 'energy':
                this.energyLevel++;
                // Each level provides 5% rate of fire boost to towers
                break;
                
            case 'hp':
                this.hpLevel++;
                // Update max HP based on level
                const prevMaxHP = this.maxHP;
                this.maxHP = 500 * (1 + (this.hpLevel - 1) * 0.2); // 20% increase per level
                // Increase current HP proportionally
                this.hp += (this.maxHP - prevMaxHP);
                break;
                
            default:
                return false;
        }
        
        // Apply visual effect
        this.element.classList.add('upgrading');
        setTimeout(() => {
            this.element.classList.remove('upgrading');
        }, 500);
        
        // Update the stats display
        this.updateStatsDisplay();
        
        return true;
    }
    
    /**
     * Get the Tower Rate of Fire boost provided by energy upgrades
     * @returns {number} - The rate of fire multiplier (1.05 = 5% boost)
     */
    getTowerRateOfFireBoost() {
        // Calculate based on energy level as per game doc
        if (this.energyLevel <= 5) {
            return 1 + (this.energyLevel - 1) * 0.025; // Linear to 15% at level 5
        } else {
            return 1.15 + (this.energyLevel - 5) * 0.03; // Steeper to 30% at level 10
        }
    }
    
    /**
     * Get the Tower Damage Reduction provided by HP upgrades
     * @returns {number} - The damage reduction percentage (0.02 = 2% DR)
     */
    getTowerDamageReduction() {
        // Calculate based on HP level as per game doc
        return (this.hpLevel - 1) * 0.02; // 0 at level 1, 2% per level, to 12% at level 7
    }
    
    /**
     * Reset the base to its default state
     */
    resetToDefault() {
        // Reset stats to initial values
        this.maxHP = 500;
        this.hp = this.maxHP;
        this.shields = 100;
        this.energy = 100;
        
        // Reset upgrade levels
        this.shieldsLevel = 1;
        this.energyLevel = 1;
        this.hpLevel = 1;
        
        // Update stats display
        this.updateStatsDisplay();
    }
}