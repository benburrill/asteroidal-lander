import { Vec2, Transform } from "./vmath.js";

// TODO: Maybe Camera should be more smarter about canvas size.  That's
// part of what this.view is for, but you need to set it manually.
export class Camera {
    constructor(focus, zoom, rotation) {
        this.focus = focus? Vec2.from(focus) : new Vec2;
        this._target = null;
        this.zoom = zoom !== undefined? zoom : 1;
        this.view = 1;
        this._za = null;
        this.rotation = rotation || 0;
    }

    copy(includeAnimState) {
        var copy = new Camera(this.focus, this.zoom, this.rotation);
        copy.view = this.view;
        if (includeAnimState) {
            copy._target = this._target;
            copy._za = this._za;
        }
        return copy;
    }

    get scale() {
        return this.view * this.zoom;
    }

    follow(target) {
        this._target = target;
    }

    animZoom(target, time, force) {
        if (!this._za || force) this._za = {target: target, time: time};
    }

    update(dt) {
        // TODO: chase the target rather than being locked on.
        // Or at least have that be an option
        if (this._target) this.focus.set(...this._target.pos);

        // TODO: rotate, focus transitions (focus should unset target)
        if (this._za) {
            if (dt >= this._za.time) {
                this.zoom = this._za.target;
                this._za = null;
            } else {
                this.zoom *= Math.pow(
                    this._za.target / this.zoom,
                    dt / this._za.time
                );

                this._za.time -= dt;
            }
        }
    }

    applyTransform(ctx) {
        this.update(0);  // Apply instantaneous transitions
        ctx.scale(this.scale, this.scale);
        ctx.rotate(this.rotation);
        ctx.translate(-this.focus.x, -this.focus.y);
    }

    getTransform() {
        this.update(0);  // Apply instantaneous transitions
        var trf = new Transform();
        trf.scale(this.scale, this.scale);
        trf.rotate(this.rotation);
        trf.translate(-this.focus.x, -this.focus.y);
        return trf;
    }
}
