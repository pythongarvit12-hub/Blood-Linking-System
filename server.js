const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "donors.json");
const PUBLIC_DIR = path.join(__dirname, "public");

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

// ---------- Database layer (JSON file) ----------
// Everything that touches storage is in these two functions,
// so you can later swap them for SQLite / MongoDB / MySQL.

function ensureDatabase() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "[]", "utf8");
}

function readDonors() {
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    } catch (err) {
        console.error("Could not read database, starting empty:", err.message);
        return [];
    }
}

function writeDonors(donors) {
    // Write to a temp file first, then rename: avoids a corrupted file if the app crashes mid-write.
    const tmp = DB_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(donors, null, 2), "utf8");
    fs.renameSync(tmp, DB_FILE);
}

ensureDatabase();

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR)); // serves index.html, style.css, app.js

// ---------- Routes ----------

// GET /api/donors?bloodGroup=A+&city=Raipur
app.get("/api/donors", (req, res) => {
    const { bloodGroup, city } = req.query;
    let donors = readDonors();

    if (bloodGroup) {
        donors = donors.filter(d => d.bloodGroup === bloodGroup);
    }

    if (city && city.trim()) {
        const term = city.trim().toLowerCase();
        donors = donors.filter(d => d.city.toLowerCase().includes(term));
    }

    // Newest first
    donors.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(donors);
});

// GET /api/stats
app.get("/api/stats", (req, res) => {
    const donors = readDonors();
    const bloodGroups = {};

    donors.forEach(d => {
        bloodGroups[d.bloodGroup] = (bloodGroups[d.bloodGroup] || 0) + 1;
    });

    res.json({
        totalDonors: donors.length,
        availableDonors: donors.filter(d => d.available).length,
        bloodGroups
    });
});

// POST /api/donors
app.post("/api/donors", (req, res) => {
    const name = String(req.body.name || "").trim();
    const bloodGroup = String(req.body.bloodGroup || "").trim();
    const city = String(req.body.city || "").trim();
    const phone = String(req.body.phone || "").trim();

    if (!name || !bloodGroup || !city || !phone) {
        return res.status(400).json({ message: "All fields are required." });
    }

    if (!BLOOD_GROUPS.includes(bloodGroup)) {
        return res.status(400).json({ message: "Invalid blood group." });
    }

    if (!/^[+\d][\d\s-]{6,17}$/.test(phone)) {
        return res.status(400).json({ message: "Please enter a valid phone number." });
    }

    const donors = readDonors();

    if (donors.some(d => d.phone === phone)) {
        return res.status(409).json({ message: "A donor with this phone number already exists." });
    }

    const donor = {
        id: crypto.randomUUID(),
        name,
        bloodGroup,
        city,
        phone,
        available: true,
        createdAt: new Date().toISOString()
    };

    donors.push(donor);
    writeDonors(donors);

    res.status(201).json(donor);
});

// PATCH /api/donors/:id/availability   body: { available: true|false }
app.patch("/api/donors/:id/availability", (req, res) => {
    if (typeof req.body.available !== "boolean") {
        return res.status(400).json({ message: "'available' must be true or false." });
    }

    const donors = readDonors();
    const donor = donors.find(d => d.id === req.params.id);

    if (!donor) {
        return res.status(404).json({ message: "Donor not found." });
    }

    donor.available = req.body.available;
    writeDonors(donors);

    res.json(donor);
});

// DELETE /api/donors/:id
app.delete("/api/donors/:id", (req, res) => {
    const donors = readDonors();
    const remaining = donors.filter(d => d.id !== req.params.id);

    if (remaining.length === donors.length) {
        return res.status(404).json({ message: "Donor not found." });
    }

    writeDonors(remaining);
    res.json({ message: "Donor deleted." });
});

// Unknown API routes -> JSON 404
app.use("/api", (req, res) => {
    res.status(404).json({ message: "API route not found." });
});

// Unexpected errors
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: "Something went wrong on the server." });
});

app.listen(PORT, () => {
    console.log(`BloodLink running at http://localhost:${PORT}`);
});
