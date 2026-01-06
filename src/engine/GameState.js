/**
 * =============================================================================
 * GameState.js - Game State Management
 * =============================================================================
 * 
 * PURPOSE:
 * This module manages all mutable game state, keeping it encapsulated in a
 * single class. This makes it easier to:
 * - Track what can change during gameplay
 * - Save/load game state (future feature)
 * - Debug state-related issues
 * 
 * STATE INCLUDES:
 * - Player's current location (room ID)
 * - Player's inventory (array of item IDs)
 * - Game flags (boolean/value markers for quest progress)
 * - Visited rooms (for tracking exploration)
 * - Command history (for up-arrow recall)
 * 
 * DESIGN PRINCIPLES:
 * - All state is private, accessed through methods
 * - State changes are made through explicit methods
 * - No direct mutation from outside the class
 * 
 * =============================================================================
 */

/**
 * GameState - Class that manages all mutable game state.
 * 
 * This class is the single source of truth for the game's current state.
 * All game systems that need to check or modify state go through this class.
 */
export class GameState {
    
    /**
     * Creates a new GameState instance with initial values.
     * 
     * @param {Object} config - Game configuration object from config.json
     *                         Must contain: startingRoom
     */
    constructor(config) {
        // =====================================================================
        // LOCATION STATE
        // =====================================================================
        
        /**
         * currentRoomId - The ID of the room where the player currently is.
         * This matches the 'id' field in rooms.json entries.
         * @type {string}
         */
        this.currentRoomId = config.startingRoom;
        
        // =====================================================================
        // INVENTORY STATE
        // =====================================================================
        
        /**
         * inventory - Array of item IDs that the player is carrying.
         * Items are added via 'take' and removed via 'drop'.
         * @type {string[]}
         */
        this.inventory = [];
        
        // =====================================================================
        // FLAG STATE
        // =====================================================================
        
        /**
         * flags - Object storing game progress flags.
         * Flags can be boolean (true/false) or any value.
         * Used for quest tracking, unlocking areas, dialogue states, etc.
         * @type {Object.<string, any>}
         */
        this.flags = {};
        
        // =====================================================================
        // EXPLORATION STATE
        // =====================================================================
        
        /**
         * visitedRooms - Set of room IDs the player has visited.
         * Used to show shortened descriptions on repeat visits.
         * @type {Set<string>}
         */
        this.visitedRooms = new Set();
        
        // =====================================================================
        // COMMAND HISTORY STATE
        // =====================================================================
        
        /**
         * commandHistory - Array of previous commands entered by the player.
         * Used for up-arrow command recall feature.
         * @type {string[]}
         */
        this.commandHistory = [];
        
        /**
         * historyIndex - Current position in command history for navigation.
         * -1 means not navigating history (fresh input).
         * @type {number}
         */
        this.historyIndex = -1;
        
        /**
         * tempInput - Stores the current input when navigating history.
         * This allows returning to what the player was typing.
         * @type {string}
         */
        this.tempInput = '';
        
        // =====================================================================
        // ITEM LOCATION TRACKING
        // =====================================================================
        
        /**
         * itemLocations - Maps item IDs to their current location.
         * Location can be a room ID, 'inventory', or 'nowhere'.
         * This is populated when rooms are first loaded.
         * @type {Map<string, string>}
         */
        this.itemLocations = new Map();
        
        // =====================================================================
        // CHARACTER STATE
        // =====================================================================
        
        /**
         * characterDialogueState - Tracks dialogue progress for each character.
         * Maps character ID to their current dialogue node ID.
         * @type {Map<string, string>}
         */
        this.characterDialogueState = new Map();
    }
    
    // =========================================================================
    // LOCATION METHODS
    // =========================================================================
    
    /**
     * getCurrentRoom - Gets the ID of the player's current room.
     * 
     * @returns {string} - The current room ID
     */
    getCurrentRoom() {
        return this.currentRoomId;
    }
    
    /**
     * setCurrentRoom - Changes the player's current room.
     * 
     * @param {string} roomId - The ID of the room to move to
     * @returns {void}
     */
    setCurrentRoom(roomId) {
        // roomId - The new room ID to set as current location
        this.currentRoomId = roomId;
    }
    
    /**
     * hasVisitedRoom - Checks if the player has visited a specific room.
     * 
     * @param {string} roomId - The room ID to check
     * @returns {boolean} - True if the room has been visited
     */
    hasVisitedRoom(roomId) {
        return this.visitedRooms.has(roomId);
    }
    
    /**
     * markRoomVisited - Marks a room as visited.
     * 
     * @param {string} roomId - The room ID to mark as visited
     * @returns {void}
     */
    markRoomVisited(roomId) {
        this.visitedRooms.add(roomId);
    }
    
    // =========================================================================
    // INVENTORY METHODS
    // =========================================================================
    
    /**
     * getInventory - Gets a copy of the player's inventory.
     * 
     * Returns a copy to prevent external modification.
     * 
     * @returns {string[]} - Array of item IDs in inventory
     */
    getInventory() {
        // Return a copy to prevent external mutation
        return [...this.inventory];
    }
    
    /**
     * hasItem - Checks if the player has a specific item.
     * 
     * @param {string} itemId - The item ID to check for
     * @returns {boolean} - True if the item is in inventory
     */
    hasItem(itemId) {
        return this.inventory.includes(itemId);
    }
    
    /**
     * addItem - Adds an item to the player's inventory.
     * 
     * Also updates the item's location tracking.
     * 
     * @param {string} itemId - The item ID to add
     * @returns {void}
     */
    addItem(itemId) {
        // Only add if not already in inventory
        if (!this.inventory.includes(itemId)) {
            this.inventory.push(itemId);
            this.itemLocations.set(itemId, 'inventory');
        }
    }
    
    /**
     * removeItem - Removes an item from the player's inventory.
     * 
     * @param {string} itemId - The item ID to remove
     * @returns {boolean} - True if the item was removed, false if not found
     */
    removeItem(itemId) {
        // index - Position of the item in inventory, or -1 if not found
        const index = this.inventory.indexOf(itemId);
        
        if (index !== -1) {
            this.inventory.splice(index, 1);
            return true;
        }
        return false;
    }
    
    // =========================================================================
    // ITEM LOCATION METHODS
    // =========================================================================
    
    /**
     * initializeItemLocations - Sets up initial item locations from room data.
     * 
     * Called during game initialization to track where all items start.
     * 
     * @param {Array} rooms - Array of room objects from rooms.json
     * @returns {void}
     */
    initializeItemLocations(rooms) {
        for (const room of rooms) {
            if (room.items && Array.isArray(room.items)) {
                for (const itemId of room.items) {
                    this.itemLocations.set(itemId, room.id);
                }
            }
        }
    }
    
    /**
     * getItemLocation - Gets the current location of an item.
     * 
     * @param {string} itemId - The item ID to look up
     * @returns {string|undefined} - Room ID, 'inventory', or undefined if not found
     */
    getItemLocation(itemId) {
        return this.itemLocations.get(itemId);
    }
    
    /**
     * setItemLocation - Updates an item's location.
     * 
     * @param {string} itemId - The item ID to update
     * @param {string} location - The new location (room ID or 'inventory')
     * @returns {void}
     */
    setItemLocation(itemId, location) {
        this.itemLocations.set(itemId, location);
    }
    
    /**
     * getItemsInRoom - Gets all items currently in a specific room.
     * 
     * @param {string} roomId - The room ID to check
     * @returns {string[]} - Array of item IDs in the room
     */
    getItemsInRoom(roomId) {
        // items - Array to collect item IDs in the room
        const items = [];
        
        for (const [itemId, location] of this.itemLocations) {
            if (location === roomId) {
                items.push(itemId);
            }
        }
        
        return items;
    }
    
    // =========================================================================
    // FLAG METHODS
    // =========================================================================
    
    /**
     * getFlag - Gets the value of a game flag.
     * 
     * @param {string} flagName - The name of the flag
     * @returns {any} - The flag value, or undefined if not set
     */
    getFlag(flagName) {
        return this.flags[flagName];
    }
    
    /**
     * setFlag - Sets a game flag to a value.
     * 
     * @param {string} flagName - The name of the flag
     * @param {any} value - The value to set (typically boolean or number)
     * @returns {void}
     */
    setFlag(flagName, value) {
        this.flags[flagName] = value;
    }
    
    /**
     * hasFlag - Checks if a flag exists and is truthy.
     * 
     * @param {string} flagName - The name of the flag
     * @returns {boolean} - True if the flag exists and is truthy
     */
    hasFlag(flagName) {
        return Boolean(this.flags[flagName]);
    }
    
    /**
     * getAllFlags - Gets a copy of all flags.
     * 
     * @returns {Object} - Copy of all flag values
     */
    getAllFlags() {
        return { ...this.flags };
    }
    
    // =========================================================================
    // COMMAND HISTORY METHODS
    // =========================================================================
    
    /**
     * addToHistory - Adds a command to the history.
     * 
     * Prevents duplicate consecutive entries.
     * 
     * @param {string} command - The command to add
     * @returns {void}
     */
    addToHistory(command) {
        // Don't add empty commands
        if (!command || command.trim() === '') {
            return;
        }
        
        // Don't add if it's the same as the last command
        const lastCommand = this.commandHistory[this.commandHistory.length - 1];
        if (command !== lastCommand) {
            this.commandHistory.push(command);
        }
        
        // Reset history navigation
        this.historyIndex = -1;
        this.tempInput = '';
    }
    
    /**
     * navigateHistory - Moves through command history.
     * 
     * @param {number} direction - -1 for older commands, 1 for newer
     * @returns {string} - The command at the new history position
     */
    navigateHistory(direction) {
        // direction - Which way to move: -1 = back (older), 1 = forward (newer)
        
        // If no history, return empty
        if (this.commandHistory.length === 0) {
            return '';
        }
        
        // If starting navigation, save current index position
        if (this.historyIndex === -1 && direction === -1) {
            // Starting to navigate backward
            this.historyIndex = this.commandHistory.length;
        }
        
        // Calculate new index
        // newIndex - The proposed new position in history
        const newIndex = this.historyIndex + direction;
        
        // Bounds checking
        if (newIndex < 0) {
            // Can't go further back, return oldest
            this.historyIndex = 0;
            return this.commandHistory[0];
        }
        
        if (newIndex >= this.commandHistory.length) {
            // At the end, return to fresh input
            this.historyIndex = -1;
            return this.tempInput;
        }
        
        // Valid index, return that command
        this.historyIndex = newIndex;
        return this.commandHistory[this.historyIndex];
    }
    
    // =========================================================================
    // DIALOGUE STATE METHODS
    // =========================================================================
    
    /**
     * getDialogueState - Gets the current dialogue state for a character.
     * 
     * @param {string} characterId - The character ID
     * @returns {string|undefined} - Current dialogue node ID or undefined
     */
    getDialogueState(characterId) {
        return this.characterDialogueState.get(characterId);
    }
    
    /**
     * setDialogueState - Sets the dialogue state for a character.
     * 
     * @param {string} characterId - The character ID
     * @param {string} nodeId - The dialogue node ID
     * @returns {void}
     */
    setDialogueState(characterId, nodeId) {
        this.characterDialogueState.set(characterId, nodeId);
    }
    
    // =========================================================================
    // SERIALIZATION METHODS (for future save/load)
    // =========================================================================
    
    /**
     * toJSON - Converts game state to a serializable object.
     * 
     * Useful for saving game state to localStorage or a file.
     * 
     * @returns {Object} - Serializable state object
     */
    toJSON() {
        return {
            currentRoomId: this.currentRoomId,
            inventory: [...this.inventory],
            flags: { ...this.flags },
            visitedRooms: [...this.visitedRooms],
            itemLocations: Object.fromEntries(this.itemLocations),
            characterDialogueState: Object.fromEntries(this.characterDialogueState)
        };
    }
    
    /**
     * fromJSON - Restores game state from a serialized object.
     * 
     * Useful for loading saved games.
     * 
     * @param {Object} data - Previously serialized state object
     * @returns {void}
     */
    fromJSON(data) {
        // data - Serialized state object from toJSON()
        
        this.currentRoomId = data.currentRoomId;
        this.inventory = [...data.inventory];
        this.flags = { ...data.flags };
        this.visitedRooms = new Set(data.visitedRooms);
        this.itemLocations = new Map(Object.entries(data.itemLocations));
        this.characterDialogueState = new Map(Object.entries(data.characterDialogueState));
    }
}
