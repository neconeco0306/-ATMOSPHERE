# ATMOSPHERE — Weather as Instrument

A browser-native audiovisual instrument that maps live atmospheric data to motion and sound.

## What it does
- Fetches live/current + hourly weather from Open-Meteo (no API key).
- Maps wind direction/speed into particle flow.
- Maps humidity, pressure, temperature and precipitation into a generative Web Audio sound field.
- Lets you scrub the next 24 hours and hear/see the atmosphere change.
- Touch bends the flow; tapping creates a short resonance.
- Optional device tilt moves the visual field and stereo image.
- Optional geolocation uses the user's own local weather; default is Fukuoka.
- Works as an installable PWA shell and gracefully falls back to a synthetic atmosphere if weather fetch fails.

## Run
Because motion sensors and service workers require secure contexts, use HTTPS in deployment. For local development:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080/ATMOSPHERE/ if serving from `/mnt/data`, or run the server inside this folder and open http://localhost:8080.

## Design principle
This is deliberately not a weather dashboard. Numeric values are secondary. The core object is a playable atmosphere: data → physical behavior → sound → touch.
