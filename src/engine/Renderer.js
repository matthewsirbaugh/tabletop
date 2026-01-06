/**
 * =============================================================================
 * Renderer.js - UI Rendering and Display
 * =============================================================================
 * 
 * PURPOSE:
 * This module handles all user interface rendering, including:
 * - Displaying game output messages
 * - Updating the status panel
 * - Managing the output log scrolling
 * - Showing suggested commands
 * - Formatting different message types (rooms, dialogue, errors, etc.)
 * 
 * SEPARATION OF CONCERNS:
 * The Renderer is responsible ONLY for display. It does not:
 * - Parse commands (that's CommandParser)
 * - Modify game state (that's GameState)
 * - Execute game logic (that's GameRules)
 * 
 * This separation makes it easy to:
 * - Change the UI without affecting game logic
 * - Test rendering independently
 * - Add new display features
 * 
 * =============================================================================
 */

/**
 * Renderer - Class that handles all UI updates and display.
 * 
 * This class provides methods for displaying different types of content
 * in the game interface, all formatted consistently with appropriate
 * CSS classes for styling.
 */
export class Renderer {
    
    /**
     * Creates a new Renderer instance.
     * 
     * Caches references to DOM elements for efficiency.
     */
    constructor() {
        // =====================================================================
        // DOM ELEMENT REFERENCES
        // =====================================================================
        
        /**
         * outputLog - The container element for game output messages.
         * Messages are appended here and it scrolls automatically.
         * @type {HTMLElement}
         */
        this.outputLog = document.getElementById('output-log');
        
        /**
         * suggestedCommands - The container for clickable command suggestions.
         * @type {HTMLElement}
         */
        this.suggestedCommands = document.getElementById('suggested-commands');
        
        /**
         * currentLocation - Element showing the current room name.
         * @type {HTMLElement}
         */
        this.currentLocation = document.getElementById('current-location');
        
        /**
         * objectiveList - Container for objective checklist items.
         * @type {HTMLElement}
         */
        this.objectiveList = document.getElementById('objective-list');
        
        /**
         * itemCount - Element showing the inventory item count.
         * @type {HTMLElement}
         */
        this.itemCount = document.getElementById('item-count');
        
        // =====================================================================
        // CALLBACK STORAGE
        // =====================================================================
        
        /**
         * suggestedCommandCallback - Function to call when a suggested command is clicked.
         * @type {Function|null}
         */
        this.suggestedCommandCallback = null;
    }
    
    // =========================================================================
    // PUBLIC METHODS - Message Display
    // =========================================================================
    
    /**
     * displayMessage - Displays a standard game message.
     * 
     * @param {string} text - The message text to display
     * @returns {void}
     */
    displayMessage(text) {
        // text - The message content
        
        // Create message element
        // messageElement - The DOM element for this message
        const messageElement = this.createMessageElement(text, 'message-response');
        
        // Add to output log
        this.appendToLog(messageElement);
    }
    
    /**
     * displayCommand - Displays the player's command as an echo.
     * 
     * Shows what the player typed, formatted distinctly from game responses.
     * 
     * @param {string} command - The command text the player entered
     * @returns {void}
     */
    displayCommand(command) {
        // command - The player's input
        
        // Create command echo element
        const commandElement = this.createMessageElement(command, 'message-command');
        
        // Add to output log
        this.appendToLog(commandElement);
    }
    
    /**
     * displayError - Displays an error message.
     * 
     * Used for invalid commands, missing targets, etc.
     * 
     * @param {string} text - The error message text
     * @returns {void}
     */
    displayError(text) {
        // text - The error message content
        
        const errorElement = this.createMessageElement(text, 'message-error');
        this.appendToLog(errorElement);
    }
    
    /**
     * displayErrorMessage - Alias for displayError for consistency.
     * 
     * @param {string} text - The error message text
     * @returns {void}
     */
    displayErrorMessage(text) {
        this.displayError(text);
    }
    
    /**
     * displaySuccess - Displays a success message.
     * 
     * Used for successful actions like picking up items.
     * 
     * @param {string} text - The success message text
     * @returns {void}
     */
    displaySuccess(text) {
        // text - The success message content
        
        const successElement = this.createMessageElement(text, 'message-success');
        this.appendToLog(successElement);
    }
    
    /**
     * displaySuccessMessage - Alias for displaySuccess.
     * 
     * @param {string} text - The success message text
     * @returns {void}
     */
    displaySuccessMessage(text) {
        this.displaySuccess(text);
    }
    
    /**
     * displayWarning - Displays a warning message.
     * 
     * Used for blocked actions, locked doors, etc.
     * 
     * @param {string} text - The warning message text
     * @returns {void}
     */
    displayWarning(text) {
        // text - The warning message content
        
        const warningElement = this.createMessageElement(text, 'message-warning');
        this.appendToLog(warningElement);
    }
    
    /**
     * displaySystemMessage - Displays a system message (help, intro, etc.).
     * 
     * @param {string} text - The system message text
     * @returns {void}
     */
    displaySystemMessage(text) {
        // text - The system message content
        
        const systemElement = this.createMessageElement(text, 'message-system');
        this.appendToLog(systemElement);
    }
    
    /**
     * displayDialogue - Displays dialogue from a character.
     * 
     * @param {string} speaker - The name of the character speaking
     * @param {string} text - The dialogue text
     * @returns {void}
     */
    displayDialogue(speaker, text) {
        // speaker - The character's name
        // text - What they're saying
        
        // Create the dialogue container
        // dialogueElement - The DOM element for this dialogue
        const dialogueElement = document.createElement('div');
        dialogueElement.className = 'output-message message-dialogue';
        
        // Create speaker name span
        // speakerSpan - Element for the speaker's name
        const speakerSpan = document.createElement('span');
        speakerSpan.className = 'dialogue-speaker';
        speakerSpan.textContent = speaker + ': ';
        
        // Create text span
        // textSpan - Element for the dialogue text
        const textSpan = document.createElement('span');
        textSpan.textContent = text;
        
        // Assemble the dialogue element
        dialogueElement.appendChild(speakerSpan);
        dialogueElement.appendChild(textSpan);
        
        // Add to output log
        this.appendToLog(dialogueElement);
    }
    
    /**
     * displayRoomDescription - Displays a full room description.
     * 
     * Formats the room name, description, items, characters, and exits
     * in a structured, readable format.
     * 
     * @param {Object} room - The room object
     * @param {Object[]} items - Array of item objects in the room
     * @param {Object[]} characters - Array of character objects in the room
     * @param {Object} exits - Object mapping directions to room IDs
     * @returns {void}
     */
    displayRoomDescription(room, items, characters, exits) {
        // room - The room data object
        // items - Items visible in the room
        // characters - Characters present in the room
        // exits - Available exits
        
        // Create the room description container
        // roomElement - The DOM element for this room description
        const roomElement = document.createElement('div');
        roomElement.className = 'output-message message-room';
        
        // Add room name
        // nameElement - Element for the room's name
        const nameElement = document.createElement('div');
        nameElement.className = 'room-name';
        nameElement.textContent = room.name;
        roomElement.appendChild(nameElement);
        
        // Add room description
        // descElement - Element for the room's description
        const descElement = document.createElement('p');
        descElement.className = 'room-description';
        descElement.textContent = room.description;
        roomElement.appendChild(descElement);
        
        // Add items if present
        if (items && items.length > 0) {
            // itemsElement - Element listing items in the room
            const itemsElement = document.createElement('p');
            itemsElement.className = 'room-list';
            
            // Build item list text
            const itemNames = items.map(item => item.name).join(', ');
            itemsElement.textContent = `You can see: ${itemNames}`;
            roomElement.appendChild(itemsElement);
        }
        
        // Add characters if present
        if (characters && characters.length > 0) {
            // charsElement - Element listing characters in the room
            const charsElement = document.createElement('p');
            charsElement.className = 'room-list';
            
            // Build character list text
            const charNames = characters.map(char => char.name).join(', ');
            charsElement.textContent = `Present here: ${charNames}`;
            roomElement.appendChild(charsElement);
        }
        
        // Add exits
        if (exits && Object.keys(exits).length > 0) {
            // exitsElement - Element listing available exits
            const exitsElement = document.createElement('p');
            exitsElement.className = 'room-list';
            
            // Build exit list text
            const exitDirections = Object.keys(exits).join(', ');
            exitsElement.textContent = `Exits: ${exitDirections}`;
            roomElement.appendChild(exitsElement);
        }
        
        // Add to output log
        this.appendToLog(roomElement);
    }
    
    /**
     * showLoadingMessage - Displays a loading status message.
     * 
     * Used during game initialization.
     * 
     * @param {string} text - The loading status text
     * @returns {void}
     */
    showLoadingMessage(text) {
        // text - The loading status
        
        // Clear previous loading messages
        if (this.outputLog) {
            this.outputLog.innerHTML = '';
        }
        
        // Display loading message
        this.displaySystemMessage(text);
    }
    
    /**
     * clearOutput - Clears all messages from the output log.
     * 
     * @returns {void}
     */
    clearOutput() {
        if (this.outputLog) {
            this.outputLog.innerHTML = '';
        }
    }
    
    // =========================================================================
    // PUBLIC METHODS - Status Panel
    // =========================================================================
    
    /**
     * updateStatusPanel - Updates the status panel with current game state.
     * 
     * @param {GameState} state - The current game state
     * @param {Object} content - The game content (for room names, objectives)
     * @returns {void}
     */
    updateStatusPanel(state, content) {
        // state - Current game state
        // content - Game content for lookups
        
        // Update location display
        this.updateLocationDisplay(state, content);
        
        // Update objective display
        this.updateObjectiveDisplay(state, content);
        
        // Update inventory count
        this.updateInventoryCount(state);
    }
    
    /**
     * updateLocationDisplay - Updates the current location in status panel.
     * 
     * @param {GameState} state - The current game state
     * @param {Object} content - The game content (for room names)
     * @returns {void}
     */
    updateLocationDisplay(state, content) {
        // state - Current game state
        // content - For room name lookup
        
        if (!this.currentLocation) {
            return;
        }
        
        // Get current room ID
        const currentRoomId = state.getCurrentRoom();
        
        // Find the room object
        const room = content.rooms.find(r => r.id === currentRoomId);
        
        // Update display
        if (room) {
            this.currentLocation.textContent = room.name;
        } else {
            this.currentLocation.textContent = currentRoomId;
        }
    }
    
    /**
     * updateObjectiveDisplay - Updates the objective checklist in status panel.
     * 
     * @param {GameState} state - The current game state
     * @param {Object} content - The game content (for objectives)
     * @returns {void}
     */
    updateObjectiveDisplay(state, content) {
        // state - Current game state (for flag checks)
        // content - For objective definitions
        
        if (!this.objectiveList) {
            return;
        }
        
        // Clear current objectives
        this.objectiveList.innerHTML = '';
        
        // Get objectives from config
        const objectives = content.config.objectives || [];
        
        // Create checkbox item for each objective
        for (const objective of objectives) {
            // isComplete - Whether this objective's flag is set
            const isComplete = state.getFlag(objective.flag);
            
            // Create objective item
            // objectiveItem - DOM element for this objective
            const objectiveItem = document.createElement('div');
            objectiveItem.className = 'objective-item';
            
            // Create checkbox
            // checkbox - The checkbox indicator element
            const checkbox = document.createElement('span');
            checkbox.className = 'objective-checkbox';
            if (isComplete) {
                checkbox.classList.add('completed');
                checkbox.textContent = '☑';
            } else {
                checkbox.textContent = '☐';
            }
            
            // Create text
            // textSpan - The objective description text
            const textSpan = document.createElement('span');
            textSpan.className = 'objective-text';
            if (isComplete) {
                textSpan.classList.add('completed');
            }
            textSpan.textContent = objective.description;
            
            // Assemble and add
            objectiveItem.appendChild(checkbox);
            objectiveItem.appendChild(textSpan);
            this.objectiveList.appendChild(objectiveItem);
        }
    }
    
    /**
     * updateInventoryCount - Updates the item count in status panel.
     * 
     * @param {GameState} state - The current game state
     * @returns {void}
     */
    updateInventoryCount(state) {
        // state - Current game state
        
        if (!this.itemCount) {
            return;
        }
        
        // Get inventory count
        const count = state.getInventory().length;
        
        // Update display
        this.itemCount.textContent = count.toString();
    }
    
    // =========================================================================
    // PUBLIC METHODS - Suggested Commands
    // =========================================================================
    
    /**
     * setupSuggestedCommandHandler - Sets up click handling for suggested commands.
     * 
     * @param {Function} callback - Function to call with clicked command text
     * @returns {void}
     */
    setupSuggestedCommandHandler(callback) {
        // callback - Function to execute clicked command
        
        this.suggestedCommandCallback = callback;
    }
    
    /**
     * updateSuggestedCommands - Updates the suggested command buttons.
     * 
     * @param {Object} context - Current context for generating suggestions
     *   { room, items, characters, exits }
     * @returns {void}
     */
    updateSuggestedCommands(context) {
        // context - Current game context
        
        if (!this.suggestedCommands) {
            return;
        }
        
        // Clear current suggestions
        this.suggestedCommands.innerHTML = '';
        
        // Generate suggestions based on context
        // suggestions - Array of command strings to suggest
        const suggestions = this.generateSuggestions(context);
        
        // Create buttons for each suggestion
        for (const suggestion of suggestions) {
            // button - The clickable command button
            const button = document.createElement('button');
            button.className = 'suggested-command';
            button.textContent = suggestion;
            button.type = 'button';
            
            // Add click handler
            button.addEventListener('click', () => {
                if (this.suggestedCommandCallback) {
                    this.suggestedCommandCallback(suggestion);
                }
            });
            
            this.suggestedCommands.appendChild(button);
        }
        
        // Show the suggestions container
        this.suggestedCommands.classList.remove('hidden');
    }
    
    /**
     * hideSuggestedCommands - Hides the suggested commands area.
     * 
     * @returns {void}
     */
    hideSuggestedCommands() {
        if (this.suggestedCommands) {
            this.suggestedCommands.classList.add('hidden');
        }
    }
    
    // =========================================================================
    // PRIVATE METHODS
    // =========================================================================
    
    /**
     * createMessageElement - Creates a DOM element for a message.
     * 
     * @private
     * @param {string} text - The message text
     * @param {string} className - CSS class for styling
     * @returns {HTMLElement} - The created element
     */
    createMessageElement(text, className) {
        // text - The message content
        // className - CSS class for this message type
        
        // Create the message container
        // element - The DOM element for this message
        const element = document.createElement('div');
        element.className = `output-message ${className}`;
        
        // Handle multi-line text by creating paragraph elements
        // lines - Array of text lines
        const lines = text.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.trim() === '' && i > 0 && i < lines.length - 1) {
                // Empty line in the middle - create a line break
                element.appendChild(document.createElement('br'));
            } else if (line.trim() !== '') {
                // Non-empty line - create a paragraph
                const p = document.createElement('p');
                p.textContent = line;
                element.appendChild(p);
            }
        }
        
        return element;
    }
    
    /**
     * appendToLog - Appends an element to the output log and scrolls.
     * 
     * @private
     * @param {HTMLElement} element - The element to append
     * @returns {void}
     */
    appendToLog(element) {
        // element - The DOM element to add
        
        if (!this.outputLog) {
            console.warn('Output log element not found');
            return;
        }
        
        // Append the element
        this.outputLog.appendChild(element);
        
        // Scroll to the bottom to show new content
        this.scrollToBottom();
    }
    
    /**
     * scrollToBottom - Scrolls the output log to show the latest content.
     * 
     * @private
     * @returns {void}
     */
    scrollToBottom() {
        if (this.outputLog) {
            this.outputLog.scrollTop = this.outputLog.scrollHeight;
        }
    }
    
    /**
     * generateSuggestions - Generates suggested commands based on context.
     * 
     * @private
     * @param {Object} context - Current game context
     * @returns {string[]} - Array of suggested command strings
     */
    generateSuggestions(context) {
        // context - { room, items, characters, exits }
        
        // suggestions - Array to collect command suggestions
        const suggestions = [];
        
        // Suggest looking around (always helpful)
        suggestions.push('look');
        
        // Suggest examining items in the room (first 2)
        if (context.items && context.items.length > 0) {
            for (const item of context.items.slice(0, 2)) {
                suggestions.push(`examine ${item.name.toLowerCase()}`);
            }
        }
        
        // Suggest talking to characters
        if (context.characters && context.characters.length > 0) {
            for (const char of context.characters.slice(0, 2)) {
                // Use first name only for brevity
                const firstName = char.name.split(' ')[0].toLowerCase();
                suggestions.push(`talk ${firstName}`);
            }
        }
        
        // Suggest available exits (first 3)
        if (context.exits) {
            const exitDirs = Object.keys(context.exits).slice(0, 3);
            for (const dir of exitDirs) {
                suggestions.push(`go ${dir}`);
            }
        }
        
        // Suggest checking inventory
        suggestions.push('inventory');
        
        // Limit total suggestions
        return suggestions.slice(0, 8);
    }
}
