// TODO: for the purposes of efficiency, this module is very, eh, wet.
// But I think I'm overdoing it.  And there are also a bunch of methods
// I'll probably never use.  Once I know better how I will actually use
// these classes, I think it would be wise to trim some fat here, even
// if it results in some unnecessary multiplications or function calls
// here and there.

export class Vec2 {
    /** 2D vector
     * Operations that normally return a vector are also available in
     * incremental forms with methods prefixed by `i`.  These mutate the
     * vector and don't return anything.
     **/

    constructor(x, y) {
        this.set(x, y);
    }

    set(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }

    static from(obj) {
        if ("x" in obj && "y" in obj) {
            return new this(obj.x, obj.y);
        }

        var arr = Array.from(obj);
        if (arr.length === 2) {
            return new this(arr[0], arr[1]);
        }

        throw new TypeError(`Can't convert ${obj} to 2D vector`);
    }

    static fromPolar(r, theta) {
        return new this(r * Math.cos(theta), r * Math.sin(theta));
    }

    copy() {
        return new this.constructor(this.x, this.y);
    }

    toString() {
        var name = this.constructor.name;
        return `[object ${name} <${this.x}, ${this.y}>]`;
    }

    // Add
    add(other) {
        return new this.constructor(
            this.x + other.x,
            this.y + other.y
        );
    }

    iadd(other) {
        this.x += other.x;
        this.y += other.y;
    }

    // Subtract
    sub(other) {
        return new this.constructor(
            this.x - other.x,
            this.y - other.y
        );
    }

    isub(other) {
        this.x -= other.x;
        this.y -= other.y;
    }

    // Multiply by scalar
    mul(s) {
        return new this.constructor(
            this.x * s,
            this.y * s
        );
    }

    imul(s) {
        this.x *= s;
        this.y *= s;
    }

    // Divide by scalar
    div(s) {
        return new this.constructor(
            this.x / s,
            this.y / s
        );
    }

    idiv(s) {
        this.x /= s;
        this.y /= s;
    }

    // Negation
    neg() {
        return new this.constructor(
            -this.x,
            -this.y
        );
    }

    ineg() {
        this.x = -this.x;
        this.y = -this.y;
    }

    // Perpendicular vector
    perp() {
        return new this.constructor(
            -this.y, this.x
        );
    }

    iperp() {
        var x = this.x;
        var y = this.y;

        this.x = -y;
        this.y = x;
    }

    // Transform by a transformation matrix
    trf(mat) {
        return new this.constructor(
            mat.a * this.x + mat.c * this.y + mat.e,
            mat.b * this.x + mat.d * this.y + mat.f
        );
    }

    itrf(mat) {
        this.x = mat.a * this.x + mat.c * this.y + mat.e;
        this.y = mat.b * this.x + mat.d * this.y + mat.f;
    }

    // Dot (scalar) product
    dot(other) {
        return this.x * other.x + this.y * other.y;
    }

    // 2D scalar cross product
    cross(other) {
        return this.x * other.y - this.y * other.x;
    }

    // Magnitude
    mag() {
        return Math.sqrt(this.dot(this));
    }

    // Unit vector
    unit() {
        return this.div(this.mag());
    }

    iunit() {
        this.idiv(this.mag());
    }

    // Test for equality
    eq(other) {
        return this.x === other.x && this.y === other.y;
    }

    // Test if vector has non-number values
    isNaN() {
        return isNaN(this.x) || isNaN(this.y);
    }

    // Test if vector is finite
    isFinite() {
        return isFinite(this.x) && isFinite(this.y);
    }

    // Implement iterator protocol
    [Symbol.iterator]() {
        return [this.x, this.y][Symbol.iterator]();
    }

    // Average vector of array of vectors
    static average(vecs) {
        return vecs.reduce((s, v) => s.add(v)).div(vecs.length);
    }
}

export class Transform {
    /** 2D transformation matrix
     * Has a similar API to CanvasRenderingContext2D.
     * All transformation methods mutate the matrix.
     **/

    constructor(a, b, c, d, e, f) {
        if (!arguments.length) {
            this.resetTransform();
        } else {
            this.setTransform(a, b, c, d, e, f);
        }
    }

    static fromRotation(theta, pivot) {
        /** A transform describing a rotation about an axis
         * Returns a rotation by `theta` around the `pivot` vector.
         **/

        var x = 0;
        var y = 0;
        if (pivot) {
            [x, y] = [pivot.x, pivot.y];
        }

        var ct = Math.cos(theta);
        var st = Math.sin(theta);
        return new this(ct, st, -st, ct, x, y);
    }

    setTransform(a, b, c, d, e, f) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
        this.e = e;
        this.f = f;
    }

    resetTransform() {
        this.setTransform(1, 0, 0, 1, 0, 0);
    }

    transform(a, b, c, d, e, f) {
        this.setTransform(
            this.a * a + this.c * b,
            this.b * a + this.d * b,
            this.a * c + this.c * d,
            this.b * c + this.d * d,
            this.a * e + this.c * f + this.e,
            this.b * e + this.d * f + this.f
        );
    }

    rotate(theta) {
        var ct = Math.cos(theta);
        var st = Math.sin(theta);

        // this.transform(ct, st, -st, ct, 0, 0)
        this.setTransform(
            this.a * ct + this.c * st,
            this.b * ct + this.d * st,
            this.c * ct - this.a * st,
            this.d * ct - this.b * st,
            this.e, this.f
        );
    }

    translate(x, y) {
        // this.transform(1, 0, 0, 1, x, y);
        this.setTransform(
            this.a, this.b, this.c, this.d,
            this.a * x + this.c * y + this.e,
            this.b * x + this.d * y + this.f
        );
    }

    scale(x, y) {
        if (y === undefined) {
            // Scale x and y uniformly
            y = x;
        }

        // this.transform(x, 0, 0, y, 0, 0);
        this.setTransform(
            this.a * x, this.b * x,
            this.c * y, this.d * y,
            this.e, this.f
        );
    }

    [Symbol.iterator]() {
        return [
            this.a, this.b, this.c,
            this.d, this.e, this.f
        ][Symbol.iterator]();
    }
}
