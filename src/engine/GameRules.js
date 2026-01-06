/**
 * =============================================================================
 * GameRules.js - Game Logic and Command Execution
 * =============================================================================
 * 
 * PURPOSE:
 * This module contains all game logic for executing player commands. It acts
 * as the "brain" of the game, interpreting parsed commands and modifying
 * game state accordingly.
 * 
 * RESPONSIBILITIES:
 * 1. Execute parsed commands (movement, inventory, examine, talk, use)
 * 2. Apply game rules and constraints (locked doors, required items)
 * 3. Trigger events based on actions (quest completion, unlocking)
 * 4. Produce appropriate output for the player
 * 
 * COMMAND HANDLERS:
 * Each command type has a dedicated handler method:
 * - handleLook() - Describe current room
 * - handleGo() - Move to another room
 * - handleExamine() - Describe an item or character
 * - handleTake() - Pick up an item
 * - handleDrop() - Put down an item
 * - handleInventory() - List carried items
 * - handleTalk() - Interact with a character
 * - handleUse() - Use an item (possibly on a target)
 * - handleHelp() - Show available commands
 * 
 * =============================================================================
 */

/**
 * GameRules - Class that executes game commands and manages game logic.
 * 
 * This class receives parsed commands and modifies game state through
 * the GameState instance. It uses the Renderer to display output.
 */
export class GameRules {
    
    /**
     * Creates a new GameRules instance.
     * 
     * @param {Object} content - All loaded game content
     *   { rooms, items, characters, commands, config }
     * @param {GameState} state - The game state manager
     * @param {Renderer} renderer - The UI renderer
     */
    constructor(content, state, renderer) {
        // =====================================================================
        // DEPENDENCIES
        // =====================================================================
        
        /**
         * content - All loaded game content from JSON files.
         * @type {Object}
         */
        this.content = content;
        
        /**
         * state - The game state manager.
         * @type {GameState}
         */
        this.state = state;
        
        /**
         * renderer - The UI renderer for displaying output.
         * @type {Renderer}
         */
        this.renderer = renderer;
        
        // =====================================================================
        // CONTENT LOOKUPS (for quick access)
        // =====================================================================
        
        /**
         * roomsById - Map of room ID to room object for quick lookup.
         * @type {Map<string, Object>}
         */
        this.roomsById = new Map();
        for (const room of content.rooms) {
            this.roomsById.set(room.id, room);
        }
        
        /**
         * itemsById - Map of item ID to item object for quick lookup.
         * @type {Map<string, Object>}
         */
        this.itemsById = new Map();
        for (const item of content.items) {
            this.itemsById.set(item.id, item);
        }
        
        /**
         * charactersById - Map of character ID to character object for quick lookup.
         * @type {Map<string, Object>}
         */
        this.charactersById = new Map();
        for (const char of content.characters) {
            this.charactersById.set(char.id, char);
        }
        
        // =====================================================================
        // COMMAND HANDLER MAP
        // =====================================================================
        
        /**
         * commandHandlers - Maps command verbs to their handler methods.
         * This makes adding new commands straightforward.
         * @type {Object.<string, Function>}
         */
        this.commandHandlers = {
            'look': this.handleLook.bind(this),
            'l': this.handleLook.bind(this),
            'go': this.handleGo.bind(this),
            'walk': this.handleGo.bind(this),
            'move': this.handleGo.bind(this),
            'examine': this.handleExamine.bind(this),
            'x': this.handleExamine.bind(this),
            'inspect': this.handleExamine.bind(this),
            'take': this.handleTake.bind(this),
            'get': this.handleTake.bind(this),
            'grab': this.handleTake.bind(this),
            'pickup': this.handleTake.bind(this),
            'drop': this.handleDrop.bind(this),
            'put': this.handleDrop.bind(this),
            'discard': this.handleDrop.bind(this),
            'inventory': this.handleInventory.bind(this),
            'i': this.handleInventory.bind(this),
            'inv': this.handleInventory.bind(this),
            'talk': this.handleTalk.bind(this),
            'speak': this.handleTalk.bind(this),
            'chat': this.handleTalk.bind(this),
            'use': this.handleUse.bind(this),
            'activate': this.handleUse.bind(this),
            'help': this.handleHelp.bind(this),
            '?': this.handleHelp.bind(this),
            'quit': this.handleQuit.bind(this),
            'exit': this.handleQuit.bind(this)
        };
        
        // Initialize item locations from room data
        this.state.initializeItemLocations(content.rooms);
    }
    
    // =========================================================================
    // PUBLIC METHODS
    // =========================================================================
    
    /**
     * execute - Executes a parsed command.
     * 
     * This is the main entry point for command execution. It looks up the
     * appropriate handler and delegates to it.
     * 
     * @param {Object} command - Parsed command object from CommandParser
     *   { verb, noun, preposition, target, raw, tokens }
     * @returns {void}
     */
    execute(command) {
        // command - The parsed command object
        
        // Handle empty command
        if (!command.verb || command.verb === '') {
            this.renderer.displayMessage('What would you like to do? Type "help" for available commands.');
            return;
        }
        
        // Check if verb is a direction (shortcut for "go <direction>")
        if (this.isDirection(command.verb)) {
            // Treat as "go <direction>"
            this.handleGo({ ...command, noun: command.verb });
            return;
        }
        
        // Look up the handler for this verb
        // handler - The function to handle this command, or undefined
        const handler = this.commandHandlers[command.verb];
        
        if (handler) {
            // Execute the handler
            handler(command);
        } else {
            // Unknown command
            this.renderer.displayError(
                `I don't understand "${command.verb}". ` +
                `Type "help" to see available commands.`
            );
        }
    }
    
    /**
     * getCurrentRoom - Gets the full room object for the current location.
     * 
     * @returns {Object|null} - The current room object, or null if not found
     */
    getCurrentRoom() {
        // currentRoomId - The ID of the current room
        const currentRoomId = this.state.getCurrentRoom();
        return this.roomsById.get(currentRoomId) || null;
    }
    
    // =========================================================================
    // COMMAND HANDLERS
    // =========================================================================
    
    /**
     * handleLook - Handles the "look" command.
     * 
     * Displays the current room's name, description, visible items,
     * characters present, and available exits.
     * 
     * @param {Object} command - The parsed command object
     * @returns {void}
     */
    handleLook(command) {
        // command - May have a noun to examine a specific thing
        
        // If a noun was specified, treat as examine
        if (command.noun) {
            this.handleExamine(command);
            return;
        }
        
        // Get the current room
        // room - The current room object
        const room = this.getCurrentRoom();
        
        if (!room) {
            this.renderer.displayError('Error: Current room not found!');
            return;
        }
        
        // Mark room as visited
        this.state.markRoomVisited(room.id);
        
        // Build the room description output
        this.displayRoomDescription(room);
    }
    
    /**
     * handleGo - Handles movement commands.
     * 
     * Moves the player to an adjacent room if the exit exists and
     * is not locked.
     * 
     * @param {Object} command - The parsed command with noun as direction
     * @returns {void}
     */
    handleGo(command) {
        // command.noun - The direction to move
        
        // Check if direction was specified
        if (!command.noun) {
            this.renderer.displayError('Which direction? Try "go north" or just "north".');
            return;
        }
        
        // Get current room
        // room - The current room object
        const room = this.getCurrentRoom();
        
        if (!room) {
            this.renderer.displayError('Error: Current room not found!');
            return;
        }
        
        // Get the direction and resolve any abbreviations
        // rawDirection - The direction as typed by the player (lowercase)
        const rawDirection = command.noun.toLowerCase();
        
        // direction - The canonical direction (e.g., 'n' becomes 'north')
        const direction = this.resolveDirectionSynonym(rawDirection);
        
        // Check if this exit exists
        if (!room.exits || !room.exits[direction]) {
            this.renderer.displayError(`You can't go ${direction} from here.`);
            this.showAvailableExits(room);
            return;
        }
        
        // Get the target room ID
        // targetRoomId - The ID of the room in that direction
        const targetRoomId = room.exits[direction];
        
        // Check for locked exits
        if (room.lockedExits && room.lockedExits[direction]) {
            // lockedInfo - Object describing what's needed to unlock
            const lockedInfo = room.lockedExits[direction];
            
            // Check if the player has met the unlock condition
            if (!this.checkUnlockCondition(lockedInfo)) {
                this.renderer.displayWarning(
                    lockedInfo.message || `The way ${direction} is locked.`
                );
                return;
            }
        }
        
        // Get the target room object
        // targetRoom - The room we're moving to
        const targetRoom = this.roomsById.get(targetRoomId);
        
        if (!targetRoom) {
            this.renderer.displayError(`Error: Target room "${targetRoomId}" not found!`);
            return;
        }
        
        // Move to the new room
        this.state.setCurrentRoom(targetRoomId);
        
        // Display the new room
        this.renderer.displayMessage(`You go ${direction}.\n`);
        this.displayRoomDescription(targetRoom);
        
        // Mark room as visited
        this.state.markRoomVisited(targetRoomId);
    }
    
    /**
     * handleExamine - Handles examining items, characters, or room features.
     * 
     * @param {Object} command - The parsed command with noun as thing to examine
     * @returns {void}
     */
    handleExamine(command) {
        // command.noun - The thing to examine
        
        // Check if something was specified to examine
        if (!command.noun) {
            this.renderer.displayError('Examine what? Try "examine <something>".');
            return;
        }
        
        // thingToExamine - The name of the thing (lowercase for matching)
        const thingToExamine = command.noun.toLowerCase();
        
        // First, try to find it as an item in inventory
        const inventoryItem = this.findItemInInventory(thingToExamine);
        if (inventoryItem) {
            this.displayItemDescription(inventoryItem);
            return;
        }
        
        // Try to find it as an item in the current room
        const roomItem = this.findItemInRoom(thingToExamine);
        if (roomItem) {
            this.displayItemDescription(roomItem);
            return;
        }
        
        // Try to find it as a character in the current room
        const character = this.findCharacterInRoom(thingToExamine);
        if (character) {
            this.displayCharacterDescription(character);
            return;
        }
        
        // Check if it's a room feature
        const room = this.getCurrentRoom();
        if (room && room.features && room.features[thingToExamine]) {
            this.renderer.displayMessage(room.features[thingToExamine]);
            return;
        }
        
        // Nothing found
        this.renderer.displayError(`You don't see any "${command.noun}" here.`);
    }
    
    /**
     * handleTake - Handles picking up items.
     * 
     * @param {Object} command - The parsed command with noun as item to take
     * @returns {void}
     */
    handleTake(command) {
        // command.noun - The item to take
        
        // Check if item was specified
        if (!command.noun) {
            this.renderer.displayError('Take what? Try "take <item>".');
            return;
        }
        
        // itemName - The name of the item to take (lowercase)
        const itemName = command.noun.toLowerCase();
        
        // Find the item in the current room
        const item = this.findItemInRoom(itemName);
        
        if (!item) {
            // Check if player already has it
            const inInventory = this.findItemInInventory(itemName);
            if (inInventory) {
                this.renderer.displayMessage(`You already have the ${inInventory.name}.`);
            } else {
                this.renderer.displayError(`You don't see any "${command.noun}" here to take.`);
            }
            return;
        }
        
        // Check if item is takeable
        if (item.takeable === false) {
            this.renderer.displayWarning(
                item.takeFailMessage || `You can't take the ${item.name}.`
            );
            return;
        }
        
        // Add item to inventory
        this.state.addItem(item.id);
        
        // Display success message
        this.renderer.displaySuccess(`You pick up the ${item.name}.`);
        
        // Check if this triggers any events
        if (item.onTake) {
            this.processEvent(item.onTake);
        }
    }
    
    /**
     * handleDrop - Handles dropping items from inventory.
     * 
     * @param {Object} command - The parsed command with noun as item to drop
     * @returns {void}
     */
    handleDrop(command) {
        // command.noun - The item to drop
        
        // Check if item was specified
        if (!command.noun) {
            this.renderer.displayError('Drop what? Try "drop <item>".');
            return;
        }
        
        // itemName - The name of the item to drop (lowercase)
        const itemName = command.noun.toLowerCase();
        
        // Find the item in inventory
        const item = this.findItemInInventory(itemName);
        
        if (!item) {
            this.renderer.displayError(`You're not carrying any "${command.noun}".`);
            return;
        }
        
        // Get current room ID
        const currentRoomId = this.state.getCurrentRoom();
        
        // Remove from inventory and place in room
        this.state.removeItem(item.id);
        this.state.setItemLocation(item.id, currentRoomId);
        
        // Display success message
        this.renderer.displaySuccess(`You drop the ${item.name}.`);
    }
    
    /**
     * handleInventory - Lists items the player is carrying.
     * 
     * @param {Object} command - The parsed command (unused for inventory)
     * @returns {void}
     */
    handleInventory(command) {
        // Get inventory item IDs
        // inventoryIds - Array of item IDs in inventory
        const inventoryIds = this.state.getInventory();
        
        if (inventoryIds.length === 0) {
            this.renderer.displayMessage("You're not carrying anything.");
            return;
        }
        
        // Build inventory list
        // inventoryText - String builder for inventory output
        let inventoryText = 'You are carrying:\n';
        
        for (const itemId of inventoryIds) {
            const item = this.itemsById.get(itemId);
            if (item) {
                inventoryText += `  • ${item.name}`;
                if (item.shortDescription) {
                    inventoryText += ` - ${item.shortDescription}`;
                }
                inventoryText += '\n';
            }
        }
        
        this.renderer.displayMessage(inventoryText);
    }
    
    /**
     * handleTalk - Handles talking to characters.
     * 
     * Initiates or continues dialogue with a character in the current room.
     * 
     * @param {Object} command - The parsed command with noun as character
     * @returns {void}
     */
    handleTalk(command) {
        // command.noun - The character to talk to
        
        // Check if character was specified
        if (!command.noun) {
            // List characters in the room as suggestions
            const room = this.getCurrentRoom();
            if (room && room.characters && room.characters.length > 0) {
                const charNames = room.characters.map(id => {
                    const char = this.charactersById.get(id);
                    return char ? char.name : id;
                }).join(', ');
                this.renderer.displayError(`Talk to whom? You can see: ${charNames}`);
            } else {
                this.renderer.displayError('There\'s no one here to talk to.');
            }
            return;
        }
        
        // characterName - The name of the character to talk to (lowercase)
        const characterName = command.noun.toLowerCase();
        
        // Find the character in the current room
        const character = this.findCharacterInRoom(characterName);
        
        if (!character) {
            this.renderer.displayError(`You don't see "${command.noun}" here to talk to.`);
            return;
        }
        
        // Start or continue dialogue
        this.runDialogue(character);
    }
    
    /**
     * handleUse - Handles using items, optionally on targets.
     * 
     * @param {Object} command - The parsed command
     *   { noun: item, preposition: 'on', target: thing }
     * @returns {void}
     */
    handleUse(command) {
        // command.noun - The item to use
        // command.target - What to use it on (optional)
        
        // Check if item was specified
        if (!command.noun) {
            this.renderer.displayError('Use what? Try "use <item>" or "use <item> on <target>".');
            return;
        }
        
        // itemName - The name of the item to use (lowercase)
        const itemName = command.noun.toLowerCase();
        
        // Find the item in inventory
        const item = this.findItemInInventory(itemName);
        
        if (!item) {
            // Check if it's in the room (can't use items you're not holding)
            const roomItem = this.findItemInRoom(itemName);
            if (roomItem) {
                this.renderer.displayWarning(
                    `You need to pick up the ${roomItem.name} first. Try "take ${roomItem.name.toLowerCase()}".`
                );
            } else {
                this.renderer.displayError(`You don't have any "${command.noun}".`);
            }
            return;
        }
        
        // Check if the item has use actions defined
        if (!item.useActions || item.useActions.length === 0) {
            this.renderer.displayMessage(
                item.useFailMessage || `You're not sure how to use the ${item.name}.`
            );
            return;
        }
        
        // If no target specified, look for a default action
        if (!command.target) {
            // defaultAction - Use action that doesn't require a target
            const defaultAction = item.useActions.find(action => !action.target);
            
            if (defaultAction) {
                this.executeUseAction(item, defaultAction);
            } else {
                this.renderer.displayError(
                    `Use the ${item.name} on what? Try "use ${item.name.toLowerCase()} on <target>".`
                );
            }
            return;
        }
        
        // Look for a matching use action for this target
        // targetName - The normalized target name
        const targetName = command.target.toLowerCase();
        
        // matchingAction - The use action for this target
        const matchingAction = item.useActions.find(action => {
            if (!action.target) return false;
            // Check if target matches (could be item ID or name)
            return action.target.toLowerCase() === targetName ||
                   this.matchesEntity(action.target, targetName);
        });
        
        if (matchingAction) {
            this.executeUseAction(item, matchingAction);
        } else {
            this.renderer.displayMessage(
                `Nothing happens when you try to use the ${item.name} on ${command.target}.`
            );
        }
    }
    
    /**
     * handleHelp - Displays help information.
     * 
     * @param {Object} command - The parsed command (noun for specific help)
     * @returns {void}
     */
    handleHelp(command) {
        // Get help text from the parser
        const helpText = `
╔════════════════════════════════════════════════════════════════╗
║                      STELLAR VOYAGER HELP                       ║
╠════════════════════════════════════════════════════════════════╣
║  MOVEMENT                                                       ║
║    go <direction>  - Move in a direction (north, south, etc.)  ║
║    n/s/e/w         - Shortcut for go north/south/east/west     ║
║                                                                 ║
║  EXPLORATION                                                    ║
║    look (or l)     - Describe your surroundings                ║
║    examine <thing> - Look closely at something                 ║
║                                                                 ║
║  INVENTORY                                                      ║
║    take <item>     - Pick up an item                           ║
║    drop <item>     - Put down an item                          ║
║    inventory (or i)- List what you're carrying                 ║
║                                                                 ║
║  INTERACTION                                                    ║
║    talk <person>   - Talk to a character                       ║
║    use <item>      - Use an item                               ║
║    use <item> on <target> - Use item on something              ║
║                                                                 ║
║  OTHER                                                          ║
║    help (or ?)     - Show this help                            ║
╚════════════════════════════════════════════════════════════════╝

TIP: You can use abbreviated directions: n, s, e, w, ne, nw, se, sw, u, d
`;
        
        this.renderer.displaySystemMessage(helpText);
    }
    
    /**
     * handleQuit - Handles quit/exit commands.
     * 
     * @param {Object} command - The parsed command (unused)
     * @returns {void}
     */
    handleQuit(command) {
        this.renderer.displayMessage(
            'Thanks for playing! Refresh the page to start a new game.'
        );
    }
    
    // =========================================================================
    // HELPER METHODS
    // =========================================================================
    
    /**
     * displayRoomDescription - Shows full description of a room.
     * 
     * @param {Object} room - The room object to describe
     * @returns {void}
     */
    displayRoomDescription(room) {
        // room - The room to describe
        
        // Build description parts
        // items - Items visible in this room
        const items = this.getItemsInRoom(room.id);
        
        // characters - Characters present in this room
        const characters = this.getCharactersInRoom(room.id);
        
        // exits - Available exits from this room
        const exits = room.exits || {};
        
        // Use renderer to display formatted room description
        this.renderer.displayRoomDescription(room, items, characters, exits);
        
        // Update suggested commands
        this.renderer.updateSuggestedCommands({
            room: room,
            items: items,
            characters: characters,
            exits: exits
        });
    }
    
    /**
     * displayItemDescription - Shows description of an item.
     * 
     * @param {Object} item - The item object to describe
     * @returns {void}
     */
    displayItemDescription(item) {
        // item - The item to describe
        
        // Build description
        let description = item.description;
        
        // Add any conditional description based on state
        if (item.stateDescriptions) {
            for (const [flag, text] of Object.entries(item.stateDescriptions)) {
                if (this.state.getFlag(flag)) {
                    description += '\n' + text;
                }
            }
        }
        
        this.renderer.displayMessage(description);
    }
    
    /**
     * displayCharacterDescription - Shows description of a character.
     * 
     * @param {Object} character - The character object to describe
     * @returns {void}
     */
    displayCharacterDescription(character) {
        // character - The character to describe
        
        this.renderer.displayMessage(character.description);
    }
    
    /**
     * showAvailableExits - Lists available exits from a room.
     * 
     * @param {Object} room - The room object
     * @returns {void}
     */
    showAvailableExits(room) {
        // room - The room to show exits for
        
        if (!room.exits || Object.keys(room.exits).length === 0) {
            return;
        }
        
        // exitList - Formatted string of available directions
        const exitList = Object.keys(room.exits).join(', ');
        
        this.renderer.displayMessage(`Available exits: ${exitList}`);
    }
    
    /**
     * isDirection - Checks if a word is a valid direction.
     * 
     * @param {string} word - The word to check
     * @returns {boolean} - True if it's a direction
     */
    isDirection(word) {
        // word - The word to check
        
        // validDirections - All recognized direction words and abbreviations
        const validDirections = [
            'north', 'south', 'east', 'west',
            'n', 's', 'e', 'w',
            'northeast', 'northwest', 'southeast', 'southwest',
            'ne', 'nw', 'se', 'sw',
            'up', 'down', 'u', 'd'
        ];
        
        return validDirections.includes(word.toLowerCase());
    }
    
    /**
     * resolveDirectionSynonym - Converts direction abbreviations to full form.
     * 
     * @param {string} direction - The direction (may be abbreviated)
     * @returns {string} - The canonical direction (e.g., 'n' -> 'north')
     */
    resolveDirectionSynonym(direction) {
        // direction - The input direction word (lowercase)
        
        // directionMap - Maps abbreviations to full direction names
        const directionMap = {
            'n': 'north',
            's': 'south',
            'e': 'east',
            'w': 'west',
            'ne': 'northeast',
            'nw': 'northwest',
            'se': 'southeast',
            'sw': 'southwest',
            'u': 'up',
            'd': 'down'
        };
        
        // Return the mapped direction or the original if not an abbreviation
        return directionMap[direction] || direction;
    }
    
    /**
     * findItemInInventory - Finds an item in player's inventory by name.
     * 
     * @param {string} name - The item name to search for
     * @returns {Object|null} - The item object, or null if not found
     */
    findItemInInventory(name) {
        // name - The name to search for (lowercase)
        
        // Get inventory item IDs
        const inventoryIds = this.state.getInventory();
        
        for (const itemId of inventoryIds) {
            const item = this.itemsById.get(itemId);
            if (item && this.matchesName(item, name)) {
                return item;
            }
        }
        
        return null;
    }
    
    /**
     * findItemInRoom - Finds an item in the current room by name.
     * 
     * @param {string} name - The item name to search for
     * @returns {Object|null} - The item object, or null if not found
     */
    findItemInRoom(name) {
        // name - The name to search for (lowercase)
        
        // Get current room ID
        const currentRoomId = this.state.getCurrentRoom();
        
        // Get items in the room
        const itemIds = this.state.getItemsInRoom(currentRoomId);
        
        for (const itemId of itemIds) {
            const item = this.itemsById.get(itemId);
            if (item && this.matchesName(item, name)) {
                return item;
            }
        }
        
        return null;
    }
    
    /**
     * findCharacterInRoom - Finds a character in the current room by name.
     * 
     * @param {string} name - The character name to search for
     * @returns {Object|null} - The character object, or null if not found
     */
    findCharacterInRoom(name) {
        // name - The name to search for (lowercase)
        
        // Get current room
        const room = this.getCurrentRoom();
        
        if (!room || !room.characters) {
            return null;
        }
        
        for (const charId of room.characters) {
            const character = this.charactersById.get(charId);
            if (character && this.matchesName(character, name)) {
                return character;
            }
        }
        
        return null;
    }
    
    /**
     * matchesName - Checks if an entity's name matches a search term.
     * 
     * Supports partial matching and aliases.
     * 
     * @param {Object} entity - The item or character to check
     * @param {string} searchName - The name to match against
     * @returns {boolean} - True if the name matches
     */
    matchesName(entity, searchName) {
        // entity - The item or character object
        // searchName - The search term (lowercase)
        
        // Check exact name match
        if (entity.name.toLowerCase() === searchName) {
            return true;
        }
        
        // Check ID match
        if (entity.id.toLowerCase() === searchName) {
            return true;
        }
        
        // Check if searchName is contained in name
        if (entity.name.toLowerCase().includes(searchName)) {
            return true;
        }
        
        // Check aliases if present
        if (entity.aliases) {
            for (const alias of entity.aliases) {
                if (alias.toLowerCase() === searchName) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * matchesEntity - Checks if a target string matches an entity.
     * 
     * Used for use actions to match targets.
     * 
     * @param {string} entityId - The entity ID from action definition
     * @param {string} searchName - The user's search term
     * @returns {boolean} - True if they match
     */
    matchesEntity(entityId, searchName) {
        // entityId - ID or name from action definition
        // searchName - What the user typed
        
        // Check items
        const item = this.itemsById.get(entityId);
        if (item && this.matchesName(item, searchName)) {
            return true;
        }
        
        // Check characters
        const character = this.charactersById.get(entityId);
        if (character && this.matchesName(character, searchName)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * getItemsInRoom - Gets full item objects for items in a room.
     * 
     * @param {string} roomId - The room ID
     * @returns {Object[]} - Array of item objects
     */
    getItemsInRoom(roomId) {
        // roomId - The room to check
        
        // Get item IDs from state
        const itemIds = this.state.getItemsInRoom(roomId);
        
        // Map to full item objects
        // items - Array to collect item objects
        const items = [];
        
        for (const itemId of itemIds) {
            const item = this.itemsById.get(itemId);
            if (item && item.visible !== false) {
                items.push(item);
            }
        }
        
        return items;
    }
    
    /**
     * getCharactersInRoom - Gets full character objects for characters in a room.
     * 
     * @param {string} roomId - The room ID
     * @returns {Object[]} - Array of character objects
     */
    getCharactersInRoom(roomId) {
        // roomId - The room to check
        
        // Get room data
        const room = this.roomsById.get(roomId);
        
        if (!room || !room.characters) {
            return [];
        }
        
        // Map to full character objects
        // characters - Array to collect character objects
        const characters = [];
        
        for (const charId of room.characters) {
            const character = this.charactersById.get(charId);
            if (character) {
                characters.push(character);
            }
        }
        
        return characters;
    }
    
    /**
     * checkUnlockCondition - Checks if a locked exit can be unlocked.
     * 
     * @param {Object} lockedInfo - Lock condition info from room data
     * @returns {boolean} - True if the condition is met
     */
    checkUnlockCondition(lockedInfo) {
        // lockedInfo - Object with condition for unlocking
        
        // Check required item
        if (lockedInfo.requiresItem) {
            if (!this.state.hasItem(lockedInfo.requiresItem)) {
                return false;
            }
        }
        
        // Check required flag
        if (lockedInfo.requiresFlag) {
            if (!this.state.getFlag(lockedInfo.requiresFlag)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * executeUseAction - Executes a use action for an item.
     * 
     * @param {Object} item - The item being used
     * @param {Object} action - The use action to execute
     * @returns {void}
     */
    executeUseAction(item, action) {
        // item - The item being used
        // action - The action definition { message, setFlag, giveItem, etc. }
        
        // Display the action message
        if (action.message) {
            this.renderer.displaySuccess(action.message);
        }
        
        // Set any flags
        if (action.setFlag) {
            this.state.setFlag(action.setFlag, true);
        }
        
        // Give any items
        if (action.giveItem) {
            this.state.addItem(action.giveItem);
            const givenItem = this.itemsById.get(action.giveItem);
            if (givenItem) {
                this.renderer.displayMessage(`You obtained: ${givenItem.name}`);
            }
        }
        
        // Remove item if consumable
        if (action.consume) {
            this.state.removeItem(item.id);
            this.state.setItemLocation(item.id, 'nowhere');
        }
    }
    
    /**
     * runDialogue - Runs dialogue interaction with a character.
     * 
     * @param {Object} character - The character to talk to
     * @returns {void}
     */
    runDialogue(character) {
        // character - The character object with dialogue tree
        
        // Check if character has dialogue
        if (!character.dialogue || character.dialogue.length === 0) {
            this.renderer.displayMessage(
                character.defaultGreeting || 
                `${character.name} doesn't seem to have anything to say.`
            );
            return;
        }
        
        // Get current dialogue state for this character
        // currentNodeId - The ID of the current dialogue node
        let currentNodeId = this.state.getDialogueState(character.id);
        
        // If no saved state, start from the first node
        if (!currentNodeId) {
            currentNodeId = character.dialogue[0].id;
        }
        
        // Find the current dialogue node
        // node - The dialogue node to display
        const node = character.dialogue.find(n => n.id === currentNodeId);
        
        if (!node) {
            // Fall back to first node if saved state is invalid
            const firstNode = character.dialogue[0];
            this.displayDialogueNode(character, firstNode);
            return;
        }
        
        this.displayDialogueNode(character, node);
    }
    
    /**
     * displayDialogueNode - Displays a dialogue node and processes effects.
     * 
     * @param {Object} character - The speaking character
     * @param {Object} node - The dialogue node to display
     * @returns {void}
     */
    displayDialogueNode(character, node) {
        // character - The character speaking
        // node - Dialogue node { id, text, setFlag, nextNode, etc. }
        
        // Display the dialogue text
        this.renderer.displayDialogue(character.name, node.text);
        
        // Process any effects
        if (node.setFlag) {
            this.state.setFlag(node.setFlag, true);
        }
        
        if (node.giveItem) {
            this.state.addItem(node.giveItem);
            const item = this.itemsById.get(node.giveItem);
            if (item) {
                this.renderer.displaySuccess(`${character.name} gives you: ${item.name}`);
            }
        }
        
        // Update dialogue state for next interaction
        if (node.nextNode) {
            this.state.setDialogueState(character.id, node.nextNode);
        } else {
            // No next node, reset to loop or stay
            if (node.loop) {
                this.state.setDialogueState(character.id, node.loop);
            }
        }
    }
    
    /**
     * processEvent - Processes a game event (from item/action triggers).
     * 
     * @param {Object} event - Event object with actions to perform
     * @returns {void}
     */
    processEvent(event) {
        // event - Event definition { message, setFlag, giveItem, etc. }
        
        if (event.message) {
            this.renderer.displayMessage(event.message);
        }
        
        if (event.setFlag) {
            this.state.setFlag(event.setFlag, true);
        }
        
        if (event.giveItem) {
            this.state.addItem(event.giveItem);
        }
    }
}
