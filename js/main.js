const hideStartScreen = function() {
  d3.selectAll('.startScreen')
    .transition()
    .duration(500)
    .style('opacity', 0)
    .remove()
}

mapboxgl.accessToken = 'pk.eyJ1IjoidHNlZ2VycyIsImEiOiJja3V6YTNwZ2cwdnlrMnZxcWJvZW44MnpxIn0.-psrOHgbMYwM1XEDMK2AOA';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/tsegers/ckuza4luy0mlk15o9d0zoiu1f',
  // style: 'mapbox://styles/mapbox/light-v10',
  zoom: 15,
  minZoom: 13,
  center: [4.418412511712686, 51.20279712915063]
})

// Holds visible airport features for filtering
let trees = [];

// Create a popup, but don't add it to the map yet.
const popup = new mapboxgl.Popup({
  closeButton: false
});

const filterEl = document.getElementById('feature-filter');
const listingEl = document.getElementById('feature-listing');

function renderListings(features) {
  const empty = document.createElement('p');

  const featuresLength = document.getElementById('feature-length');
  let length = `Trees found: ${features.length}`;
  featuresLength.innerHTML = length;

  // Clear any existing listings
  listingEl.innerHTML = '';
  if (features.length) {

    for (const feature of features) {
      const itemLink = document.createElement('a');
      let label = `${feature.properties.LATBOOMSOORT} <span>${Math.round(feature.properties.dst)}m</span>`;
      itemLink.target = '_blank';
      itemLink.innerHTML = label;
      itemLink.addEventListener('mouseover', () => {

        // Highlight corresponding feature on the map
        popup
          .setLngLat(feature.geometry.coordinates)
          .setHTML(label)
          .addTo(map);
      });
      listingEl.appendChild(itemLink);
    }

    // Show the filter input
    filterEl.parentNode.style.display = 'block';
  } else if (features.length === 0 && filterEl.value !== '') {
    empty.textContent = 'No results found';
    listingEl.appendChild(empty);
  } else {
    empty.textContent = 'Drag the map to populate results';
    listingEl.appendChild(empty);

    // Hide the filter input
    filterEl.parentNode.style.display = 'none';

    resetMap()

  }
}

function normalize(string) {
  return string.trim().toLowerCase();
}

function getUniqueFeatures(features, comparatorProperty) {

  const uniqueIds = new Set();
  const uniqueFeatures = [];

  for (const feature of features) {
    const id = feature.properties[comparatorProperty];
    if (!uniqueIds.has(id)) {
      uniqueIds.add(id);
      uniqueFeatures.push(feature);
    }
  }

  return uniqueFeatures;
}

function resetMap() {
  map.setFilter('data-driven-circles', ['has', 'OBJECTID']);
  filterEl.value = '';
}

map.on('load', () => {

  const features = map.queryRenderedFeatures({
    layers: ['data-driven-circles']
  });

  features.sort(function(a, b) {
    return a.properties.dst - b.properties.dst
  });

  if (features) {
    const uniqueFeatures = getUniqueFeatures(features, 'OBJECTID');
    renderListings(uniqueFeatures);
    filterEl.value = '';
    trees = uniqueFeatures;
  }

  map.on('movestart', () => {
    resetMap()
  });

  map.on('moveend', () => {
    const features = map.queryRenderedFeatures({
      layers: ['data-driven-circles']
    });

    features.sort(function(a, b) {
      return a.properties.dst - b.properties.dst
    });

    if (features) {
      const uniqueFeatures = getUniqueFeatures(features, 'OBJECTID');

      renderListings(uniqueFeatures);

      trees = uniqueFeatures;
    }
  });

});

map.on('mouseenter', 'data-driven-circles', (event) => {

  map.getCanvas().style.cursor = 'pointer';

  // If the user clicked on one of your markers, get its information.
  const features = map.queryRenderedFeatures(event.point, {
    layers: ['data-driven-circles'] // replace with your layer name
  });
  if (!features.length) {
    return;
  }
  const feature = features[0];

  popup
    .setLngLat(feature.geometry.coordinates)
    .setHTML(`<h3>${feature.properties.LATBOOMSOORT}</h3><p>${feature.properties.STAMOMTREK} cm</p>`)
    .addTo(map);

});

map.on('mouseleave', 'data-driven-circles', () => {
  map.getCanvas().style.cursor = '';
  popup.remove();
});

// Add geolocate control to the map.
map.addControl(
  new mapboxgl.GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true
    },
    // When active the map will receive updates to the device's location as it changes.
    trackUserLocation: true,
    // Draw an arrow next to the location dot to indicate which direction the device is heading.
    showUserHeading: true
  })
);

filterEl.addEventListener('keyup', (e) => {
  const value = normalize(e.target.value);

  // Filter visible features that match the input value.
  const filtered = [];

  for (const feature of trees) {
    const name = normalize(feature.properties.LATBOOMSOORT);
    const code = normalize(feature.properties.GENUS);
    if (name.includes(value) || code.includes(value)) {
      filtered.push(feature);
    }
  }

  // Populate the sidebar with filtered results
  renderListings(filtered);

  // Set the filter to populate features into the layer.
  if (filtered.length) {
    map.setFilter('data-driven-circles', [
      'match',
      ['get', 'OBJECTID'],
      filtered.map((feature) => {
        return feature.properties.OBJECTID;
      }),
      true,
      false
    ]);
  }
})