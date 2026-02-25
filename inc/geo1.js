//object général de la géolocalisation
/*
Objet Geo : 
- constructor : 
    - défini l'url de notre API
    - défini toutes les propriétés
    - défini les paramètres de localisation
    - défini les icônes de la map
- init() :
    - initialisa la géolocalisation
    - appelle la méthode createMap() ou errorPosition()
    - si pas les droits, utilise des corrdonnées imposées et appelle createMap()
- createMap() : 
    - récupère la position issue de init()
    - redirige l'user vers carte.html si besoin
    - supprime une carte déjà mise en place
    - retire la classe hidde à la div #map
    - Ajoute la carte à la div #map, zoom 17
    - Ajoute un marker avec la position de l'user
    - Défini le layer de la carte
    - Ajoute un copyright personalisé
    - Appelle loadstops() pour affciher les arrêts de bus
- loadstops() :
    - recupère la position de l'user
    - lance un request sur l'API des tecs en passant position de l'user et rayon de recherche en km
    - récupère liste des arrêts de bus
    - si arrêts, ajoute un marker par arrêt sur la carte
    - ajoute un event click par marker
        - lance request sur notre API avec l'ID de l'arrêt
        - si "pas ok", ajoute le texte d'erreur de bus au marker
        - si "ok" pour chaque bus, on ajoute un lien avec la route_id dans le marker
    - ajoute les liens dans 1 tableau markersLinks (Array)
    - pour chaque lien, add event click
        - récupère l'id_shape du bus
        - lance request sur notre api 
            - récupérer les points de passage du bus dans dataLenght
        - supprimer un trajet si il y en a un
        - retire tous les markers éventuels sauf le user
        - récupère le premier point pour créer un marker "Départ"
        - récupère le dernier point pour créer un marker "Arrivée"
        -  calcul long et lat moyenne de tous les points
        - dezoome la map pour afficher tout le trajet
        - crée une ligne avec tous les points sur la map
    - si pas d'arrêts, affiche la box d'erreur
-errorPosition() :
    - affiche un message dans la console
    - .....
-geoLoc() :
    - geolocalise l'user



*/
class Geo {
    constructor($mapBox, $geoSwitch) {
        //url api si dev ou prod
         this.urlApi = (window.location.href  != 'https://teconme.netlify.app/carte.html') ? 'http://localhost/api_bootcamp' : 'https://cepegra-frontend.xyz/bootcamp'
         // Neuville
         this.urlApi = 'https://cepegra-frontend.xyz/bootcamp'
        //récup des éléments HTML
        this.$geoSwitch = $geoSwitch
        this.$mapBox = $mapBox
        //Mémorisera la carte
        this.map = false
        //Mémorisera la dernière position de l'user
        this.lastPosition = false
        //Mémorise un layer
        this.layer = false
        //setting les lines sur la carte
        this.mapElms = {polyLineRef: null}
        // receptacle pour tous les markers
        this.markers = []
        //Est-on géolocalisé ?
        this.geo = false
        //Rayon pour chercher les bus stops (en km)
        this.distance = 1
        //Option de géolocalisation
        this.optionsMap = {
            //Activation du GPS précis
            enableHighAccuracy: true,
            //5 secondes pour y arriver, sinon erreur
            timeout: 5000,
            //On ne met pas la position en cache
            maximumAge: 0
            }
        // définition des icônes à utliser pour les markers
        this.myIcon = L.icon({
            iconUrl: './icons/icon-map-bus-stop.svg',
            iconSize: [53, 53],
            iconAnchor: [16, 55],
            popupAnchor: [10, -37],
            shadowUrl: '',
            shadowSize: [80, 80],
            shadowAnchor: [22, 94]
        })
        this.startIcon = L.icon({
            iconUrl: './icons/icon-map-bus-start.svg',
            iconSize: [53, 53],
            iconAnchor: [16, 55],
            popupAnchor: [10, -37],
            shadowUrl: '',
            shadowSize: [80, 80],
            shadowAnchor: [22, 94]
        })
        this.endIcon = L.icon({
            iconUrl: './icons/icon-map-bus-end.svg',
            iconSize: [53, 53],
            iconAnchor: [16, 55],
            popupAnchor: [10, -37],
            shadowUrl: '',
            shadowSize: [80, 80],
            shadowAnchor: [22, 94]
        })
        this.currentIcon = L.icon({
            iconUrl: './icons/icon-map-user-location.svg',
            iconSize: [53, 53],
            iconAnchor: [16, 55],
            popupAnchor: [10, -37],
            shadowUrl: '',
            shadowSize: [80, 80],
            shadowAnchor: [22, 94]
        })
    }
    //Métode pour changer la distance
    setDistance = (newDistance) => {
        this.distance = newDistance;
        // On peut relancer la recherche automatiquement si on a déjà une position
        if (this.lastPosition) {
            this.loadStops(this.lastPosition);
        }
    }
    //Méthode d'initialisation de la géolocalisation
    init = () => {
      //demande de l'autorisation
        navigator.permissions.query({name:'geolocation'})
        .then(result => {
            console.log(result.state)
            // si on a les droits
            if (result.state === 'granted') {
                //Ajout d'une class sur le bouton "Me géolocaliser" si les droits sont OK
                //this.$geoSwitch.classList.add('hidden')
                // on change le switch
                this.geo = true
                
                // géolocaliser l'user et déclencher createMap si position reçue / errorPosition sinon
                navigator.geolocation.getCurrentPosition(this.createMap, this.errorPosition, this.optionsMap)
            }
            //si pas les droits
            else {
                console.log('pas autorisé')
                //création d' un objet
                let position = {
                    coords: {}
                }
                //valeurs en dur
                // stops dispos
                position.coords.latitude = 50.05597490916252
                position.coords.longitude = 4.491863482729571
                /* stops non dispos */
                position.coords.latitude = 50.112673
                position.coords.longitude = 4.418669
               // création de la carte
                this.createMap(position)
            }
        })
    } // end init

    //création de la carte autour de la position
    createMap = (position) => {
        //tes de l'url
        let url = new URL(window.location.href)
        //rediriger vers carte.html si besoin
        if(url.pathname != "/carte.html") {
            window.location.href = "carte.html"
        }
        //si la carte par défaut est affichée, la supprimer
        if (this.map) {
            this.map.remove()
        }
        // Afficher la div id="carte"
        this.$mapBox.classList.remove('hidde')
       
        // ajouter la carte dans la div#map centrée sur les coordonnées reçues dans "position"
        this.map = L.map(this.$mapBox).setView([position.coords.latitude, position.coords.longitude], 17)
        L.marker([position.coords.latitude, position.coords.longitude], {icon:this.currentIcon}).addTo(this.map)
        // ajoute un calque sur la carte
        this.layer = L.layerGroup().addTo(this.map);

        // Choisir le layer désiré (on peut avoir le satelite ou autre)
        //carte vue satelite
        var imageUrl = 'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        // carte standard
        var imageUrl2 = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        // carte source Belge
        var imageBel = "https://tile.openstreetmap.be/osmbe/{z}/{x}/{y}.png"
        // carte avec lignes des bus
        var imageUrl3 = "https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=f5a6d9a8d3484637b41037978e6e1e7b"
        // ajout de la carte choisie
        L.tileLayer(imageUrl3, {
            attribution: 'Cepegra - 2026' //Auteur de la carte
        }).addTo(this.map)

        //Appel de la fonction de recherche des arrêts de bus
        this.loadStops(position)

        //click sur la carte pour trouver des arrêts de bus dans le coin
        this.map.on('click', (e) => {
            //si un trajet est déjà affiché
            //recupération coordonnées du click
            let clickCoords = e.latlng
            let position = {
                coords: {
                    latitude: clickCoords.lat,
                    longitude: clickCoords.lng
                }
            }
            // il y a un trajet ?
            if(this.mapElms.polyLineRef){
                //on élminie tous ses points
                this.mapElms.polyLineRef.removeFrom(this.map)
                // on élimine tous les markers marker par marker
                this.markers.forEach(marker => {
                   this.map.removeLayer(marker)
                })
             }
             //appel des arrêts de bus dans le coin du click
             this.loadStops(position)
        })
     }// end createMap

     //recherche des arrêts TEC
     loadStops = (position) => {
        //netoyyer le layer
        this.layer.clearLayers()

        //requête sur l'API des Tec en passant les coordonnées et la distance
        //fetch(`https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/poteaux-tec/records?where=within_distance(geo_point_2d%2C%20geom%27POINT(${position.coords.longitude}%20${position.coords.latitude})%27%2C%20${this.distance}km)&limit=20&lang=fr`)
        fetch(`https://www.odwb.be/api/explore/v2.1/catalog/datasets/le-tec-arrets-bus/records?limit=100&where=within_distance(coordinates, geom'POINT(${position.coords.longitude}%20${position.coords.latitude})', ${this.distance}km)`)
            .then(resp => resp.json())
            .then(resp => {
                // recup des arrêts
                let stopsList = resp.results
                alert(stopsList.length+"/"+resp.total_count)
                //si y a des arrêts
                if(stopsList.length > 0) {
                    //pour chaque arrêt
                    stopsList.forEach(el => {
                        //ajout d'un marker + icone
                        let marker = L.marker([el.coordinates.lat, el.coordinates.lon], {icon:this.myIcon}).addTo(this.layer)
                        // si on clique sur l'arrêt
                        .on('click', (map) => {
                            const myMap = map
                            
                            //appel de notre api en passant le nom de l'arrêt pour récupérer les bus y passant
                            fetch(this.urlApi+'/bus/'+el.stop_name+'/'+el.coordinates.lon)
                            .then((response) => response.json())
                            .then((data) => {
                                
                            //définition d'un modèle vide
                            let template = ''
                            // si pas de bus
                            if(data.code == "pas ok") {
                                // contenu de pop-up
                                marker.bindPopup(`<h4 data-id="${el.stop_name}">${el.stop_nane}</h4><p class="error">Pas de bus renseigné</p>`).openPopup()
                            } 
                            // si il y a des bus
                            else {
                                // pour chaque bus
                                data.content.forEach(item => {
                                    // si on a une route pour le bus
                                    if (item.route_id != null) {
                                        //on ajoute un lien avec une classe marker-link pour ce bus dans le template
                                        template += `<a href="#" class="marker-link" data-id="${item['route_id']}" data-shape="${item['shape_id']}">${item['route_short_name']} - ${item['route_long_name']}</a><br>`
                                    }
                                })
                                //on insère le template dans le pop-up
                                marker.bindPopup(`<h4 data-id="${el.stop_name}">${el.stop_name}</h4>`+template).openPopup()

                                //console.log(template)
                                //Sélection de tous les liens des pop-up
                                let markersLinks = document.getElementsByClassName('marker-link')
                                // on en fait un Array
                                markersLinks = [ ...markersLinks]
                                //console.log(markersLinks[0])
                                // pour chaque liens, on récupère le marker
                                Array.prototype.forEach.call(markersLinks, (marker) => {
                                    //console.log(marker)
                                    // quand on clique sur le marker
                                    marker.addEventListener('click', e => {
                                        e.preventDefault()
                                        // recup de l'ID du trajet
                                        const id_shape = e.target.dataset.shape
                                        console.log(e.target.dataset.shape)
                                        // appel à notre api pour récupérer tous les points du trajet
                                        fetch(this.urlApi+'/shapes/'+id_shape)
                                        .then(res => res.json())
                                        .then(res => {
                                            //console.log(res)
                                           
                                            let data = res.content
                                            // récupération des points
                                            const dataPositions = data.map(el => [el.shape_pt_lat, el.shape_pt_lon])
                                            let dataLenght = data.length
                                            // si il y a des points
                                            if(res.content.length > 0) {
                                                // si un trajet est déjà affiché
                                                if(this.mapElms.polyLineRef){
                                                    //on élminie tous ses points
                                                    this.mapElms.polyLineRef.removeFrom(this.layer)
                                                    // on élimine tous les markers marker par marker
                                                    this.markers.forEach(marker => {
                                                       this.map.removeLayer(marker)
                                                    })
                                                    }
                                                //on ajoute la premier marker avec l'icone start + texte Départ dans pop-up
                                                let marker = L.marker([data[0].shape_pt_lat,data[0].shape_pt_lon], {icon:this.startIcon}).addTo(this.layer)
                                                .bindPopup('Départ')
                                                //pousse le marker dans l'array
                                                this.markers.push(marker)
                                                //ajout du dernier marker avec l'icone end + texte Arrivée
                                                marker = L.marker([data[dataLenght-1].shape_pt_lat,data[dataLenght-1].shape_pt_lon], {icon:this.endIcon}).addTo(this.layer)
                                                .bindPopup('Arrivée')
                                                //pousse le marker dans l'array
                                                this.markers.push(marker)
                                                // Adapter le zoom et centrer la carte pour afficher tout le trajet
                                                // Calculer la latitude moyenne
                                                let latMedium = (parseFloat(data[0].shape_pt_lat) + parseFloat(data[dataLenght-1].shape_pt_lat))/2
                                                // Calculer la longitude moyenne
                                                let longMedium = (parseFloat(data[0].shape_pt_lon) + parseFloat(data[dataLenght-1].shape_pt_lon))/2
                                                //console.log('latitudeMedium', latMedium)

                                                // adapter la carte à  ces moyennes
                                                this.map.flyTo([latMedium,longMedium],11)
                                                // ajouter le trajet en rouge en utilisant tous les points de dataPositions
                                                this.mapElms.polyLineRef = L.polyline(dataPositions,{color: 'red', weight: 13}
                                                ).addTo(this.layer)


                                            }
                                        })
                                    })
                                
                                })
                                //end click links
                            }
                            })
                         
                        
                            .catch((error) => console.error(error))
                        })
                        
                    })
                } else {
                    //Si pas d'arrêt dans le coin, on affiche la boxe alerte
                    document.querySelector('.box-alert').classList.remove('hidden')
                }
             })
             //si error de communication avec l'API
             .catch(err => alert(err.message))
     }

// Méthode déclenchée si erreur de géolocalisation
    errorPosition = (err) => {
        console.warn('ERROR(' + err.code + '): ' + err.message);
    } //end errorPosition

    
    // Méthode pour demander les autorisations de géolocalisation
    geoLoc = () => {
        navigator.permissions.query({name:'geolocation'})
              .then(result => {
                // si l'user a déjà accepté
                if (result.state === 'granted') {
                    this.geo = true
                    //createMap()
                    //option (GPS, valide mise en cache refusée car 0, 5 sec max pour arriver à géolocaliser avant une erreur  )
                   
                    navigator.geolocation.getCurrentPosition(this.createMap, this.errorPosition, this.optionsMaps)
                    // Si la demande est acceptée
                    
                } else if (result.state === 'prompt') {
                    
                    navigator.geolocation.getCurrentPosition(this.createMap, this.errorPosition, this.optionsMap)
                    
                 } 
                 else if(result.state === 'denied'){
                    // si il refuse
                    console.log('pas autorisé')
                }
                //console.log(result.state);
                })
    }
}
//export de l'Object
export {Geo}
