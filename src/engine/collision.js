export function lscol(a, b, c, d) {
    /** Test if and where two line segments intersect
     * a, b, c, and d are vectors that represent the endpoints of the
     * two line segments AB and CD.
     **/

    // Explanation of the non-parallel case:
    // a + (b-a)s = c + (d-c)t
    // c-a = (b-a)s - (d-c)t
    // (c-a)x(d-c) = (b-a)x(d-c)s - (0)
    // (c-a)x(b-a) = (0) - (d-c)x(b-a)t = (b-a)x(d-c)t
    // s = (c-a)x(d-c) / (b-a)x(d-c), 0 <= s <= 1 -> intersection
    // t = (c-a)x(b-a) / (b-a)x(d-c), 0 <= t <= 1 -> intersection

    var ab = b.sub(a);
    var ac = c.sub(a);
    var cd = d.sub(c);

    var den = ab.cross(cd);

    if (den === 0) {  // Line segments are parallel
        if (ac.cross(cd) !== 0) return null;

        var ad = d.sub(a);
        var bc = c.sub(b);
        var bd = d.sub(b);

        // Using dot to test whether directions are opposite
        if (ac.dot(ad) <= 0) return { colinear: true, point: a };
        if (bc.dot(bd) <= 0) return { colinear: true, point: b };
        if (ac.dot(bc) <= 0) return { colinear: true, point: c };

        return null;
    }

    var s = ac.cross(cd) / den;
    if (s < 0 || s > 1) return null;
    var t = ac.cross(ab) / den;
    if (t < 0 || t > 1) return null;

    return {
        colinear: false,
        point: a.add(ab.mul(s))
    };
}


export function rtripolycol(o, p, q, poly) {
    /** Test if and where a radial triangle and polygon collide
     * This is an utterly horrifying and likely very inefficient form of
     * collision detection.  However I think it's somewhat justified
     * because I'm not just looking for collisions, I'm also trying to
     * make sure that the ship gets spit out in a very particular way.
     *
     * The ship always should move away from the origin point `o` with
     * this function, but depending on how the polygon is colliding, it
     * may move along the normal of the surface pq or along the radial
     * sides op or oq.
     **/

    var norm = p.sub(q).perp().unit();
    var op = p.sub(o).unit();
    var oq = q.sub(o).unit();

    var surf = norm.dot(p);
    var plo = op.cross(p);  // Lowest cross with op inside the triangle
    var qhi = oq.cross(q);  // Highest cross with oq inside the triangle

    var rp = op.dot(p);
    var rq = oq.dot(q);

    var maxDepth = 0;
    var out = null;
    var pivot = null;
    var intersections = [];

    for (var i = 0; i < poly.length; i++) {
        var start = poly[i];
        var end = poly[(i + 1) % poly.length];
        var edge = end.sub(start);

        // test if start inside triangle
        var jp = op.cross(start);
        var jq = oq.cross(start);
        var jn = norm.dot(start);

        if (jp > plo && jq < qhi && jn < surf) {
            var depth = surf - jn;
            if (depth > maxDepth) {
                maxDepth = depth;
                out = norm;
                pivot = start;
            }

            intersections.push(start);
        }

        // test if edge intersects op
        var result = lscol(start, end, o, p);
        if (result) {
            // If it's colinear, it might be better to use whichever of
            // start or end is lowest, but I don't think it matters too
            // much, so I'm not going to bother.

            var depth = rp - op.dot(result.point);
            if (depth > maxDepth) {
                maxDepth = depth;
                out = op;
                pivot = result.point;
            }

            intersections.push(result.point);
        }

        // test if edge intersects oq
        var result = lscol(start, end, o, q);
        if (result) {
            var depth = rq - oq.dot(result.point);
            if (depth > maxDepth) {
                maxDepth = depth;
                out = oq;
                pivot = result.point;
            }

            intersections.push(result.point);
        }

        // Not important for collision detection, but gives us
        // additional points of intersection
        var result = lscol(start, end, p, q);
        if (result) intersections.push(result.point);
    }

    if (!out) return null;
    return {
        norm: out,
        pivot: pivot,
        depth: maxDepth,
        intersections: intersections
    }
}
