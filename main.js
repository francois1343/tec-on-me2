// --- 1. IMPORTATIONS ---
// On importe la classe qui gère la carte et la logique de fermeture des boîtes
import { Geo } from './inc/geo.js';
import boxClose from './inc/box.js';

// --- 2. SÉLECTION DES ÉLÉMENTS HTML ---
const $mapBox = document.querySelector('#map');      // La zone où s'affiche la carte
const $geoBtn = document.querySelector('.geo-btn');   // Le bouton pour se relocaliser
const $distanceRange = document.querySelector('#distance'); // Le curseur (range)

// --- 3. INITIALISATION ---
// On crée l'instance de l'objet Geo
const myGeo = new Geo($mapBox, $geoBtn);

// On lance la carte immédiatement au chargement de la page
// (init() gère soit le GPS, soit la position par défaut si refusé)
// main.js

// On regarde si on vient de la page index avec "?localisation=n"
const urlParams = new URLSearchParams(window.location.search);
const localisationParam = urlParams.get('localisation');

if (localisationParam === 'n') {
    // L'utilisateur a choisi "Adresse par défaut"
    myGeo._fallbackPosition(); 
} else {
    // Par défaut, ou si 'y', on tente le GPS
    myGeo.init();
}

// Active la gestion des clics sur les boutons "fermer" des alertes/modales
boxClose();

// --- 4. ÉCOUTEURS D'ÉVÉNEMENTS (INTERACTIONS) ---

/**
 * Gestion du curseur de distance
 * 'change' est souvent préférable à 'input' pour ne pas harceler l'API à chaque millimètre,
 * mais 'input' est plus fluide visuellement.
 */
$distanceRange.addEventListener('input', (e) => {
    const km = e.target.value;
    
    // 1. Mise à jour du texte (si tu as un élément pour l'afficher)
    const $distDisplay = document.querySelector('#distance-value');
    if ($distDisplay) $distDisplay.textContent = `${km} km`;

    // 2. Mise à jour de la variable dans l'objet Geo
    myGeo.setDistance(km);

    // 3. RELANCER LA RECHERCHE
    // On utilise la dernière position connue stockée dans myGeo
    if (myGeo.lastPosition) {
        myGeo.loadStops(myGeo.lastPosition);
    }
});

/**
 * Bouton "Me géolocaliser"
 * Permet de recentrer la carte sur l'utilisateur à la demande
 */
$geoBtn.addEventListener('click', (e) => {
    e.preventDefault();
    
    // On affiche un petit retour visuel (optionnel)
    console.log("Relocalisation en cours...");
    
    // On relance l'initialisation complète
    myGeo.init();
});