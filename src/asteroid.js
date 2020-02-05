import OpenSimplexNoise from "open-simplex-noise";
import { Vec2 } from "./engine/vmath.js";
import { Polygon } from "./shape.js";
import { ceilPow, mapMinMax } from "./utils.js";

function multiOctave(gen, octaves) {
    return function(...args) {
        return octaves.reduce((sum, octave) => (
            sum + octave.mag * Math.pow(gen(...args.map(
                arg => arg * octave.freq
            )), octave.pow)
        ), 0);
    }
}

function coolSpots(radii, sectors, opts) {
    /** Finds cool spots on the asteroid's surface
     * Returns an array of the indices of the cool spots, which are
     * distributed uniformly across the surface of the asteroid.  This
     * is done by dividing the surface of the asteroid into `sectors`
     * sectors and finding the local maxima of coolness in each sector.
     *
     * Craters and ledges are considered particularly cool.
     * The code for this function, however, is considered very uncool.
     **/

    opts = opts || {};

    // Flatness threshold
    var fthresh = opts.fthresh || 10;

    var cool = [];

    // Skip the first index, since we don't know if the last index will
    // be cool or not, so it's best to just ignore the first one.
    // As an added advantage, it means we don't need to deal with
    // negative indices in checking the previous index.
    var i = 1;
    for (var sector = 0; sector < sectors; sector++) {
        var end = Math.floor((sector + 1) / sectors * radii.length);

        var maxIndex = -1;
        var maxScore = -Infinity;
        for (; i < end; i++) {
            var p = radii[i - 1];
            var s = radii[i];
            var e = radii[(i + 1) % radii.length];
            var n = radii[(i + 2) % radii.length];

            var crookedness = Math.max(Math.abs(e - s) - fthresh, 0);
            var leftDescent = Math.max(p - s, 0);
            var rightDescent = Math.max(n - e, 0);

            var score = leftDescent + rightDescent - crookedness / 2;
            if (score > maxScore) {
                maxIndex = i;
                maxScore = score;
            }
        }

        // It's possible the loop wont run at all if `i` has advanced
        // past the end of this sector.
        if (maxIndex !== -1) {
            cool.push(maxIndex);
            if (maxIndex === end - 1) i++;
        }
    }

    return cool;
}

// I like this one, but it's very blobby / non circular
// var defaultOctaves = [
//     {freq: 1, mag: 1, pow: 1},
//     {freq: 3, mag: 1/3, pow: 1},
//     {freq: 6, mag: 1/3, pow: 3},
// ];

// Not bad, but still a bit blobby and somewhat less cool
// var defaultOctaves = [
//     {freq: 1, mag: 1/4, pow: 1},
//     {freq: 2, mag: 1/2, pow: 1},
//     {freq: 3, mag: 1/4, pow: 1},
//     {freq: 6, mag: 1/3, pow: 3},
// ];

// Non-blobby, but with some cool features here and there
var defaultOctaves = [
    {freq: 1.5, mag: 1/3, pow: 1},
    {freq: 3, mag: 1/4, pow: 1},
    {freq: 6, mag: 1/2, pow: 5},
    {freq: 12, mag: 1/32, pow: 1}
];


export class Asteroid {
    constructor(radius, nsides, fillimg, nopts) {
        nsides = Math.max(3, nsides);
        this.centralAngle = 2 * Math.PI / nsides;
        this.fillimg = fillimg;

        nopts = nopts || {};
        var seed = nopts.seed !== undefined? nopts.seed : +new Date;
        var octaves = nopts.octaves || defaultOctaves;
        var noise = new OpenSimplexNoise(seed);
        var nfunc = multiOctave(noise.noise2D.bind(noise), octaves);

        var radii = new Array(nsides);
        var units = new Array(nsides);

        // Terrain generation
        for (var i = 0; i < nsides; i++) {
            var ux = Math.cos(i * this.centralAngle);
            var uy = Math.sin(i * this.centralAngle);

            radii[i] = radius * (1 + nfunc(ux, uy) / 2);
            units[i] = new Vec2(ux, uy);
        }

        this.cool = coolSpots(radii, 10);
        for (var i of this.cool) {
            var ni = (i + 1) % radii.length;

            // Flatten the cool spot
            radii[i] = radii[ni] = (radii[i] + radii[ni]) / 2;
        }

        var extremeRadii = mapMinMax(radii);
        this.minRadius = extremeRadii.min;
        this.maxRadius = extremeRadii.max;

        units.forEach((u, i) => u.imul(radii[i]));
        this.shape = new Polygon(units);
        this.length = nsides;

        // TODO: currently asteroid pos is almost totally ignored
        // The only reason I have it is so that I can write code that
        // pretends as if asteroids have a position and are not always
        // at the origin.  It shouldn't be hard to make asteroids use
        // the pos themselves, but I'm too lazy right now.
        this.pos = new Vec2;

        // Gravitational factor of the asteroid.  This is G * mass.
        // Would be nice to pass this in to the constructor, but right
        // now I'm fine with all asteroids having the same fixed grav.
        this.grav = 300;
    }

    getSlice(obj) {
        // Return low and high index bounds for an object near by the
        // asteroid.  The bounds may be the same index.
        var dist = obj.pos.sub(this.pos).mag();
        var angle = this.angleFor(obj.pos);
        var angularRadius = Math.atan(obj.shape.radius / dist);

        return [
            this.indexForAngle(angle - angularRadius),
            this.indexForAngle(angle + angularRadius)
        ]
    }

    angleFor(pos) {
        return Math.atan2(pos.y - this.pos.y, pos.x - this.pos.x);
    }

    indexForAngle(angle) {
        return Math.floor(angle / this.centralAngle);
    }

    normalizeIndex(idx) {
        idx %= this.length;
        return idx < 0? this.length + idx : idx;
    }

    getPoint(idx) {
        return this.shape.points[this.normalizeIndex(idx)];
    }

    isCool(idx) {
        idx = this.normalizeIndex(idx);

        // It's basically stupid to do a binary search here because
        // there are only ever going to be like 10 cool spots, but even
        // if it ends up being slower in practice, it doesn't really
        // matter and binary searches are cool, so it's fitting I guess.
        var lo = 0;
        var hi = this.cool.length - 1;
        while (lo <= hi) {
            var mid = (lo + hi) >> 1;
            if      (this.cool[mid] < idx) lo = mid + 1;
            else if (this.cool[mid] > idx) hi = mid - 1;
            else return true;
        }

        return false;
    }

    draw(ctx, cam) {
        ctx.save();

        this.shape.trace(ctx);

        ctx.fillStyle = ctx.createPattern(this.fillimg, "repeat");

        var fz = 1 / ceilPow(cam.scale);
        ctx.save(); ctx.scale(fz, fz); ctx.fill(); ctx.restore();

        ctx.lineWidth = cam.scale < 1? 1/cam.scale : 1;
        ctx.strokeStyle = "#FFF";
        ctx.stroke();

        ctx.lineWidth *= 2.5;
        ctx.strokeStyle = "#F08";
        for (var i of this.cool) {
            ctx.beginPath();
            ctx.moveTo(...this.getPoint(i));
            ctx.lineTo(...this.getPoint(i + 1));
            ctx.stroke();
        }

        ctx.restore();
    }
}
