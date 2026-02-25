/**
 * =============================================================================
 * TABLE DES MATIÈRES
 * =============================================================================
 * 1. CONSTRUCTEUR & CONFIGURATION ........ Initialisation et état global
 * 2. GESTION DES ICÔNES .................. Création des marqueurs personnalisés
 * 3. SYSTÈME DE GÉOLOCALISATION .......... GPS, Permissions et Secours
 * 4. MOTEUR DE CARTE (LEAFLET) ........... Création et gestion des calques
 * 5. CHARGEMENT DES DONNÉES (API) ........ Récupération des arrêts (ODWB)
 * 6. RENDU ET POPUPS ..................... Affichage des marqueurs et bus
 * 7. ITINÉRAIRES (ROUTE & WALKING) ....... Tracés bus (Red) et piéton (Blue)
 * =============================================================================
 */

class Geo {
    /**
     * 1. CONSTRUCTEUR & CONFIGURATION
     * Prépare les variables de base dont l'application a besoin pour fonctionner.
     */
    constructor($mapBox, $geoSwitch) {
        // L'adresse de notre serveur qui contient les données des lignes de bus
        this.urlApi = 'https://cepegra-frontend.xyz/bootcamp';
        
        // Références aux éléments HTML (la div de la carte et le bouton)
        this.$mapBox = $mapBox;
        this.$geoSwitch = $geoSwitch;
        
        // État de l'application : on stocke la carte et la distance de recherche
        this.map = null;          // Contiendra l'objet Leaflet une fois créé
        this.distance = 1;        // Rayon de recherche par défaut (1km)
        this.lastPosition = null; // Stocke les dernières coordonnées pour les calculs
        
        // --- LES CALQUES (LAYER GROUPS) ---
        // On crée des "tiroirs" pour ranger nos éléments.
        // Cela permet de vider un tiroir (ex: les arrêts) sans effacer la carte elle-même.
        this.layers = {
            stops: L.layerGroup(),   // Pour les icônes d'arrêts de bus
            route: L.layerGroup(),   // Pour le tracé rouge du bus
            walking: L.layerGroup()  // Pour le tracé bleu de la marche à pied
        };

        // Écouteur global pour les lignes de bus (Délégation d'événement)
        // On écoute la zone de la carte : si on clique sur un lien avec la classe 'bus-link', on trace la ligne.
        this.$mapBox.addEventListener('click', (e) => {
            if (e.target.classList.contains('bus-link')) {
                e.preventDefault();
                this.drawRoute(e.target.dataset.shape);
            }
        });

        // Options pour la précision du GPS
        this.optionsMap = { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 };
        
        // On lance la préparation des images des marqueurs
        this._initIcons();
    }

    /**
     * 2. GESTION DES ICÔNES
     * Définit l'apparence des marqueurs sur la carte (taille, point d'ancrage).
     */
    _initIcons() {
        const configCommune = {
            iconSize: [53, 53],    // Taille de l'image en pixels
            iconAnchor: [26, 53],  // Le point de l'image qui "touche" la coordonnée (le bas milieu)
            popupAnchor: [0, -50]  // Où la bulle d'info s'affiche par rapport au marqueur
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
     * 3. SYSTÈME DE GÉOLOCALISATION
     * Gère la demande d'autorisation et récupère la position de l'utilisateur.
     */
    async init() {
        try {
            // On vérifie si l'utilisateur a déjà donné sa permission
            const result = await navigator.permissions.query({ name: 'geolocation' });
            
            if (result.state === 'granted' || result.state === 'prompt') {
                // Si autorisé, on demande la position précise au navigateur
                navigator.geolocation.getCurrentPosition(
                    (pos) => this.createMap(pos), // Succès
                    (err) => this.errorPosition(err), // Erreur
                    this.optionsMap
                );
            } else {
                // Si refusé, on utilise la position de secours
                this._fallbackPosition();
            }
        } catch (error) {
            this._fallbackPosition();
        }
    }

    // Position par défaut (Neuville) si le GPS est inaccessible
    _fallbackPosition() {
        const dummyPos = { coords: { latitude: 50.112673, longitude: 4.418669 } };
        this.createMap(dummyPos);
    }

    // Affiche une erreur dans la console si le GPS échoue
    errorPosition(err) {
        console.warn(`Erreur de localisation (${err.code}): ${err.message}`);
    }

    // Permet de changer le rayon de recherche (ex: via le curseur range)
    setDistance(km) {
        this.distance = km;
    }

    /**
     * 4. MOTEUR DE CARTE (LEAFLET)
     * Affiche la carte et configure les interactions de base.
     */
    createMap(position) {
        const { latitude, longitude } = position.coords;

        // Si une carte existe déjà, on la supprime pour éviter les bugs visuels
        if (this.map) this.map.remove();

        // On affiche la zone de la carte et on initialise Leaflet centrée sur nous
        this.$mapBox.classList.remove('hidde');
        this.map = L.map(this.$mapBox).setView([latitude, longitude], 17);

        // On ajoute le "fond de carte" (les images des rues)
        L.tileLayer("https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=f5a6d9a8d3484637b41037978e6e1e7b", {
            attribution: '© OpenStreetMap - TEC'
        }).addTo(this.map);

        // On active nos "tiroirs" (calques) sur la carte
        this.layers.stops.addTo(this.map);
        this.layers.route.addTo(this.map);
        this.layers.walking.addTo(this.map);

        // Marqueur fixe pour notre position initiale
        L.marker([latitude, longitude], { icon: this.icons.user }).addTo(this.map);

        // On charge les arrêts autour de nous
        this.loadStops(position);

        // Événement : Si on clique sur la carte, on relance une recherche à cet endroit
        this.map.on('click', (e) => {
            this.layers.route.clearLayers(); // On efface le bus précédent
            this.loadStops({ coords: { latitude: e.latlng.lat, longitude: e.latlng.lng } });
        });
    }

    /**
     * 5. CHARGEMENT DES DONNÉES (API)
     * Va chercher les arrêts de bus TEC réels via l'Open Data Wallonie-Bruxelles.
     */
    async loadStops(position) {
        this.lastPosition = position; // Sauvegarde pour les calculs d'itinéraires piétons
        
        // Nettoyage avant de charger de nouveaux points
        this.layers.stops.clearLayers();
        
        // On place un marqueur "cible" là où on a cliqué
        L.marker([position.coords.latitude, position.coords.longitude], { icon: this.icons.userClick }).addTo(this.layers.stops);
        
        const { latitude, longitude } = position.coords;

        try {
            // URL complexe qui demande : "donne moi les arrêts dans un rayon de X km autour de ce point"
            const url = `https://www.odwb.be/api/explore/v2.1/catalog/datasets/le-tec-arrets-bus/records?limit=100&where=within_distance(coordinates, geom'POINT(${longitude} ${latitude})', ${this.distance}km)&order_by=distance(coordinates, geom'POINT(${longitude} ${latitude})')`;
            
            const response = await fetch(url);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                // Pour chaque arrêt trouvé par l'API, on crée son marqueur
                data.results.forEach(stop => this._renderStopMarker(stop));
            } else {
                // Si aucun arrêt, on affiche notre message d'alerte HTML
                document.querySelector('.box-alert').classList.remove('hidden');
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des arrêts :", error);
        }
    }

    /**
     * 6. RENDU ET POPUPS
     * Crée physiquement les icônes d'arrêts et gère le contenu de la bulle d'info.
     */
    _renderStopMarker(stop) {
        // Calcul de distance "vol d'oiseau" entre nous et l'arrêt
        const stopPos = L.latLng(stop.coordinates.lat, stop.coordinates.lon);
        const userPos = L.latLng(this.lastPosition.coords.latitude, this.lastPosition.coords.longitude);
        const distance = userPos.distanceTo(stopPos);
        const distText = distance > 1000 ? (distance / 1000).toFixed(1) + " km" : Math.round(distance) + " m";

        // Ajout du marqueur d'arrêt dans le bon tiroir
        const marker = L.marker([stop.coordinates.lat, stop.coordinates.lon], { icon: this.icons.stop })
            .addTo(this.layers.stops);

        // Quand on clique sur un arrêt
        marker.on('click', async () => {
            // 1. On interroge notre API locale pour savoir quels bus passent ici
            const response = await fetch(`${this.urlApi}/bus/${stop.stop_name}/${stop.coordinates.lon}`);
            const data = await response.json();
            
            let busHtml = "";
            if (data.code === "ok") {
                // On boucle sur chaque bus pour créer un lien cliquable
                data.content.forEach(bus => {
                    if (bus.route_id) {
                        busHtml += `<a href="#" class="bus-link" data-shape="${bus.shape_id}">${bus.route_short_name} - ${bus.route_long_name}</a><br>`;
                    }
                });
            } else {
                busHtml = `<p class="error">Aucun bus renseigné ici</p>`;
            }

            // 2. On prépare le contenu HTML de la popup
            const fullContent = `
                <h4>${stop.stop_name}</h4>
                <p>📍 À ${distText} (vol d'oiseau)</p>
                <div class="walking-info">⌛ Calcul du trajet à pied...</div>
                <hr>
                ${busHtml}
            `;

            // 3. On configure et on ouvre la popup
            marker.bindPopup(fullContent, {
                autoPan: false,
                closeOnClick: true,
                className: 'fixed-header-popup'
            }).openPopup();

            // 4. On lance en arrière-plan le calcul du vrai chemin à pied
            this.getWalkingRoute(stop.coordinates, marker);
        });
    }

    /**
     * 7. ITINÉRAIRES (ROUTE & WALKING)
     * Dessine les lignes sur la carte (Bus en rouge, Marche en bleu).
     */
    
    // Trace le parcours complet d'une ligne de bus (depuis notre API)
    async drawRoute(shapeId) {
        this.layers.route.clearLayers(); // On efface le trajet précédent

        try {
            const response = await fetch(`${this.urlApi}/shapes/${shapeId}`);
            const data = await response.json();

            if (data.content && data.content.length > 0) {
                // Transformation des points API en coordonnées Leaflet
                const points = data.content.map(p => [p.shape_pt_lat, p.shape_pt_lon]);
                
                // Dessin de la ligne rouge
                L.polyline(points, { color: 'red', weight: 8, opacity: 0.7 }).addTo(this.layers.route);
                
                // Icônes de départ et d'arrivée du bus
                L.marker(points[0], { icon: this.icons.start }).bindPopup('Départ du bus').addTo(this.layers.route);
                L.marker(points[points.length - 1], { icon: this.icons.end }).bindPopup('Terminus').addTo(this.layers.route);

                // On ajuste la vue pour voir toute la ligne de bus
                this.map.flyToBounds(points, { padding: [50, 50] });
            }
        } catch (error) {
            console.error("Erreur lors du tracé du trajet :", error);
        }
    }

    // Calcule le chemin piéton via l'API OSRM
    async getWalkingRoute(stopCoords, marker) {
        this.layers.walking.clearLayers(); // Efface l'ancien chemin bleu

        const start = `${this.lastPosition.coords.longitude},${this.lastPosition.coords.latitude}`;
        const end = `${stopCoords.lon},${stopCoords.lat}`;
        const url = `https://router.project-osrm.org/route/v1/foot/${start};${end}?overview=full&geometries=geojson`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const routeData = data.routes[0];
                
                // Calcul du temps réaliste (75 mètres par minute)
                const distanceMetres = routeData.distance;
                const finalMin = Math.round(distanceMetres / 75) || 1;
                const finalDist = distanceMetres > 1000 
                    ? (distanceMetres / 1000).toFixed(2) + " km" 
                    : Math.round(distanceMetres) + " m";

                // MISE À JOUR DYNAMIQUE : On remplace le texte "⌛ Calcul..." par le vrai temps
                const popup = marker.getPopup();
                if (popup) {
                    let content = popup.getContent();
                    if (typeof content === 'string') {
                        const newInfo = `🚶‍♂️ <b>${finalMin} min</b> (${finalDist})`;
                        content = content.replace(
                            '<div class="walking-info">⌛ Calcul du trajet à pied...</div>', 
                            `<div class="walking-info">${newInfo}</div>`
                        );
                        marker.setPopupContent(content);
                    }
                }

                // Dessin du tracé bleu en pointillés
                L.geoJSON(routeData.geometry, {
                    style: { color: '#3388ff', weight: 6, opacity: 0.8, dashArray: '10, 15' }
                }).addTo(this.layers.walking);
            }
        } catch (error) {
            console.error("Erreur itinéraire OSRM :", error);
        }
    }
}

export { Geo };