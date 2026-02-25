/**
 * =============================================================================
 * TABLE DES MATIÈRES : main.js
 * =============================================================================
 * 1. IMPORTATIONS ........................ Modules et composants externes
 * 2. SÉLECTION DES ÉLÉMENTS HTML ......... Récupération des objets du DOM
 * 3. INITIALISATION & LOGIQUE D'ENTRÉE ... Lancement de l'app selon l'URL
 * 4. ÉCOUTEURS D'ÉVÉNEMENTS .............. Interactions utilisateur (Range, GPS)
 * =============================================================================
 */

// --- 1. IMPORTATIONS ---
// On importe la "classe" Geo (notre moteur de carte) et la fonction pour fermer les fenêtres
import { Geo } from './inc/geo.js';
import boxClose from './inc/box.js';

// --- 2. SÉLECTION DES ÉLÉMENTS HTML ---
// On crée des constantes pour manipuler les éléments de notre page HTML
const $mapBox = document.querySelector('#map');            // La zone où s'affiche la carte
const $geoBtn = document.querySelector('.geo-btn');         // Le bouton pour se relocaliser
const $distanceRange = document.querySelector('#distance'); // Le curseur pour le rayon (km)

// --- 3. INITIALISATION ---
// On crée l'instance de l'objet Geo (on prépare la machine)
const myGeo = new Geo($mapBox, $geoBtn);

/**
 * LOGIQUE DE DÉMARRAGE :
 * On analyse l'adresse URL pour savoir si l'utilisateur a choisi 
 * la géolocalisation ou l'adresse par défaut sur la page d'accueil.
 */
const urlParams = new URLSearchParams(window.location.search);
const localisationParam = urlParams.get('localisation');

if (localisationParam === 'n') {
    // Cas "n" (Non) : L'utilisateur a choisi "Adresse par défaut"
    // On force la position sur Neuville sans demander le GPS
    myGeo._fallbackPosition(); 
} else {
    // Cas "y" (Yes) ou lien direct : On tente d'utiliser le GPS réel
    // init() vérifiera les permissions du navigateur
    myGeo.init();
}

// On active la petite croix (X) sur toutes nos fenêtres d'alertes
boxClose();


// --- 4. ÉCOUTEURS D'ÉVÉNEMENTS (INTERACTIONS) ---

/**
 * GESTION DU CURSEUR DE DISTANCE
 * Permet de mettre à jour la recherche quand on bouge le curseur.
 * L'événement 'input' réagit pendant que l'on glisse.
 */
$distanceRange.addEventListener('input', (e) => {
    // On récupère la valeur du curseur (1, 2, 5... km)
    const km = e.target.value;
    
    // 1. Mise à jour du texte indicateur dans le HTML (si présent)
    const $distDisplay = document.querySelector('#distance-value');
    if ($distDisplay) $distDisplay.textContent = `${km} km`;

    // 2. On informe notre objet "myGeo" que la distance a changé
    myGeo.setDistance(km);

    // 3. RELANCER LA RECHERCHE AUTOMATIQUEMENT
    // Si on a déjà une position, on demande à la carte de recharger les arrêts
    if (myGeo.lastPosition) {
        myGeo.loadStops(myGeo.lastPosition);
    }
});

/**
 * BOUTON "ME GÉOLOCALISER"
 * Permet de recentrer la carte sur sa position réelle à n'importe quel moment.
 */
$geoBtn.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Petit message de debug pour confirmer le clic
    console.log("Demande de relocalisation GPS...");
    
    // On relance la procédure complète de localisation
    myGeo.init();
});