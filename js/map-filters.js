/**
 * Sets up the map filtering functionality for a page.
 * @param {L.Map} map - The Leaflet map instance.
 * @param {object} initialLoadOptions - The options for the initial loadPlaces call.
 */
function setupMapFilters(map, initialLoadOptions) {
  if (!map || !initialLoadOptions || !initialLoadOptions.jsonPath) {
    console.error('setupMapFilters: map and initialLoadOptions with jsonPath are required.');
    return;
  }

  let allPlaces = [];

  function doFilteredLoad(filteredPlaces) {
    const blob = new Blob([JSON.stringify({ places: filteredPlaces })], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    return loadPlaces(map, {
      jsonPath: url,
      listContainerId: initialLoadOptions.listContainerId || 'places-content',
      icons: initialLoadOptions.icons || {},
      clearBefore: true
    }).finally(() => URL.revokeObjectURL(url));
  }

  function applyFilters() {
    const showPz = document.getElementById('filter-pizzerias')?.checked ?? true;
    const showRest = document.getElementById('filter-restaurants')?.checked ?? document.getElementById('filter-restos')?.checked ?? true;
    const showFf = document.getElementById('filter-fast-food')?.checked ?? true;
    const showCafe = document.getElementById('filter-cafes')?.checked ?? true;
    
    const brunchOnly = document.getElementById('filter-brunch')?.classList.contains('active');
    const vgOnly = document.getElementById('filter-vg')?.classList.contains('active');
    const babyOnly = document.getElementById('filter-baby')?.classList.contains('active');

    const filtered = allPlaces.filter(p => {
      const t = (p.type || '').toLowerCase();
      if (t === 'pizzeria' && !showPz) return false;
      if (t === 'restaurant' && !showRest) return false;
      if (t === 'fast-food' && !showFf) return false;
      if (t === 'café' && !showCafe) return false;

      const tags = p.tags ? (Array.isArray(p.tags) ? p.tags.map(s => String(s).toLowerCase()) : String(p.tags).toLowerCase().split(/[,#;]/).map(s => s.trim())) : [];
      if (brunchOnly && !tags.includes('brunch')) return false;
      if (vgOnly && !tags.includes('vg') && !tags.includes('#vg')) return false;
      if (babyOnly && !tags.includes('babyfriendly') && !tags.includes('baby') && !tags.includes('#babyfriendly')) return false;
      
      return true;
    });

    return doFilteredLoad(filtered);
  }

  loadPlaces(map, initialLoadOptions)
    .then(({ places }) => {
      allPlaces = places.slice();

      // Wire up all potential filters
      const filterIds = ['filter-pizzerias', 'filter-restaurants', 'filter-restos', 'filter-fast-food', 'filter-cafes'];
      filterIds.forEach(id => {
        document.getElementById(id)?.addEventListener('change', applyFilters);
      });

      const tagButtonIds = ['filter-vg', 'filter-baby', 'filter-brunch'];
      tagButtonIds.forEach(id => {
        document.getElementById(id)?.addEventListener('click', e => { e.currentTarget.classList.toggle('active'); applyFilters(); });
      });
    })
    .catch(console.warn);
}