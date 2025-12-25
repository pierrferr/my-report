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
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
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
                } else if (header === 'type') {
                    place[header] = value ? value.toLowerCase().trim() : '';
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
            // URL par défaut vers le Google Sheet (remplace l'ancien fichier JSON)
            const defaultSheetUrl = "https://docs.google.com/spreadsheets/d/1h2CegxeHf_ALQDLAeVkLTByXbADVrwu1MPPDv0pZHms/export?format=csv";
            const urlToFetch = config.dataSourceUrl || defaultSheetUrl;

            const response = await fetch(urlToFetch);
            
            if (urlToFetch.endsWith('.json')) {
                const data = await response.json();
                dataPlaces = data.places;
            } else {
                const text = await response.text();
                dataPlaces = parseCSV(text);
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
                if (place.last) {
                    lastVisitHtml = `<br><small class="muted">Dernière visite : ${place.last}</small>`;
                }
                let pictureHtml = '';
                let picPath = null;
                if (place.picture) {
                    picPath = place.picture;
                    
                    // Conversion robuste des liens Google Drive vers lh3.googleusercontent.com (plus fiable pour l'affichage)
                    let driveId = null;
                    const matchFile = picPath.match(/\/file\/d\/([-a-zA-Z0-9_]+)/);
                    const matchId = picPath.match(/[?&]id=([-a-zA-Z0-9_]+)/);

                    if (matchFile && matchFile[1]) driveId = matchFile[1];
                    else if (matchId && matchId[1] && picPath.includes('drive.google.com')) driveId = matchId[1];

                    if (driveId) {
                        picPath = `https://lh3.googleusercontent.com/d/${driveId}`;
                    } else if (!picPath.startsWith('http') && !picPath.startsWith('//')) {
                        // Si ce n'est pas une URL absolue (Drive ou autre), on applique le chemin relatif
                        picPath = (options.pictureBasePath || '') + picPath;
                    }
                    pictureHtml = `<div style="flex:0 0 80px;"><img src="${picPath}" alt="${place.name}" referrerpolicy="no-referrer" style="width:80px;height:80px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="window.openImageModal && window.openImageModal('${picPath}')"></div>`;
                }

                const popupContent = `<div style="display:flex;gap:10px;align-items:start;min-width:200px;">
                                        <div style="flex:1;"><strong>${place.name}</strong><br>${place.description || ''}</div>
                                        ${pictureHtml}
                                      </div>
                                      <div style="margin-top:8px;">
                                          <a href="${place.link}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;">
                                            Afficher dans Google Maps
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                          </a>
                                          ${tagsHtml}
                                          ${lastVisitHtml}
                                      </div>`;
                marker.bindPopup(popupContent);
                markers.addLayer(marker);

                if (listContainer) {
                    const li = document.createElement('li');
                    li.style.marginBottom = '20px';
                    li.style.display = 'flex';
                    li.style.gap = '15px';
                    li.style.alignItems = 'flex-start';
                    li.style.cursor = 'pointer';

                    li.onclick = (e) => {
                        if (e.target.tagName === 'A' || e.target.closest('a') || e.target.tagName === 'IMG') return;
                        document.getElementById(config.mapId).scrollIntoView({behavior: 'smooth'});
                        markers.zoomToShowLayer(marker, () => {
                            marker.openPopup();
                        });
                    };
                    
                    let listTags = '';
                    if (place.tags && place.tags.length > 0) {
                        listTags = '<div style="margin-top:8px;">' + 
                            place.tags.map(t => `<span style="display:inline-block; background:#f1f5f9; color:#475569; padding:4px 10px; border-radius:12px; font-size:0.75rem; margin-right:5px; font-weight:500;">${t}</span>`).join('') + 
                            '</div>';
                    }

                    let imgHtml = '';
                    if (picPath) {
                        imgHtml = `<div style="flex-shrink:0; width:120px;">
                            <img src="${picPath}" alt="${place.name}" style="width:120px; height:90px; object-fit:cover; border-radius:8px; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.1);" onclick="window.openImageModal && window.openImageModal('${picPath}')" loading="lazy">
                        </div>`;
                    }

                    li.innerHTML = `${imgHtml}
                                    <div style="flex:1;">
                                        <div style="font-size:1.1rem; font-weight:600; margin-bottom:4px;">
                                            <span style="color:#2c3e50;">${place.name}</span> 
                                            <small class="muted" style="font-weight:400; font-size:0.9rem;">(${place.type})</small>
                                        </div>
                                        <div style="color:#555; line-height:1.5; font-size:0.95rem;">${place.description || ''}</div>
                                        ${listTags}
                                    </div>`;
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