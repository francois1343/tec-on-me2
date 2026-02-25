// gestion de la carte
import {Geo} from './inc/geo.js'
//Gestion du bouton d'installation

//gestion des fermetures des boxes
import boxClose from './inc/box.js'
//lance le process d'installation de l'app

// end install

//sélection des éléments HTML
const $mapBox = document.querySelector('#map')
const $geoSwitch = document.querySelector('.geo-btn')

const myGeo = new Geo($mapBox, $geoSwitch)
myGeo.init()
// Gestion du curseur de distance
const $distanceRange = document.querySelector('#distance');

$distanceRange.addEventListener('input', (e) => {
    const km = e.target.value;
    console.log(`Nouvelle distance de recherche : ${km} km`);
    
    // On met à jour la propriété dans l'objet Geo
    myGeo.setDistance(km);
});


// Quand on clique sur le bouton "Me géolocaliser" A FINIR
$geoSwitch.addEventListener('click', e => {
e.preventDefault()
alert('geo')
// On déclenche la méthode geoLoc
myGeo.init()
})

// délenche la gestion de fermetures des boxes
boxClose()