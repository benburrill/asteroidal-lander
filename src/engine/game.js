/** The Game object stores global game state. */

import { createKeyStore } from "./keyboard.js";

export class Game {
    constructor(canvas, theme) {
        theme = theme || {};

        this._canvas = canvas;

        // The theme is used by generic scenes such as the loading scene
        // so that appropriate colors and fonts can be used.
        this.theme = {
            bg: theme.bg || "#FFF",
            fg: theme.fg || "#000",
            fontFace: theme.fontFace || "sans"
        }

        this.keys = createKeyStore(canvas);
        this.mouse = null; // TODO

        // For storing global resources.
        this.rc = {};
    }

    get width() {
        return this._canvas.width;
    }

    get height() {
        return this._canvas.height;
    }

    get minDim() {
        return Math.min(this.width, this.height);
    }

    get maxDim() {
        return Math.max(this.width, this.height);
    }
}
