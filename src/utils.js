export function ceilPow(val, pow) {
    /** Round val to the nearest power of pow (2 by default) **/

    var lnp = pow? Math.log(pow) : Math.LN2;
    return Math.exp(lnp * Math.ceil(Math.log(val) / lnp));
}

export function mapMinMax(iterable, keyFunc) {
    var min, max, minKey, maxKey;

    var iterator = iterable[Symbol.iterator]();
    var first = iterator.next().value;
    min = max = first;
    minKey = maxKey = (keyFunc? keyFunc(first) : first);

    for (var value of iterator) {
        var key = (keyFunc? keyFunc(value) : value);

        if (key < minKey) {
            min = value;
            minKey = key;
        } else if (key > maxKey) {
            max = value;
            maxKey = key;
        }
    }

    return { min: min, max: max, minKey: minKey, maxKey: maxKey };
}




const PREFIXES = [
    // TODO: maybe replace mc with µ, depending on how it shows up in
    // the font I use.  Also, it's µ (dig: My), not μ (dig: m*).
    "y", "z", "a", "f", "p", "n", "mc", "m",
    "",
    "k", "M", "G", "T", "P", "E", "Z", "Y"
];

function magnitude(val) {
    if (val === 0) return 0;
    return Math.floor(Math.log(Math.abs(val)) * Math.LOG10E);
}

// TODO: make this better somehow.  It's ugly and inefficient and likely
// littered with bugs.  There's got to be a better way.
export function toMetric(val, unit, sig, prec) {
    /** Format a number with metric-prefixed units
     * Rounds the number `val` to `sig` significant figures (but with no
     * more precision than `prec`), returning a string with the unit
     * `unit` prefixed by a metric/SI prefix.
     */

    unit = unit || "";
    sig = sig || 3;

    // NaN, ±Infinity, other non-numeric
    if (!isFinite(val)) return `${val} ${unit}`;

    // Round to the nearest multiple of prec
    if (prec) val = Math.round(val / prec) * prec;

    var roundFactor = Math.pow(10, 1 + magnitude(val) - sig);
    var rounded = Math.round(val / roundFactor) * roundFactor;

    var pow = magnitude(rounded);

    var minPrefix = -8;
    var maxPrefix = 8;
    if (prec) {
        var minPow = magnitude(prec);
        minPrefix = Math.min(Math.max(
            Math.ceil(minPow / 3),
        minPrefix), maxPrefix);

        sig -= Math.max(0, minPow - pow + sig - 1);
    }

    // Power of the nearest prefix
    var ppow = 3 * Math.min(Math.max(
        Math.floor(pow / 3),
    minPrefix), maxPrefix);

    var decs = sig - (1 + pow - ppow);
    var num = (rounded / Math.pow(10, ppow)).toFixed(Math.max(0, decs));
    unit = PREFIXES[8 + Math.floor(ppow / 3)] + unit;
    return `${num} ${unit}`;
}
