/**
 * Classe Geo : Gère tout l'affichage de la carte et les interactions avec les API de transport.
 */
class Geo {
    constructor($mapBox, $geoSwitch) {
        // --- 1. CONFIGURATION ---
        // L'adresse de notre serveur qui contient les données des bus
        this.urlApi = 'https://cepegra-frontend.xyz/bootcamp';
        
        // Références aux éléments HTML (la div de la carte et le bouton)
        this.$mapBox = $mapBox;
        this.$geoSwitch = $geoSwitch;
        
        // --- 2. ÉTAT DE L'APPLICATION ---
        this.map = null;          // Contiendra l'objet Leaflet une fois la carte créée
        this.distance = 1;        // Rayon de recherche par défaut (1km)
        
        // --- 3. LES CALQUES (LAYER GROUPS) ---
        // Au lieu de supprimer les markers un par un, on crée des "tiroirs".
        // On peut vider un tiroir entier (clearLayers) sans toucher au reste de la carte.
        this.layers = {
            stops: L.layerGroup(), // Tiroir pour les icônes d'arrêts de bus
            route: L.layerGroup(),  // Tiroir pour le tracé rouge du bus et ses terminus
            walking: L.layerGroup()  //Tiroir pour le tracé bleu de la marche à pied
        };

        // Écouteur global pour les lignes de bus
        this.$mapBox.addEventListener('click', (e) => {
            if (e.target.classList.contains('bus-link')) {
                e.preventDefault();
                this.drawRoute(e.target.dataset.shape);
            }
        });

        // Options pour la précision du GPS
        this.optionsMap = { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 };
        
        // On prépare les icônes
        this._initIcons();
    }

    /**
     * Crée les icônes personnalisées pour les différents marqueurs
     */
    _initIcons() {
        const configCommune = {
            iconSize: [53, 53],    // Taille de l'image
            iconAnchor: [26, 53],  // Point de l'image qui touche la coordonnée (le bas au milieu)
            popupAnchor: [0, -50]  // Où la bulle d'info doit apparaître par rapport au point
        };

        this.icons = {
            stop: L.icon({ ...configCommune, iconUrl: './icons/icon-map-bus-stop.svg' }),
            start: L.icon({ ...configCommune, iconUrl: './icons/icon-map-bus-start.svg' }),
            end: L.icon({ ...configCommune, iconUrl: './icons/icon-map-bus-end.svg' }),
            user: L.icon({ ...configCommune, iconUrl: './icons/icon-map-user-location.svg' }),
            userClick: L.icon({ ...configCommune, iconUrl: './icons/geo-gps-on.svg' })
        };
    }

    /**
     * Point d'entrée : vérifie si l'utilisateur autorise le GPS
     */
    async init() {
        try {
            // On demande au navigateur si on a le droit d'utiliser le GPS
            const result = await navigator.permissions.query({ name: 'geolocation' });
            
            if (result.state === 'granted' || result.state === 'prompt') {
                // Si oui, on demande la position réelle
                navigator.geolocation.getCurrentPosition(
                    (pos) => this.createMap(pos),
                    (err) => this.errorPosition(err),
                    this.optionsMap
                );
            } else {
                // Si non, on utilise une position par défaut (Neuville)
                this._fallbackPosition();
            }
        } catch (error) {
            this._fallbackPosition();
        }
    }

    /**
     * Position de secours si le GPS est désactivé
     */
    _fallbackPosition() {
        const dummyPos = { coords: { latitude: 50.112673, longitude: 4.418669 } };
        this.createMap(dummyPos);
    }

    setDistance(km) {
        this.distance = km;
    }

    /**
     * Initialise la carte Leaflet sur l'écran
     */
    createMap(position) {
        const { latitude, longitude } = position.coords;

        // Si une carte existe déjà, on l'efface pour éviter les bugs de mémoire
        if (this.map) this.map.remove();

        // On affiche la div HTML et on crée l'objet Map
        this.$mapBox.classList.remove('hidde');
        this.map = L.map(this.$mapBox).setView([latitude, longitude], 17);

        // On ajoute le fond de carte (le dessin des rues)
        L.tileLayer("https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=f5a6d9a8d3484637b41037978e6e1e7b", {
            attribution: '© OpenStreetMap - TEC'
        }).addTo(this.map);

        // IMPORTANT : On ajoute nos "tiroirs" (calques) à la carte
        this.layers.stops.addTo(this.map);
        this.layers.route.addTo(this.map);
        this.layers.walking.addTo(this.map)

        // On place un marqueur là où se trouve l'utilisateur
        L.marker([latitude, longitude], { icon: this.icons.user }).addTo(this.map);

        // On charge les premiers arrêts de bus
        this.loadStops(position);

        // Événement : Si on clique sur la carte, on cherche les bus à cet endroit
        this.map.on('click', (e) => {
            this.layers.route.clearLayers(); // On efface un éventuel trajet affiché
            this.loadStops({ coords: { latitude: e.latlng.lat, longitude: e.latlng.lng } });
        });
    }

    /**
     * Récupère les arrêts de bus depuis l'API Open Data (ODWB)
     */
    async loadStops(position) {
        this.lastPosition = position; // On garde en mémoire la dernière position utilisée pour les calculs de distance
        // On vide le tiroir des arrêts actuels avant d'en mettre de nouveaux
        this.layers.stops.clearLayers();
        L.marker([position.coords.latitude, position.coords.longitude], { icon: this.icons.userClick }).addTo(this.layers.stops);
        const { latitude, longitude } = position.coords;

        try {
            // URL de l'API avec les coordonnées et le rayon (this.distance)
            const url = `https://www.odwb.be/api/explore/v2.1/catalog/datasets/le-tec-arrets-bus/records?limit=100&where=within_distance(coordinates, geom'POINT(${longitude} ${latitude})', ${this.distance}km)&order_by=distance(coordinates, geom'POINT(${longitude} ${latitude})')`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            //alert(data.results.length+"/"+data.total_count + '/'+this.distance);

            if (data.results && data.results.length > 0) {
                // Pour chaque arrêt trouvé, on crée un marqueur
                data.results.forEach(stop => this._renderStopMarker(stop));
            } else {
                // Si rien n'est trouvé, on affiche l'alerte HTML
                document.querySelector('.box-alert').classList.remove('hidden');
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des arrêts :", error);
        }
    }

    /**
     * Dessine UN marqueur d'arrêt et gère le clic pour voir les lignes de bus
     */
    _renderStopMarker(stop) {
    // 1. Calcul de la distance initiale (vol d'oiseau)
    const stopPos = L.latLng(stop.coordinates.lat, stop.coordinates.lon);
    const userPos = L.latLng(this.lastPosition.coords.latitude, this.lastPosition.coords.longitude);
    const distance = userPos.distanceTo(stopPos);
    const distText = distance > 1000 ? (distance / 1000).toFixed(1) + " km" : Math.round(distance) + " m";

    // 2. Création du marqueur
    const marker = L.marker([stop.coordinates.lat, stop.coordinates.lon], { icon: this.icons.stop })
        .addTo(this.layers.stops);

    // 3. Gestion du clic
    marker.on('click', async () => {
        // A. ON CHARGE LES BUS D'ABORD
        const response = await fetch(`${this.urlApi}/bus/${stop.stop_name}/${stop.coordinates.lon}`);
        const data = await response.json();
        
        let busHtml = "";
        if (data.code === "ok") {
            data.content.forEach(bus => {
                if (bus.route_id) {
                    busHtml += `<a href="#" class="bus-link" data-shape="${bus.shape_id}">${bus.route_short_name} - ${bus.route_long_name}</a><br>`;
                }
            });
        } else {
            busHtml = `<p class="error">Aucun bus renseigné ici</p>`;
        }

        // B. ON DÉFINIT LE CONTENU DE BASE (Titre + Distance + Bus)
        const fullContent = `
            <h4>${stop.stop_name}</h4>
            <p>📍 À ${distText} (vol d'oiseau)</p>
            <div class="walking-info">⌛ Calcul du trajet à pied...</div>
            <hr>
            ${busHtml}
        `;

        // C. ON OUVRE LE POPUP

    marker.bindPopup(fullContent, {
    autoPan: false,           // Garde la carte immobile
    closeOnClick: true,       // Ferme si on clique ailleurs sur la carte
    closeButton: true,
    offset: [0, 0],           // Annule le décalage par défaut
    className: 'fixed-header-popup'  // Une classe propre pour ton CSS
}).openPopup();




        // D. ON LANCE LE TRAJET À PIED (qui viendra remplacer "Calcul du trajet...")
        // On n'a plus besoin d'attendre (await) ici, ça se fera en arrière-plan
        this.getWalkingRoute(stop.coordinates, marker);
        
        // E. GESTION DES CLICS SUR LES BUS (Délegation ou timeout)
        // On utilise la délégation sur la carte pour être sûr que ça marche
    });
}
    /**
     * Dessine la ligne rouge du trajet complet d'un bus
     */
    async drawRoute(shapeId) {
        // On vide le tiroir des trajets (efface le bus précédent)
        this.layers.route.clearLayers();

        try {
            const response = await fetch(`${this.urlApi}/shapes/${shapeId}`);
            const data = await response.json();

            if (data.content && data.content.length > 0) {
                // On transforme les données de l'API en une liste de points [lat, lon]
                const points = data.content.map(p => [p.shape_pt_lat, p.shape_pt_lon]);
                
                // On dessine la ligne (Polyline)
                L.polyline(points, { color: 'red', weight: 8, opacity: 0.7 }).addTo(this.layers.route);

                // On ajoute des icônes spéciales pour le début et la fin
                L.marker(points[0], { icon: this.icons.start }).bindPopup('Départ du bus').addTo(this.layers.route);
                L.marker(points[points.length - 1], { icon: this.icons.end }).bindPopup('Terminus').addTo(this.layers.route);

                // MAGIQUE : La carte s'ajuste toute seule pour montrer TOUT le trajet
                this.map.flyToBounds(points, { padding: [50, 50] });
            }
        } catch (error) {
            console.error("Erreur lors du tracé du trajet :", error);
        }
    }

    errorPosition(err) {
        console.warn(`Erreur de localisation (${err.code}): ${err.message}`);
    }

    /**
 * Calcule et affiche le trajet à pied vers un arrêt
 */
/**
 * Calcule l'itinéraire à pied, le dessine, et met à jour le popup du marqueur.
 * @param {Object} stopCoords - Les coordonnées de l'arrêt {lat, lon}
 * @param {L.marker} marker - L'instance du marqueur Leaflet cliqué
 */
async getWalkingRoute(stopCoords, marker) {
    this.layers.walking.clearLayers();

    const start = `${this.lastPosition.coords.longitude},${this.lastPosition.coords.latitude}`;
    const end = `${stopCoords.lon},${stopCoords.lat}`;
    const url = `https://router.project-osrm.org/route/v1/foot/${start};${end}?overview=full&geometries=geojson`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
            const routeData = data.routes[0];
            
            // Calcul réaliste (75m / min)
            const distanceMetres = routeData.distance;
            const finalMin = Math.round(distanceMetres / 75) || 1;
            const finalDist = distanceMetres > 1000 
                ? (distanceMetres / 1000).toFixed(2) + " km" 
                : Math.round(distanceMetres) + " m";

            // --- MISE À JOUR DU POPUP ---
            const popup = marker.getPopup();
            if (popup) {
                let content = popup.getContent();

                // Si le contenu est du texte, on le traite
                if (typeof content === 'string') {
                    const newInfo = `🚶‍♂️ <b>${finalMin} min</b> (${finalDist})`;
                    // On remplace la div de chargement par le vrai résultat
                    content = content.replace(
                        '<div class="walking-info">⌛ Calcul du trajet à pied...</div>', 
                        `<div class="walking-info">${newInfo}</div>`
                    );
                    marker.setPopupContent(content);
                }
            }

            // Dessin du tracé
            L.geoJSON(routeData.geometry, {
                style: { color: '#3388ff', weight: 6, opacity: 0.8, dashArray: '10, 15' }
            }).addTo(this.layers.walking);

            // Ajustement de la vue
            const bounds = L.latLngBounds([
                [this.lastPosition.coords.latitude, this.lastPosition.coords.longitude],
                [stopCoords.lat, stopCoords.lon]
            ]);
            this.map.flyToBounds(bounds, { padding: [100, 100], duration: 1.5 });
        }
    } catch (error) {
        console.error("Erreur itinéraire OSRM :", error);
    }
}

}

export { Geo };