# hero3d build

Source for the home page 3D layer (glass cube that rebuilds into a growth stack on scroll).
The site itself has no build step: the bundled output is committed as `js/hero3d.js`.

    cd tools/hero3d
    npm install
    npm run build

`js/hero3d-loader.js` decides whether to load it (no phones, no reduced motion, no WebGL,
no data-saver, no weak devices). If it is skipped or fails, the static design is untouched.
