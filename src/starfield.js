import { Vec2 } from "./engine/vmath.js";
import { Queue } from "./utils.js";

export class StarField {
    constructor(img, opts) {
        this.img = img;

        opts = opts || {};

        // One star per square tile of side length tileSize
        this.tileSize = opts.tileSize || 200;
        // Coefficient for use with parallax effect, [0,1] is sensible
        this.paraCoeff = opts.paraCoeff || 0.1;
        // Coefficient for use with the sqrt-based zooming I do
        this.zoomCoeff = opts.zoomCoeff || 0.5;
        // Seeds the (very pseudo) PRNG for the star field
        this.hashSeed = opts.hashSeed || 0;

        this.minStarSize = opts.minStarSize || 2;
        this.maxStarSize = opts.maxStarSize || 4;
        var rate = opts.starScaleRate || 10
        this.starScale = rate / (this.maxStarSize - this.minStarSize);
    }

    hashPos(pos) {
        return this.dropHigh(Math.abs(Math.sin(
            8690.638 * Math.LOG2E * pos.x +
            3774.412 * Math.SQRT2 * pos.y +
            this.hashSeed
        )), 1e5);
    }

    dropHigh(hash, mul) {
        hash *= mul
        hash -= Math.floor(hash);
        return hash;
    }

    // Draws the star field in a rectangle centered at (0, 0) with the
    // given dimensions.
    // TODO: usage seems a bit weird
    draw(ctx, cam, width, height) {
        cam = cam.copy();
        cam.focus.imul(this.paraCoeff);
        cam.zoom = Math.sqrt(cam.zoom) * this.zoomCoeff;
        var mat = cam.getTransform();

        var origin = new Vec2(
            Math.floor(cam.focus.x / this.tileSize),
            Math.floor(cam.focus.y / this.tileSize)
        );

        // Extra padding for the rectangle to ensure all stars get drawn
        var fudge = cam.scale * this.tileSize * Math.SQRT1_2;

        var imgRad = Math.min(
            this.maxStarSize,
            Math.max(this.minStarSize, cam.scale * this.starScale)
        ) / cam.scale;

        ctx.save();
        ctx.transform(...mat);

        // coords in queue relative to origin
        var queue = Queue.from([[0, 0]]);
        while (!queue.empty) {
            var coord = queue.dequeue();
            var pos = Vec2.from(coord).add(origin).mul(this.tileSize);
            var sc = pos.trf(mat);

            if (Math.abs(sc.x) > width / 2 + fudge ||
                Math.abs(sc.y) > height / 2 + fudge) continue;

            var hash = this.hashPos(pos);
            var rx = hash - 0.5;
            hash = this.dropHigh(hash, 1e10);
            var ry = hash - 0.5;
            hash = this.dropHigh(hash, 1e10);
            ctx.globalAlpha = hash;

            ctx.drawImage(this.img,
                pos.x + this.tileSize * rx - imgRad,
                pos.y + this.tileSize * ry - imgRad,
                imgRad * 2, imgRad * 2
            );

            // Because I didn't want to have 4 similar if statements, I
            // made one unreadable (and slower) loop!   Hooray for DRY!
            for (var i = 0; i < 4; i++) {
                var vCur = i & 1;
                var vAux = ~i & 1;

                // -1 when high bit is 0, +1 when high bit is 1
                var sign = (i & ~vCur) - 1;

                // -1 for x, +1 for y
                var vSign = vCur * 2 - 1;

                if (sign * coord[vCur] >= 0) {
                    if (Math.abs(coord[vCur]) >= Math.abs(coord[vAux])) {
                        var leaf = coord.slice();
                        leaf[vCur] += sign;
                        queue.enqueue(leaf);
                    }

                    if (vSign * coord[vCur] === coord[vAux]) {
                        var leaf = coord.slice();
                        leaf[vCur] += sign;
                        leaf[vAux] += vSign * sign;
                        queue.enqueue(leaf);
                    }
                }
            }
        }

        ctx.restore();
    }
}
