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

    // fallback par défaut pour l'icône "restaurant"
    cfg.icons = Object.assign({
      restaurant: 'img/cloche.png' // chemin relatif par défaut (depuis la racine)
    }, cfg.icons);

    const container = document.getElementById(cfg.listContainerId);
    if (!container) console.warn('loadPlaces: list container not found:', cfg.listContainerId);

    // manage marker layers on the map
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
      if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText);
      const data = await res.json();

      // Normalize into array "places"
      let places = [];
      if (Array.isArray(data.places)) {
        places = data.places;
      } else {
        // legacy support: brunchs/pizzerias/restaurants keys
        ['brunchs', 'pizzerias', 'restaurants', 'places'].forEach(k => {
          if (Array.isArray(data[k])) {
            const type = k === 'places' ? null : k.replace(/s$/, '');
            data[k].forEach(it => places.push(Object.assign({}, it, { type: it.type || type })));
          }
        });
        if (!places.length) {
          Object.keys(data).forEach(k => {
            if (Array.isArray(data[k]) && data[k].length && typeof data[k][0] === 'object') {
              data[k].forEach(it => places.push(Object.assign({}, it, { type: it.type || k })));
            }
          });
        }
      }

      if (container) container.innerHTML = '';
      const ul = document.createElement('ul');

      places.forEach(p => {
        const lat = Number(p.lat || p.latitude);
        const lng = Number(p.lng || p.longitude);
        if (!lat || !lng) return;

        //const type = (p.type || '').toString().toLowerCase();
        //const iconUrl = cfg.icons && cfg.icons[type];
        //const icon = iconUrl ? L.icon({ iconUrl, iconSize: [30, 30] }) : null;
        //const marker = icon ? L.marker([lat, lng], Object.assign({}, cfg.markerOptions, { icon })) : L.marker([lat, lng], cfg.markerOptions);

        const type = (p.type || '').toString().toLowerCase();
const iconUrl = cfg.icons && cfg.icons[type];
const icon = iconUrl ? L.icon({ iconUrl, iconSize: [30, 30] }) : null;

const marker = icon
  ? L.marker([lat, lng], Object.assign({}, cfg.markerOptions, { icon }))
  : L.marker([lat, lng], cfg.markerOptions);


        // popup html: name, description, tags, link/page
        const name = escapeHtml(p.name || '—');
        const desc = p.description ? `<p style="margin:0.35rem 0;font-size:0.95rem;color:#334;">${escapeHtml(p.description)}</p>` : '';
        const tags = (() => {
          if (!p.tags) return '';
          const arr = Array.isArray(p.tags) ? p.tags : String(p.tags).split(/[,#;]/).map(s => s.trim()).filter(Boolean);
          if (!arr.length) return '';
          return `<p style="margin:0.35rem 0;">${arr.map(t => `<span class="kicker" style="margin-right:6px;font-size:0.85rem;padding:0.18rem 0.45rem;border-radius:999px;background:rgba(0,163,224,0.08);color:var(--primary);">${escapeHtml(t)}</span>`).join('')}</p>`;
        })();

        const href = p.page || p.link || null;
        const hrefLabel = p.page ? 'Fiche' : (p.link ? 'Voir sur Google Maps' : null);
        const hrefHtml = href ? `<p style="margin:0.25rem 0;"><a href="${href}" target="_blank" rel="noopener">${escapeHtml(hrefLabel)}</a></p>` : '';

        const popupHtml = `<div style="max-width:320px"><strong>${name}</strong>${desc}${tags}${hrefHtml}</div>`;

        marker.bindPopup(popupHtml);
        marker.addTo(layerGroup);

        // list item
        if (container) {
          const li = document.createElement('li');
          if (href) {
            li.innerHTML = `<a href="${href}" target="_blank" rel="noopener">${escapeHtml(p.name)}</a>${p.type ? ` — <small class="muted">${escapeHtml(p.type)}</small>` : ''}`;
          } else {
            li.innerHTML = `<strong>${escapeHtml(p.name)}</strong>${p.type ? ` — <small class="muted">${escapeHtml(p.type)}</small>` : ''}`;
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

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  window.loadPlaces = loadPlaces;
})();