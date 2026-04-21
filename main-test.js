//Gestion du bouton d'installation
import {Install} from './inc/install.js'
Install()
// end install

//sélection des éléments HTML
const $mapBox = document.querySelector('#map')
const $geoSwitch = document.querySelector('.geo-btn')

//Création de deux variables globales accessibles de partout
var map = false
let geo = false

//Méthodes

// Méthode d"initialisation de l'app. Elle tente de géolocaliser l'user. Si pas les droits, on afficle la carte centrée sur le point par défaut : le Cepegra
const init = () => {
    navigator.permissions.query({name:'geolocation'})
    .then(result => {
        console.log(result.state)
        if (result.state === 'granted') {
            //Ajout d'une class sur le bouton "Me géolocaliser" si les droits sont OK
            $geoSwitch.classList.add('hidden')
            geo = true
            //createMap()
            const options = {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
            navigator.geolocation.getCurrentPosition(createMap, errorPosition, options)
        }
        else {
            console.log('pas autorisé')
            let position = {
                coords: {}
            }
            position.coords.latitude = 50.05597490916252
            position.coords.longitude = 4.491863482729571
            createMap(position)
        }
    })
 }
init()


const createMap = (position) => {
    //si la carte paar défaut est affichée, la supprimer
    if(map) {
        map.remove()
    }

    //console.log("createMap",position)
    // Afficher la div id="carte"
    $mapBox.classList.remove('hidde')
    //return
    // ajouter la carte dans la div#map centrée sur les coordonnées reçues dans "position"
    map = L.map($mapBox).setView([position.coords.latitude, position.coords.longitude], 17)
    // Choisir le layer standard (on peut avoir le satelite ou autre)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Cepegra - 2024' //Auteur de la carte
    }).addTo(map)
 }

 // Quand on clique sur le bouton "Me géolocaliser"
$geoSwitch.addEventListener('click', e => {
    e.preventDefault()
    // On déclenche la méthode geoLoc
    geoLoc()
})

// Méthode d"clenchée si erreur de géolocalisation
const errorPosition = (err) => {
    console.warn('ERROR(' + err.code + '): ' + err.message);
}

// Méthode pour géolocaliser l'utilisateur
const geoLoc = () => {
    navigator.permissions.query({name:'geolocation'})
          .then(result => {
            // si l'user a déjà accepté
            if (result.state === 'granted') {
                geo = true
                //createMap()
                //option (GPS, valide mise en cache refusée car 0, 5 sec max pour arriver à géolocaliser avant une erreur  )
                const options = {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
                navigator.geolocation.getCurrentPosition(createMap, errorPosition, options)
                // Si la demande est acceptée
            } else if (result.state === 'prompt') {
                const options = {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
                }
                navigator.geolocation.getCurrentPosition(createMap, errorPosition, options)
             } 
             else if(result.state === 'denied'){
                // si il refuse
                console.log('pas autorisé')
            }
            //console.log(result.state);
            })
}

