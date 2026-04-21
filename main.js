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
const $mapBox = document.querySelector('#map');            // La zone où s'affiche la carte      // Le bouton pour se relocaliser

// --- 3. INITIALISATION ---
// On crée l'instance de l'objet Geo (on prépare la machine)
const myGeo = new Geo($mapBox);

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
