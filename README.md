# Stellar Voyager - Interactive Fiction Engine

A browser-based interactive fiction (text adventure) game engine that runs as a static site. All game content is loaded from JSON files, making it easy to create your own adventures without modifying code.

## Project Overview

**Stellar Voyager** is a Star Trek–inspired text adventure where you play as a newly appointed starship captain. The engine is designed to be:

- **Static**: No server required, runs entirely in the browser
- **Modular**: Clean separation between engine code and content
- **Extensible**: Add new rooms, items, characters, and commands via JSON
- **Beginner-friendly**: Extensively commented code suitable for learning

### Current Demo Story

You are the new Captain of the USS Horizon. Before departing for the Andromeda Sector, you must:
- Meet your senior officers (First Officer, Helmsman, Medical Officer, Chief Engineer)
- Obtain your access credentials
- Complete the ship readiness checklist

## How to Run

### Option 1: Use a Static Server (Recommended)

```bash
# Using npx (Node.js required)
npx serve

# Using Python
python -m http.server 8000

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:3000` (or 8000) in your browser.

### Option 2: Use VS Code Live Server

1. Install the "Live Server" extension in VS Code
2. Right-click `index.html` and select "Open with Live Server"

### Why a Server is Needed

Modern browsers block `fetch()` requests to local files for security reasons (CORS). A simple static server allows the game to load its JSON content files properly.

## Folder Structure

```
tabletop/
├── index.html              # Main HTML file - entry point
├── styles.css              # All game styling
├── README.md               # This documentation
│
├── src/
│   ├── main.js             # Application entry point, bootstraps the game
│   └── engine/
│       ├── ContentLoader.js  # Loads and validates JSON content
│       ├── GameState.js      # Manages player state (location, inventory, flags)
│       ├── CommandParser.js  # Parses player input into commands
│       ├── GameRules.js      # Executes game logic (movement, items, dialogue)
│       └── Renderer.js       # Handles all UI updates and display
│
└── content/
    ├── config.json         # Game configuration and objectives
    ├── commands.json       # Command synonyms and help text
    ├── rooms.json          # Room definitions
    ├── items.json          # Item definitions
    └── characters.json     # Character definitions with dialogue
```

## Available Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| `help` | `?` | Show available commands |
| `look` | `l` | Describe current location |
| `go <direction>` | `walk`, `move` | Move in a direction |
| `n/s/e/w` | - | Shortcut for go north/south/east/west |
| `examine <thing>` | `x`, `inspect`, `check` | Look closely at something |
| `take <item>` | `get`, `grab`, `pick up` | Pick up an item |
| `drop <item>` | `put`, `discard` | Put down an item |
| `inventory` | `i`, `inv` | List what you're carrying |
| `talk <character>` | `speak`, `chat` | Talk to a character |
| `use <item>` | `activate` | Use an item |
| `use <item> on <target>` | - | Use an item on something |

---

# Content Authoring Guide

## JSON Schema Reference

### config.json - Game Configuration

```json
{
    "title": "Your Game Title",
    "introText": "Opening text shown to the player...",
    "startingRoom": "room_id",
    "version": "1.0.0",
    "author": "Your Name",
    "objectives": [
        {
            "flag": "flagName",
            "description": "Displayed in status panel"
        }
    ],
    "victoryText": "Shown when all objectives complete..."
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Game title shown in header |
| `introText` | Yes | Opening story text |
| `startingRoom` | Yes | ID of the room where player begins |
| `objectives` | No | Array of trackable objectives |
| `victoryText` | No | Message shown on completion |

### rooms.json - Room Definitions

```json
[
    {
        "id": "unique_room_id",
        "name": "Room Display Name",
        "description": "Full room description shown on 'look'...",
        "exits": {
            "north": "other_room_id",
            "south": "another_room_id"
        },
        "lockedExits": {
            "east": {
                "requiresItem": "key_item_id",
                "requiresFlag": "some_flag",
                "message": "Message shown when locked"
            }
        },
        "items": ["item_id_1", "item_id_2"],
        "characters": ["character_id"],
        "features": {
            "window": "Description when examining the window"
        }
    }
]
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier (used in exits) |
| `name` | Yes | Displayed room name |
| `description` | Yes | Full description |
| `exits` | No | Object mapping directions to room IDs |
| `lockedExits` | No | Exits with unlock requirements |
| `items` | No | Array of item IDs initially in this room |
| `characters` | No | Array of character IDs in this room |
| `features` | No | Examinable scenery (not takeable) |

**Valid Directions**: `north`, `south`, `east`, `west`, `northeast`, `northwest`, `southeast`, `southwest`, `up`, `down`

### items.json - Item Definitions

```json
[
    {
        "id": "unique_item_id",
        "name": "Item Display Name",
        "description": "Description shown on 'examine item'...",
        "shortDescription": "Brief text for inventory list",
        "aliases": ["synonym1", "synonym2"],
        "takeable": true,
        "visible": true,
        "onTake": {
            "message": "Shown when item is picked up",
            "setFlag": "flagToSet"
        },
        "useActions": [
            {
                "target": "target_id",
                "message": "Result of using item on target",
                "setFlag": "flagName",
                "giveItem": "new_item_id",
                "consume": false
            },
            {
                "message": "Result of using item alone (no target)"
            }
        ],
        "useFailMessage": "Shown if use has no matching action"
    }
]
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier |
| `name` | Yes | Displayed name |
| `description` | Yes | Full examine description |
| `shortDescription` | No | Brief text for lists |
| `aliases` | No | Alternative names players can use |
| `takeable` | No | Can player pick it up? (default: true) |
| `visible` | No | Is it shown in room? (default: true) |
| `onTake` | No | Event triggered when taken |
| `useActions` | No | Array of use action definitions |
| `useFailMessage` | No | Message when use fails |

### characters.json - Character Definitions

```json
[
    {
        "id": "unique_character_id",
        "name": "Character Name",
        "description": "Description shown on 'examine character'...",
        "aliases": ["nickname", "title"],
        "defaultGreeting": "Shown if no dialogue defined",
        "dialogue": [
            {
                "id": "initial",
                "text": "What the character says...",
                "setFlag": "metCharacter",
                "giveItem": "item_id",
                "nextNode": "followup"
            },
            {
                "id": "followup",
                "text": "Second conversation...",
                "nextNode": "ready"
            },
            {
                "id": "ready",
                "text": "Repeating conversation...",
                "loop": "ready"
            }
        ]
    }
]
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier |
| `name` | Yes | Displayed name |
| `description` | Yes | Examine description |
| `aliases` | No | Alternative names |
| `defaultGreeting` | No | Used if dialogue is empty |
| `dialogue` | No | Array of dialogue nodes |

**Dialogue Node Fields**:
- `id`: Unique within this character
- `text`: What the character says
- `setFlag`: Optional flag to set when this node plays
- `giveItem`: Optional item to give player
- `nextNode`: ID of next dialogue node (for next `talk` command)
- `loop`: ID to return to for repeated conversations

### commands.json - Synonyms and Help

```json
{
    "synonyms": {
        "get": "take",
        "grab": "take"
    },
    "directions": {
        "n": "north",
        "s": "south"
    },
    "help": {
        "look": "Describe your surroundings",
        "go": "Move in a direction"
    }
}
```

---

## How to Add Content

### Adding a New Room

1. Open `content/rooms.json`
2. Add a new room object to the array:

```json
{
    "id": "cargo_bay",
    "name": "Cargo Bay",
    "description": "A large storage area filled with supply crates...",
    "exits": {
        "north": "corridor"
    },
    "items": ["supply_crate"],
    "characters": []
}
```

3. Add an exit TO this room from another room:

```json
// In the corridor room, add:
"exits": {
    "south": "cargo_bay"
}
```

### Adding a New Item

1. Open `content/items.json`
2. Add a new item object:

```json
{
    "id": "laser_pistol",
    "name": "Laser Pistol",
    "description": "A standard-issue sidearm with a blue power cell...",
    "shortDescription": "Sidearm",
    "aliases": ["pistol", "gun", "weapon"],
    "takeable": true,
    "useActions": [
        {
            "target": "locked_door",
            "message": "The pistol isn't powerful enough to damage the door.",
            "setFlag": null
        }
    ]
}
```

3. Add the item to a room's `items` array:

```json
"items": ["laser_pistol"]
```

### Adding a New Character with Dialogue

1. Open `content/characters.json`
2. Add a new character object:

```json
{
    "id": "science_officer",
    "name": "Lieutenant Park",
    "description": "A young officer in a blue science uniform...",
    "aliases": ["park", "scientist"],
    "dialogue": [
        {
            "id": "initial",
            "text": "Captain! I've detected unusual readings from Sector 7...",
            "setFlag": "metScienceOfficer",
            "nextNode": "second"
        },
        {
            "id": "second",
            "text": "The readings suggest an unknown energy signature.",
            "nextNode": "waiting"
        },
        {
            "id": "waiting",
            "text": "I'm still analyzing the data, Captain.",
            "loop": "waiting"
        }
    ]
}
```

3. Add the character to a room:

```json
"characters": ["science_officer"]
```

### Adding a Custom Command Synonym

1. Open `content/commands.json`
2. Add to the `synonyms` object:

```json
"synonyms": {
    "fire": "use",
    "shoot": "use",
    "attack": "use"
}
```

### Adding a New Objective

1. Open `content/config.json`
2. Add to the `objectives` array:

```json
"objectives": [
    {
        "flag": "foundArtifact",
        "description": "Locate the alien artifact"
    }
]
```

3. Make sure some game action sets this flag:

```json
// In an item's useActions or character's dialogue:
"setFlag": "foundArtifact"
```

### Creating a Locked Door

1. In `rooms.json`, add a `lockedExits` entry:

```json
{
    "id": "hallway",
    "exits": {
        "east": "secure_room"
    },
    "lockedExits": {
        "east": {
            "requiresItem": "keycard",
            "message": "The door is locked. You need a keycard."
        }
    }
}
```

2. Create the keycard item in `items.json`
3. Place the keycard somewhere for the player to find

---

## Architecture Overview

### Engine Components

1. **ContentLoader** (`src/engine/ContentLoader.js`)
   - Loads JSON files via `fetch()`
   - Validates content structure
   - Reports clear errors if content is malformed

2. **GameState** (`src/engine/GameState.js`)
   - Tracks player location, inventory, and flags
   - Manages command history for up-arrow recall
   - Encapsulates all mutable state

3. **CommandParser** (`src/engine/CommandParser.js`)
   - Tokenizes player input
   - Resolves synonyms (e.g., "get" → "take")
   - Parses command structure (verb, noun, preposition, target)

4. **GameRules** (`src/engine/GameRules.js`)
   - Executes parsed commands
   - Handles movement, inventory, examine, talk, use
   - Manages locked doors and quest flags

5. **Renderer** (`src/engine/Renderer.js`)
   - Updates the HTML UI
   - Displays messages with appropriate styling
   - Manages status panel and suggested commands

### Data Flow

```
Player Input → CommandParser → Parsed Command → GameRules → GameState (modified)
                                                    ↓
                                                Renderer → UI Updated
```

---

## Tips for Content Authors

1. **Test incrementally**: Add one thing at a time and test it
2. **Use unique IDs**: Every room, item, and character needs a unique `id`
3. **Validate JSON**: Use a JSON validator if you get parsing errors
4. **Check references**: Make sure exit room IDs and item IDs exist
5. **Start simple**: Get basic navigation working before adding complex puzzles

## Troubleshooting

**"Failed to load content"**
- Make sure you're using a web server (not file://)
- Check that all JSON files exist in /content/

**"JSON parsing error"**
- Check for missing commas, unmatched brackets
- Ensure all strings use double quotes (not single)
- Remove any trailing commas

**"Room/item not found"**
- Verify the ID matches exactly (case-sensitive)
- Check that the item/room is defined in its JSON file

---

## License

This project is open source and available for modification and redistribution.

## Credits

Created as a demonstration of modular, data-driven game architecture using vanilla JavaScript ES modules.

