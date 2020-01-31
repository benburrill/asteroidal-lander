import { drawWrapper } from "./ctxlib.js";

export class GameLoop {
    constructor(canvas, opts) {
        opts = opts || {};

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        // Default max time step of 35 allows for 30 fps with a little
        // extra slop over time.  RAF is typically 60 fps though.
        this.maxTimeStep = opts.maxTimeStep || 35;

        // TODO: more time step options (such as doing multiple updates
        // in a frame as a strategy for dealing with lag spikes)

        // TODO: I'm starting to think that maybe scenes should be
        // responsible for all this loop option stuff.  The GameLoop
        // could call a wrapper method rather than directly calling
        // update, giving it the true dt and the Scene could decide what
        // to do with that information.
        // A similar thing could be done with draw, though the
        // applications are more limited.  It would mostly just be
        // useful to automatically show a click to focus overlay on
        // certain scenes (wouldn't want it on every scene though).

        this.lastTime = -Infinity;
        this.focused = false;
    }

    start(game, scene) {
        // Fix dimensions of canvas before initial scene is constructed.
        this.adjustDimensions();
        this.scene = scene.construct(game);
        requestAnimationFrame(this._mainLoop.bind(this, true));
    }

    adjustDimensions() {
        var resized = false;

        if (canvas.width !== canvas.clientWidth) {
            canvas.width = canvas.clientWidth;
            resized = true;
        }

        if (canvas.height !== canvas.clientHeight) {
            canvas.height = canvas.clientHeight;
            resized = true;
        }

        return resized;
    }

    _mainLoop(firstFrame, time) {
        requestAnimationFrame(this._mainLoop.bind(this, false));

        var scene = this.scene;

        var prevFocused = this.focused;
        this.focused = document.hasFocus() || scene.ignoreBlur;

        var resized = this.adjustDimensions();

        // The first frame after a focus skips the update since no game
        // time has elapsed while the game has been paused.
        if (this.focused && prevFocused) {
            var dt = Math.min(time - this.lastTime, this.maxTimeStep);
            var nextScene = scene.update(dt);
            if (nextScene) this.scene = nextScene.construct(scene);
        }

        // The game needs to be drawn not only when it is focused, but
        // also when it was previously focused (so that a blur screen
        // can be drawn) as well as when the game was resized (so that
        // it gets drawn at the new resolution) and also on the first
        // frame (so that something shows up in the canvas, even if it
        // isn't focused)
        if (this.focused || prevFocused || resized || firstFrame) {
            drawWrapper(this.ctx, () => {
                scene.draw(this.ctx, !this.focused);
            });
        }

        this.lastTime = time;
    }
}
