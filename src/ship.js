import { Vec2, Transform } from "./engine/vmath.js";
import { MultiShape } from "./shape.js";
import { mapMinMax } from "./utils.js";

export function speedColor(val, half) {
    var mag = Math.abs(val);
    var frac = mag / (mag + half);
    var cTheta = frac * Math.PI / 2;
    var blue = 255 * Math.cos(cTheta);
    var red = 255 * Math.sin(cTheta);
    var green = 255 * 4 * frac * (1 - frac);
    return "rgb(" + red + ", " + green + ", " + blue + ")";
}

export class PhysicsObject {
    constructor(shape, opt) {
        this.shape = shape;
        opt = opt || {};
        this.pos = opt.pos || new Vec2;
        this.vel = opt.vel || new Vec2;
        this.theta = opt.theta || 0;
        this.omega = opt.omega || 0;
        // coefficient of restitution
        this.crest = opt.crest || 0;
        // "coefficient of inertia": ratio of moment of inertia to mass
        // default is to treat everything like a big circle
        this.ciner = opt.ciner || this.shape.radius**2 / 2;
        // this.damp = opt.damp || 0;
        this.sfric = opt.sfric || 0;
        this.dfric = opt.dfric || 0;
    }

    applyImpulse(imp, where) {
        // Since my physics objects don't have masses, the impulse is
        // really just a change in velocity.
        // `where` is relative to the center of the physics object.

        this.vel.iadd(imp);

        // When where is undefined, it is equivalent to applying the
        // force to the center of mass.
        if (where !== undefined) {
            this.omega += where.cross(imp) / this.ciner;
        }
    }

    gravitate(body, dt) {
        this.applyImpulse(
            this.pos.mul(-body.grav * dt)
            .div(Math.pow(this.pos.sub(body.pos).mag(), 3))
        );
    }

    pointVel(where) {
        return this.vel.add(where.perp().mul(this.omega));
    }

    collide(c) {
        // Responds to a collision with a fixed, stationary object

        // var piv = c.pivot.sub(this.pos);
        var piv = Vec2.average(c.intersections).sub(this.pos);
        this.pos.iadd(c.norm.mul(c.depth));

        var pVel = this.pointVel(piv);
        var horiz = c.norm.perp();

        var nLeverage = piv.cross(c.norm);
        var pBump = -pVel.dot(c.norm) * (1 + this.crest) /
                    (1 + nLeverage * nLeverage / this.ciner);

        this.applyImpulse(c.norm.mul(pBump), piv);
        pVel = this.pointVel(piv);

        // Friction
        var tVel = pVel.sub(c.norm.mul(c.norm.dot(pVel)));
        var fric = tVel.mag();
        if (fric > pBump * this.sfric) {
            fric = pBump * this.dfric;
        }

        var tDir = tVel.unit();
        var tLeverage = piv.cross(tDir);
        this.applyImpulse(tDir.mul(-fric / (
            1 + tLeverage * tLeverage / this.ciner
        )), piv);
    }

    // TODO: I probably want to cache stuff like transforms and bounds.
    // IDK though, maybe not.
    getTransform() {
        var tm = new Transform;
        tm.translate(this.pos.x, this.pos.y);
        tm.rotate(this.theta);
        return tm;
    }

    getBounds() {
        return (
            (this.shape.region && this.shape.region.bounds) ||
            this.shape
        ).trfPoints(this.getTransform());

        // // Should return transformed bounds.  Currently leaving this up
        // // to subclassers since there isn't a consistent way to do this.
        // return [];
    }

    draw(ctx, cam) {
        ctx.save();
        ctx.transform(...this.getTransform());

        ctx.lineWidth = cam.scale < 1? 1 / cam.scale : 1;
        ctx.strokeStyle = "#FFF";

        this.shape.draw(ctx);
        ctx.restore();
    }

    update(dt) {
        this.theta += this.omega * dt;
        this.pos.iadd(this.vel.mul(dt));
    }
}

export class Ship extends PhysicsObject {
    constructor(shapeData, opt) {
        super(new MultiShape(shapeData), opt);
        this.throttle = 0;
        this.fuel = 1;
        this.fmul = 1/(opt && opt.fuel || 1);
    }

    getBounds() {
        return this.shape.region.bounds.trfPoints(this.getTransform());
    }

    drawInfo(ctx, cam) {
        ctx.save();
        ctx.transform(...this.getTransform());
        ctx.scale(1/cam.scale, 1/cam.scale);
        var rad = this.shape.radius * cam.scale;

        var vmag = this.vel.mag();
        if (vmag > 0.01) {
            var vdir = this.vel.div(vmag);
            ctx.save();
            // Undo rotation, kinda gross.  Probably better not to apply
            // transform and just translate by right amount, but...
            ctx.rotate(-this.theta);

            ctx.fillStyle = ctx.strokeStyle = speedColor(vmag, 0.05);

            ctx.beginPath();
            ctx.arc(...vdir.mul(rad + 5), 3, 0, 2 * Math.PI);
            ctx.fill();

            // TODO: maybe some kind of log scale for velocity, rather
            // than just capping it off?  Would need to deal with
            // negative logs though.  And maybe cap it off eventually
            // anyway, but probably outside normal velocity range.
            ctx.beginPath();
            ctx.moveTo(...vdir.mul(rad + 5));
            ctx.lineTo(...vdir.mul(rad + 5 + Math.min(20, vmag * 100)));
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.restore();
        }

        if (cam.scale < 0.3) {
            ctx.fillStyle = "#4DF";

            ctx.beginPath();
            ctx.moveTo(rad + 25, 0);
            ctx.lineTo(rad + 5, 5);
            ctx.lineTo(rad + 5, -5);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }

    _randExhaust(throttle) {
        var r = Math.random() - Math.random(); // r ∈ [-1, 1]
        return throttle * (0.75 + 0.25 * r);
    }

    _updateTurnExhaustL(throttle) {
        var t = this._randExhaust(throttle);
        var c = this._randExhaust(throttle);
        this.shape.shapes.turningExhaustL.throttle = t;
        this.shape.shapes.counterExhaustR.throttle = c;
    }

    _updateTurnExhaustR(throttle) {
        var t = this._randExhaust(throttle);
        var c = this._randExhaust(throttle);
        this.shape.shapes.turningExhaustR.throttle = t;
        this.shape.shapes.counterExhaustL.throttle = c;
    }

    _updatePrimaryExhaust() {
        var p = this._randExhaust(this.throttle);
        this.shape.shapes.primaryExhaust.throttle = p;
    }

    update(dt, actions) {
        actions = actions || {};
        // Not a great way to deal the out of fuel condition, but all
        // actions currently use fuel, so I suppose it works for now.
        if (this.fuel <= 0) actions = {};

        this._updateTurnExhaustL(actions.turnLeft? 1 : 0);
        if (actions.turnLeft) {
            this.omega -= 3e-7 * dt;
            this.fuel -= 5e-6 * this.fmul * dt;
        }

        this._updateTurnExhaustR(actions.turnRight? 1 : 0);
        if (actions.turnRight) {
            this.omega += 3e-7 * dt;
            this.fuel -= 5e-6 * this.fmul * dt;
        }

        // if (actions.increaseThrust) this.throttle += dt * 9e-4;
        // if (actions.decreaseThrust) this.throttle -= dt * 9e-4;
        if (actions.thrustForward) {
            this.throttle += dt * 1e-3;
            this.throttle = Math.min(this.throttle, 1);
            var thrustMag = this.throttle * 4e-5 * dt;
            this.vel.iadd(Vec2.fromPolar(thrustMag, this.theta));
            // Extra fuel is wasted early in the engine startup.  This
            // is to further incentivize judicious use of the throttle,
            // but if you want a some technobabble, you can blame it on
            // the integrated ullage engines in the ship's drive system.
            this.fuel -= (2 - this.throttle) * 3e-5 * this.fmul * dt;
        } else {
            this.throttle = 0;
        }

        this._updatePrimaryExhaust();

        this.fuel = Math.max(this.fuel, 0);
        window.fuel = this.fuel;

        super.update(dt);
    }

    explode(norm) {
        var horiz = norm.perp().mul(0.75);

        var frags = [];
        for (var name in this.shape.nonDecorative) {
            var shape = this.shape.nonDecorative[name];

            var randTheta = Math.random() * Math.PI;
            var randR = Math.random() / 5;

            var dVel = norm.mul(randR * Math.sin(randTheta));
            dVel.iadd(horiz.mul(randR * Math.cos(randTheta)));

            var dOmega = (Math.random() - Math.random()) / 900;

            frags.push(new Fragment(this, shape, dVel, dOmega));
        }

        return frags;
    }

    getAltitude(asteroid) {
        return mapMinMax(this.getBounds(), function(point) {
            var idx = asteroid.indexForAngle(asteroid.angleFor(point));
            var a = asteroid.getPoint(idx);
            var b = asteroid.getPoint(idx + 1);

            var edge = b.sub(a);
            var down = asteroid.pos.sub(point).unit();
            return a.sub(point).cross(edge) / down.cross(edge);
        }).minKey;
    }
}


export class Fragment extends PhysicsObject {
    constructor(origin, shape, dVel, dOmega) {
        dVel = dVel || new Vec2;
        dOmega = dOmega || 0;

        // use average vertex position as center
        var center = (
            shape.points.reduce((s,v)=>s.add(v))
            .div(shape.points.length)
        );

        // re-center the shape
        shape = new shape.constructor(
            shape.points.map(v=>v.sub(center))
        );

        super(shape, {
            pos: center.trf(origin.getTransform()),
            vel: origin.pointVel(center).add(dVel),
            theta: origin.theta,
            omega: origin.omega + dOmega,

            crest: origin.crest,
            sfric: origin.sfric,
            dfric: origin.dfric
        });
    }
}
