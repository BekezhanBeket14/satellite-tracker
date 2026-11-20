(() => {
  const OMM_URL = "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=JSON";
  const POSITION_UPDATE_INTERVAL_MS = 1000;
  const REQUEST_TIMEOUT_MS = 15000;
  const UNSUPPORTED_MESSAGE = "Orbital tracking is not available for this catalog item in this milestone; only ISS (NORAD 25544) uses real orbital data.";
  const satellites = {
    iss: {
      name: "ISS (ZARYA)",
      type: "CREWED SPACE STATION",
      symbol: "ISS",
      description: "A crewed orbital laboratory. Its position is predicted from published orbital elements."
    },
    hubble: {
      name: "Hubble",
      type: "SPACE TELESCOPE",
      symbol: "HST",
      description: UNSUPPORTED_MESSAGE
    },
    noaa19: {
      name: "NOAA 19",
      type: "WEATHER SATELLITE",
      symbol: "19",
      description: UNSUPPORTED_MESSAGE
    }
  };

  const elements = {
    searchInput: document.querySelector("#satellite-search"),
    satelliteButtons: [...document.querySelectorAll(".satellite-item")],
    selectedName: document.querySelector("#selected-name"),
    objectKicker: document.querySelector("#object-kicker"),
    detailSymbol: document.querySelector("#detail-symbol"),
    objectDescription: document.querySelector("#object-description"),
    visibleCount: document.querySelector("#visible-count"),
    satelliteCount: document.querySelector("#satellite-count"),
    emptyState: document.querySelector("#empty-state"),
    systemStatus: document.querySelector("#system-status"),
    systemStatusLabel: document.querySelector("#system-status-label"),
    systemStatusDetail: document.querySelector("#system-status-detail"),
    dataBadge: document.querySelector("#data-badge"),
    dataBadgeLabel: document.querySelector("#data-badge-label"),
    map: document.querySelector("#map"),
    mapMessage: document.querySelector("#map-message"),
    followToggle: document.querySelector("#follow-toggle"),
    errorActions: document.querySelector("#error-actions"),
    errorMessage: document.querySelector("#error-message"),
    retryButton: document.querySelector("#retry-button"),
    trackingStatus: document.querySelector("#tracking-status"),
    trackingDot: document.querySelector("#tracking-dot"),
    currentTime: document.querySelector("#current-time"),
    orbitalEpoch: document.querySelector("#orbital-epoch"),
    detailsNotice: document.querySelector("#details-notice"),
    telemetryStatus: document.querySelector("#telemetry-status"),
    altitudeValue: document.querySelector("#altitude-value"),
    velocityValue: document.querySelector("#velocity-value"),
    latitudeValue: document.querySelector("#latitude-value"),
    longitudeValue: document.querySelector("#longitude-value"),
    altitudeCaption: document.querySelector("#altitude-caption"),
    velocityCaption: document.querySelector("#velocity-caption"),
    latitudeCaption: document.querySelector("#latitude-caption"),
    longitudeCaption: document.querySelector("#longitude-caption")
  };

  if (Object.values(elements).some((element) => element === null) || elements.satelliteButtons.length === 0) {
    console.error("Satellite Tracker could not initialize: required dashboard elements are missing.");
    return;
  }

  let map;
  let issMarker;
  let orbitalRecord;
  let latestPosition;
  let selectedSatelliteId = "iss";
  let followEnabled = false;
  let positionTimer;

  function formatUtc(date) {
    return `${date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "")} UTC`;
  }

  function parseOmmEpoch(epochValue) {
    if (typeof epochValue !== "string" || epochValue.trim() === "") {
      throw new Error("The CelesTrak response is missing a valid orbital data epoch.");
    }

    const trimmedEpoch = epochValue.trim();
    const epochWithTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(trimmedEpoch)
      ? trimmedEpoch
      : `${trimmedEpoch}Z`;
    const epoch = new Date(epochWithTimezone);

    if (Number.isNaN(epoch.getTime())) {
      throw new Error("The CelesTrak response contains an invalid orbital data epoch.");
    }

    return epoch;
  }

  function validateOmmResponse(response) {
    if (!Array.isArray(response)) {
      throw new Error("CelesTrak returned an unexpected response; an OMM JSON array was expected.");
    }

    const issOmm = response.find((entry) => Number(entry?.NORAD_CAT_ID) === 25544);
    if (!issOmm) {
      throw new Error("The OMM response did not contain the ISS (NORAD 25544).");
    }

    const numericFields = [
      "MEAN_MOTION",
      "ECCENTRICITY",
      "INCLINATION",
      "RA_OF_ASC_NODE",
      "ARG_OF_PERICENTER",
      "MEAN_ANOMALY",
      "BSTAR",
      "MEAN_MOTION_DOT",
      "MEAN_MOTION_DDOT"
    ];
    const hasMissingField = numericFields.some((field) => {
      const value = issOmm[field];
      return value === undefined || value === null || value === "" || !Number.isFinite(Number(value));
    });
    if (hasMissingField) {
      throw new Error("The ISS OMM response is missing required numeric orbital elements.");
    }

    const epoch = parseOmmEpoch(issOmm.EPOCH);
    const trimmedEpoch = issOmm.EPOCH.trim();
    let normalizedEpoch = `${trimmedEpoch}Z`;
    if (/Z$/i.test(trimmedEpoch)) {
      normalizedEpoch = `${trimmedEpoch.slice(0, -1)}Z`;
    } else if (/[+-]\d{2}:\d{2}$/.test(trimmedEpoch)) {
      normalizedEpoch = epoch.toISOString();
    }

    return {
      omm: { ...issOmm, EPOCH: normalizedEpoch },
      epoch
    };
  }

  function initializeMap() {
    if (!window.L) {
      throw new Error("Leaflet could not be loaded. Check your internet connection and reload the page.");
    }

    map = window.L.map(elements.map, {
      worldCopyJump: true
    }).setView([15, 0], 2);

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    issMarker = window.L.circleMarker([0, 0], {
      radius: 8,
      color: "#b7fbff",
      weight: 2,
      fillColor: "#54d6df",
      fillOpacity: 0.95
    }).bindPopup("ISS (ZARYA) · NORAD 25544");
  }

  function setStatus(state, label, detail) {
    elements.systemStatus.classList.remove("is-loading", "is-success", "is-error");
    elements.dataBadge.classList.remove("is-loading", "is-success", "is-error");
    elements.systemStatus.classList.add(`is-${state}`);
    elements.dataBadge.classList.add(`is-${state}`);
    elements.systemStatusLabel.textContent = label;
    elements.systemStatusDetail.textContent = detail;
    elements.dataBadgeLabel.textContent = label;
  }

  function showMapMessage(message) {
    elements.mapMessage.textContent = message;
    elements.mapMessage.hidden = false;
  }

  function clearTelemetry(message) {
    elements.altitudeValue.textContent = "—";
    elements.velocityValue.textContent = "—";
    elements.latitudeValue.textContent = "—";
    elements.longitudeValue.textContent = "—";
    elements.altitudeCaption.textContent = message;
    elements.velocityCaption.textContent = message;
    elements.latitudeCaption.textContent = message;
    elements.longitudeCaption.textContent = message;
    elements.currentTime.textContent = "—";
    elements.orbitalEpoch.textContent = "—";
  }

  function updateFollowButton() {
    elements.followToggle.textContent = `Follow ISS: ${followEnabled ? "On" : "Off"}`;
    elements.followToggle.setAttribute("aria-pressed", String(followEnabled));
    elements.followToggle.disabled = selectedSatelliteId !== "iss";
  }

  function displaySelectedSatellite(satelliteId) {
    const satellite = satellites[satelliteId];
    if (!satellite) {
      console.error(`Satellite Tracker could not find data for "${satelliteId}".`);
      return;
    }

    selectedSatelliteId = satelliteId;
    elements.satelliteButtons.forEach((button) => {
      const isSelected = button.dataset.satelliteId === satelliteId;
      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });

    elements.selectedName.textContent = satellite.name;
    elements.objectKicker.textContent = satellite.type;
    elements.detailSymbol.textContent = satellite.symbol;
    elements.objectDescription.textContent = satellite.description;
    updateFollowButton();

    if (satelliteId === "iss") {
      elements.detailsNotice.textContent = "Orbital predictions use the element set epoch shown here; this is not live telemetry received from the ISS.";
      if (latestPosition) {
        renderPosition(latestPosition);
      } else if (elements.systemStatus.classList.contains("is-error")) {
        elements.trackingStatus.textContent = "Error";
        elements.trackingDot.classList.add("is-unavailable");
        showMapMessage("ISS position unavailable. Check the error below and try again.");
      } else {
        elements.trackingStatus.textContent = "Loading";
        elements.trackingDot.classList.add("is-unavailable");
        showMapMessage("Waiting for ISS orbital data…");
      }
      return;
    }

    followEnabled = false;
    updateFollowButton();
    elements.trackingStatus.textContent = "ISS only";
    elements.trackingDot.classList.add("is-unavailable");
    elements.telemetryStatus.textContent = "ISS TRACKING ONLY";
    elements.detailsNotice.textContent = UNSUPPORTED_MESSAGE;
    clearTelemetry("ISS tracking only");
    if (issMarker && map.hasLayer(issMarker)) {
      map.removeLayer(issMarker);
    }
    showMapMessage("Real orbital tracking is currently available only for the ISS.");
  }

  function filterSatellites() {
    const query = elements.searchInput.value.trim().toLocaleLowerCase();
    let matches = 0;

    elements.satelliteButtons.forEach((button) => {
      const isMatch = button.textContent.toLocaleLowerCase().includes(query);
      button.hidden = !isMatch;
      if (isMatch) {
        matches += 1;
      }
    });

    elements.visibleCount.textContent = String(matches);
    elements.satelliteCount.textContent = String(matches).padStart(2, "0");
    elements.emptyState.hidden = matches !== 0;
  }

  function calculateIssPosition(date) {
    const state = window.satellite.propagate(orbitalRecord.satrec, date);
    if (!state || !state.position || !state.velocity) {
      throw new Error(`SGP4 could not propagate the ISS orbit (satellite.js error ${orbitalRecord.satrec.error}).`);
    }

    // SGP4 returns an Earth-centered inertial (ECI) vector. Rotate it by Greenwich sidereal time
    // into an Earth-fixed frame, then satellite.js converts it to geodetic latitude/longitude/height.
    const gmst = window.satellite.gstime(date);
    const geodeticPosition = window.satellite.eciToGeodetic(state.position, gmst);
    const latitude = window.satellite.degreesLat(geodeticPosition.latitude);
    const longitude = window.satellite.degreesLong(geodeticPosition.longitude);
    const altitude = geodeticPosition.height;
    const velocity = Math.hypot(state.velocity.x, state.velocity.y, state.velocity.z);

    if (![latitude, longitude, altitude, velocity].every(Number.isFinite)) {
      throw new Error("SGP4 returned invalid ISS position or velocity values.");
    }

    return { latitude, longitude, altitude, velocity, time: date };
  }

  function renderPosition(position) {
    latestPosition = position;
    if (selectedSatelliteId !== "iss") {
      return;
    }

    const latLng = [position.latitude, position.longitude];
    if (!map.hasLayer(issMarker)) {
      issMarker.addTo(map);
    }
    issMarker.setLatLng(latLng);
    if (followEnabled) {
      map.panTo(latLng, { animate: false });
    }

    elements.altitudeValue.textContent = position.altitude.toFixed(2);
    elements.velocityValue.textContent = position.velocity.toFixed(3);
    elements.latitudeValue.textContent = position.latitude.toFixed(4);
    elements.longitudeValue.textContent = position.longitude.toFixed(4);
    elements.altitudeCaption.textContent = "SGP4 calculated altitude";
    elements.velocityCaption.textContent = "Magnitude of propagated velocity";
    elements.latitudeCaption.textContent = "Geodetic latitude";
    elements.longitudeCaption.textContent = "Geodetic longitude";
    elements.currentTime.textContent = formatUtc(position.time);
    elements.orbitalEpoch.textContent = formatUtc(orbitalRecord.epoch);
    elements.trackingStatus.textContent = "Tracking";
    elements.trackingDot.classList.remove("is-unavailable");
    elements.telemetryStatus.textContent = "SGP4 PREDICTION · UPDATES EVERY SECOND";
    elements.detailsNotice.textContent = "This is a calculated orbital prediction from published CelesTrak elements, not direct live telemetry received from the ISS.";
    elements.mapMessage.hidden = true;
    setStatus("success", "ISS TRACKING", "Orbital prediction · not live telemetry");
  }

  function showError(message) {
    window.clearInterval(positionTimer);
    positionTimer = undefined;
    setStatus("error", "DATA ERROR", "ISS position is unavailable");
    elements.trackingStatus.textContent = "Error";
    elements.trackingDot.classList.add("is-unavailable");
    elements.telemetryStatus.textContent = "ORBITAL DATA UNAVAILABLE";
    elements.errorMessage.textContent = message;
    elements.errorActions.hidden = false;
    clearTelemetry("Unavailable · no valid ISS orbital data");
    showMapMessage("ISS position unavailable. Check the error below and try again.");
    if (issMarker && map.hasLayer(issMarker)) {
      map.removeLayer(issMarker);
    }
  }

  async function loadOrbitalData() {
    window.clearInterval(positionTimer);
    positionTimer = undefined;
    orbitalRecord = undefined;
    latestPosition = undefined;
    elements.errorActions.hidden = true;
    elements.retryButton.disabled = true;
    elements.trackingStatus.textContent = "Loading";
    elements.trackingDot.classList.add("is-unavailable");
    elements.telemetryStatus.textContent = "FETCHING ISS ORBITAL ELEMENTS";
    clearTelemetry("Waiting for orbital data");
    showMapMessage("Fetching ISS orbital elements from CelesTrak…");
    setStatus("loading", "LOADING ISS DATA", "Connecting to CelesTrak…");

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(OMM_URL, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`CelesTrak returned HTTP ${response.status}.`);
      }

      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error("CelesTrak did not return valid OMM JSON. Please try again later.");
      }

      const { omm, epoch } = validateOmmResponse(payload);
      if (!window.satellite || typeof window.satellite.json2satrec !== "function") {
        throw new Error("satellite.js could not be loaded. Check your internet connection and reload the page.");
      }

      const satrec = window.satellite.json2satrec(omm);
      if (!satrec || typeof satrec !== "object") {
        throw new Error("satellite.js could not initialize the ISS OMM orbital elements.");
      }
      orbitalRecord = { satrec, epoch };
      elements.orbitalEpoch.textContent = formatUtc(epoch);

      const initialPosition = calculateIssPosition(new Date());
      renderPosition(initialPosition);
      positionTimer = window.setInterval(() => {
        try {
          renderPosition(calculateIssPosition(new Date()));
        } catch (error) {
          showError(error instanceof Error ? error.message : "The ISS position could not be calculated.");
        }
      }, POSITION_UPDATE_INTERVAL_MS);
    } catch (error) {
      let message;
      if (error instanceof Error && error.name === "AbortError") {
        message = "The request to CelesTrak timed out. Check your connection and try again.";
      } else if (
        error instanceof Error &&
        /^(?:CelesTrak|The |satellite\.js|SGP4)/.test(error.message)
      ) {
        message = error.message;
      } else {
        message = "Could not reach CelesTrak or calculate the ISS position. Check your internet connection and try again.";
      }
      showError(message);
      console.error("Satellite Tracker could not load ISS orbital data:", error);
    } finally {
      window.clearTimeout(timeoutId);
      elements.retryButton.disabled = false;
    }
  }

  elements.satelliteButtons.forEach((button) => {
    button.addEventListener("click", () => displaySelectedSatellite(button.dataset.satelliteId));
  });
  elements.searchInput.addEventListener("input", filterSatellites);
  elements.followToggle.addEventListener("click", () => {
    followEnabled = !followEnabled;
    updateFollowButton();
    if (followEnabled && latestPosition) {
      map.flyTo([latestPosition.latitude, latestPosition.longitude], Math.max(map.getZoom(), 4));
    }
  });
  elements.retryButton.addEventListener("click", loadOrbitalData);

  try {
    initializeMap();
    displaySelectedSatellite("iss");
    loadOrbitalData();
  } catch (error) {
    showError(error instanceof Error ? error.message : "The map could not be initialized.");
    console.error("Satellite Tracker could not initialize the map:", error);
  }
})();
