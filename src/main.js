/**
 * =============================================================================
 * main.js - Application Entry Point
 * =============================================================================
 * 
 * PURPOSE:
 * This is the main entry point for the interactive fiction game. It orchestrates
 * the initialization of all game systems and coordinates the loading of game
 * content from JSON files.
 * 
 * RESPONSIBILITIES:
 * 1. Import all engine modules
 * 2. Initialize the game engine components in correct order
 * 3. Load game content (rooms, items, characters, etc.)
 * 4. Start the game loop
 * 5. Handle any top-level errors gracefully
 * 
 * ARCHITECTURE:
 * The game uses a modular architecture with clear separation of concerns:
 * - ContentLoader: Handles JSON file loading and validation
 * - GameState: Manages player state (location, inventory, flags)
 * - CommandParser: Parses player input into commands
 * - GameRules: Executes game logic (movement, inventory, etc.)
 * - Renderer: Handles all UI updates and user interaction
 * 
 * USAGE:
 * This file is loaded as an ES module from index.html:
 * <script type="module" src="src/main.js"></script>
 * 
 * The game automatically starts when the DOM is fully loaded.
 * 
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================
// Import all engine modules using ES module syntax.
// Each module is responsible for a specific aspect of the game.

import { ContentLoader } from './engine/ContentLoader.js';  // Loads JSON content
import { GameState } from './engine/GameState.js';          // Manages game state
import { CommandParser } from './engine/CommandParser.js';  // Parses player commands
import { GameRules } from './engine/GameRules.js';          // Executes game rules
import { Renderer } from './engine/Renderer.js';            // Handles UI rendering

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * BASE_CONTENT_PATH - The directory path where JSON content files are stored.
 * All content files (rooms, items, characters, etc.) are loaded from this path.
 * This makes it easy to change the content location if needed.
 */
const BASE_CONTENT_PATH = './content';

/**
 * CONTENT_FILES - An array of content file configurations to load.
 * Each entry specifies the filename and a human-readable description.
 * The order matters: some content may depend on others being loaded first.
 */
const CONTENT_FILES = [
    { file: 'config.json', name: 'Game Configuration' },     // Game settings and objectives
    { file: 'commands.json', name: 'Commands & Synonyms' },  // Command definitions
    { file: 'rooms.json', name: 'Rooms' },                   // Room definitions
    { file: 'items.json', name: 'Items' },                   // Item definitions
    { file: 'characters.json', name: 'Characters' }          // Character definitions
];

// =============================================================================
// GLOBAL GAME INSTANCE
// =============================================================================

/**
 * game - The main game controller object.
 * This object is initialized once the DOM is loaded and holds references
 * to all the major game systems. It's defined at module scope so it can
 * be accessed by event handlers.
 * 
 * Structure after initialization:
 * {
 *   content: { config, commands, rooms, items, characters },
 *   state: GameState instance,
 *   parser: CommandParser instance,
 *   rules: GameRules instance,
 *   renderer: Renderer instance
 * }
 */
let game = null;

// =============================================================================
// INITIALIZATION FUNCTIONS
// =============================================================================

/**
 * initializeGame - Main initialization function that sets up the entire game.
 * 
 * This function is called when the DOM is ready. It performs the following steps:
 * 1. Create a ContentLoader and load all JSON content
 * 2. Create instances of all game engine components
 * 3. Wire up the components together
 * 4. Display the initial game state to the player
 * 
 * @async
 * @returns {Promise<void>} - Resolves when initialization is complete
 * @throws {Error} - If content loading fails or initialization errors occur
 */
async function initializeGame() {
    // Create a temporary renderer first to show loading messages
    const tempRenderer = new Renderer();  // Renderer for displaying loading status
    
    try {
        // ---------------------------------------------------------------------
        // STEP 1: Display loading message
        // ---------------------------------------------------------------------
        tempRenderer.showLoadingMessage('Initializing Stellar Voyager...');
        
        // ---------------------------------------------------------------------
        // STEP 2: Load all game content from JSON files
        // ---------------------------------------------------------------------
        const contentLoader = new ContentLoader(BASE_CONTENT_PATH);  // Loader for JSON files
        const content = await loadAllContent(contentLoader, tempRenderer);  // Loaded content object
        
        // ---------------------------------------------------------------------
        // STEP 3: Create game engine components
        // ---------------------------------------------------------------------
        
        // Create the game state manager with initial configuration
        const state = new GameState(content.config);  // Manages player state
        
        // Create the command parser with synonym mappings
        const parser = new CommandParser(content.commands);  // Parses player input
        
        // Create the renderer for UI updates (reuse the temp one)
        const renderer = tempRenderer;  // Handles all UI rendering
        
        // Create the game rules engine with access to content and state
        const rules = new GameRules(content, state, renderer);  // Executes game logic
        
        // ---------------------------------------------------------------------
        // STEP 4: Assemble the game object
        // ---------------------------------------------------------------------
        game = {
            content: content,    // All loaded game content
            state: state,        // Current game state
            parser: parser,      // Command parser
            rules: rules,        // Game rules engine
            renderer: renderer   // UI renderer
        };
        
        // ---------------------------------------------------------------------
        // STEP 5: Set up input handling
        // ---------------------------------------------------------------------
        setupInputHandlers(game);
        
        // ---------------------------------------------------------------------
        // STEP 6: Clear loading message and show initial game state
        // ---------------------------------------------------------------------
        renderer.clearOutput();
        showWelcomeMessage(game);
        
        // Execute an initial "look" command to show the starting room
        executeCommand('look');
        
        // Update the status panel with initial state
        renderer.updateStatusPanel(state, content);
        
    } catch (error) {
        // Handle initialization errors with a user-friendly message
        handleInitializationError(error, tempRenderer);
    }
}

/**
 * loadAllContent - Loads all content files and returns them as an object.
 * 
 * This function iterates through CONTENT_FILES and loads each one,
 * displaying progress to the user as it goes.
 * 
 * @async
 * @param {ContentLoader} loader - The ContentLoader instance to use
 * @param {Renderer} renderer - The Renderer to show loading progress
 * @returns {Promise<Object>} - Object containing all loaded content
 * @throws {Error} - If any content file fails to load
 */
async function loadAllContent(loader, renderer) {
    // content - Object to store all loaded content, keyed by content type
    const content = {};
    
    // Iterate through each content file configuration
    for (const fileConfig of CONTENT_FILES) {
        // fileConfig.file - The filename to load (e.g., 'rooms.json')
        // fileConfig.name - Human-readable name for display
        
        // Update the loading message to show current file
        renderer.showLoadingMessage(`Loading ${fileConfig.name}...`);
        
        // Load and validate the JSON file
        const data = await loader.loadFile(fileConfig.file);  // Loaded JSON data
        
        // Extract the content type from the filename (e.g., 'rooms' from 'rooms.json')
        const contentType = fileConfig.file.replace('.json', '');  // Content key
        
        // Store the loaded data in the content object
        content[contentType] = data;
    }
    
    // Validate that all content references are consistent
    loader.validateContentReferences(content);
    
    return content;
}

/**
 * setupInputHandlers - Configures event listeners for player input.
 * 
 * This sets up:
 * - Enter key to submit commands
 * - Up/Down arrows for command history navigation
 * - Submit button click handler
 * - Click handlers for suggested commands
 * 
 * @param {Object} gameInstance - The initialized game object
 * @returns {void}
 */
function setupInputHandlers(gameInstance) {
    // inputElement - The text input field where players type commands
    const inputElement = document.getElementById('command-input');
    
    // submitButton - The button to submit commands (alternative to Enter key)
    const submitButton = document.getElementById('submit-button');
    
    // -------------------------------------------------------------------------
    // Input field keyboard event handler
    // -------------------------------------------------------------------------
    inputElement.addEventListener('keydown', (event) => {
        // event - The keyboard event object
        
        if (event.key === 'Enter') {
            // Enter key: Submit the current command
            event.preventDefault();  // Prevent default form submission
            submitCommand();
        } else if (event.key === 'ArrowUp') {
            // Up arrow: Navigate to previous command in history
            event.preventDefault();  // Prevent cursor movement
            navigateHistory(-1);  // -1 means go back in history
        } else if (event.key === 'ArrowDown') {
            // Down arrow: Navigate to next command in history
            event.preventDefault();  // Prevent cursor movement
            navigateHistory(1);  // 1 means go forward in history
        }
    });
    
    // -------------------------------------------------------------------------
    // Submit button click handler
    // -------------------------------------------------------------------------
    submitButton.addEventListener('click', () => {
        submitCommand();
        inputElement.focus();  // Return focus to input field after click
    });
    
    // -------------------------------------------------------------------------
    // Set up suggested command click handlers
    // -------------------------------------------------------------------------
    // These are handled by the Renderer when commands are displayed
    gameInstance.renderer.setupSuggestedCommandHandler((command) => {
        // command - The suggested command that was clicked
        executeCommand(command);
    });
}

/**
 * submitCommand - Handles submission of a player command from the input field.
 * 
 * This function:
 * 1. Gets the command text from the input field
 * 2. Clears the input field
 * 3. Adds the command to history
 * 4. Executes the command
 * 
 * @returns {void}
 */
function submitCommand() {
    // inputElement - The command input text field
    const inputElement = document.getElementById('command-input');
    
    // commandText - The raw text the player typed, with whitespace trimmed
    const commandText = inputElement.value.trim();
    
    // Don't process empty commands
    if (commandText === '') {
        return;
    }
    
    // Clear the input field for the next command
    inputElement.value = '';
    
    // Execute the command
    executeCommand(commandText);
}

/**
 * executeCommand - Parses and executes a player command.
 * 
 * This is the main command processing pipeline:
 * 1. Display the command in the output (echo)
 * 2. Parse the command into a structured form
 * 3. Execute the command using game rules
 * 4. Update the status panel
 * 
 * @param {string} commandText - The raw command text from the player
 * @returns {void}
 */
function executeCommand(commandText) {
    // Guard: Don't process if game isn't initialized
    if (!game) {
        console.error('Game not initialized');
        return;
    }
    
    // -------------------------------------------------------------------------
    // Step 1: Echo the command to output (except for 'look' on game start)
    // -------------------------------------------------------------------------
    if (commandText.toLowerCase() !== 'look' || game.state.commandHistory.length > 0) {
        game.renderer.displayCommand(commandText);
    }
    
    // -------------------------------------------------------------------------
    // Step 2: Add to command history
    // -------------------------------------------------------------------------
    game.state.addToHistory(commandText);
    
    // -------------------------------------------------------------------------
    // Step 3: Parse the command
    // -------------------------------------------------------------------------
    // parsedCommand - Structured representation of the player's intent
    // Contains: { verb, noun, preposition, target, raw }
    const parsedCommand = game.parser.parse(commandText);
    
    // -------------------------------------------------------------------------
    // Step 4: Execute the command using game rules
    // -------------------------------------------------------------------------
    game.rules.execute(parsedCommand);
    
    // -------------------------------------------------------------------------
    // Step 5: Update the status panel to reflect any changes
    // -------------------------------------------------------------------------
    game.renderer.updateStatusPanel(game.state, game.content);
    
    // -------------------------------------------------------------------------
    // Step 6: Check for game completion
    // -------------------------------------------------------------------------
    checkGameCompletion();
}

/**
 * navigateHistory - Moves through command history for the input field.
 * 
 * Allows players to recall previous commands using up/down arrows.
 * 
 * @param {number} direction - Direction to navigate: -1 for back, 1 for forward
 * @returns {void}
 */
function navigateHistory(direction) {
    // Guard: Don't navigate if game isn't initialized
    if (!game) {
        return;
    }
    
    // inputElement - The command input text field
    const inputElement = document.getElementById('command-input');
    
    // Get the previous/next command from history
    // previousCommand - The command from history, or empty string if at end
    const previousCommand = game.state.navigateHistory(direction);
    
    // Update the input field with the historical command
    inputElement.value = previousCommand;
    
    // Move cursor to end of input (for editing convenience)
    inputElement.setSelectionRange(
        inputElement.value.length,
        inputElement.value.length
    );
}

/**
 * showWelcomeMessage - Displays the initial welcome message to the player.
 * 
 * This introduces the game premise and provides basic instructions.
 * 
 * @param {Object} gameInstance - The initialized game object
 * @returns {void}
 */
function showWelcomeMessage(gameInstance) {
    // config - Game configuration containing title and intro text
    const config = gameInstance.content.config;
    
    // Build the welcome message with game title and introduction
    const welcomeText = `
${config.title || 'Welcome to the Adventure'}

${config.introText || 'Your adventure begins...'}

Type 'help' at any time to see available commands.
`;
    
    // Display the welcome message
    gameInstance.renderer.displaySystemMessage(welcomeText);
}

/**
 * checkGameCompletion - Checks if the player has completed all objectives.
 * 
 * If all objectives are complete, displays a victory message.
 * 
 * @returns {void}
 */
function checkGameCompletion() {
    // Guard: Don't check if game isn't initialized
    if (!game) {
        return;
    }
    
    // Don't check if game already completed
    if (game.state.getFlag('gameCompleted')) {
        return;
    }
    
    // config - Game configuration containing objectives
    const config = game.content.config;
    
    // Check if all objectives are complete
    if (config.objectives && Array.isArray(config.objectives)) {
        // allComplete - Boolean indicating if all objectives are done
        const allComplete = config.objectives.every((objective) => {
            // objective - Single objective with flag and description
            return game.state.getFlag(objective.flag);
        });
        
        if (allComplete) {
            // Mark game as completed to prevent repeat messages
            game.state.setFlag('gameCompleted', true);
            
            // Display victory message
            const victoryText = config.victoryText || 'Congratulations! You have completed all objectives!';
            game.renderer.displaySuccessMessage(`\n${victoryText}\n`);
        }
    }
}

/**
 * handleInitializationError - Handles errors that occur during game startup.
 * 
 * Displays a user-friendly error message and logs details for debugging.
 * 
 * @param {Error} error - The error that occurred
 * @param {Renderer} renderer - The Renderer to display the error
 * @returns {void}
 */
function handleInitializationError(error, renderer) {
    // Log the full error for developers
    console.error('Game initialization failed:', error);
    
    // Build a user-friendly error message
    const errorMessage = `
⚠️ Game Initialization Failed

There was a problem loading the game. This could be due to:

1. Running the game from a file:// URL (CORS restriction)
   Solution: Use a local web server. Try: npx serve

2. Missing or malformed content files
   Solution: Ensure all JSON files in /content are valid

3. Network error
   Solution: Check your internet connection

Technical details: ${error.message}

Please check the browser console (F12) for more details.
`;
    
    // Display the error to the user
    renderer.displayErrorMessage(errorMessage);
}

// =============================================================================
// DOM READY HANDLER
// =============================================================================

/**
 * Wait for the DOM to be fully loaded before initializing the game.
 * This ensures all HTML elements exist before we try to access them.
 */
if (document.readyState === 'loading') {
    // DOM is still loading, wait for DOMContentLoaded event
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    // DOM is already loaded, initialize immediately
    initializeGame();
}
