import mapboxgl from 'https://cdn.jsdelivr.net/npm/[email protected]/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/[email protected]/+esm';

mapboxgl.accessToken = 'pk.eyJ1IjoicHBhbmNoYWw5NyIsImEiOiJjbWh5ZWJqcG0wYWJkMmlwdGtsc2JzOW8xIn0.K6s8A4GWrfp4xAQrFDjarg';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [-71.0589, 42.3601],
  zoom: 11.5,
  minZoom: 9,
  maxZoom: 18
});

const svg = d3.select('#map').select('svg');

function minutesSinceMidnight(iso) {
  const t = new Date(iso);
  return t.getHours() * 60 + t.getMinutes();
}
function formatTime(minutes) {
  const d = new Date(0, 0, 0, 0, Math.max(0, minutes));
  return d.toLocaleString('en-US', { timeStyle: 'short' });
}
function getCoords(station) {
  const pt = new mapboxgl.LngLat(+station.lon, +station.lat);
  const { x, y } = map.project(pt);
  return { cx: x, cy: y };
}

let stations = [];
let trips = [];
let timeFilter = -1;
let circles = null;

function computeStationTraffic(stationsInput, tripsInput) {
  const deps = d3.rollup(tripsInput, v => v.length, d => d.start_station_id);
  const arrs = d3.rollup(tripsInput, v => v.length, d => d.end_station_id);
  return stationsInput.map(s => {
    const id = s.short_name;
    const departures = deps.get(id) ?? 0;
    const arrivals = arrs.get(id) ?? 0;
    const totalTraffic = departures + arrivals;
    return { ...s, departures, arrivals, totalTraffic };
  });
}

function updateScatterPlot(currentMinutes) {
  const filteredTrips = currentMinutes === -1
    ? trips
    : trips.filter(t => {
        const m = minutesSinceMidnight(t.started_at);
        return m >= currentMinutes && m < currentMinutes + 60;
      });

  const enriched = computeStationTraffic(stations, filteredTrips);
  const maxTraffic = d3.max(enriched, d => d.totalTraffic) || 1;
  const radiusMax = currentMinutes === -1 ? 25 : 35;
  const radiusScale = d3.scaleSqrt().domain([0, maxTraffic]).range([0, radiusMax]);

  circles = svg.selectAll('circle').data(enriched, d => d.short_name);

  circles.join(
    enter => enter.append('circle')
      .attr('r', d => radiusScale(d.totalTraffic))
      .attr('fill', d => (d.departures >= d.arrivals ? '#4a7bd1' : '#f26a3d'))
      .attr('cx', d => getCoords(d).cx)
      .attr('cy', d => getCoords(d).cy)
      .append('title')
      .text(d => `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`),
    update => update
      .attr('r', d => radiusScale(d.totalTraffic))
      .attr('fill', d => (d.departures >= d.arrivals ? '#4a7bd1' : '#f26a3d'))
  );
}

function updatePositions() {
  if (!circles) return;
  circles.attr('cx', d => getCoords(d).cx).attr('cy', d => getCoords(d).cy);
}

map.on('load', async () => {
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson'
  });
  map.addLayer({
    id: 'bike-lanes-boston',
    type: 'line',
    source: 'boston_route',
    paint: { 'line-color': 'green', 'line-width': 3, 'line-opacity': 0.4 }
  });

  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson'
  });
  map.addLayer({
    id: 'bike-lanes-cambridge',
    type: 'line',
    source: 'cambridge_route',
    paint: { 'line-color': 'green', 'line-width': 3, 'line-opacity': 0.4 }
  });

  let rawStations = await d3.json('https://dsc106.com/labs/lab07/data/bluebikes-stations.json');
  if (rawStations?.data?.stations) {
    stations = rawStations.data.stations.map(s => ({
      short_name: s.short_name || s.Number || s.shortName || s.shortname,
      name: s.name || s.NAME,
      lat: +s.lat || +s.Lat,
      lon: +s.lon || +s.Long
    }));
  } else if (Array.isArray(rawStations)) {
    stations = rawStations.map(s => ({
      short_name: s.short_name || s.Number || s.shortName || s.shortname,
      name: s.name || s.NAME,
      lat: +s.lat || +s.Lat,
      lon: +s.lon || +s.Long
    }));
  }

  trips = await d3.csv('https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv', d3.autoType);

  updateScatterPlot(timeFilter);

  map.on('move', updatePositions);
  map.on('zoom', updatePositions);
  map.on('resize', updatePositions);
  map.on('moveend', updatePositions);

  const slider = document.getElementById('time-slider');
  const selectedTime = document.getElementById('selected-time');
  const anyTime = document.getElementById('any-time');

  function updateTimeDisplay() {
    timeFilter = Number(slider.value);
    if (timeFilter === -1) {
      selectedTime.textContent = '';
      anyTime.style.display = 'inline';
    } else {
      selectedTime.textContent = formatTime(timeFilter);
      anyTime.style.display = 'none';
    }
    updateScatterPlot(timeFilter);
    updatePositions();
  }

  slider.addEventListener('input', updateTimeDisplay);
  updateTimeDisplay();
});
