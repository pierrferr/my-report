/**
 * Initialise une carte Leaflet avec des lieux, des filtres et la géolocalisation.
 * @param {object} options - La configuration de la carte pour la page.
 * @param {string} [options.mapId='map'] - L'ID de l'élément div pour la carte.
 * @param {string} [options.listContainerId] - L'ID de l'élément div pour la liste des lieux.
 * @param {Array<number>} options.center - Les coordonnées [lat, lng] du centre de la carte.
 * @param {number} options.zoom - Le niveau de zoom initial.
 * @param {string} [options.iconBasePath='../../img/'] - Le chemin relatif vers le dossier des icônes.
 * @param {boolean} [options.enableGeolocation=true] - Activer ou non le bouton de géolocalisation.
 * @param {function} options.dataFilter - Une fonction qui reçoit la liste de tous les lieux et retourne la liste filtrée pour la page.
 * @param {string} [options.dataSourceUrl] - (Optionnel) URL directe vers un fichier de données (ex: CSV Google Sheet). Si défini, remplace le fichier JSON par défaut.
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

    let allPlaces = [];
    const markers = L.markerClusterGroup({
        disableClusteringAtZoom: 13 // On désactive le regroupement à partir de ce niveau de zoom
    });
    map.addLayer(markers);
    const listContainer = config.listContainerId ? document.getElementById(config.listContainerId) : null;

    const customIcons = {
        pizzeria: L.icon({ iconUrl: `${config.iconBasePath}pizza.png`, iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] }),
        brunch: L.icon({ iconUrl: `${config.iconBasePath}croissant.png`, iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] }),
        restaurant: L.icon({ iconUrl: `${config.iconBasePath}cloche.png`, iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] }),
        'fast-food': L.icon({ iconUrl: `${config.iconBasePath}burger.png`, iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] }),
        café: L.icon({ iconUrl: `${config.iconBasePath}tasse.png`, iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] }),
        patisserie: L.icon({ iconUrl: `${config.iconBasePath}croissant.png`, iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] })
    };
    const defaultIcon = new L.Icon.Default();

    // Fonction utilitaire pour convertir le CSV (Google Sheet) en tableau d'objets
    function parseCSV(csvText) {
        const lines = csvText.split(/\r?\n/);
        // On récupère les entêtes (name, type, lat, etc.)
        const headers = lines[0].split(',').map(h => h.trim());
        const places = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            // Découpage intelligent qui ignore les virgules à l'intérieur des guillemets
            const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => {
                let val = cell.trim();
                // Enlève les guillemets autour du texte si présents (format CSV standard)
                if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1).replace(/""/g, '"');
                return val;
            });

            const place = {};
            headers.forEach((header, index) => {
                const value = row[index];
                if (header === 'lat' || header === 'lng') {
                    place[header] = parseFloat(value.replace(',', '.')); // Gère les virgules décimales
                } else if (header === 'tags') {
                    place[header] = value ? value.split(',').map(t => t.trim()) : [];
                } else {
                    place[header] = value;
                }
            });
            if (place.lat && place.lng) places.push(place);
        }
        return places;
    }

    async function fetchData() {
        try {
            let dataPlaces = [];
            if (config.dataSourceUrl) {
                // Chargement depuis Google Sheet (CSV)
                const response = await fetch(config.dataSourceUrl);
                const text = await response.text();
                dataPlaces = parseCSV(text);
            } else {
                // Chargement par défaut (JSON)
                const response = await fetch(`${config.iconBasePath}../data/all_restaurants.json`);
                const data = await response.json();
                dataPlaces = data.places;
            }

            // Application du filtre si nécessaire
            allPlaces = config.dataFilter ? config.dataFilter(dataPlaces) : dataPlaces;
            displayContent(allPlaces);
        } catch (error) {
            console.error("Erreur de chargement:", error);
            if (listContainer) listContainer.innerHTML = '<p class="muted">Impossible de charger les adresses.</p>';
        }
    }

    function displayContent(places) {
        markers.clearLayers();
        if (listContainer) listContainer.innerHTML = '<ul></ul>'; // Initialise avec une liste vide
        const ul = listContainer ? listContainer.querySelector('ul') : null;

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
                let lastVisitHtml = '';
                if (place["Dernière visite"]) {
                    lastVisitHtml = `<br><small class="muted">Dernière visite : ${place["Dernière visite"]}</small>`;
                }
                let pictureHtml = '';
                if (place.picture) {
                    const picPath = (options.pictureBasePath || '') + place.picture;
                    pictureHtml = `<div style="flex:0 0 80px;"><img src="${picPath}" alt="${place.name}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="window.openImageModal && window.openImageModal('${picPath}')"></div>`;
                }

                const popupContent = `<div style="display:flex;gap:10px;align-items:start;min-width:200px;">
                                        <div style="flex:1;"><strong>${place.name}</strong><br>${place.description || ''}</div>
                                        ${pictureHtml}
                                      </div>
                                      <div style="margin-top:8px;">
                                          <a href="${place.link}" target="_blank" rel="noopener noreferrer">Voir sur la carte</a>
                                          ${tagsHtml}
                                          ${lastVisitHtml}
                                      </div>`;
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

    function setupFilters() {
        const typeCheckboxes = document.querySelectorAll('#filters input[type="checkbox"]');
        const tagButtons = document.querySelectorAll('#filters button.tag-button');
        
        function applyFilters() {
            const selectedTypes = Array.from(typeCheckboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.value);
            
            const activeTags = Array.from(tagButtons)
                .filter(btn => btn.classList.contains('active'))
                .map(btn => btn.dataset.tag);
            
            const filteredPlaces = allPlaces.filter(place => {
                const typeMatch = selectedTypes.includes(place.type);
                const placeTags = (place.tags || []).map(t => String(t).toLowerCase());
                const tagMatch = activeTags.every(tag => placeTags.includes(tag.toLowerCase()));
                return typeMatch && tagMatch;
            });
            displayContent(filteredPlaces);
        }
        typeCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));
        tagButtons.forEach(button => button.addEventListener('click', () => {
            button.classList.toggle('active');
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