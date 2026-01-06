/**
 * =============================================================================
 * CommandParser.js - Command Parsing and Tokenization
 * =============================================================================
 * 
 * PURPOSE:
 * This module parses player input into structured command objects that can
 * be processed by the game rules. It handles:
 * - Tokenization (splitting input into words)
 * - Synonym resolution (mapping 'get' to 'take', 'n' to 'north', etc.)
 * - Command structure parsing (verb, noun, preposition, target)
 * - Handling common input variations
 * 
 * COMMAND STRUCTURE:
 * Most commands follow a pattern like:
 * - "look" -> { verb: 'look' }
 * - "go north" -> { verb: 'go', noun: 'north' }
 * - "examine sword" -> { verb: 'examine', noun: 'sword' }
 * - "use key on door" -> { verb: 'use', noun: 'key', preposition: 'on', target: 'door' }
 * 
 * SYNONYM HANDLING:
 * Players may use different words for the same action:
 * - "get", "take", "grab", "pick up" -> 'take'
 * - "look", "l", "examine" -> context-dependent
 * - "n", "north" -> 'north'
 * 
 * =============================================================================
 */

/**
 * CommandParser - Class that parses player text input into structured commands.
 * 
 * The parser is intentionally simple, not a full natural language processor.
 * It handles common adventure game command patterns effectively.
 */
export class CommandParser {
    
    /**
     * Creates a new CommandParser instance.
     * 
     * @param {Object} commandsConfig - Command configuration from commands.json
     *                                 Contains: synonyms, directions, help text
     */
    constructor(commandsConfig) {
        // =====================================================================
        // SYNONYM MAPPINGS
        // =====================================================================
        
        /**
         * verbSynonyms - Maps alternative verbs to their canonical form.
         * Example: 'get' -> 'take', 'grab' -> 'take'
         * @type {Object.<string, string>}
         */
        this.verbSynonyms = commandsConfig.synonyms || {};
        
        /**
         * directionSynonyms - Maps direction abbreviations to full names.
         * Example: 'n' -> 'north', 'nw' -> 'northwest'
         * @type {Object.<string, string>}
         */
        this.directionSynonyms = commandsConfig.directions || {};
        
        // =====================================================================
        // COMMAND DEFINITIONS
        // =====================================================================
        
        /**
         * commandHelp - Help text for each command, from configuration.
         * @type {Object.<string, string>}
         */
        this.commandHelp = commandsConfig.help || {};
        
        // =====================================================================
        // PREPOSITIONS
        // =====================================================================
        
        /**
         * prepositions - List of words that separate noun from target.
         * These are used in commands like "use key ON door" or "put sword IN chest".
         * @type {string[]}
         */
        this.prepositions = ['on', 'with', 'to', 'in', 'at', 'from', 'into'];
        
        // =====================================================================
        // ARTICLES
        // =====================================================================
        
        /**
         * articles - Words to strip from input as they don't affect meaning.
         * "take THE sword" is the same as "take sword".
         * @type {string[]}
         */
        this.articles = ['the', 'a', 'an'];
    }
    
    // =========================================================================
    // PUBLIC METHODS
    // =========================================================================
    
    /**
     * parse - Parses raw player input into a structured command object.
     * 
     * This is the main entry point for the parser. It processes the input
     * through several stages to produce a normalized command object.
     * 
     * @param {string} input - The raw text input from the player
     * @returns {Object} - Parsed command object with the following structure:
     *   {
     *     verb: string,           // The main action (e.g., 'take', 'go')
     *     noun: string|null,      // The object of the action (e.g., 'sword')
     *     preposition: string|null, // Connector word (e.g., 'on', 'with')
     *     target: string|null,    // Secondary object (e.g., 'door' in "use key on door")
     *     raw: string,            // Original input for error messages
     *     tokens: string[]        // All tokens for debugging
     *   }
     */
    parse(input) {
        // input - Raw player input string
        
        // Validate input
        if (!input || typeof input !== 'string') {
            return this.createEmptyCommand(input);
        }
        
        // ---------------------------------------------------------------------
        // Step 1: Normalize the input
        // ---------------------------------------------------------------------
        // normalizedInput - Lowercase, trimmed version of the input
        const normalizedInput = this.normalizeInput(input);
        
        if (normalizedInput === '') {
            return this.createEmptyCommand(input);
        }
        
        // ---------------------------------------------------------------------
        // Step 2: Tokenize the input
        // ---------------------------------------------------------------------
        // tokens - Array of individual words from the input
        const tokens = this.tokenize(normalizedInput);
        
        // ---------------------------------------------------------------------
        // Step 3: Remove articles
        // ---------------------------------------------------------------------
        // cleanTokens - Tokens with articles (the, a, an) removed
        const cleanTokens = this.removeArticles(tokens);
        
        if (cleanTokens.length === 0) {
            return this.createEmptyCommand(input);
        }
        
        // ---------------------------------------------------------------------
        // Step 4: Extract the verb (first word)
        // ---------------------------------------------------------------------
        // rawVerb - The first token, before synonym resolution
        const rawVerb = cleanTokens[0];
        
        // verb - The canonical verb after synonym resolution
        const verb = this.resolveVerbSynonym(rawVerb);
        
        // ---------------------------------------------------------------------
        // Step 5: Parse the rest of the command
        // ---------------------------------------------------------------------
        // remainingTokens - Everything after the verb
        const remainingTokens = cleanTokens.slice(1);
        
        // Parse the noun, preposition, and target from remaining tokens
        const { noun, preposition, target } = this.parseNounPhrase(remainingTokens, verb);
        
        // ---------------------------------------------------------------------
        // Step 6: Build and return the command object
        // ---------------------------------------------------------------------
        return {
            verb: verb,                 // The main action verb
            noun: noun,                 // The direct object
            preposition: preposition,   // The connecting word (if any)
            target: target,             // The indirect object (if any)
            raw: input,                 // Original input for reference
            tokens: cleanTokens         // All tokens for debugging
        };
    }
    
    /**
     * getSuggestions - Gets suggested commands based on context.
     * 
     * Used to show clickable command suggestions to the player.
     * 
     * @param {Object} context - Current game context
     *   { room, items, characters, exits }
     * @returns {string[]} - Array of suggested command strings
     */
    getSuggestions(context) {
        // suggestions - Array to collect command suggestions
        const suggestions = [];
        
        // Always suggest looking around
        suggestions.push('look');
        
        // Suggest examining items in the room
        if (context.items && context.items.length > 0) {
            // Only suggest for first few items to avoid clutter
            for (const item of context.items.slice(0, 3)) {
                suggestions.push(`examine ${item.name.toLowerCase()}`);
            }
        }
        
        // Suggest talking to characters
        if (context.characters && context.characters.length > 0) {
            for (const char of context.characters) {
                suggestions.push(`talk ${char.name.toLowerCase()}`);
            }
        }
        
        // Suggest available exits
        if (context.exits) {
            for (const direction of Object.keys(context.exits)) {
                suggestions.push(`go ${direction}`);
            }
        }
        
        // Suggest inventory check
        suggestions.push('inventory');
        
        return suggestions;
    }
    
    /**
     * getHelpText - Gets help text for commands.
     * 
     * @returns {string} - Formatted help text for all commands
     */
    getHelpText() {
        // helpText - String builder for the help output
        let helpText = 'Available commands:\n\n';
        
        // Add help for each known command
        for (const [command, description] of Object.entries(this.commandHelp)) {
            helpText += `  ${command.toUpperCase()} - ${description}\n`;
        }
        
        // Add direction shortcuts
        helpText += '\nDirection shortcuts:\n';
        helpText += '  n/s/e/w - north/south/east/west\n';
        helpText += '  ne/nw/se/sw - diagonals\n';
        helpText += '  u/d - up/down\n';
        
        return helpText;
    }
    
    /**
     * isDirection - Checks if a word is a valid direction.
     * 
     * @param {string} word - The word to check
     * @returns {boolean} - True if the word is a direction or direction synonym
     */
    isDirection(word) {
        // word - The word to check (already lowercase)
        const normalizedWord = word.toLowerCase();
        
        // Check if it's a direction synonym
        if (this.directionSynonyms[normalizedWord]) {
            return true;
        }
        
        // Check if it's already a canonical direction
        const canonicalDirections = Object.values(this.directionSynonyms);
        return canonicalDirections.includes(normalizedWord);
    }
    
    /**
     * resolveDirection - Converts a direction word to its canonical form.
     * 
     * @param {string} direction - The direction word (may be abbreviated)
     * @returns {string} - The canonical direction (e.g., 'n' -> 'north')
     */
    resolveDirection(direction) {
        // direction - The input direction word
        const normalizedDirection = direction.toLowerCase();
        
        // Return the canonical form, or the original if not found
        return this.directionSynonyms[normalizedDirection] || normalizedDirection;
    }
    
    // =========================================================================
    // PRIVATE METHODS
    // =========================================================================
    
    /**
     * normalizeInput - Normalizes input for consistent processing.
     * 
     * @private
     * @param {string} input - Raw player input
     * @returns {string} - Normalized input (lowercase, trimmed, single spaces)
     */
    normalizeInput(input) {
        // input - The raw input string
        
        return input
            .toLowerCase()                  // Convert to lowercase for comparison
            .trim()                         // Remove leading/trailing whitespace
            .replace(/\s+/g, ' ');          // Collapse multiple spaces into one
    }
    
    /**
     * tokenize - Splits input into individual word tokens.
     * 
     * @private
     * @param {string} input - Normalized input string
     * @returns {string[]} - Array of word tokens
     */
    tokenize(input) {
        // input - Already normalized input string
        
        // Split on spaces to get individual words
        return input.split(' ').filter(token => token.length > 0);
    }
    
    /**
     * removeArticles - Removes articles (the, a, an) from token array.
     * 
     * Articles don't affect command meaning, so we strip them.
     * "take the sword" and "take sword" should work the same.
     * 
     * @private
     * @param {string[]} tokens - Array of word tokens
     * @returns {string[]} - Tokens with articles removed
     */
    removeArticles(tokens) {
        // tokens - Input token array
        
        return tokens.filter(token => !this.articles.includes(token));
    }
    
    /**
     * resolveVerbSynonym - Maps a verb to its canonical form.
     * 
     * @private
     * @param {string} verb - The verb word from input
     * @returns {string} - The canonical verb (e.g., 'get' -> 'take')
     */
    resolveVerbSynonym(verb) {
        // verb - The input verb word
        
        // Look up in synonym map, return original if not found
        return this.verbSynonyms[verb] || verb;
    }
    
    /**
     * parseNounPhrase - Parses everything after the verb.
     * 
     * Extracts the noun, preposition (if any), and target (if any).
     * 
     * Examples:
     * - "sword" -> { noun: 'sword', preposition: null, target: null }
     * - "key on door" -> { noun: 'key', preposition: 'on', target: 'door' }
     * 
     * @private
     * @param {string[]} tokens - Tokens after the verb
     * @param {string} verb - The verb (for context-dependent parsing)
     * @returns {Object} - { noun, preposition, target }
     */
    parseNounPhrase(tokens, verb) {
        // tokens - Words after the verb
        // verb - The main verb (for context-sensitive parsing)
        
        // Handle empty token list
        if (tokens.length === 0) {
            return {
                noun: null,
                preposition: null,
                target: null
            };
        }
        
        // Special case: "go" verb - the noun might be a direction
        if (verb === 'go' || verb === 'walk' || verb === 'move') {
            // For movement, the noun is a direction
            const direction = this.resolveDirection(tokens[0]);
            return {
                noun: direction,
                preposition: null,
                target: null
            };
        }
        
        // Find preposition position
        // prepIndex - Index of the first preposition in tokens, or -1 if none
        const prepIndex = this.findPrepositionIndex(tokens);
        
        if (prepIndex === -1) {
            // No preposition found, entire remaining is the noun
            // Combine multi-word nouns (e.g., "access badge")
            return {
                noun: tokens.join(' '),
                preposition: null,
                target: null
            };
        }
        
        // Found a preposition - split noun and target
        // nounTokens - Words before the preposition
        const nounTokens = tokens.slice(0, prepIndex);
        
        // preposition - The preposition word itself
        const preposition = tokens[prepIndex];
        
        // targetTokens - Words after the preposition
        const targetTokens = tokens.slice(prepIndex + 1);
        
        return {
            noun: nounTokens.length > 0 ? nounTokens.join(' ') : null,
            preposition: preposition,
            target: targetTokens.length > 0 ? targetTokens.join(' ') : null
        };
    }
    
    /**
     * findPrepositionIndex - Finds the first preposition in a token array.
     * 
     * @private
     * @param {string[]} tokens - Array of tokens to search
     * @returns {number} - Index of the first preposition, or -1 if none
     */
    findPrepositionIndex(tokens) {
        // tokens - Array of word tokens
        
        for (let i = 0; i < tokens.length; i++) {
            if (this.prepositions.includes(tokens[i])) {
                return i;
            }
        }
        return -1;
    }
    
    /**
     * createEmptyCommand - Creates a command object for empty/invalid input.
     * 
     * @private
     * @param {string} raw - The original raw input
     * @returns {Object} - Empty command object
     */
    createEmptyCommand(raw) {
        return {
            verb: '',           // No verb
            noun: null,         // No noun
            preposition: null,  // No preposition
            target: null,       // No target
            raw: raw || '',     // Original input
            tokens: []          // No tokens
        };
    }
}
