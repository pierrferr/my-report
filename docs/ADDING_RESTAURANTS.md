# Ajouter un restaurant — mode d'emploi

Ce guide explique comment ajouter une adresse (brunch, pizzeria, resto) à ton site. Les données sont stockées dans `c:\Users\pierr\my-report\data\`.

---

## 1) Emplacements recommandés
- Strasbourg : `data/restaurants_strasbourg.json` (déjà présent)
- Toulouse : `data/restaurants_toulouse.json`
- Alsace / France / Pologne / Monde : crée `data/restaurants_alsace.json`, `data/restaurants_france.json`, `data/restaurants_pologne.json`, `data/restaurants_world.json` (format recommandé ci‑dessous)

---

## 2) Format à utiliser

### a) Strasbourg (actuel)
Le fichier contient deux listes `brunchs` et `pizzerias`. Exemple d'ajout d'un brunch :

```json
{
  "brunchs": [
    {
      "name": "Le Brunch du Marché",
      "lat": 48.5790,
      "lng": 7.7450,
      "page": "pages/cities/brunchs_strasbourg.html#le-brunch-du-marche"
    }
    // ... autres brunchs ...
  ],
  "pizzerias": [
    // ... pizzerias ...
  ]
}
```

Ajoute simplement un objet dans l'array `brunchs` avec `name`, `lat`, `lng`, `page` (lien interne ou `#`).

### b) Toulouse (exemple)
Fichier `data/restaurants_toulouse.json` (pizzerias + restaurants) :

```json
{
  "pizzerias": [
    {
      "name": "Pizza de l'Ormeau",
      "lat": 43.5795,
      "lng": 1.4445,
      "page": "pages/cities/pizzerias_toulouse.html#pizza-de-lormeau"
    }
  ],
  "restaurants": []
}
```

### c) Alsace / France / Pologne / Monde (format générique recommandé)
Utilise un tableau `places` qui gère tous les types :

```json
{
  "places": [
    {
      "name": "La Courrone — Scherwiller",
      "type": "restaurant",
      "lat": 48.2890,
      "lng": 7.3410,
      "page": null,
      "link": "https://www.google.com/maps/search/?api=1&query=La+Courrone+Scherwiller",
      "note": "Cuisine locale, terrasse"
    }
  ]
}
```

Les champs :
- `name` (string) — nom affiché
- `type` (string) — `brunch|pizzeria|restaurant|ville` (utile pour icônes/filtre)
- `lat`, `lng` (number) — coordonnées
- `page` (string|null) — lien interne (fichier du site)
- `link` (string|null) — URL externe (Google Maps)
- `note` (optionnel) — description courte

---

## 3) Récupérer les coordonnées
1. Ouvre Google Maps.
2. Clique droit → "Plus d'infos sur cet endroit".
3. Les coordonnées s'affichent en haut : copie `lat, lng`.

Ou clique sur un point et regarde l'URL (paramètre `@lat,lng,zoom`).

---

## 4) Vérifier / valider JSON
- PowerShell : 
  ```
  Get-Content .\data\restaurants_strasbourg.json | ConvertFrom-Json
  ```
- Python :
  ```
  python -m json.tool data\restaurants_strasbourg.json
  ```

Corrige les erreurs de virgules / guillemets si l'outil échoue.

---

## 5) Rafraîchir et vérifier la page
- Ouvre la page correspondante (ex. `pages/cities/strasbourg.html`) dans le navigateur ou via Live Server.
- Vérifie :
  - Le marqueur ajouté apparaît sur la carte.
  - L'entrée est listée sous la carte.
  - Console DevTools pour erreurs (fetch / chemin / JSON mal formé).

---

## 6) Bonnes pratiques
- Utilise des `page` relatifs quand tu as une page interne (ex. `pages/cities/...`), sinon remplis `link`.
- Respecte la structure JSON existante pour la zone (Strasbourg : `brunchs`/`pizzerias`).
- Sauvegarde une copie avant modification.

---

Si tu veux, je peux :
- Générer les fichiers vides `data/restaurants_*.json` pour Alsace/France/Pologne/World.
- Créer un petit script `js/loadPlaces.js` commun qui charge n'importe quel JSON et met à jour la carte + la liste.