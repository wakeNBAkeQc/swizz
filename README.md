# Secret Map

This small website displays an interactive map using [Leaflet](https://leafletjs.com/).
Users can save their name, age and gender in the profile page and place a single pin on
the map. Pins are stored locally in the browser and synchronised with Firebase
Firestore so they remain visible even after a refresh or on another device.

After cloning the repository, run `npm install` to fetch the local dependencies.
You can then start a local server with `npm start` and open `http://localhost:8080` in your browser to get started.

## Firebase configuration

The repository already includes a `firebase-config.js` file that contains the Firebase
credentials used by the site, so no additional setup is required.
