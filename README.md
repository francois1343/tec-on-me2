# 🚌 Tec on Me !

**Tec on Me** est une application web interactive et pédagogique permettant de localiser les arrêts de bus TEC (Belgique) autour de soi, de visualiser le tracé des lignes et de calculer son itinéraire piéton.

---

## 📌 Table des matières
1. [Aperçu du projet](#-aperçu-du-projet)
2. [Structure des fichiers](#-structure-des-fichiers)
3. [Fonctionnement des APIs (Requêtes AJAX)](#-fonctionnement-des-apis-requêtes-ajax)
4. [Installation et usage](#-installation-et-usage)
5. [Détails Techniques (UX/UI)](#-détails-techniques-uxui)

---

## 🧐 Aperçu du projet

L'application propose deux modes d'entrée :
- **Mode Géolocalisation** : Utilise le GPS du navigateur pour une précision maximale.
- **Mode Par défaut** : Positionne l'utilisateur à Neuville si le GPS est refusé ou indisponible.

Une fois la carte affichée, l'utilisateur peut ajuster un curseur de distance (1 à 10 km) pour scanner les arrêts environnants. Chaque arrêt cliqué déclenche un calcul d'itinéraire piéton "temps réel".



---

## 📁 Structure des fichiers

- `index.html` : Porte d'entrée gérant le choix de l'expérience utilisateur via un formulaire HTML natif.
- `carte.html` : Interface principale hébergeant la carte Leaflet.
- `main.js` : Chef d'orchestre. Il lit les paramètres d'URL, initialise les composants et gère les événements (curseur, boutons).
- `inc/geo.js` : Cœur logique (Classe `Geo`). Contient toute l'intelligence liée à Leaflet et aux appels API.
- `inc/box.js` : Utilitaire gérant les interactions de fermeture (modales, alertes).
- `styles/style.css` : Contient l'habillage graphique et les correctifs pour l'affichage fixe des popups.

---

## 🚀 Fonctionnement des APIs (Requêtes AJAX)

Le projet orchestre trois APIs distinctes via la méthode `fetch()`.

### 1. Liste des arrêts (ODWB - Open Data Wallonie)
Cette API est interrogée pour peupler la carte en marqueurs.
- **Utilisation** : Dans `loadStops()`.
- **Logique** : Elle reçoit une longitude, une latitude et un rayon (distance). Elle renvoie un JSON contenant tous les arrêts TEC correspondants.
- **Extrait de requête** :
  `where=within_distance(coordinates, geom'POINT(${lon} ${lat})', ${this.distance}km)`

### 2. Passages des bus (API Locale / Cepegra)
Permet de lister les lignes de bus s'arrêtant à un point précis.
- **Utilisation** : Au clic sur un marqueur d'arrêt.