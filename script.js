(() => {
  const satellites = {
    iss: {
      name: "ISS (ZARYA)",
      type: "CREWED SPACE STATION",
      symbol: "ISS",
      description: "A crewed orbital laboratory. Live orbital information is not connected in this demo."
    },
    hubble: {
      name: "Hubble",
      type: "SPACE TELESCOPE",
      symbol: "HST",
      description: "A space telescope used for astronomical observations. Live orbital information is not connected in this demo."
    },
    noaa19: {
      name: "NOAA 19",
      type: "WEATHER SATELLITE",
      symbol: "19",
      description: "A weather-observation satellite. Live orbital information is not connected in this demo."
    }
  };

  const searchInput = document.querySelector("#satellite-search");
  const satelliteButtons = [...document.querySelectorAll(".satellite-item")];
  const selectedName = document.querySelector("#selected-name");
  const objectKicker = document.querySelector("#object-kicker");
  const detailSymbol = document.querySelector("#detail-symbol");
  const objectDescription = document.querySelector("#object-description");
  const visibleCount = document.querySelector("#visible-count");
  const satelliteCount = document.querySelector("#satellite-count");
  const emptyState = document.querySelector("#empty-state");

  if (
    !searchInput ||
    satelliteButtons.length === 0 ||
    !selectedName ||
    !objectKicker ||
    !detailSymbol ||
    !objectDescription ||
    !visibleCount ||
    !satelliteCount ||
    !emptyState
  ) {
    console.error("Satellite Tracker could not initialize: required dashboard elements are missing.");
    return;
  }

  function selectSatellite(button) {
    const satellite = satellites[button.dataset.satelliteId];

    if (!satellite) {
      console.error(`Satellite Tracker could not find data for "${button.dataset.satelliteId}".`);
      return;
    }

    satelliteButtons.forEach((item) => {
      const isSelected = item === button;
      item.classList.toggle("is-selected", isSelected);
      item.setAttribute("aria-pressed", String(isSelected));
    });

    selectedName.textContent = satellite.name;
    objectKicker.textContent = satellite.type;
    detailSymbol.textContent = satellite.symbol;
    objectDescription.textContent = satellite.description;
  }

  function filterSatellites() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    let matches = 0;

    satelliteButtons.forEach((button) => {
      const isMatch = button.textContent.toLocaleLowerCase().includes(query);
      button.hidden = !isMatch;

      if (isMatch) {
        matches += 1;
      }
    });

    visibleCount.textContent = String(matches);
    satelliteCount.textContent = String(matches).padStart(2, "0");
    emptyState.hidden = matches !== 0;
  }

  satelliteButtons.forEach((button) => {
    button.addEventListener("click", () => selectSatellite(button));
  });
  searchInput.addEventListener("input", filterSatellites);
})();