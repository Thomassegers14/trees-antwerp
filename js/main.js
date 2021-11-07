mapboxgl.accessToken = 'pk.eyJ1IjoidHNlZ2VycyIsImEiOiJja3V6YTNwZ2cwdnlrMnZxcWJvZW44MnpxIn0.-psrOHgbMYwM1XEDMK2AOA';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/tsegers/ckuza4luy0mlk15o9d0zoiu1f',
  // style: 'mapbox://styles/mapbox/light-v10',
  zoom: 13,
  minZoom: 13,
  center: [4.418639413310029, 51.212040233601485]
})

// Holds visible airport features for filtering
let airports = [];

// Create a popup, but don't add it to the map yet.
const popup = new mapboxgl.Popup({
  closeButton: false
});

const filterEl = document.getElementById('feature-filter');
const listingEl = document.getElementById('feature-listing');

function renderListings(features) {
  const empty = document.createElement('h3');

  // Clear any existing listings
  listingEl.innerHTML = '';
  if (features.length) {
    for (const feature of features) {
      const itemLink = document.createElement('a');
      const label = `${feature.properties.LATBOOMSOORT} (${Math.round(feature.properties.dst/1000 * 2)/2}km)`;
      itemLink.target = '_blank';
      itemLink.textContent = label;
      itemLink.addEventListener('mouseover', () => {

        // Highlight corresponding feature on the map
        popup
          .setLngLat(feature.geometry.coordinates)
          .setText(label)
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

  }
}

function normalize(string) {
  return string.trim().toLowerCase();
}

// Because features come from tiled vector data,
// feature geometries may be split
// or duplicated across tile boundaries.
// As a result, features may appear
// multiple times in query results.
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
    .setHTML(`<h3>${feature.properties.GENUS}</h3><p>${feature.properties.LATBOOMSOORT}</p>`)
    .addTo(map);

});

map.on('mouseleave', 'data-driven-circles', () => {
  map.getCanvas().style.cursor = '';
  popup.remove();
});

map.on('moveend', () => {
  const features = map.queryRenderedFeatures({
    layers: ['data-driven-circles']
  });

  if (features) {
    const uniqueFeatures = getUniqueFeatures(features, 'LATBOOMSOORT');
    // Populate features for the listing overlay.
    renderListings(uniqueFeatures);

    // Clear the input container
    filterEl.value = '';

    // Store the current features in sn `airports` variable to
    // later use for filtering on `keyup`.
    airports = uniqueFeatures;
  }
});

map.on('load', () => {
  const features = map.queryRenderedFeatures({
    layers: ['data-driven-circles']
  });

  if (features) {
    const uniqueFeatures = getUniqueFeatures(features, 'LATBOOMSOORT');
    // Populate features for the listing overlay.
    renderListings(uniqueFeatures);

    // Clear the input container
    filterEl.value = '';

    // Store the current features in sn `airports` variable to
    // later use for filtering on `keyup`.
    airports = uniqueFeatures;
  }
});

filterEl.addEventListener('keyup', (e) => {
  const value = normalize(e.target.value);

  // Filter visible features that match the input value.
  const filtered = [];

  for (const feature of airports) {
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
      ['get', 'LATBOOMSOORT'],
      filtered.map((feature) => {
        return feature.properties.LATBOOMSOORT;
      }),
      true,
      false
    ]);
  }
})