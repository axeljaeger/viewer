# SpaceMouse Web Demo

A public Vite + BabylonJS demonstration of rotating a 3D object with a 3Dconnexion SpaceMouse.

## Input modes

- **Raw WebHID** asks Chrome for direct access to the SpaceMouse. This is useful for inspecting its raw HID reports, but **3DxWare must not be holding the device**.
- **3Dconnexion SDK** is the production path: 3DxWare and its Navigation Library Server own the hardware, while the web app receives events via 3DconnexionJS. This avoids a raw-device conflict and retains driver configuration.

The demo is framework-free. `BabylonCanvas` owns the render lifecycle and exposes a small `rotate()` API. Input implementations convert data to the shared `SpaceMouseMotion` type in `src/space-mouse.ts`.

## 3Dconnexion SDK setup

The repository commits only the minified runtime needed by the browser. The downloaded SDK source, examples, documentation, and licence material must **not** be committed. The SDK agreement permits distribution of its processed JavaScript as part of a web application designed exclusively for 3Dconnexion products; it also requires the attribution shown in the app.

To reproduce the vendored runtime after downloading and extracting the Platform SDK:

```sh
# Default: expects ./3DxWare_SDK_v4-0-6_r22071
npm run vendor:3dconnexion

# Or point to a different extracted SDK version
TDX_SDK_PATH=/path/to/3DxWare_SDK npm run vendor:3dconnexion
```

This copies `3dconnexion.module.min.js` from `web/3DconnexionJS/build/` to `public/vendor/3dconnexion/`. The source SDK folder is excluded by `.gitignore`.

The driver bridge should be running before opening the demo. You can verify it locally at `https://127.51.68.120:8181/version`.

## Development

```sh
npm install
npm start
```

Use Chrome or another Chromium browser for WebHID. Run checks with:

```sh
npm run build
npm test
```

## Deployment

The GitHub Actions workflow in `.github/workflows/pages.yml` deploys every push to `main` to GitHub Pages. In the repository settings, set **Pages → Source** to **GitHub Actions** once. The workflow builds with the repository base path, so it works at `https://axeljaeger.github.io/viewer/`.

Dependabot checks npm and GitHub Actions dependencies monthly.
