# BrickSpeed PWA

The BrickSpeed pad screen as an installable web app that talks **Bluetooth** to the phone pad
(pad firmware 3.14.1 or newer).

Works in **Chrome on Android** (and Chrome / Edge on a PC). iPhone browsers have no Web Bluetooth.

## Put it online (needs HTTPS)
Bluetooth and installing only work from an https address. Easiest: GitHub Pages.
1. GitHub → **New repository** → name `brickspeed-app` → **Public**.
2. **Add file → Upload files** → drag in everything from this folder → **Commit**.
3. **Settings → Pages** → Source: *Deploy from a branch* → Branch `main`, folder `/ (root)` → Save.
4. After a minute it is live at `https://<your-github-name>.github.io/brickspeed-app/`.
Later you can move it to `https://brickspeed.fun` on the Synology (any HTTPS host works).

## Install on the phone
1. Open the address in **Chrome** on Android.
2. Menu ⋮ → **Install app** (or *Add to Home screen*).
3. Open **BrickSpeed** from the home screen: full screen, landscape, works offline.

## Use it
1. Switch on the pad.
2. Tap **Connect to my pad** → pick `BrickSpeed-Pad-XXXX`.
3. Next time it reconnects by itself where Chrome allows it; otherwise tap Connect once.

## Updating
Upload the changed files to the repository and raise `VERSION` in `sw.js` (e.g. `bs-1.0.1`).
Phones get the new version the next time the app is opened with internet.
