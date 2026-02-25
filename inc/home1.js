//gestion de la géolocalisation
import {Geo} from './geo.js'


//sélection du formulaire
const $geoSwitch = document.querySelector('.gps_form')


//myGeo.init()

     // Quand on clique sur le bouton "Me géolocaliser"
     $geoSwitch.addEventListener('submit', e => {
        e.preventDefault()
        // On déclenche la méthode geoLoc si bon button rado
        if($geoSwitch.querySelector('input[name="localisation"]:checked').value == 'y') {
            //appelle l'objet de gélocalisation
            const myGeo = new Geo("", $geoSwitch)
            //déclenchement de la géolocalisation et redirection vers carte.html
            myGeo.geoLoc()
        } else {
            // redirection vers carte.html
        window.location.href = "carte.html"
        }
    })
