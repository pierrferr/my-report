(function () {
  /**
   * loadPlaces(map, options)
   * - map: instance Leaflet (L.map)
   * - options:
   *    jsonPath: string (required)
   *    listContainerId: string (default: 'places-content')
   *    icons: object mapping types -> iconUrl
   *    markerOptions: object for L.marker
   *    clearBefore: boolean
   *
   * Returns Promise<{ places, layerGroup }>
   */
  async function loadPlaces(map, options = {}) {
    if (!map) throw new Error('loadPlaces: map is required');

    const cfg = Object.assign({
      jsonPath: './data/places.json',
      listContainerId: 'places-content',
      icons: {},
      markerOptions: {},
      clearBefore: true
    }, options);

    // Fallback par défaut pour l'icône "restaurant"
    cfg.icons = Object.assign({
      restaurant: 'img/cloche.png'
    }, cfg.icons);

    const container = document.getElementById(cfg.listContainerId);
    if (!container) console.warn('loadPlaces: list container not found:', cfg.listContainerId);

    // Gestion des couches Leaflet
    if (!map._loadPlaces_layers) map._loadPlaces_layers = [];
    const layerGroup = L.layerGroup();
    if (cfg.clearBefore) {
      (map._loadPlaces_layers || []).forEach(l => map.removeLayer(l));
      map._loadPlaces_layers = [];
    }
    map.addLayer(layerGroup);
    map._loadPlaces_layers.push(layerGroup);

    try {
      const res = await fetch(cfg.jsonPath);
      if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText)
