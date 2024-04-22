## TODO

- Update Ionic and Capacitor
- App and Fav Icons
  - https://capacitorjs.com/docs/android/configuration
- Turn image composition into an npm lib
- subscriptions for player updates
- Fix Grids on Android
- Inline the selections for anime tab
- Tabs should keep the debug flag

## Things to experiment with

- Matrix fonts
- Screen glitching
- Blurry text
- Prestige

## Glitches

- Acolyte shoes overlay
- Cloak shoulders

# Stable Diffusion

## Image

- Aspect 3:4, 1024 x 1344
- Denoise 0.5 - 0.85 depending on the step

## Generation

- AnimaPencilXL 3.0.0 + AddDetailXL @ 1
- DPM++ SDE Karras, 4 its, 5 steps, cfg 2.0

## Control

- t2i-adapter-openpose-sdxl @ 1 (0-100)
- t2i-adapter-canny-sdxl @ 1 (25-75) only handls, feet, shoulders, top of head, and hips

## Prompts

- Pos: <SK_ANIME><ZIP2D> a full body front shot drawing of a man standing.
- Neg: <ac_neg1><ac_neg2><zip2d_neg> shadow. nsfw. nudity. reflection
