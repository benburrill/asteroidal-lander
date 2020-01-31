import { Scene } from "./scene.js";
import { background } from "./ctxlib.js";
import * as resources from "./resources.js";

export class LoadGlobalResources extends Scene {
    init(rcmap, nextScene) {
        this.ignoreBlur = true;

        this.time = 0;

        this.done = false;
        this.failed = false;
        resources.load(rcmap, this.game.rc).then(
            () => { this.done = true; },
            reason => {
                this.failed = true;
                throw reason;
            }
        );

        this.nextScene = nextScene;
    }

    update(dt) {
        this.time += dt;
        if (this.done) return this.nextScene;
    }

    draw(ctx) {
        background(ctx, this.game.theme.bg);

        if (this.done || this.time < 100) return;

        var s = Math.min(this.game.width, this.game.height)
        var t = this.time / 150 - Math.PI / 2;

        ctx.fillStyle = this.game.theme.fg;

        ctx.font = "20pt " + this.game.theme.fontFace + ", sans";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        ctx.fillText(
            this.failed? "Failed to load resources!" : "Loading...",
            this.game.width / 2, 5, this.game.width
        );

        if (this.failed) return;

        ctx.strokeStyle = "hsl(" +
            360 * (Math.sin(t / 4) + 1) / 2 +
            ", 50%, 50%)";

        ctx.lineWidth = s / 32;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.arc(
            this.game.width / 2, this.game.height / 2,
            s / 8, t - Math.PI / 2, t
        )
        ctx.stroke();
    }
}
