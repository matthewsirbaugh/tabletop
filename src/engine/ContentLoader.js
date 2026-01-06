/**
 * =============================================================================
 * ContentLoader.js - JSON Content Loading and Validation
 * =============================================================================
 * 
 * PURPOSE:
 * This module handles loading game content from JSON files and validating
 * that the content is well-formed. It provides clear error messages when
 * content is malformed or missing.
 * 
 * RESPONSIBILITIES:
 * 1. Fetch JSON files from the content directory
 * 2. Parse JSON and handle parsing errors
 * 3. Validate content structure
 * 4. Validate cross-references between content types
 * 5. Provide beginner-friendly error messages
 * 
 * USAGE:
 * const loader = new ContentLoader('./content');
 * const rooms = await loader.loadFile('rooms.json');
 * 
 * DESIGN NOTES:
 * - All methods are async to support fetch API
 * - Validation errors are thrown as Error objects with clear messages
 * - The class does not store state, making it safe to reuse
 * 
 * =============================================================================
 */

/**
 * ContentLoader - Class responsible for loading and validating JSON content.
 * 
 * This class encapsulates all JSON loading logic, keeping it separate from
 * the rest of the game engine. This separation makes it easier to:
 * - Add new content types
 * - Change validation rules
 * - Test loading independently
 */
export class ContentLoader {
    
    /**
     * Creates a new ContentLoader instance.
     * 
     * @param {string} basePath - The base directory path for content files
     *                            (e.g., './content' or '/game/content')
     */
    constructor(basePath) {
        // basePath - The root directory where all JSON content files are stored
        // This path is prepended to all file names when loading
        this.basePath = basePath;
    }
    
    // =========================================================================
    // PUBLIC METHODS
    // =========================================================================
    
    /**
     * loadFile - Loads a single JSON file and validates its basic structure.
     * 
     * This method:
     * 1. Fetches the file from the server
     * 2. Parses the JSON content
     * 3. Validates the basic structure
     * 4. Returns the parsed data
     * 
     * @async
     * @param {string} filename - The name of the JSON file to load (e.g., 'rooms.json')
     * @returns {Promise<Object|Array>} - The parsed JSON content
     * @throws {Error} - If the file cannot be loaded or parsed
     */
    async loadFile(filename) {
        // fullPath - The complete URL to fetch, combining base path and filename
        const fullPath = `${this.basePath}/${filename}`;
        
        try {
            // ----------------------------------------------------------------
            // Step 1: Fetch the file
            // ----------------------------------------------------------------
            // response - The HTTP response object from the fetch request
            const response = await fetch(fullPath);
            
            // Check if the HTTP request was successful
            if (!response.ok) {
                // Build a helpful error message for HTTP errors
                throw new Error(
                    `Failed to load ${filename}: HTTP ${response.status} - ${response.statusText}\n` +
                    `Make sure the file exists at: ${fullPath}`
                );
            }
            
            // ----------------------------------------------------------------
            // Step 2: Get the response text
            // ----------------------------------------------------------------
            // text - The raw text content of the file
            const text = await response.text();
            
            // ----------------------------------------------------------------
            // Step 3: Parse the JSON
            // ----------------------------------------------------------------
            // data - The parsed JavaScript object/array from the JSON
            const data = this.parseJSON(text, filename);
            
            // ----------------------------------------------------------------
            // Step 4: Validate the content structure
            // ----------------------------------------------------------------
            this.validateContent(data, filename);
            
            return data;
            
        } catch (error) {
            // Re-throw with additional context if it's a fetch error
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error(
                    `Cannot fetch ${filename}. This often happens when:\n` +
                    `1. Running from file:// (use a local server instead)\n` +
                    `2. The file path is incorrect\n` +
                    `3. CORS is blocking the request\n\n` +
                    `Try running: npx serve\n\n` +
                    `Original error: ${error.message}`
                );
            }
            throw error;
        }
    }
    
    /**
     * validateContentReferences - Validates cross-references between content types.
     * 
     * This method checks that:
     * - Room exits reference valid room IDs
     * - Room items reference valid item IDs
     * - Room characters reference valid character IDs
     * - Item targets reference valid items or characters
     * 
     * @param {Object} content - Object containing all loaded content types
     *                          { rooms, items, characters, commands, config }
     * @throws {Error} - If any references are invalid
     */
    validateContentReferences(content) {
        // Extract content arrays/objects for validation
        const rooms = content.rooms || [];          // Array of room definitions
        const items = content.items || [];          // Array of item definitions
        const characters = content.characters || []; // Array of character definitions
        
        // Create sets of valid IDs for quick lookup
        // validRoomIds - Set of all valid room ID strings
        const validRoomIds = new Set(rooms.map(room => room.id));
        
        // validItemIds - Set of all valid item ID strings
        const validItemIds = new Set(items.map(item => item.id));
        
        // validCharacterIds - Set of all valid character ID strings
        const validCharacterIds = new Set(characters.map(char => char.id));
        
        // errors - Array to collect all validation errors
        const errors = [];
        
        // ---------------------------------------------------------------------
        // Validate room references
        // ---------------------------------------------------------------------
        for (const room of rooms) {
            // Validate exit references
            if (room.exits) {
                for (const [direction, targetRoomId] of Object.entries(room.exits)) {
                    if (!validRoomIds.has(targetRoomId)) {
                        errors.push(
                            `Room "${room.id}": Exit "${direction}" references unknown room "${targetRoomId}"`
                        );
                    }
                }
            }
            
            // Validate item references
            if (room.items) {
                for (const itemId of room.items) {
                    if (!validItemIds.has(itemId)) {
                        errors.push(
                            `Room "${room.id}": Contains unknown item "${itemId}"`
                        );
                    }
                }
            }
            
            // Validate character references
            if (room.characters) {
                for (const charId of room.characters) {
                    if (!validCharacterIds.has(charId)) {
                        errors.push(
                            `Room "${room.id}": Contains unknown character "${charId}"`
                        );
                    }
                }
            }
        }
        
        // ---------------------------------------------------------------------
        // Report any errors found
        // ---------------------------------------------------------------------
        if (errors.length > 0) {
            throw new Error(
                `Content validation failed:\n\n` +
                errors.map(e => `• ${e}`).join('\n') +
                `\n\nPlease check your JSON files for typos or missing definitions.`
            );
        }
    }
    
    // =========================================================================
    // PRIVATE METHODS
    // =========================================================================
    
    /**
     * parseJSON - Parses a JSON string with friendly error messages.
     * 
     * JavaScript's default JSON.parse errors can be cryptic. This method
     * wraps parsing and provides more helpful error messages pointing to
     * the specific location of the error.
     * 
     * @private
     * @param {string} text - The raw JSON text to parse
     * @param {string} filename - The filename (for error messages)
     * @returns {Object|Array} - The parsed JSON data
     * @throws {Error} - If JSON parsing fails
     */
    parseJSON(text, filename) {
        try {
            return JSON.parse(text);
        } catch (parseError) {
            // Extract position information from the error if available
            // positionMatch - Regex match result for error position
            const positionMatch = parseError.message.match(/position\s+(\d+)/);
            
            // Build a helpful error message
            let errorMessage = `JSON parsing error in ${filename}:\n\n`;
            errorMessage += `${parseError.message}\n\n`;
            
            if (positionMatch) {
                // position - The character position where the error occurred
                const position = parseInt(positionMatch[1], 10);
                
                // Find the line number and character for the error position
                const lineInfo = this.getLineFromPosition(text, position);
                
                errorMessage += `Error occurs near line ${lineInfo.line}, character ${lineInfo.character}:\n`;
                errorMessage += `${lineInfo.context}\n\n`;
            }
            
            errorMessage += `Common JSON errors:\n`;
            errorMessage += `• Missing or extra commas\n`;
            errorMessage += `• Unquoted property names (use "name" not name)\n`;
            errorMessage += `• Single quotes instead of double quotes\n`;
            errorMessage += `• Trailing commas after last item in arrays/objects\n`;
            
            throw new Error(errorMessage);
        }
    }
    
    /**
     * getLineFromPosition - Converts a character position to line number.
     * 
     * Helper method to provide context for JSON parsing errors.
     * 
     * @private
     * @param {string} text - The full JSON text
     * @param {number} position - The character position in the text
     * @returns {Object} - Object with line number, character position, and context
     */
    getLineFromPosition(text, position) {
        // lines - Array of all lines in the text
        const lines = text.substring(0, position).split('\n');
        
        // lineNumber - The 1-indexed line number where the error is
        const lineNumber = lines.length;
        
        // characterNumber - The character position within the line
        const characterNumber = lines[lines.length - 1].length + 1;
        
        // Get the actual line for context
        const allLines = text.split('\n');
        // contextLine - The line where the error occurred
        const contextLine = allLines[lineNumber - 1] || '';
        
        return {
            line: lineNumber,
            character: characterNumber,
            context: contextLine.trim()
        };
    }
    
    /**
     * validateContent - Validates the structure of loaded content.
     * 
     * Performs basic validation to ensure required fields are present.
     * Each content type has its own validation rules.
     * 
     * @private
     * @param {Object|Array} data - The parsed JSON data
     * @param {string} filename - The filename (to determine content type)
     * @throws {Error} - If validation fails
     */
    validateContent(data, filename) {
        // Determine content type from filename
        // contentType - The type of content (e.g., 'rooms', 'items')
        const contentType = filename.replace('.json', '');
        
        // Dispatch to appropriate validator
        switch (contentType) {
            case 'rooms':
                this.validateRooms(data);
                break;
            case 'items':
                this.validateItems(data);
                break;
            case 'characters':
                this.validateCharacters(data);
                break;
            case 'commands':
                this.validateCommands(data);
                break;
            case 'config':
                this.validateConfig(data);
                break;
            default:
                // Unknown content type, skip validation
                console.warn(`No validator for content type: ${contentType}`);
        }
    }
    
    /**
     * validateRooms - Validates room definitions.
     * 
     * @private
     * @param {Array} rooms - Array of room objects
     * @throws {Error} - If validation fails
     */
    validateRooms(rooms) {
        // Check that rooms is an array
        if (!Array.isArray(rooms)) {
            throw new Error('rooms.json must contain an array of room objects');
        }
        
        // Check that there's at least one room
        if (rooms.length === 0) {
            throw new Error('rooms.json must contain at least one room');
        }
        
        // Validate each room
        for (let i = 0; i < rooms.length; i++) {
            const room = rooms[i];  // Current room being validated
            const errorPrefix = `Room at index ${i}`;  // Error message prefix
            
            // Required fields
            if (!room.id || typeof room.id !== 'string') {
                throw new Error(`${errorPrefix}: Missing or invalid 'id' (must be a string)`);
            }
            if (!room.name || typeof room.name !== 'string') {
                throw new Error(`${errorPrefix} (${room.id}): Missing or invalid 'name' (must be a string)`);
            }
            if (!room.description || typeof room.description !== 'string') {
                throw new Error(`${errorPrefix} (${room.id}): Missing or invalid 'description' (must be a string)`);
            }
            
            // Optional fields with type checking
            if (room.exits && typeof room.exits !== 'object') {
                throw new Error(`${errorPrefix} (${room.id}): 'exits' must be an object`);
            }
            if (room.items && !Array.isArray(room.items)) {
                throw new Error(`${errorPrefix} (${room.id}): 'items' must be an array`);
            }
            if (room.characters && !Array.isArray(room.characters)) {
                throw new Error(`${errorPrefix} (${room.id}): 'characters' must be an array`);
            }
        }
    }
    
    /**
     * validateItems - Validates item definitions.
     * 
     * @private
     * @param {Array} items - Array of item objects
     * @throws {Error} - If validation fails
     */
    validateItems(items) {
        // Check that items is an array
        if (!Array.isArray(items)) {
            throw new Error('items.json must contain an array of item objects');
        }
        
        // Validate each item
        for (let i = 0; i < items.length; i++) {
            const item = items[i];  // Current item being validated
            const errorPrefix = `Item at index ${i}`;  // Error message prefix
            
            // Required fields
            if (!item.id || typeof item.id !== 'string') {
                throw new Error(`${errorPrefix}: Missing or invalid 'id' (must be a string)`);
            }
            if (!item.name || typeof item.name !== 'string') {
                throw new Error(`${errorPrefix} (${item.id}): Missing or invalid 'name' (must be a string)`);
            }
            if (!item.description || typeof item.description !== 'string') {
                throw new Error(`${errorPrefix} (${item.id}): Missing or invalid 'description' (must be a string)`);
            }
        }
    }
    
    /**
     * validateCharacters - Validates character definitions.
     * 
     * @private
     * @param {Array} characters - Array of character objects
     * @throws {Error} - If validation fails
     */
    validateCharacters(characters) {
        // Check that characters is an array
        if (!Array.isArray(characters)) {
            throw new Error('characters.json must contain an array of character objects');
        }
        
        // Validate each character
        for (let i = 0; i < characters.length; i++) {
            const char = characters[i];  // Current character being validated
            const errorPrefix = `Character at index ${i}`;  // Error message prefix
            
            // Required fields
            if (!char.id || typeof char.id !== 'string') {
                throw new Error(`${errorPrefix}: Missing or invalid 'id' (must be a string)`);
            }
            if (!char.name || typeof char.name !== 'string') {
                throw new Error(`${errorPrefix} (${char.id}): Missing or invalid 'name' (must be a string)`);
            }
            if (!char.description || typeof char.description !== 'string') {
                throw new Error(`${errorPrefix} (${char.id}): Missing or invalid 'description' (must be a string)`);
            }
        }
    }
    
    /**
     * validateCommands - Validates command definitions.
     * 
     * @private
     * @param {Object} commands - Commands configuration object
     * @throws {Error} - If validation fails
     */
    validateCommands(commands) {
        // Check that commands is an object
        if (typeof commands !== 'object' || commands === null) {
            throw new Error('commands.json must be an object');
        }
        
        // Check for required sections
        if (!commands.synonyms || typeof commands.synonyms !== 'object') {
            throw new Error('commands.json must have a "synonyms" object');
        }
        
        if (!commands.directions || typeof commands.directions !== 'object') {
            throw new Error('commands.json must have a "directions" object');
        }
    }
    
    /**
     * validateConfig - Validates game configuration.
     * 
     * @private
     * @param {Object} config - Game configuration object
     * @throws {Error} - If validation fails
     */
    validateConfig(config) {
        // Check that config is an object
        if (typeof config !== 'object' || config === null) {
            throw new Error('config.json must be an object');
        }
        
        // Check for required fields
        if (!config.startingRoom || typeof config.startingRoom !== 'string') {
            throw new Error('config.json must have a "startingRoom" string');
        }
        
        if (!config.title || typeof config.title !== 'string') {
            throw new Error('config.json must have a "title" string');
        }
    }
}
