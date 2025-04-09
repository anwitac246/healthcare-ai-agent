require('dotenv').config();
console.log("Loaded env vars:", {
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY: process.env.TWILIO_API_KEY,
  FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL?.slice(0,30) + '…'
});

const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const admin = require('firebase-admin');
const cron = require('node-cron');
const serviceAccount = require('./serviceAccountKey.json');

const app = express();
const port = 5000;

// --- Twilio credentials from env ---
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;
const apiKey     = process.env.TWILIO_API_KEY;       // SID of API Key
const apiSecret  = process.env.TWILIO_API_SECRET;    // Secret of API Key

// --- Initialize Firebase Admin ---
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});
const db = admin.database();

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET','POST'],
}));

// --- Token endpoint ---
app.get('/token', (req, res) => {
  const identity = req.query.identity
    || `user_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
  const room = req.query.room || 'default-room';

  try {
    const AccessToken = twilio.jwt.AccessToken;
    const VideoGrant  = AccessToken.VideoGrant;

    const token = new AccessToken(accountSid, apiKey, apiSecret, { identity });
    token.addGrant(new VideoGrant({ room }));
    const jwt = token.toJwt();

    console.log(`[Server] Generated token for ${identity} in room ${room}`);
    res.json({ token: jwt, identity });
  } catch (error) {
    console.error('[Server] Error generating token:', error.message);
    res.status(500).json({ error: 'Failed to generate token', details: error.message });
  }
});

// --- Health check ---
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// --- Cron job: every minute ---
cron.schedule('* * * * *', async () => {
  console.log('[Cron] Checking appointments…');
  try {
    const snap = await db.ref('appointments').once('value');
    const now = Date.now();

    snap.forEach((child) => {
      const appt = child.val();
      const id   = child.key;
      if (appt.status !== 'accepted') return;

      const apptTime = new Date(appt.dateTime).getTime();
      const openAt   = apptTime - 5 * 60 * 1000;
      const closeAt  = apptTime + 30 * 60 * 1000;

      // 1) Activate link 5 minutes before
      if (!appt.linkAvailable && now >= openAt && now < apptTime) {
        // generate Twilio tokens for both doctor & patient
        const AccessToken = twilio.jwt.AccessToken;
        const VideoGrant  = AccessToken.VideoGrant;

        const docToken = new AccessToken(accountSid, apiKey, apiSecret, { identity: appt.doctorId });
        docToken.addGrant(new VideoGrant({ room: appt.roomId }));

        const patToken = new AccessToken(accountSid, apiKey, apiSecret, { identity: appt.userId });
        patToken.addGrant(new VideoGrant({ room: appt.roomId }));

        db.ref(`appointments/${id}`).update({
          linkAvailable: true,
          linkGeneratedAt: new Date().toISOString(),
          twilioTokens: {
            [appt.doctorId]: docToken.toJwt(),
            [appt.userId]:    patToken.toJwt(),
          },
        });
        console.log(`[Cron] Activated link for ${appt.roomId}`);
      }

      // 2) Expire & complete 30 minutes after
      if (appt.linkAvailable && now >= closeAt && appt.status !== 'completed') {
        db.ref(`appointments/${id}`).update({
          status: 'completed',
          linkAvailable: false,
        });
        console.log(`[Cron] Completed appointment ${appt.roomId}`);
      }
    });
  } catch (err) {
    console.error('[Cron] Error:', err);
  }
});

app.listen(port, () => {
  console.log(`[Server] Running on http://localhost:${port}`);
});
