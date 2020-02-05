Asteroidal Lander
=================
A game inspired by `Lunar Lander`_, but with Newtonian gravity and my
best attempt at rigid-body physics.

You can play the game `here <https://benburrill.github.io/asteroidal-lander>`__.

Gameplay Instructions
---------------------
| **Left/Right** arrows: hold to fire turning thrusters
| **Down**: hold to automatically slow your rotation
| **Up**: hold to fire the main engine
| **Spacebar**: hold to speed up time

WASD can be used in place of the arrow keys if desired.

Your goal is to land on the magenta-colored areas of the asteroid.  You
can see them all on the map in the bottom right of the screen.  The map
also shows your position relative to the asteroid as a blue icon.  You
might want to use the spacebar to speed up time until you get close to
where you want to land.

The main display shows your ship, and will automatically zoom as you get
closer/farther from the asteroid.  The camera is fixed to the ship, and
will rotate as you move around the asteroid so that the asteroid always
appears at the bottom of the screen.  A velocity indicator appears next
to the ship, showing the direction of your velocity.  Pointing the ship
opposite to the velocity and firing the main engine will allow you to
cancel out the orbital velocity and land.

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

| **Deploy process:**

To update the ``gh-pages`` branch, I use some arcane git trickery.  The
``gh-pages`` branch consists of everything in the ``static/`` directory
(including the generated build files that are .gitignore'd by the master
branch).  The ``gh-pages`` branch was created as an orphan branch, which
means it has no history prior to the first commit to the branch (use the
``--orphan`` flag with ``git checkout`` when creating it for the first
time)

New releases can be committed to ``gh-pages`` as follows:

.. code:: sh

    npm run build
    git symbolic-ref HEAD refs/heads/gh-pages
    git --work-tree static/ add --all && git --work-tree static/ commit
    git symbolic-ref HEAD refs/heads/master && git reset

I based this technique off of `X1011/git-directory-deploy`_.  If you
prefer, you can use that script rather than doing the commands yourself.
The script has some additional features as well.

.. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. .. ..
.. Links
.. _Lunar Lander: https://en.wikipedia.org/wiki/Lunar_Lander_%281979_video_game%29
.. _X1011/git-directory-deploy: https://github.com/X1011/git-directory-deploy
