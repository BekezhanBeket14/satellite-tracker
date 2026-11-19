# Satellite Tracker

Satellite Tracker is an educational project to build a web application for exploring real artificial satellites and their orbits. This project is being developed incrementally to make the engineering ideas and software understandable along the way.

## Project goals

- Build a clear, responsive dashboard for discovering and selecting satellites.
- Learn how orbital data such as Two-Line Element sets (TLEs) describe satellite orbits.
- Add real position and telemetry calculations in a later milestone.
- Make the data source, freshness, and limitations visible to users.

## Current development stage

**Milestone 1: frontend foundation.** The current page is a demonstration interface. It includes a searchable catalog with ISS (ZARYA), Hubble, and NOAA 19, selectable object details, a decorative Earth-view placeholder, and telemetry cards.

Satellite positions and telemetry are **not available**. The map graphic is illustrative, and this application does not currently fetch or calculate orbital data. It is not a real-time tracker.

## Technologies

- HTML5 for the page structure
- CSS3 for the responsive dark dashboard
- Vanilla JavaScript (ES6+) for search and satellite selection

Leaflet.js, satellite.js, and CelesTrak are not connected in this milestone.

## Run locally

1. Open this project folder in Visual Studio Code.
2. Install the **Live Server** extension if it is not already installed.
3. In VS Code, right-click `index.html` and choose **Open with Live Server**.
4. The dashboard opens in your browser. Try searching for a satellite and selecting each catalog entry.

The page can also be opened directly in a modern browser, but Live Server provides a convenient local development workflow.

## Planned future features

1. Load and validate real TLE data from CelesTrak, and display when the data was retrieved.
2. Use satellite.js to calculate satellite positions from TLEs at a specified time.
3. Add a Leaflet map with real map tiles and calculated satellite positions.
4. Show calculated altitude, velocity, latitude, and longitude, clearly identifying their source and update time.
5. Add loading and error states for unavailable or outdated orbital data.

These features are planned, not implemented. The current demo intentionally does not display invented coordinates or telemetry.