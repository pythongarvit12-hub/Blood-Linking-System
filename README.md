# BloodLink

Blood donor linking system: HTML/CSS/JS frontend + Node.js/Express backend + JSON file database.

## Folder structure

```
bloodlink/
├── package.json
├── server.js          <- backend
├── data/
│   └── donors.json    <- database (created automatically)
└── public/            <- frontend
    ├── index.html
    ├── style.css
    └── app.js
```

## Run

```bash
npm install
npm start
```

Open http://localhost:3000

## API

| Method | URL                              | Purpose                          |
|--------|----------------------------------|----------------------------------|
| GET    | /api/donors?bloodGroup=&city=    | List / search donors             |
| GET    | /api/stats                       | Totals for the stats cards       |
| POST   | /api/donors                      | Register a donor                 |
| PATCH  | /api/donors/:id/availability     | Set available / unavailable      |
| DELETE | /api/donors/:id                  | Delete a donor                   |
