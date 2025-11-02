(function () {
  /**
   * loadPlaces(map, options)
   * - map: instance Leaflet (L.map)
   * - options:
   *    jsonPath: string (required) - chemin vers le JSON
   *    listContainerId: string (default: 'places-content')
   *    icons: object mapping types -> iconUrl (optional)
   *    markerOptions: object default options pour L.marker
   *    clearBefore: boolean (default: true) - supprime les marqueurs existants
   *
   * Retourne une Promise qui résout { places, layerGroup }
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

    const container = document.getElementById(cfg.listContainerId);
    if (!container) {
      console.warn('loadPlaces: list container not found:', cfg.listContainerId);
    }

    // couche pour gérer facilement les marqueurs ajoutés
    if (!map._loadPlaces_layers) map._loadPlaces_layers = [];
    const layerGroup = L.layerGroup();
    if (cfg.clearBefore) {
      // retire anciens layers si présents
      (map._loadPlaces_layers || []).forEach(l => map.removeLayer(l));
      map._loadPlaces_layers = [];
    }
    map.addLayer(layerGroup);
    map._loadPlaces_layers.push(layerGroup);

    try {
      const res = await fetch(cfg.jsonPath);
      if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText);
      const data = await res.json();

      // Normalize data -> array "places"
      let places = [];
      if (Array.isArray(data.places)) {
        places = data.places;
      } else {
        // legacy format: brunchs / pizzerias / restaurants
        const keys = ['brunchs', 'pizzerias', 'restaurants', 'places'];
        keys.forEach(k => {
          if (Array.isArray(data[k])) {
            const type = k === 'places' ? null : k.replace(/s$/, '');
            data[k].forEach(item => {
              places.push(Object.assign({}, item, { type: item.type || type }));
            });
          }
        });
        // if still empty, try to collect any top-level arrays of objects
        if (!places.length) {
          Object.keys(data).forEach(k => {
            if (Array.isArray(data[k]) && data[k].length && typeof data[k][0] === 'object') {
              data[k].forEach(item => places.push(Object.assign({}, item, { type: item.type || k })));
            }
          });
        }
      }

      // create list element
      if (container) container.innerHTML = '';

      const ul = document.createElement('ul');

      places.forEach(p => {
        const lat = Number(p.lat) || Number(p.latitude) || 0;
        const lng = Number(p.lng) || Number(p.longitude) || 0;
        if (!lat || !lng) return; // skip invalid

        // choose icon if provided for this type
        let icon = null;
        const t = (p.type || '').toString().toLowerCase();
        if (t && cfg.icons && cfg.icons[t]) {
          icon = L.icon({ iconUrl: cfg.icons[t], iconSize: [30, 30] });
        }

        const marker = icon
          ? L.marker([lat, lng], Object.assign({}, cfg.markerOptions, { icon }))
          : L.marker([lat, lng], cfg.markerOptions);

        // popup content
        const href = p.page || p.link || null;
        const note = p.note ? `<div class="muted">${escapeHtml(p.note)}</div>` : '';
        const popup = href
          ? `<a href="${href}" target="_blank" rel="noopener">${escapeHtml(p.name)}</a>${note}`
          : `<strong>${escapeHtml(p.name)}</strong>${note}`;

        marker.bindPopup(popup);
        marker.addTo(layerGroup);

        // list item
        if (container) {
          const li = document.createElement('li');
          if (href) {
            li.innerHTML = `<a href="${href}" target="_blank" rel="noopener">${escapeHtml(p.name)}</a>${p.type ? ` — <small class="muted">${escapeHtml(p.type)}</small>` : ''}${p.note ? ` — <span class="muted">${escapeHtml(p.note)}</span>` : ''}`;
          } else {
            li.innerHTML = `<strong>${escapeHtml(p.name)}</strong>${p.type ? ` — <small class="muted">${escapeHtml(p.type)}</small>` : ''}${p.note ? ` — <span class="muted">${escapeHtml(p.note)}</span>` : ''}`;
          }
          ul.appendChild(li);
        }
      });

      if (container) {
        if (!ul.children.length) container.innerHTML = '<p class="muted">Aucune adresse.</p>';
        else container.appendChild(ul);
      }

      return { places, layerGroup };
    } catch (err) {
      console.warn('loadPlaces error', err);
      if (container) container.innerHTML = '<p class="muted">Impossible de charger les adresses.</p>';
      throw err;
    }
  }

  // petit helper pour éviter XSS basique dans noms/notes
  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // expose
  window.loadPlaces = loadPlaces;
})();

<script src="../../js/loadPlaces.js"></script>
<script>
  loadPlaces(map, {
    jsonPath: '../../data/restaurants_pologne.json',
    listContainerId: 'places-content',
    icons: { restaurant: '../../img/restaurant.png', ville: null }
  });
</script>