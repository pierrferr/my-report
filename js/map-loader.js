/**
 * Initialise une carte Leaflet avec des lieux, des filtres et la géolocalisation.
 * @param {object} options - La configuration de la carte pour la page.
 * @param {string} options.mapId - L'ID de l'élément div pour la carte.
 * @param {string} options.listContainerId - L'ID de l'élément div pour la liste des lieux.
 * @param {Array<number>} options.center - Les coordonnées [lat, lng] du centre de la carte.
 * @param {number} options.zoom - Le niveau de zoom initial.
 * @param {string} options.iconBasePath - Le chemin relatif vers le dossier des icônes.
 * @param {boolean} [options.enableGeolocation=true] - Activer ou non le bouton de géolocalisation.
 * @param {function} options.dataFilter - Une fonction qui reçoit la liste de tous les lieux et retourne la liste filtrée pour la page.
 */
function initializeMap(options) {
    const config = {
        enableGeolocation: true,
        ...options
    };

    const map = L.map(config.mapId).setView(config.center, config.zoom);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    let pagePlaces = [];
    const markers = L.layerGroup().addTo(map);
    const listContainer = document.getElementById(config.listContainerId);

    const customIcons = {
        pizzeria: L.icon({ iconUrl: `${config.iconBasePath}pizza.png`, iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] }),
        brunch: L.icon({ iconUrl: `${config.iconBasePath}croissant.png`, iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] }),
        restaurant: L.icon({ iconUrl: `${config.iconBasePath}cloche.png`, iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] }),
        'fast-food': L.icon({ iconUrl: `${config.iconBasePath}burger.png`, iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] }),
        café: L.icon({ iconUrl: `${config.iconBasePath}tasse.png`, iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] }),
        patisserie: L.icon({ iconUrl: `${config.iconBasePath}croissant.png`, iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] })
    };
    const defaultIcon = new L.Icon.Default();

    async function fetchData() {
        try {
            const response = await fetch(`${config.iconBasePath}../data/all_restaurants.json`);
            const data = await response.json();
            pagePlaces = config.dataFilter(data.places);
            displayContent(pagePlaces);
        } catch (error) {
            console.error("Erreur de chargement:", error);
            if (listContainer) listContainer.innerHTML = '<p class="muted">Impossible de charger les adresses.</p>';
        }
    }

    function displayContent(places) {
        markers.clearLayers();
        if (listContainer) listContainer.innerHTML = '';
        const ul = document.createElement('ul');

        places.forEach(place => {
            if (place.lat && place.lng) {
                let chosenIcon = customIcons[place.type] || defaultIcon;
                if (place.tags && place.tags.includes('brunch')) chosenIcon = customIcons.brunch;
                
                const marker = L.marker([place.lat, place.lng], { icon: chosenIcon });
                let tagsHtml = '';
                if (place.tags && place.tags.length > 0) {
                    tagsHtml = '<div class="popup-tags">' +
                        place.tags.map(tag => `<span class="popup-tag">#${tag}</span>`).join('') +
                        '</div>';
                }
                const popupContent = `<strong>${place.name}</strong><br>${place.description || ''}<br>
                                      <a href="${place.link}" target="_blank" rel="noopener noreferrer">Voir sur la carte</a>
                                      ${tagsHtml}`;
                marker.bindPopup(popupContent);
                markers.addLayer(marker);

                if (listContainer) {
                    const li = document.createElement('li');
                    li.innerHTML = `<a href="${place.link}" target="_blank" rel="noopener">${place.name}</a> — <small class="muted">${place.type}</small>`;
                    ul.appendChild(li);
                }
            }
        });

        if (listContainer) {
            if (!ul.children.length) listContainer.innerHTML = '<p class="muted">Aucune adresse à afficher pour les filtres actuels.</p>';
            else listContainer.appendChild(ul);
        }
    }

    function applyFilters() {
        const selectedTypes = Array.from(document.querySelectorAll('#filters input[type="checkbox"]:checked')).map(cb => cb.id.replace('filter-', 's'));
        const activeTags = Array.from(document.querySelectorAll('#filters button.tag-button.active')).map(btn => btn.dataset.tag || btn.id.replace('filter-', ''));

        const filteredPlaces = pagePlaces.filter(place => {
            const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(place.type + 's');
            const tagMatch = activeTags.every(tag => (place.tags || []).map(t => String(t).toLowerCase()).includes(tag.toLowerCase()));
            return typeMatch && tagMatch;
        });
        displayContent(filteredPlaces);
    }

    function setupFilters() {
        const filterElements = document.querySelectorAll('#filters input[type="checkbox"], #filters button.tag-button');
        filterElements.forEach(el => el.addEventListener('click', () => {
            if (el.tagName === 'BUTTON') el.classList.toggle('active');
            applyFilters();
        }));
    }

    if (config.enableGeolocation) {
        const GeolocateControl = L.Control.extend({
            onAdd: function(map) {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-geolocate');
                container.innerHTML = '⌖';
                container.title = 'Me géolocaliser';
                L.DomEvent.on(container, 'click', e => {
                    L.DomEvent.stopPropagation(e);
                    map.locate({setView: true, maxZoom: 14});
                });
                return container;
            }
        });
        new GeolocateControl().addTo(map);
        map.on('locationfound', e => L.marker(e.latlng).addTo(map).bindPopup("Vous êtes ici !").openPopup());
        map.on('locationerror', e => alert("Impossible de vous géolocaliser.\n" + e.message));
    }

    fetchData().then(setupFilters);
}