function pairsToObj(pairs, obj) {
    obj = obj || {};

    for (var [k, v] of pairs) {
        obj[k] = v;
    }

    return obj;
}

export function load(rcmap, obj) {
    /** Resource loader... kinda
     * This function doesn't so much manage resources as it does simply
     * resolve all promises in an object of promises.  But it's useful
     * for defining named resources as a mapping of names to promises.
     **/

    // Maybe I should make sure all the promises actually are promises.
    return Promise.all(Object.keys(rcmap)
        .filter(Object.prototype.hasOwnProperty.bind(rcmap))
        .map(key => rcmap[key].then(val => [key, val]))
    ).then(pairs => pairsToObj(pairs, obj));
}

export function getXHR(url) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.onload = () => resolve(xhr)
        xhr.onerror = () => reject(xhr);
        xhr.send();
    });
}

export function getJSON(url) {
    return getXHR(url).then(xhr => JSON.parse(xhr.responseText));
}
