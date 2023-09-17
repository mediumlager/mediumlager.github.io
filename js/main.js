    // Wait for the DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', function () {
        // Initialize the map and set its center and zoom level
        var map = L.map('map').setView([60.192, 24.946], 13);

        // Add a tile layer from OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Initialize an array to store markers
        var markers = [];

        // Create a custom map reload event
    const mapReloadEvent = new Event('map-reloaded');

    var mapLoaded = false;

    const resultsTab = document.querySelector('.results-tab');
    const resultsContainer = document.querySelector('.results-container');

    resultsTab.addEventListener('click', () => {
        if (parseInt(getComputedStyle(resultsContainer).left) < 0) {
            resultsContainer.style.left = '0';
        } else {
            resultsContainer.style.left = '-300px'; // Adjust to match the container width
        }
    });


    // Function to fetch toilets within a specified bounding box with a limit of 100
    function fetchToiletsWithinBounds(northEast, southWest) {
        const bbox = `${southWest.lat},${southWest.lng},${northEast.lat},${northEast.lng}`;
        const limit = 100; // Limit the number of results to 100
        const url = `https://overpass-api.de/api/interpreter?data=[out:json];node["amenity"="toilets"](${bbox});out ${limit};`;

        return fetch(url)
            .then(response => response.json())
            .then(data => data.elements)
            .catch(error => console.error("Error fetching toilets:", error));
    }
    // Function to handle the map reload
    function handleMapReload() {
        // You can perform any actions related to map reloading here
        // For example, you can trigger the fetching of toilets

        const bounds = map.getBounds();
        const northEast = bounds.getNorthEast();
        const southWest = bounds.getSouthWest();
        clearMarkers(bounds);
        fetchToiletsWithinBounds(northEast, southWest)
            .then(toilets => {
                clearResultsList();

                // Iterate through the toilets and add them to the list
                console.log('Going to iterate now')
                toilets.forEach(toilet => {
                    addToiletToList(toilet);
                });
                console.log("Toilets near the location:", toilets);
                // Display the toilets on the map or in a list
                displayToiletsOnMap(toilets);
            })
            .catch(error => {
                console.error("Error fetching toilets:", error);
            });
    }

    // Attach event listeners to the map
    map.on('moveend', function () {
        // Trigger the custom map reload event when the map has finished moving
        document.dispatchEvent(mapReloadEvent);
    });

    map.on('zoomend', function () {
        // Trigger the custom map reload event when the map has finished zooming
        document.dispatchEvent(mapReloadEvent);
    });

    map.on('load', function () {
        // Trigger the custom map reload event when the map has finished loading
        if (!mapLoaded) {
            mapLoaded = true;
            document.dispatchEvent(mapReloadEvent);
        }
    });

    // Listen for the custom map reload event and handle it
    document.addEventListener('map-reloaded', handleMapReload);

    // Function to display toilets as markers on the map
    function displayToiletsOnMap(toilets) {
        // Limit the number of displayed toilets to 100
        toilets.slice(0, 100).forEach(toilet => {
            // Check if the toilet already exists in markers
            const existingMarker = markers.find(marker => {
                const latLng = marker.getLatLng();
                return latLng.lat === toilet.lat && latLng.lng === toilet.lon;
            });

        if (!existingMarker) {
            // Create the marker using the createMarker function
            let marker = createMarker(toilet);

            // Add the marker to the map
            marker.addTo(map);

            // Add the marker to the markers array
            markers.push(marker);
        }
        });

        // Register event listeners for "More Information" links after adding markers
        registerMoreInfoEventListeners();
        // Event delegation for "More Information" links
        $(document).on('click', '.more-info-link', function(event) {
            event.preventDefault();
            console.log('Link clicked'); // Check if this message appears in the console
            console.log(this)
            const toiletInfo = JSON.parse($(this).attr('data-toilet-info'));
            console.log('Toilet info:', toiletInfo); // Check if the data is extracted correctly
            openToiletModal(toiletInfo);
        });
    }


    // JavaScript to handle location request
    document.getElementById('locateUser').addEventListener('click', function () {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                function (position) {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;
                    map.setView([latitude, longitude], 13);
                },
                function (error) {
                    console.error('Error getting user location:', error);
                }
            );
        } else {
            console.log('Geolocation is not supported by this browser.');
        }
    });

    // Function to populate and display the toilet details section
    function displayToiletDetails(toiletDetails) {
        const toiletDetailsSection = document.getElementById('toiletDetails');

        // Clear any existing content
        toiletDetailsSection.innerHTML = '';

        // Populate the section with toilet details
        // You can create HTML elements and set their content here
        const title = document.createElement('h2');
        title.textContent = toiletDetails.name; // Example: Assuming 'name' is a property in the toiletDetails object
        toiletDetailsSection.appendChild(title);

        const description = document.createElement('p');
        description.textContent = toiletDetails.description; // Example: Assuming 'description' is a property in the toiletDetails object
        toiletDetailsSection.appendChild(description);

        // You can add more details as needed

        // Display the toilet details section
        toiletDetailsSection.style.display = 'block';
    }

    // When a marker is clicked, find the corresponding list item and highlight it
    function highlightListItem(toiletId) {
        // Remove the highlight from all list items
        const listItems = document.querySelectorAll('#toiletList li');
        listItems.forEach((item) => {
            item.classList.remove('highlighted');
        });

        // Find the list item with the matching data-toilet-id
        const listItem = document.querySelector(`li[data-marker-id="${toiletId}"]`);

        // Highlight the matched list item
        if (listItem) {
            listItem.classList.add('highlighted');
        } else {
            console.error(`List item with data-marker-id "${toiletId}" not found.`);
        }
    }

    // JavaScript code to open the modal and populate it with data
    function openToiletModal(toilet) {
        // Get references to the modal elements
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        // Populate the modal elements with toilet information
        modalTitle.textContent = toilet.tags.name || 'Toilet Name';
        // Customize this part to display the desired information in the modal body
        modalBody.innerHTML = `
            <p><strong>Location:</strong> ${toilet.lat}, ${toilet.lon}</p>
            <p><strong>Fee:</strong> ${toilet.tags.fee || 'Not specified'}</p>
            <p><strong>Type:</strong> ${toilet.tags.amenity || 'Not specified'}</p>
            <p><strong>Hours:</strong> ${toilet.tags.opening_hours || 'Not specified'}</p>
            <p><strong>Non-customers:</strong> ${toilet.tags.access || 'Not specified'}</p>
            <p><strong>Wheelchair Accessible:</strong> ${toilet.tags.wheelchair || 'Not specified'}</p>
            <p><strong>Description:</strong> ${toilet.tags.description || 'Not available'}</p>
            <p><strong>Changing Table:</strong> ${toilet.tags.changing_table || 'Not specified'}</p>
            <p><strong>Drinking Water:</strong> ${toilet.tags.drinking_water || 'Not specified'}</p>
            <p><strong>Indoor:</strong> ${toilet.tags.indoor || 'Not specified'}</p>
        `;

        // Trigger the modal to open
        $('#toiletModal').modal('show');
    }

    // Function to register event listeners for "More Information" links
    function registerMoreInfoEventListeners() {
        console.log('register called');

    }

    // Function to clear markers outside of the current visible area
    function clearMarkers(bounds) {
        markers = markers.filter(marker => {
            const latLng = marker.getLatLng();
            if (!bounds.contains(latLng)) {
                map.removeLayer(marker);
                return false; // Exclude this marker from the markers array
            }
            return true; // Keep this marker in the markers array
        });
    }

    // Modify your code when creating Leaflet markers
    function createMarker(toilet) {
        const marker = L.marker([toilet.lat, toilet.lon]);

        // Generate a unique ID for the marker, e.g., using a timestamp
        const markerId = toilet.id;
        marker.options.markerId = markerId;

        // Create the popup content
        const popupContent = `
        <strong>${toilet.tags.name || 'Toilet'} </strong><br>
        Location: ${toilet.lat}, ${toilet.lon}<br>
        Hours: ${toilet.tags.opening_hours || 'Not specified'}<br>
        Fee: ${toilet.tags.fee || 'Not specified'}<br>
        <a href="#" class="more-info-link" data-toilet-info='${JSON.stringify(toilet)}'>More Information</a>`;

        // Create the popup
        const popup = L.popup({
        autoPan: true, // Enable auto-panning to keep the popup within the map bounds
        autoPanPadding: L.point(50, 50), // Adjust padding to control the position
        }).setContent(popupContent);

        marker.bindPopup(popup);

        // Add the marker to the markers array
        markers.push(marker);

        return marker;
    }



    // Function to handle the search
    function handleSearch() {
        const searchInput = document.getElementById('location-search');
        const searchTerm = searchInput.value.trim();

        // Check if the search term is not empty
        if (searchTerm !== '') {
            // Use a geocoding service (e.g., Nominatim) to get the coordinates of the place
            geocodePlace(searchTerm)
                .then(coordinates => {
                    if (coordinates) {
                        // Zoom the map to the found location
                        map.setView(coordinates, 13);

                        map.once('moveend',function() {
                            // Get the bounds (coordinates) of the currently visible map area
                            //clearMarkers();
                            const bounds = map.getBounds();
                            const northEast = bounds.getNorthEast();
                            const southWest = bounds.getSouthWest();
                            clearMarkers(bounds);
                            console.log('northEast:', northEast);
                            console.log('southWest:',southWest);
                            fetchToiletsWithinBounds(northEast, southWest)
                                .then(toilets => {
                                // Clear the results list before adding new items
                                  clearResultsList();

                                  // Iterate through the toilets and add them to the list
                                  toilets.forEach(toilet => {
                                    addToiletToList(toilet);
                                  });
                                  // Display the toilets on the map
                                  //displayToiletsOnMap(toilets);

                                })
                                .catch(error => {
                                    console.error("Error fetching toilets:", error);
                                });
                          });
                          // Clear the search input field
                          searchInput.value = '';
                    } else {
                        alert('Location not found. Please try another search term.');
                    }
                })
                .catch(error => {
                    console.error("Geocoding error:", error);
                });
        } else {
            alert('Please enter a search term.');
        }
    }

    // Attach a click event listener to the search button
    document.getElementById('search-button').addEventListener('click', handleSearch);
    document.getElementById('location-search').addEventListener('keyup', function (event) {
        if (event.key === 'Enter') {
            handleSearch();
        }
    });

    // Function to display toilet details (modify this to suit your layout)
    function displayToiletDetails(toilet) {
      // Access the details and update your UI as needed
      // For example, update a section in your HTML to display the details
      const detailsSection = document.getElementById('toiletDetails');
      detailsSection.innerHTML = `
        <h2>${toilet.tags.name || 'Toilet Name'}</h2>
        <p>${toilet.tags.description || 'Description'}</p>
        <!-- Add more details here as needed -->
      `;
      // Show the details section
      detailsSection.style.display = 'block';
    }


    // Function to add a toilet item to the results list
    function addToiletToList(toilet) {
      const toiletList = document.getElementById('toiletList');
      const listItem = document.createElement('li');
      const toiletName = toilet.tags.name || `Toilet #${toilet.id}`; // Use "Toilet #n" as the name

      // Create a clickable item
      listItem.innerHTML = `<a href="#" class="toilet-item" data-marker-id="${toilet.id}">${toiletName}</a>`;

      // Attach a click event listener to the clickable item
      const clickableItem = listItem.querySelector('.toilet-item');
      clickableItem.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent the default link behavior
        const markerId = clickableItem.getAttribute('data-marker-id');

        // Trigger a click event on the corresponding marker
        triggerMarkerClick(markerId);
      });

      toiletList.appendChild(listItem);
    }

    // Inside triggerMarkerClick function
    function triggerMarkerClick(markerId) {
      console.log('trigger called')
      console.log(markerId);
      // Find the marker with the specified ID in the markers array
      const marker = markers.find((m) => m.options.markerId == markerId);
      console.log(markers)
      if (marker) {
        // Open the marker's popup
        highlightListItem(markerId);
        marker.openPopup();
      }
    }


    // Function to clear the results list
    function clearResultsList() {
      const toiletList = document.getElementById('toiletList');
      toiletList.innerHTML = ''; // Remove all list items
    }

    // Function to geocode a place name to coordinates
    function geocodePlace(placeName) {
        // You can use a geocoding API or service here (e.g., Nominatim, Google Maps Geocoding)
        // Replace this with the actual geocoding API you want to use
        const geocodingApiUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}`;

        return fetch(geocodingApiUrl)
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    const firstResult = data[0];
                    return [parseFloat(firstResult.lat), parseFloat(firstResult.lon)];
                }
                return null;
            });
    }

});