class SceneConstructor {
    /** A dummy object that keeps track of an unconstructed game. */

    constructor(obj, args) {
        this._obj = obj;
        this._args = args;
        this._constructed = false;
    }

    construct(parentSceneOrGame) {
        /** Returns a fully constructed scene.
         * If necessary, initializes the unconstructed scene, providing
         * it with a game object inheriting from the parent scene if one
         * is provided, and finally calling the deferred init method.
         **/

        // This might happen if there are multiple references to an
        // unconstructed scene.
        if (this._constructed) return this._obj;

        if (parentSceneOrGame instanceof Scene) {
            this._obj.game = parentSceneOrGame.game;
            this._obj.inherit(parentSceneOrGame);
        } else {
            this._obj.game = parentSceneOrGame;
        }

        this._obj.init(...this._args);
        this._constructed = true;
        return this._obj;
    }
}

export class Scene {
    constructor(...args) {
        /** Deferred scene construction
         * Takes the same arguments as init, but defers construction
         * until contextual information is passed to the construct
         * method.  Note that the Scene constructor DOES NOT return an
         * instance of Scene, but rather a SceneConstructor.  The
         * construct method must be called on the SceneConstructor to
         * initialize it.  Scene also implements the SceneConstructor
         * interface, so construct can also be called on a fully
         * constructed scene to simply return itself.
         **/

        // Could I have just kept track of the arguments within the
        // Scene class itself?  Or done something else more normal?
        // Yeah, but that's no fun...  And this just feels better to me.
        return new SceneConstructor(this, args);
    }

    construct(parentSceneOrGame) {
        /** Polymorphic SceneConstructor interface
         * This method exists so that fully constructed scenes share the
         * construction interface with SceneConstructor.
         *
         * The parentSceneOrGame object is always ignored, since the
         * scene has presumably already been passed the desired parent
         * scene.
         **/

        return this;
    }

    // The inherit method may be implemented to inherit additional
    // information other than the game object from the previous scene.
    // It is only called when constructed from another scene, but if it
    // is called, it will be called before the init method.
    // This will be useful if I want to implement transition scenes.
    inherit(parentScene) { }

    // The init method is where normal initialization happens.  The
    // arguments it receives are the same arguments passed to the
    // constructor.
    init(...args) { }

    // The update and draw methods are called by the GameLoop at regular
    // intervals.
    update(dt) { }
    draw(ctx, focused) { }
}
