// This script correlates everything based on the name in the CMS.
// The location ID is based on this name, which means the name needs to be unique. It cannot be a duplicate. If you find it is being duplicated, can use another selector that will not be duplicated in the future.

window.Webflow ||= [];
window.Webflow.push(() => {
  //////////////////////////////////////////////////////////////
  /////////////////////// VARIABLES ////////////////////////////

  const tagFilterItem = document.querySelectorAll(
    "[tag-filter-item] input"
  );
  let filteredTagIds = [];

  // Variables for the map card wrapper, items, and close buttons
  const locationMapCardWrapper = document.querySelector(
    "[locations-map-card-wrapper]"
  );
  const locationMapCardItem = document.querySelectorAll(
    "[locations-map-card-item]"
  );
  const locationMapCardCloseBtn = document.querySelectorAll(
    "[locations-map-card-close-block]"
  );

  // Variables for the sidebar items and popups
  const locationItemSidebar = document.querySelectorAll(
    "[location-item-sidebar]"
  );
  // Filtered locations updated by checkboxes & used for sidebar, dots, & search after inital load.
  let filteredLocations = locationItemSidebar;

  let currentSearchResult = null;
  let currentSearchName = "";

  const popUps = document.getElementsByClassName("mapboxgl-popup");

  // Remove the 'is--show' class from the map card wrapper
  locationMapCardWrapper.classList.remove("is--show");

  // Set the Mapbox access token for authentication
  mapboxgl.accessToken =
    "YOUR ACCESS TOKEN";

  //////////////////////////////////////////////////////////////
  /////////////////// INITIALIZE MAPBOX MAP ////////////////////

  // Initialize the Mapbox map within the element with id 'map'
  const map = new mapboxgl.Map({
    container: "map", // The id of the HTML element to initialize the map in
    //style: "YOUR MAPBOX STYLE", // The Mapbox style to use
    center: [-120.8117841, 37.1428699], // Initial center coordinates [longitude, latitude]
    zoom: 5, // Initial zoom level
  });

  // Adjust the zoom level of the map based on the screen size
  let mq = window.matchMedia("(max-width: 767px)");
  if (mq.matches) {
    map.setZoom(8); // Set map zoom level for mobile size
  }

  ///////////////////////////////////////////////////////////////////////
  ///////// Helper functions to update result & filter count ////////////

  const updateResultCount = function () {
    const count = filteredLocations.length;

    const resultCountElement = document.querySelectorAll("[result-count]");
    resultCountElement.forEach((el) => (el.textContent = count));
  };
  updateResultCount();

  const updateFilterCount = function () {
    const count = filteredTagIds.length;

    const filterTitleElement = document.querySelectorAll("[filter-title]");
    if (count > 0)
      filterTitleElement.forEach(
        (el) => (el.textContent = "Filter (" + count + ")")
      );
    else
      filterTitleElement.forEach(
        (el) => (el.textContent = "Filter")
      );
  };

  //////////////////////////////////////////////////////////////
  /////////////////// CREATE GEOJSON DATA //////////////////////

  // Create an empty GeoJSON object to dot location data
  let dots = {
    type: "FeatureCollection",
    features: [],
  };

  // Get the list of location elements from the HTML and convert each to GeoJSON
  const listLocations = locationItemSidebar;

  // Function to convert each location element into GeoJSON and add to dots object
  const getGeoData = function () {
    // Loop through each location in the list
    listLocations.forEach(function (location) {
      // Get the latitude from the element and trim any whitespace
      const locationLat = location
        .querySelector("[location-latitude-sidebar]")
        .textContent.trim();

      // Get the longitude from the element and trim any whitespace
      const locationLong = location
        .querySelector("[location-longitude-sidebar]")
        .textContent.trim();

      // Create coordinates array from longitude and latitude using parseFloat to convert strings to numbers
      const coordinates = [parseFloat(locationLong), parseFloat(locationLat)];

      // Get the location ID from the element (using the location name)
      const locationID = location.querySelector(
        "[location-name-sidebar]"
      ).textContent;

      // Get the location info for popup content on the map (using the location name)
      const locationName = location.querySelector(
        "[location-name-sidebar]"
      ).textContent;

      // Create a GeoJSON feature for the location using the gathered information
      const geoData = {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: coordinates,
        },
        properties: {
          id: locationID,
          name: locationName, // information used in the popup on the map
        },
      };

      // Add the feature to the dots object if it's not already included
      if (!dots.features.includes(geoData)) {
        dots.features.push(geoData);
      }

      // Set the data-id attribute on the location element for later reference in sidebar click events
      location.setAttribute("data-id", locationID);
    });

    // Log the dots object to the console for debugging
    console.log(dots);
  };

  // Call getGeoData function to turn Webflow CMS items into GeoJSON Data for Mapbox to use
  getGeoData();

  // Set data-id attribute for each map card item based on the corresponding location ID
  locationMapCardItem.forEach((el, i) => {
    // Get the location ID from the corresponding location in the list
    const locationID = listLocations[i]
      .querySelector("[location-name-sidebar]") // Find the element with location name
      .textContent.trim(); // Get the text content and trim any whitespace

    // Set the data-id attribute on the map card item using the location ID
    el.setAttribute("data-id", locationID);

    // Set google maps link
    const longitude = el
      .querySelector("[location-longitude-sidebar]")
      .textContent.trim();
    const latitude = el
      .querySelector("[location-latitude-sidebar]")
      .textContent.trim();
    const locationDirectionsLink = el.querySelector("[location-directions]");
    locationDirectionsLink.href =
      "https://www.google.com/maps/place/" +
      locationDirectionsLink.textContent.trim() +
      "/@" +
      longitude +
      "," +
      latitude;
  });

  //////////////////////////////////////////////////////////////
  ///////////////// RENDER LOCATIONS LAYER ON THE MAP //////////

  // Function to add the GeoJSON data as a layer to the map
  const addMapPoints = function () {
    map.addSource("locations", {
      type: "geojson",
      data: dots, // Uses GeoJSON data from the dots object
    });

    map.addLayer({
      id: "location-dots", // Layer id
      type: "circle", // Layer type (circle for point features)
      source: "locations",
      paint: {
        "circle-radius": 10, // Circle radius
        "circle-stroke-width": 2, // Circle stroke width
        "circle-color": "#fe0000", // Circle fill color
        "circle-opacity": 1, // Circle opacity
        "circle-stroke-color": "#fff", // Circle stroke color
      },
    });
  };

  /////////////////////////////////////////////////////////////////////////////
  /////// Helper function to calculate distances and update the DOM //////////

  const calculateDistancesAndUpdateDOM = () => {
    const referencePoint = currentSearchResult;
    const options = { units: "miles" }; // Set the units for distance calculation to miles

    // Loop through each location in the list
    filteredLocations.forEach((location) => {
      // Get the latitude from the element and trim any whitespace
      const locationLat = location
        .querySelector("[location-latitude-sidebar]")
        .textContent.trim();

      // Get the longitude from the element and trim any whitespace
      const locationLong = location
        .querySelector("[location-longitude-sidebar]")
        .textContent.trim();

      // Create coordinates array from longitude and latitude using parseFloat to convert strings to numbers
      const coordinates = [parseFloat(locationLong), parseFloat(locationLat)];

      // Create a GeoJSON feature for the location using the gathered coordinates
      const locationGeoJSON = {
        type: "Point",
        coordinates: coordinates,
      };

      // Calculate the distance between the reference point and the location
      const distance = turf.distance(referencePoint, locationGeoJSON, options);
      // Store the calculated distance as a data attribute on the location element
      location.setAttribute("data-distance", distance);

      // Find or create a distance element to display the distance
      let distanceElement = location.querySelector(
        "[location-distance-sidebar]"
      );
      if (!distanceElement) {
        distanceElement = document.createElement("div"); // Create a new div element if it doesn't exist
        distanceElement.className = "location_distance"; // Set the class name of the div
        location.appendChild(distanceElement); // Append the div to the location element
      }

      // Find or create a card distance element to display the distance
      let cardElement = locationMapCardWrapper.querySelector(
        "[data-id='" + location.getAttribute("data-id") + "']"
      );
      let cardDistanceElement = cardElement.querySelector(
        "[location-distance-sidebar]"
      );
      if (!cardDistanceElement) {
        cardDistanceElement = document.createElement("div"); // Create a new div element if it doesn't exist
        cardDistanceElement.className = "location_distance"; // Set the class name of the div
        cardElement.appendChild(cardDistanceElement); // Append the div to the location element
      }

      // Display & set the text content of the div to the calculated distance in miles
      distanceElement.style.display = "block";
      distanceElement.textContent = `${distance.toFixed(2)} miles away`;
      cardDistanceElement.style.display = "block";
      cardDistanceElement.textContent = `${distance.toFixed(2)} miles away`;
    });

    // Sort the locations based on the distance attribute
    const sortedLocations = Array.from(filteredLocations).sort((a, b) => {
      return (
        parseFloat(a.getAttribute("data-distance")) -
        parseFloat(b.getAttribute("data-distance"))
      );
    });

    // Select the parent element with the attribute location-list-sidebar and remove all existing children
    const parentElement = document.querySelector("[location-list-sidebar]");
    while (parentElement.firstChild) {
      parentElement.removeChild(parentElement.firstChild);
    }

    // Reorder the HTML elements based on the sorted order
    sortedLocations.forEach((location) => {
      parentElement.appendChild(location); // Append the location to the parent element
    });

    // Display "sorted by" text
    const sortedTextElement = document.querySelectorAll("[sorted-text]");
    const sortedLocationElement =
      document.querySelectorAll("[sorted-location]");
    sortedTextElement.forEach((el) => (el.style.display = "block"));
    sortedLocationElement.forEach((el) => (el.textContent = currentSearchName));

    // Return the sorted locations
    return sortedLocations;
  };

  const clearDistancesAndUpdateDOM = () => {
    currentSearchResult = null;

    // Loop through each location in the list
    filteredLocations.forEach((location) => {
      location.setAttribute("data-distance", "");

      // Find sidebar item distance element
      let distanceElement = location.querySelector(
        "[location-distance-sidebar]"
      );

      // Find card distance element
      let cardElement = locationMapCardWrapper.querySelector(
        "[data-id='" + location.getAttribute("data-id") + "']"
      );
      let cardDistanceElement = cardElement.querySelector(
        "[location-distance-sidebar]"
      );

      // Display & set the text content of the div to the calculated distance in miles
      if (distanceElement) {
        distanceElement.textContent = "";
        distanceElement.style.display = "none";
      }
      if (cardDistanceElement) {
        cardDistanceElement.textContent = "";
        cardDistanceElement.style.display = "none";
      }
    });

    // Sort the locations based on alphabetical names
    const sortedLocations = Array.from(filteredLocations).sort((a, b) => {
      const nameA = a
        .querySelector("[location-name-sidebar]")
        .textContent.trim();
      const nameB = b
        .querySelector("[location-name-sidebar]")
        .textContent.trim();

      return nameA.localeCompare(nameB);
    });

    // Select the parent element with the attribute location-list-sidebar and remove all existing children
    const parentElement = document.querySelector("[location-list-sidebar]");
    while (parentElement.firstChild) {
      parentElement.removeChild(parentElement.firstChild);
    }

    // Reorder the HTML elements based on the sorted order
    sortedLocations.forEach((location) => {
      parentElement.appendChild(location); // Append the location to the parent element
    });

    // Remove "sorted by" text
    const sortedTextElement = document.querySelectorAll("[sorted-text]");
    const sortedLocationElement =
      document.querySelectorAll("[sorted-location]");
    sortedLocationElement.forEach((el) => (el.textContent = ""));
    sortedTextElement.forEach((el) => (el.style.display = "none"));

    // Return the sorted locations
    return sortedLocations;
  };

  /////////////////////////////////////////////////////////////////////////////////////
  /////// Helper function to highlight the closest location and add a popup //////////

  const highlightClosestLocationAndAddPopup = (sortedLocations) => {
    // Get the closest location from the sorted list (first element)
    const closestLocation = sortedLocations[0];

    // Check if there is a closest location
    if (closestLocation) {
      // Add the 'is--active' class to highlight the closest location
      closestLocation.classList.add("is--active");

      // Get the ID of the closest location from the data-id attribute
      const ID = closestLocation.getAttribute("data-id");

      // Find the feature in the GeoJSON data that matches the closest location ID
      const feature = dots.features.find(
        (feature) => feature.properties.id === ID
      );

      // Check if the feature is found
      if (feature) {
        // Extract the coordinates and city of the feature
        const coordinates = feature.geometry.coordinates;
        const name = feature.properties.name;

        // Create a mock event object to pass to the addPopup function
        const mockEvent = {
          features: [
            {
              geometry: { coordinates: coordinates },
              properties: { name: name },
            },
          ],
          lngLat: { lng: coordinates[0], lat: coordinates[1] }, // Set the lngLat property of the mock event
        };

        // Add the popup to the map at the closest location
        addPopup(mockEvent);

        // Update the active location in the sidebar to highlight it
        updateActiveLocation(ID);

        // Show the detailed map card for the closest location
        showMapCard(ID);

        // Zoom in to the closest location on the map
        zoomToLocation(map, coordinates);
      } else {
        // Log an error message if the feature is not found in the GeoJSON data
        console.error(`Feature with ID ${ID} not found.`);
      }
    }
  };

  // Event listener for when the map is loaded
  map.on("load", function () {
    // Add map points after map loads
    addMapPoints();

    //////////////////////////////////////////////////////////////
    ///////////////// MAP GEOCODER FUNCTIONALITY (SEARCH) //////////

    // Initialize the Mapbox Geocoder for search functionality
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken, // Set the access token for Mapbox
      mapboxgl: mapboxgl, // Reference to the Mapbox GL JS library
      placeholder: "Type your address", // Set the placeholder text for the search box
    });

    // Add the geocoder control to the map
    map.addControl(geocoder);

    // Add zoom and rotation controls to the map
    map.addControl(new mapboxgl.NavigationControl());

    // Event listener that fires when a search result occurs
    geocoder.on("result", (event) => {
      // Extract the geometry of the search result (coordinates)
      console.log(event);
      currentSearchResult = event.result.geometry;
      currentSearchName = event.result.place_name;

      // Calculate distances from the search result to each location and update the DOM
      // This function returns the sorted list of locations based on their distance to the search result
      const sortedLocations = calculateDistancesAndUpdateDOM();

      // Highlight the closest location from the sorted list and add a popup
      highlightClosestLocationAndAddPopup(sortedLocations);
    });

    // Event listener that fires when a search result is cleared
    geocoder.on("clear", (event) => {
      console.log("cleared");
      clearDistancesAndUpdateDOM();
    });

    //////////////////////////////////////////////////////////////
    //////// MAP GEOLOCATE FUNCTIONALITY (CURRENT POSITION) /////

    // Initialize the GeolocateControl, which provides a button that when clicked
    // uses the browser's geolocation API to locate the user on the map
    // Initialize the Mapbox GeolocateControl for tracking user's location
    const geolocate = new mapboxgl.GeolocateControl({
      // Configuration options for geolocation
      positionOptions: {
        enableHighAccuracy: true, // Enable high accuracy for geolocation
      },
      trackUserLocation: false, // Do not continuously track user's location
      showUserHeading: true, // Show the direction the user is facing
    });

    // Add the geolocate control to the map
    map.addControl(geolocate);

    // Event listener that fires when a geolocation event occurs (i.e., when the user's location is found)
    geolocate.on("geolocate", (event) => {
      // Log to the console that a geolocation event has occurred
      console.log("A geolocate event has occurred.");

      // Extract the user's current coordinates (longitude and latitude) from the event object
      const geolocateResult = [event.coords.longitude, event.coords.latitude];
      currentSearchResult = {
        type: "Point", // Specify the GeoJSON type as Point
        coordinates: geolocateResult, // Set the coordinates to the user's current location
      };
      currentSearchName = "Current Location";

      // Calculate distances from the user's current location to each listed location and update the DOM
      // This function returns the sorted list of locations based on their distance to the user's current location
      const sortedLocations = calculateDistancesAndUpdateDOM();

      // Highlight the closest location from the sorted list and add a popup
      highlightClosestLocationAndAddPopup(sortedLocations);
    });
  });

  //////////////////////////////////////////////////////////////
  ///////////// OPTIONS FOR THE MAP ////////////////////////////

  // Popup options
  const popupOptions = {
    closeOnClick: false,
    focusAfterOpen: false,
  };

  //////////////////////////////////////////////////////////////
  ///////////// FUNCTIONS BASED ON CLICK EVENTS ////////////////

  // Function to close the detailed map card when the close button is clicked
  const locationMapCardClose = function () {
    // Remove the 'is--show' class from the map card wrapper to hide it
    locationMapCardWrapper.classList.remove("is--show");

    // Iterate over each map card item
    locationMapCardItem.forEach((el) => {
      // Remove the 'is--show' class from each map card item to ensure none of them are visible
      el.classList.remove("is--show");
    });
  };

  // Function to add a popup to the dot on the map. Event properties are passed from click event
  const addPopup = function (e) {
    // Extract the coordinates of the clicked feature and create a copy of the coordinates array
    const coordinates = e.features[0].geometry.coordinates.slice();

    // Extract the city of the clicked feature for the popup content
    const name = e.features[0].properties.name;

    // Adjust coordinates if the map is zoomed out and the popup appears on a different copy of the feature
    // This ensures the popup appears on the correct side of the map
    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
      coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
    }

    // Check if there is already a popup on the map and if so, remove it to avoid multiple popups
    if (popUps[0]) popUps[0].remove();

    // Create and display the popup at the coordinates with the name
    const popup = new mapboxgl.Popup(popupOptions)
      .setLngLat(coordinates) // Set the longitude and latitude for the popup
      .setHTML(name) // Set the HTML content of the popup
      .addTo(map); // Add the popup to the map

    // Add event listener to close card items when popup is closed
    popup.on("close", () => {
      locationMapCardClose(); // Close the detailed map card
      console.log("popup was closed"); // Log that the popup was closed
    });
  };

  // Function to update the active item in the sidebar by adding the 'is--active' class
  const updateActiveLocation = function (locationID) {
    // Remove the 'is--active' class from all sidebar location items
    locationItemSidebar.forEach((el) => el.classList.remove("is--active"));

    // Loop through each sidebar location item to find the one with the matching locationID
    locationItemSidebar.forEach((el) => {
      // Check if the current item's data-id attribute matches the provided locationID
      if (el.getAttribute("data-id") === locationID) {
        // Add the 'is--active' class to the matching item
        el.classList.add("is--active");
      }
    });
  };

  // Function to show the detailed map card for a specific location
  const showMapCard = function (locationID) {
    console.log(`Showing map card for location ID: ${locationID}`);

    // Add the 'is--show' class to the map card wrapper to display it
    locationMapCardWrapper.classList.add("is--show");

    // Loop through each map card item and remove the 'is--show' class
    locationMapCardItem.forEach((el) => {
      el.classList.remove("is--show");
      /*console.log(
        `Removed 'is--show' class from card with data-id: ${el.getAttribute(
          "data-id"
        )}`
      );*/
    });

    // Loop through each map card item to find the one with the matching locationID
    locationMapCardItem.forEach((el) => {
      /* console.log(
        `Checking card with data-id: ${el.getAttribute(
          "data-id"
        )} against locationID: ${locationID}`
      );*/
      // Check if the current item's data-id attribute matches the provided locationID
      if (el.getAttribute("data-id") === locationID) {
        // Add the 'is--show' class to the matching item to display it
        el.classList.add("is--show");
        /*console.log(
          `Added 'is--show' class to card with data-id: ${el.getAttribute(
            "data-id"
          )}`
        );*/
      }
    });
  };

  // Fly to location on the map and zoom in - Adjust properties for different effects
  const zoomToLocation = function (map, coordinates) {
    map.flyTo({
      center: coordinates, // Center the map on the provided coordinates
      zoom: 14, // Set the zoom level to 14 for a closer view
      speed: 1, // Set the animation speed (1 is default, higher is faster)
      curve: 1, // Set the animation curve (1 is default, higher is more curved)
      duration: 3000,
      easing(t) {
        return t; // Set the easing function for the animation (t is the current time)
      },
    });
  };

  //////////////////////////////////////////////////////////////
  //////////////////// EVENT LISTENERS /////////////////////////

  // Listens for clicks on the location layer of the map (dots on the map)
  map.on("click", "location-dots", (e) => {
    // Get the location ID from the clicked feature's properties
    const locationID = e.features[0].properties.id;

    // Log the location ID for debugging purposes
    console.log(
      `This is the location ID: ${locationID} that corresponds to the clicked feature.`
    );

    // Add a popup to the map at the location of the clicked feature
    addPopup(e);

    // Update the active location in the sidebar to highlight the clicked location
    updateActiveLocation(locationID);

    // Show the detailed map card for the clicked location
    showMapCard(locationID);

    // Zoom in to the clicked location on the map
    zoomToLocation(map, e.features[0].geometry.coordinates);
  });

  // Changes cursor style when cursor moves onto the map layer "locations" (REMEMBER: Locations has the dots so when you hover over a dot, the cursor changes)
  map.on("mouseenter", "location-dots", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  // Reverses cursor style when cursor moves off the map layer "locations" (REMEMBER: Locations has the dots so when you hover off a dot, the cursor changes)
  map.on("mouseleave", "location-dots", () => {
    map.getCanvas().style.cursor = "";
  });

  // Add Event Listener that closes the detailed card when the close button is clicked on the detailed card
  locationMapCardCloseBtn.forEach((btn) => {
    btn.addEventListener("click", () => {
      locationMapCardClose();
    });
  });

  // Add event listeners to the sidebar location items
  locationItemSidebar.forEach((location) => {
    // Add a click event listener to each sidebar location item
    location.addEventListener("click", (e) => {
      // Get the location ID from the data-id attribute of the clicked sidebar item
      const locationID = e.currentTarget.getAttribute("data-id");

      // Log the location ID for debugging purposes
      console.log(
        `This is the locationID: ${locationID} that corresponds to the clicked feature.`
      );

      // Check if the screen width is 767px or below (mobile view)
      if (window.innerWidth <= 767) {
        // Scroll to the section with ID 'map-component' to ensure the map is visible on mobile view
        document.getElementById("map-component").scrollIntoView({
          behavior: "smooth",
        });
      }

      // Find the feature in the GeoJSON data that matches the location ID
      const feature = dots.features.find(
        (feature) => feature.properties.id === locationID
      );

      // If the feature is found in the GeoJSON data
      if (feature) {
        // Get the coordinates and name of the feature
        const coordinates = feature.geometry.coordinates;
        const name = feature.properties.name;

        // Create a mock event object to pass to the addPopup function
        const mockEvent = {
          features: [
            {
              geometry: { coordinates: coordinates },
              properties: { name: name },
            },
          ],
          lngLat: { lng: coordinates[0], lat: coordinates[1] },
        };

        // Add a popup at the feature's location
        // This function is currently causing a bug - The screen is jumping around. It has to do with the close button on the popup being focused automatically. Will seek a solution and update, but for now, leave this commented out.
        addPopup(mockEvent);

        // Update the active location in the sidebar
        updateActiveLocation(locationID);

        // Show the corresponding map card
        showMapCard(locationID);

        // Zoom to the feature's location on the map
        zoomToLocation(map, coordinates);
      } else {
        // Log an error message if the feature is not found in the GeoJSON data
        console.error(`Feature with ID ${locationID} not found.`);
      }
    });
  });

  // Add event listeners to the tag filter checkboxes
  tagFilterItem.forEach((filter) => {
    // Add a click event listener to each sidebar location item
    filter.addEventListener("change", (e) => {
      isChecked = !e.currentTarget.previousElementSibling.classList.contains(
        "w--redirected-checked"
      );

      filterLocations(filter.parentElement.id, isChecked);
    });
  });

  // Filter sidebar locations based on matching tags & update map dots
  const filterLocations = (filteredTagId, doAdd) => {
    if (doAdd) {
      filteredTagIds.push(filteredTagId);
    } else {
      const index = filteredTagIds.indexOf(filteredTagId);
      if (index > -1) {
        filteredTagIds.splice(index, 1);
      }
    }

    filteredLocations = locationItemSidebar;

    if (filteredTagIds.length > 0) {
      // Locations that match at least 1 tag
      filteredLocations = Array.from(locationItemSidebar).filter((location) => {
        let doesMatch = false;

        filteredTagIds.forEach((tagId) => {
          if (!doesMatch)
            doesMatch =
              $(location).find("[location-tag]#" + tagId).length !== 0;
        });

        return doesMatch;
      });
    }

    let updatedDots = {
      type: "FeatureCollection",
      features: [],
    };

    // Select the parent element with the attribute location-list-sidebar and remove all existing children
    const parentSidebarElement = document.querySelector(
      "[location-list-sidebar]"
    );
    while (parentSidebarElement.firstChild) {
      parentSidebarElement.removeChild(parentSidebarElement.firstChild);
    }

    // Re-add the HTML elements based on the filtered list
    // Filter the features based on the matching name
    filteredLocations.forEach((location) => {
      parentSidebarElement.appendChild(location);

      let name = location
        .querySelector("[location-name-sidebar]")
        .textContent.trim();

      updatedDots.features.push(
        dots.features.find((feature) => {
          return feature.properties.name.toLowerCase() === name.toLowerCase();
        })
      );
    });

    updateFilterCount();
    updateResultCount();

    console.log(dots);
    console.log(updatedDots);

    // Update map dots & recalulate distance + resort if theres a current search
    if (map.getSource("locations")) {
      map.getSource("locations").setData(updatedDots);
      console.log("Updated.");

      if (currentSearchResult) {
        // Calculate distances from the search result to each location and update the DOM
        // This function returns the sorted list of locations based on their distance to the search result
        const sortedLocations = calculateDistancesAndUpdateDOM();

        // Highlight the closest location from the sorted list and add a popup
        highlightClosestLocationAndAddPopup(sortedLocations);
      }
    } else {
      console.error("Source 'locations' not found.");
    }
  };
});