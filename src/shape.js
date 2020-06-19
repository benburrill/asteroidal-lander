// TODO: Maybe move shape.js to engine?  It feels enginey.  ExhaustShape
// wouldn't belong in the engine though.  There should be a nicer way to
// register shape names with MultiShape I think.

import { Vec2 } from "./engine/vmath.js";
import { mapMinMax } from "./utils.js";

class PointShape {
    /** Base class of shapes consisting of multiple points **/

    constructor(points) {
        this.setData(points);
    }

    setData(points) {
        this.points = points.map(p => Vec2.from(p));
        this.radius = mapMinMax(this.points, p=>p.mag()).maxKey;
    }

    trfPoints(tm) {
        return this.points.map(p => p.trf(tm));
    }

    copy() {
        return new this.constructor(this.points);
    }

    draw(ctx) { }
    fill(ctx) { }
}

export class Dots extends PointShape {
    draw(ctx) {
        var oldFill = ctx.fillStyle;
        ctx.fillStyle = ctx.strokeStyle;

        try {
            for (var point of this.points) {
                ctx.beginPath();
                ctx.arc(...point, ctx.lineWidth / 2, 0, 2 * Math.PI);
                ctx.fill();
            }
        } finally {
            ctx.fillStyle = oldFill;
        }
    }
}

export class Polyline extends PointShape {
    /** The "open" shape kind in MultiShape **/

    trace(ctx) {
        ctx.beginPath();

        // TODO: do this in a more browser-compatible way probably
        var points = this.points[Symbol.iterator]();
        ctx.moveTo(...points.next().value);
        for (var point of points) {
            ctx.lineTo(...point);
        }
    }

    draw(ctx) {
        this.trace(ctx);
        ctx.stroke();
    }
}

export class Polygon extends Polyline {
    /** The "closed" shape kind in MultiShape **/

    trace(ctx) {
        super.trace(ctx);
        ctx.closePath();
    }

    fill(ctx) {
        this.trace(ctx);
        ctx.fill();
    }

    static rect(x, y, w, h) {
        // IDK why I wrote this method, I don't need it.  Not even sure
        // if it makes sense to write this as a static method as opposed
        // to creating a subclass (which has the advantage of being
        // usable in MultiShape)
        return new this([x, y], [x + w, y], [x + w, y + h], [x, y + h]);
    }
}

export class ExhaustShape extends Polyline {
    setData(data) {
        this.throttle = 0;
        this.source = Vec2.from(data.source);
        this.displacement = Vec2.from(data.displacement);
        this.width = data.width;
    }

    get points() {
        var norm = this.displacement.perp().unit();

        return [
            this.source.add(norm.mul(this.width / 2)),
            this.source.add(this.displacement.mul(this.throttle)),
            this.source.sub(norm.mul(this.width / 2))
        ]
    }

    copy() {
        return new this.constructor(this);
    }
}

export class MultiShape {
    constructor(shapes, shapeNames) {
        shapeNames = shapeNames || defaultShapeNames;

        // This is a somewhat silly way to do things, but IDK... There
        // is a strange kind of elegance to it in my opinion.  You can
        // use for-in on either object.  On this.shapes, you get all the
        // shapes (decorative or not) if you loop this way.
        // My main concern is that since we obviously can't use
        // hasOwnProperty, we're relying on browsers to only include
        // enumerable properties, which IIRC there was some funkyness in
        // some old browsers about this, so...
        // Also, if we do things like that, I don't really like the name
        // nonDecorative.
        // But basically I want it to be fast to get the subset of
        // shapes that are not decorative, and this accomplishes that.
        this.nonDecorative = {};
        this.shapes = Object.create(this.nonDecorative);

        // .region is for virtual shapes that are not displayed
        this.region = {};

        for (var key in shapes) {
            var kind = shapeNames[shapes[key].kind];
            if (!kind) {
                throw new ReferenceError(
                    "Unknown shape kind: " + shapes[key].kind
                )
            }

            var shape = new kind(shapes[key].data);

            if (key.charAt(0) === "@") {
                this.region[key.substring(1)] = shape;
            } else if (!shapes[key].decorative) {
                this.nonDecorative[key] = shape;
            } else {
                this.shapes[key] = shape;
            }
        }

        // @bounds is a special region all shapes must have
        if (!this.region.bounds) {
            // The @inside region (essentially a stronger version of
            // @bounds) can be used as a fallback for @bounds if it
            // doesn't exist though.
            if (this.region.inside) {
                this.region.bounds = this.region.inside;
            } else {
                throw new ReferenceError("Shape has no @bounds region");
            }
        }

        this.radius = this.region.bounds.radius;
    }

    draw(ctx) {
        for (var key in this.shapes) {
            this.shapes[key].draw(ctx);
        }
    }

    fill(ctx) {
        if (this.region.inside) {
            this.region.inside.fill(ctx);
        } else {
            for (var key in this.shapes) {
                this.shapes[key].fill(ctx);
            }
        }
    }
}

var defaultShapeNames = {
    "open": Polyline,
    "closed": Polygon,
    "dot": Dots,
    "exhaust": ExhaustShape
}
