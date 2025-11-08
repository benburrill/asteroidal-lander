import { background, createImage } from "./engine/ctxlib.js";
import { Vec2, Transform } from "./engine/vmath.js";
import { rtripolycol } from "./engine/collision.js";
import { Camera } from "./engine/camera.js";
import { GameLoop } from "./engine/loop.js";
import { Game } from "./engine/game.js";
import { Scene } from "./engine/scene.js";
import { LoadGlobalResources } from "./engine/loading-scene.js";
import { getJSON } from "./engine/resources.js";

import { MultiShape, Polygon } from "./shape.js";
import { Asteroid } from "./asteroid.js";
import { Ship, Fragment, speedColor } from "./ship.js";
import { toMetric, mapMinMax } from "./utils.js";
import { StarField } from "./starfield.js";


class GameOverScene extends Scene {
    inherit(parentScene) {
        this.background = parentScene;
    }

    update(dt) {
        if (this.game.keys.R) return new AsteroidalLander;
    }

    draw(ctx) {
        ctx.save();
        this.background.draw(ctx);
        ctx.restore();

        background(ctx, "rgba(0, 0, 100, 0.5)");

        ctx.fillStyle = "#FFF";
        ctx.font = "40px monospace";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillText("Press [R] to restart", this.game.width/2, this.game.height/2, this.game.width);
    }
}

class ExplosionScene extends Scene {
    inherit(parentScene) {
        this.asteroid = parentScene.asteroid;
        this.starField = parentScene.starField;
        this.cam = parentScene.cam;
    }

    init(fragments) {
        this.fragments = fragments;
        this.time = 0;
    }

    update(dt) {
        this.time += dt;
        // TODO: I could use my new Camera zoom animation for this, but
        // the zoom function would be a bit different.  Maybe add an
        // alternative zoom function to Camera?  Or just use the normal
        // zoom animation here rather than this weird quadratic thing?
        var zoominess = Math.min(this.cam.zoom * this.cam.zoom, 1);
        this.cam.zoom -= zoominess * (dt / 50);
        if (this.cam.zoom < 1/100) {
            this.cam.zoom = 1/100;

            if (this.time > 5000) return new GameOverScene;
        }

        // Nice to have for testing, but most of the time I want to
        // force the player to wallow in their shame.
        // if (this.game.keys.R) return new AsteroidalLander;

        for (var frag of this.fragments) {
            frag.gravitate(this.asteroid, dt);
            frag.update(dt);

            var [lo, hi] = this.asteroid.getSlice(frag);
            for (var i = lo; i <= hi; i++) {
                var p1 = this.asteroid.getPoint(i);
                var p2 = this.asteroid.getPoint(i + 1);

                var collision = rtripolycol(
                    this.asteroid.pos, p1, p2, frag.getBounds()
                );

                if (collision) frag.collide(collision);
            }
        }
    }

    draw(ctx) {
        background(ctx, "#000");

        ctx.save();
        ctx.translate(this.game.width/2, this.game.height/2);
        this.starField.draw(ctx, this.cam, this.game.width, this.game.height);

        this.cam.applyTransform(ctx);

        for (var frag of this.fragments) frag.draw(ctx, this.cam);

        this.asteroid.draw(ctx, this.cam);
        ctx.restore();
    }
}

// TODO: keep track of G forces from impacts.  Even when the ship is not
// destroyed, high G landings damage things, resulting in lower score or
// other implicitly undesirable outcomes.
// "X people were injured during the rough landing"
// "$X worth of mining equipment was damaged due to the rough landing"
// etc.
class AsteroidalLander extends Scene {
    init() {
        this.frames = 0;
        this.dtRecord = new Array(60);
        for (var i = 0; i < this.dtRecord.length; i++)
            this.dtRecord[i] = 0;
        this.debug = false;

        this.asteroid = new Asteroid(5000, 200, this.game.rc.hatching);
        // this.asteroid.grav = 0;

        this.starField = new StarField(this.game.rc.star);

        var rShip = this.asteroid.maxRadius + 400;

        this.ship = new Ship(this.game.rc.cityShipData, {
            pos:new Vec2(0, -rShip),
            vel: new Vec2(Math.sqrt(this.asteroid.grav / rShip), 0),
            theta: Math.random() * 2 * Math.PI,
            crest: 0.3,
            sfric: 0.9,
            dfric: 0.7,

            // A bit extra fuel for exploration
            fuel: 1.5
        });

        this.cam = new Camera;
        this.cam.follow(this.ship);
        this.cam.zoom = 1/350;
        this.cam.animZoom(1/15, 2500);

        this.regimes = [
            {enter: 0, exit: 700, zoom: 1/3, ttime: 500},
            {enter: 300, exit: 6000, zoom: 1/15, ttime: 1000},
            // {enter: 1000, exit: 6000, zoom: 1/15, ttime: 500},
            {enter: 5000, exit: 1.1e4, zoom: 1/100, ttime: 1500},
            {enter: 1e4, exit: 0, zoom: 1/500, ttime: 2000},
        ];

        this.curRegime = this.regimes[0];
    }

    update(dt) {
        this.frames++;
        this.dtRecord[this.frames % this.dtRecord.length] = dt;

        if (this.game.keys.R && this.ship.fuel <= 0) {
            return new AsteroidalLander;
        }

        if (this.game.keys["!"]) this.debug = true;

        if (this.game.keys.Spacebar) dt *= 10;
        this.cam.update(dt);

        // if (this.game.keys.$BracketLeft) this.cam.zoom -= 0.03 * this.cam.zoom;
        // if (this.game.keys.$BracketRight) this.cam.zoom += 0.03 * this.cam.zoom;
        // this.cam.zoom = Math.max(Math.min(this.cam.zoom, 1), 1/2000);

        this.ship.gravitate(this.asteroid, dt);

        var keyUp = this.game.keys.$KeyW || this.game.keys.ArrowUp;
        var keyDn = this.game.keys.$KeyS || this.game.keys.ArrowDown;
        var keyLe = this.game.keys.$KeyA || this.game.keys.ArrowLeft;
        var keyRt = this.game.keys.$KeyD || this.game.keys.ArrowRight;

        this.ship.update(dt, {
            turnLeft: keyLe || (keyDn &&
                this.ship.omega >= this.ship.thrustTorque * dt),
            turnRight: keyRt || (keyDn &&
                this.ship.omega <= -this.ship.thrustTorque * dt),
            thrustForward: keyUp
            // increaseThrust: this.game.keys.ArrowUp,
            // decreaseThrust: this.game.keys.ArrowDown
        })

        var maxAstrRadius = -1;
        var normals = [];
        var origVel = this.ship.vel.copy();
        var vulnerable = false;
        var cool = true;
        var [lo, hi] = this.asteroid.getSlice(this.ship);
        for (var i = lo; i <= hi; i++) {
            var p1 = this.asteroid.getPoint(i);
            var p2 = this.asteroid.getPoint(i + 1);
            maxAstrRadius = Math.max(
                maxAstrRadius, Math.max(p1.mag(), p2.mag())
            );

            var collision = rtripolycol(
                this.asteroid.pos, p1, p2,
                this.ship.getBounds()
            );

            if (collision) {
                normals.push(collision.norm);
                var vReg = this.ship.shape.region.vulnerable;
                var vPoints = vReg.trfPoints(this.ship.getTransform());
                if (rtripolycol(this.asteroid.pos, p1, p2, vPoints)) {
                    vulnerable = true;
                };

                if (!this.asteroid.isCool(i)) cool = false;

                this.ship.collide(collision);

            }
        }

        var sep = this.ship.pos.sub(this.asteroid.pos).mag() - (
            maxAstrRadius + this.ship.shape.radius
        );

        if (sep < this.curRegime.enter || sep > this.curRegime.exit) {
            for (var reg of this.regimes) {
                if (sep < reg.enter) break;
                this.curRegime = reg;
            }
        }

        this.cam.animZoom(this.curRegime.zoom, this.curRegime.ttime);


        // The idea here was that I could use this to put a message
        // reminding the player that they need to land elsewhere, but
        // unfortunately this.stable is ironically very unstable, I
        // think mostly due to omega fluctuations.
        this.stable = false;
        if (normals.length) {
            var avgNorm = Vec2.average(normals).unit();
            var dSpeed = origVel.sub(this.ship.vel).mag();
            var speed = this.ship.vel.mag();
            if (vulnerable || dSpeed > 0.05) {
                return new ExplosionScene(this.ship.explode(avgNorm));
            }

            var forward = Vec2.fromPolar(1, this.ship.theta);
            this.stable = (
                forward.dot(avgNorm) > 0.99 &&
                speed < 0.0002 && Math.abs(this.ship.omega) < 6e-7
            );

            if (cool && this.stable) {
                this.cam.zoom = 1/2;
                return new GameOverScene;
            }
        }
    }

    draw(ctx, unfocused) {
        var cam = this.cam;
        cam.view = this.game.minDim / this.ship.shape.radius / 2;
        cam.rotation = -this.asteroid.angleFor(this.ship.pos) - Math.PI / 2;

        background(ctx, "#000");

        ctx.save();
            ctx.translate(this.game.width / 2, this.game.height / 2);
            this.starField.draw(ctx, cam, this.game.width, this.game.height);
            cam.applyTransform(ctx);

            this.ship.draw(ctx, cam);
            this.asteroid.draw(ctx, cam);
            this.ship.drawInfo(ctx, cam);
        ctx.restore();

        ctx.fillStyle = "rgba(15,15,15,0.5)"
        ctx.fillRect(this.game.width / 2, 0, this.game.width, 40);
        ctx.fillStyle = "rgba(80,80,80,0.5)"
        ctx.fillRect(0, 0, this.game.width / 2, 40);
        ctx.fillStyle = "rgba(230,210,50,0.5)"
        ctx.fillRect(0, 0, this.game.width * this.ship.fuel / 2, 40);
        if (this.ship.fuel <= 0.2 && (new Date) % 2000 < 700) {
            ctx.font = "40px monospace";
            ctx.textBaseline = "top";
            ctx.textAlign = "start";
            ctx.fillStyle = "#fb0";
            ctx.fillText(
                this.ship.fuel > 0? "FUEL LOW" : "NO FUEL",
                5, 5, this.game.width / 2 - 10
            );
        }

        ctx.font = "15px monospace";
        ctx.textBaseline = "top";

        if (this.ship.fuel <= 0) {
            ctx.textAlign = "start";
            ctx.fillStyle = "#FFF";
            ctx.fillText("Press [R] to restart", 5, 45, this.game.width / 2 - 10);
        }

        ctx.textAlign = "end";
        ctx.fillStyle = "#4DF";
        ctx.fillText("Altitude: " + toMetric(
            this.ship.getAltitude(this.asteroid) * 0.6,
            "m", 3, 0.01
        ), this.game.width - 5, 5, this.game.width / 2 - 10);

        var vmag = this.ship.vel.mag();
        ctx.fillStyle = speedColor(vmag, 0.05);
        ctx.fillText(
            ((vmag > Math.sqrt(2 * this.asteroid.grav / this.ship.pos.mag()))?
                "(ESC)" : ""
            ) + " Velocity: " + toMetric(vmag * 600, "m/s", 3, 0.01),
            this.game.width - 5, 25, this.game.width / 2 - 10
        );

        if (this.debug) {
            ctx.textBaseline = "bottom";
            ctx.textAlign = "start";
            ctx.fillStyle = "#FFF";
            var totTime = this.dtRecord.reduce((sum, cur) => sum + cur);
            var totFrames = Math.min(this.frames, this.dtRecord.length);
            ctx.fillText(
                (totFrames * 1000 / totTime).toFixed(1) + " FPS",
                5, this.game.height - 5
            );
        }

        // Minimap, TODO: move this code somewhere else.
        ctx.save();
        // This clipping region isn't really needed currently, since
        // nothing should ever end up outside of it anymore, but might
        // as well have it anyway.
        ctx.rect(
            this.game.width / 2, this.game.height / 2,
            this.game.width, this.game.height
        );
        ctx.clip();

        var mapZoom = this.game.minDim / 8 / this.asteroid.maxRadius;
        ctx.translate(
            this.game.width - this.game.minDim / 4,
            this.game.height - this.game.minDim / 4
        );
        ctx.scale(mapZoom, mapZoom);

        // ctx.strokeStyle = "rgba(150, 255, 150, 0.75)";
        ctx.strokeStyle = "rgba(140, 140, 112, 0.75)";
        ctx.fillStyle = "rgba(140, 140, 112, 0.15)";
        var pixels = 1 / mapZoom;
        ctx.lineWidth = 1.5 * pixels;
        this.asteroid.shape.draw(ctx);
        ctx.fill();

        for (var i of this.asteroid.cool) {
            if (Math.random() < 0.05) continue;
            ctx.fillStyle = "rgba(240, 0, 128, 0.6)";
            ctx.beginPath();
            var offset = Math.round(0.7 * (Math.random() - Math.random()));
            ctx.arc(
                ...this.asteroid.getPoint(i + offset),
                2.3 * pixels, 0, 2 * Math.PI
            );
            ctx.fill();
        }

        var edge = (this.game.minDim / 4 - 8) * pixels;
        var sx = this.ship.pos.x - this.asteroid.pos.x;
        var sy = this.ship.pos.y - this.asteroid.pos.y;
        if (Math.abs(sx) > edge || Math.abs(sy) > edge) {
            sx = Math.min(Math.max(sx, -edge), edge);
            sy = Math.min(Math.max(sy, -edge), edge);
            if ((new Date) % 1000 < 500) {
                ctx.fillStyle = "rgba(68, 221, 255, 0.3)";
            } else {
                ctx.fillStyle = "rgba(68, 221, 255, 0.1)";
            }
        } else {
            ctx.fillStyle = "rgba(68, 221, 255, 0.75)";
        }

        ctx.translate(sx, sy);
        ctx.rotate(this.ship.theta);
        ctx.beginPath();
        ctx.moveTo(8 * pixels, 0);
        ctx.arc(0, 0, 2.3 * pixels, Math.PI / 2, 3 * Math.PI / 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        if (unfocused) {
            background(ctx, "rgba(0,0,0,0.75)");
            ctx.textBaseline = "middle";
            ctx.font = `20pt ${this.game.theme.fontFace}`;
            ctx.textAlign = "center";
            ctx.fillStyle = "#CCC";
            ctx.fillText("Click to focus", this.game.width / 2, this.game.height / 2, this.game.width);
        }
    }
}

window.addEventListener("load", function(e) {
    var canvas = document.getElementById("asteroidal-lander");

    new GameLoop(canvas).start(
        new Game(canvas, {
            bg: "#000",
            fg: "#DDD",
            fontFace: "monospace"
        }),

        new LoadGlobalResources({
            cityShipData: getJSON("city-ship.json"),
            // A delay for testing out the loading scene
            // delay: new Promise(resolve => setTimeout(resolve, 5000)),
            hatching: createImage([100, 100], function(ctx) {
                background(ctx, "rgb(10,10,10)");
                // ctx.strokeStyle = "#777";
                // ctx.strokeStyle = "#997";
                ctx.lineCap = "square";
                ctx.scale(2, 2);

                ctx.strokeStyle = "#554";
                ctx.beginPath();
                    ctx.moveTo(0, 0); ctx.lineTo(50, 50);
                    ctx.moveTo(25, 0); ctx.lineTo(50, 25);
                    ctx.moveTo(0, 25); ctx.lineTo(25, 50);

                    // The corner bits (only necessary at the 2x scale)
                    ctx.moveTo(-1, 49); ctx.lineTo(1, 51);
                    ctx.moveTo(49, -1); ctx.lineTo(51, 1);
                ctx.stroke();

                ctx.strokeStyle = "rgba(152, 134, 110, 0.2)";
                ctx.beginPath();
                    ctx.moveTo(0, 50); ctx.lineTo(50, 25);
                    ctx.moveTo(50, 0); ctx.lineTo(0, 25);
                ctx.stroke();
            }),

            star: createImage([100, 100], function(ctx) {
                var grad = ctx.createRadialGradient(50, 50, 10, 50, 50, 50);
                grad.addColorStop(0, "rgb(180, 180, 255)");
                grad.addColorStop(0.3, "rgba(200, 150, 255, 0.3)");
                grad.addColorStop(0.6, "rgba(220, 100, 200, 0.1)");
                grad.addColorStop(1, "rgba(255, 50, 150, 0)");

                ctx.beginPath();
                ctx.arc(50, 50, 50, 0, 2 * Math.PI);
                ctx.fillStyle = grad;
                ctx.fill();
            })
        }, new AsteroidalLander)
    );
})
