# Satellite Tracker

Satellite Tracker is a beginner-friendly web application for learning how published orbital elements can be used to predict a satellite's position. This development stage tracks only the International Space Station (ISS, NORAD catalog number 25544).

## What the application does

- Requests the ISS Orbit Mean-Elements Message (OMM) JSON from [CelesTrak](https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=JSON).
- Parses that JSON with `json2satrec()` from satellite.js, then uses its SGP4 propagator to calculate an Earth-centered position and velocity.
- Converts the position to geographic latitude, longitude, and altitude and plots it on a Leaflet map with OpenStreetMap tiles.
- Updates the prediction and displayed UTC time every second without repeatedly downloading the orbital elements.
- Shows the orbital element epoch, loading/error states, and a switchable map-follow mode.

The Hubble and NOAA 19 catalog entries remain to preserve the original selection and search interface, but they are not tracked in this milestone.

## Accuracy and limitations

The displayed location and velocity are **orbital predictions** based on the published OMM data and the SGP4 model. They are not direct, continuously transmitted telemetry from the ISS. The data epoch is shown because predictions become less reliable as orbital elements age.

The browser must be online to load satellite.js, Leaflet, map tiles, and CelesTrak data. If CelesTrak is unavailable or returns invalid data, the dashboard shows an error rather than inventing a position. The application does not currently predict a ground track, account for observation visibility, or automatically refresh the orbital elements; use the retry button to request a new element set.

## Run locally

1. Open the project folder in Visual Studio Code.
2. Install the **Live Server** extension if it is not already installed.
3. Right-click [index.html](./index.html) and choose **Open with Live Server**.
4. Keep an internet connection available and wait for the ISS data status to change from loading to tracking.

The page can also be served by any local static HTTP server. For example, with Python installed, run `python -m http.server 8000` in the project folder and open `http://localhost:8000`. Serving over HTTP is recommended instead of opening the HTML file directly.

## Manual testing checklist

- Confirm the ISS location, latitude, longitude, altitude, velocity, current UTC time, and orbital element epoch appear after data loads.
- Check that the ISS marker moves periodically while orbital data is fetched only once at startup.
- Enable **Follow ISS**, verify the map follows the marker, and disable follow mode.
- Search the catalog, select Hubble or NOAA 19, and confirm the interface clearly says those satellites are not tracked.
- Disconnect from the network or block CelesTrak, reload, and confirm a clear error appears instead of telemetry values; restore the connection and use **Retry data fetch**.
- Check the browser console for JavaScript errors and verify that the map attribution remains visible.
