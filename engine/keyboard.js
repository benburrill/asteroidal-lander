// Some browsers use (or used in the past) nonstandard names for keys.
// https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values
const standardNames = {
    "OS": "Meta",  // Could also be Super or Hyper
    "Scroll": "ScrollLock",
    " ": "Spacebar",  // This is a nonstandard name, but I prefer it (*)
    "Up": "ArrowUp",
    "Down": "ArrowDown",
    "Left": "ArrowLeft",
    "Right": "ArrowRight",
    "Del": "Delete",
    "Crsel": "CrSel",
    "Exsel": "ExSel",
    "Esc": "Escape",
    "Apps": "ContextMenu",
    "Nonconvert": "NonConvert",
    "RomanCharacters": "Romaji",  // In FF <37, this also catches Eisu
    "HalfWidth": "Hankaku",
    "FullWidth": "Zenkaku",
    "MozHomeScreen": "GoHome",
    "MediaNextTrack": "MediaTrackNext",
    "MediaPreviousTrack": "MediaTrackPrevious",
    "FastFwd": "MediaFastForward",
    "VolumeUp": "AudioVolumeUp",
    "VolumeDown": "AudioVolumeDown",
    "VolumeMute": "AudioVolumeMute",
    "Live": "TV",
    "Zoom": "ZoomToggle",
    "SelectMedia": "LaunchMediaPlayer",
    "MediaSelect": "LaunchMediaPlayer",
    "Decimal": ".",  // This really should depend on locale
    "Multiply": "*",
    "Add": "+",
    "Divide": "/",
    "Subtract": "-"
}

// (*) Using Spacebar as the name makes sense to use in this particular
// case.  Having a key name consisting of whitespace is a bit annoying
// because in order to display the keys pressed to the user (such as in
// a game's keyboard configuration), you would need to put quotes around
// it or something.  I also think keyboard.Spacebar looks nicer and more
// readable than keyboard[" "] in the code.
// Obviously it would be less convenient if you wanted to know the text
// that was being typed, but that's not what the keyboard object is for.
// TODO: I should maybe rethink this though, now that I also keep track
// of event.code, I also have $Space for the physical space key (which
// should be equivalent to event.key's " " on any sane keyboard layout).

export function getName(event) {
    var name = event.key || "Unidentified";
    if (name.length === 1) name = name.toUpperCase();
    return standardNames[name] || name;
}

export function getCode(event) {
    var code = event.code || "Unidentified";
    return "$" + code;
}

export function createKeyStore(canvas) {
    /** Keep track of the currently pressed keys
     * Returns an object that will be updated with the currently pressed
     * keys.  For every key that is pressed, two entries will be added
     * to the object set to a truthy value, allowing you to check for
     * key presses both by key name (KeyboardEvent.key) in addition to
     * key code (KeyboardEvent.code).  Key codes are prefixed with a `$`
     * symbol to distinguish them from key names, and key names may also
     * be different from those obtained from KeyboardEvent.key.
     * Specifically, key names for the letter keys are all capitalized,
     * the key for the space character is renamed to `Spacebar`, and
     * non-standard key names are replaced with their standard name.
     *
     * getName or getCode should be used if you want to store key names
     * or codes obtained from events to test for later in the key store.
     **/

    var keys = {};

    if (!canvas.hasAttribute("tabindex")) {
        canvas.setAttribute("tabindex", "0");
    }

    canvas.addEventListener("keydown", function(event) {
        var keyName = getName(event);
        var codeName = getCode(event);
        keys[keyName] |= 1 << event.location;
        keys[codeName] = true;
        event.preventDefault();
    }, false);

    canvas.addEventListener("keyup", function(event) {
        var keyName = getName(event);
        var codeName = getCode(event);

        // Remove the key only if no alternative version of the key is
        // being pressed.  This is really the whole reason I keep track
        // of the key location, so that in cases such as when the user
        // presses both left and right control keys and lets go of one
        // of them, the game will remember that one of the control keys
        // is still pressed.  Maybe it's silly to care about such cases,
        // but I don't care, it feels right.
        keys[keyName] &= ~(1 << event.location);
        if (!keys[keyName]) delete keys[keyName];

        // I don't think we need to worry about alternates for codes
        // because there are different codes for different locations.
        if (keys[codeName]) delete keys[codeName];

        event.preventDefault();
    }, false);

    return keys;
}
