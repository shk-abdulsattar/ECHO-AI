const express = require('express');
const cors = require('cors');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));


const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

try {
    initializeApp({
        credential: cert(firebaseConfig),
    });
    console.log("Firebase Admin successfully initialized.");
} catch (err) {
    if (!/already exists/u.test(err.message)) {
      console.error("Firebase Admin initialization error:", err.message);
    }
}

const db = getFirestore();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


app.locals.db = db;
app.locals.ai = ai;


app.use('/api/chat', require('./routes/chat'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/report', require('./routes/report'));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'ECHO AI Backend is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
