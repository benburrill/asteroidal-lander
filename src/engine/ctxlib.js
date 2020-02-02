export function drawWrapper(ctx, func) {
    ctx.save();

    try {
        return func();
    } finally {
        ctx.restore();
    }
}

export function resetTransform(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

export function background(ctx, fillStyle) {
    ctx.save();
    resetTransform(ctx);
    ctx.fillStyle = fillStyle;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
}

export function createImage(dim, func) {
    var canvas = document.createElement("canvas");
    [canvas.width, canvas.height] = dim;
    var ctx = canvas.getContext("2d");
    func(ctx);

    return new Promise(function(resolve, reject) {
        var img = new Image();
        // TODO: maybe use toBlob in browsers that support it?  Storing
        // the image as a data url seems somewhat inefficient.
        // We could also just return the canvas itself and skip all the
        // asynchronous shit, but IDK, I like the idea of returning an
        // image.
        // There's also the createImageBitmap function which returns a
        // special ImageBitmap type.  It is also asynchronous, which is
        // ok I guess, but like ctx.toBlob, it has poor cross-browser
        // support.
        img.src = canvas.toDataURL("image/png");
        img.addEventListener("load", function() {
            resolve(img);
        });

        img.addEventListener("error", function(event) {
            // I don't think this will ever actually be called since
            // we're just loading a data url, but whatever...
            reject(event);
        });
    });
}
