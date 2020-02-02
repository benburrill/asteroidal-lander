Asteroidal Lander
=================
A game inspired by `Lunar Lander`_, but with Newtonian gravity and my
best attempt at rigid-body physics.

You can play the game `here <https://benburrill.github.io/asteroidal-lander>`__.

Wait, how do I play?
--------------------
| **Left/Right** arrows to fire turning thrusters
| **Down** to automatically slow your rotation
| **Up** to fire the main engine
| **Spacebar** to speed up time

WASD can be used in place of the arrow keys if desired.

Your goal is to land on the magenta-colored areas of the asteroid.  You
can see them all on the map in the bottom right of the screen.  The map
also shows your position relative to the asteroid as a blue icon.

The main display shows your ship, and will automatically zoom as you get
closer/farther from the asteroid.  The camera is fixed to the ship, and
will rotate as you move around the asteroid so that the asteroid always
appears at the bottom of the screen.  A velocity indicator appears next
to the ship, showing the direction of your velocity.  Pointing the ship
opposite to the velocity and firing the main engine will allow you to
cancel out the oribital velocity and land.

Good luck, keep an eye on your fuel level, and try not to crash.  This
isn't some dinky little landing module, it's a massive colony ship!

Development
-----------
To live-code Asteroidal Lander, you can use the ``npm run live`` command:

.. code:: sh

    $ git clone https://github.com/benburrill/asteroidal-lander
    $ cd asteroidal-lander
    $ npm install
    $ npm run live

Then navigate to the link it prints out in your browser

If you want to build Asteroidal Lander, you can use ``npm run build``
instead.  This will produce an minified JavaScript file and source map
in ``static/build``.

.. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. ..
.. Links
.. _Lunar Lander: https://en.wikipedia.org/wiki/Lunar_Lander_%281979_video_game%29
