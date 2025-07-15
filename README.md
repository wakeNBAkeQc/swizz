# Secret Map

This small website displays an interactive map using [Leaflet](https://leafletjs.com/).
Users can save their name, age and gender in the profile page and place a single pin on
the map. All information is stored in the browser's `localStorage`.

After cloning the repository, run `npm install` to fetch the local dependencies.
You can then start a local server with `npm start` and open `http://localhost:8080` in your browser to get started.

## Firebase configuration

This project expects a `firebase-config.js` file containing your Firebase keys. A sample file named `firebase-config.sample.js` is provided. Copy it to `firebase-config.js` and fill in your own credentials. The resulting file is ignored by git to keep your keys private.
