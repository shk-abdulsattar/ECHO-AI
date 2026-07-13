const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const verifyAuth = require('../middleware/auth');

const CRISIS_KEYWORDS = [
    'suicide', 'kill myself', 'end my life', 'self-harm', 'cut myself',
    'dont want to live', "don't want to live", 'jump off', 'die',
];

async function fetchWeeklyActivitySummary(db, uid) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const inWeek = (ts) => ts && typeof ts.toDate === 'function' && ts.toDate() >= weekAgo;

    const [medSnap, breathSnap, gameSnap] = await Promise.all([
        db.collection(`users/${uid}/meditationSessions`).limit(60).get(),
        db.collection(`users/${uid}/breathingSessions`).limit(60).get(),
        db.collection(`users/${uid}/memoryGameSessions`).limit(60).get(),
    ]);

    const parts = [];
    let mc = 0;
    medSnap.forEach((d) => {
        if (inWeek(d.data().endedAt)) {
            mc += 1;
            parts.push(`Meditation: ${d.data().name || 'session'}`);
        }
    });
    let bc = 0;
    breathSnap.forEach((d) => {
        if (inWeek(d.data().endedAt)) {
            bc += 1;
            parts.push(`Breathing: ${d.data().pattern || 'pattern'}`);
        }
    });
    let gc = 0;
    gameSnap.forEach((d) => {
        if (inWeek(d.data().endedAt)) {
            gc += 1;
            parts.push(`Memory game (${d.data().difficulty || '?'})`);
        }
    });

    if (parts.length === 0) return 'No structured activities logged this week.';
    return `Counts: meditation ${mc}, breathing ${bc}, games ${gc}. Details: ${parts.slice(0, 12).join('; ')}`;
}

router.post('/', verifyAuth, async (req, res) => {
    const { sessionId, message, userMessageSaved } = req.body;
    const db = req.app.locals.db;
    const ai = req.app.locals.ai;
    const uid = req.user.uid;

    if (!sessionId || !message || typeof message !== 'string') {
        return res.status(400).json({ error: 'sessionId and message are required' });
    }

    try {
        const today = new Date().toLocaleDateString('en-CA');
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();
        let userData = userDoc.exists ? userDoc.data() : {
            msgCount: 0,
            lastMsgDate: today,
            tone: 'Friendly',
            name: 'User',
            age: '',
            goals: [],
        };

        if (userData.lastMsgDate !== today) {
            userData.msgCount = 0;
            userData.lastMsgDate = today;
        }

        if (userData.msgCount >= 200) {
            return res.status(429).json({ error: 'Daily message limit of 200 reached.' });
        }

        const lMessage = message.toLowerCase();
        const containsCrisis = CRISIS_KEYWORDS.some((k) => lMessage.includes(k));

        if (containsCrisis) {
            const anon = crypto.createHash('sha256').update(`${uid}:${Date.now()}`).digest('hex').slice(0, 16);
            await db.collection('crisis_logs').add({
                timestamp: new Date(),
                anonBucket: anon,
                source: 'chat_keyword',
            });
            return res.status(200).json({
                isCrisis: true,
                aiMessage: 'I hear your pain. You are in a safe now. Please open the Panic button (shield icon) for breathing support and crisis helplines.',
            });
        }

        const BANNED_TERMS = ['child abuse', 'drug synthesis', 'how to make weapon', 'child pornography', 'how to synthesize'];
        const isHarmful = BANNED_TERMS.some((k) => lMessage.includes(k));
        if (isHarmful) {
            return res.status(400).json({ error: 'Content violates ECHO AI protocols.' });
        }

        const msgsRef = db.collection(`users/${uid}/sessions/${sessionId}/messages`);
        const recentMsgsSnap = await msgsRef.orderBy('timestamp', 'desc').limit(20).get();
        let history = [];
        recentMsgsSnap.forEach((doc) => history.push(doc.data()));
        history = history.reverse();

        let historyForPrompt = [...history];
        const last = historyForPrompt[historyForPrompt.length - 1];
        if (userMessageSaved && last && last.sender === 'user' && last.text === message) {
            historyForPrompt = historyForPrompt.slice(0, -1);
        }

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const moodsRef = db.collection(`users/${uid}/moodLogs`);
        const recentMoods = await moodsRef.where('timestamp', '>=', weekAgo).orderBy('timestamp', 'asc').get();
        let moodLines = [];
        recentMoods.forEach((doc) => {
            const data = doc.data();
            moodLines.push(`${data.timestamp.toDate().toLocaleDateString()}: ${data.mood}`);
        });

        const activityBlock = await fetchWeeklyActivitySummary(db, uid);

        const systemToneMap = {
            Friendly: 'Speak warmly and casually like a trusted friend.',
            Professional: 'Speak calmly and clearly like a licensed therapist. Do not claim to be licensed; stay within supportive coaching.',
            Motivational: 'Speak with energy and positivity and focus on small actionable steps.',
        };

        const tone = userData.tone || 'Friendly';
        const section1 = `You are ECHO AI, a warm empathetic therapist (not a medical professional). Never diagnose or prescribe medication. Encourage professional help when appropriate. If the user is in crisis, direct them to emergency services and the in-app Panic button.
Tone: ${systemToneMap[tone] || systemToneMap.Friendly}`;

        const section2 = `User context — Name: ${userData.name || 'User'}, Age: ${userData.age || 'unspecified'}, Focus areas: ${(userData.goals || []).join(', ') || 'general wellness'}.`;

        const section3 = `Last 7 days mood logs (newest last):\n${moodLines.length ? moodLines.join('\n') : 'No mood logs yet.'}`;

        const section4 = `Recent activity this week:\n${activityBlock}`;

        const section5 = `Last messages in this session (chronological):\n${historyForPrompt.map((h) => `${h.sender}: ${h.text}`).join('\n') || '(none yet)'}`;

        const section6 = `User's new message:\n${message}`;

        const fullPrompt = [section1, section2, section3, section4, section5, section6].join('\n\n---\n\n');

        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        });

        const aiReply = result.text;

        const highlyDistressed = ['angry', 'furious', 'distressed', 'hate', 'hopeless', 'worthless'].some((w) => lMessage.includes(w));

        if (!userMessageSaved) {
            await msgsRef.add({ sender: 'user', text: message, timestamp: new Date() });
        }
        await msgsRef.add({
            sender: 'ai',
            text: aiReply,
            timestamp: new Date(),
            feedback: null,
        });

        const sessionRef = db.collection(`users/${uid}/sessions`).doc(sessionId);
        const sessSnap = await sessionRef.get();
        const sessData = sessSnap.exists ? sessSnap.data() : {};
        const updates = { updatedAt: new Date() };
        if (!sessSnap.exists) {
            updates.createdAt = new Date();
            const firstSentence = message.split('.')[0];
            updates.title = firstSentence.length > 48 ? firstSentence.slice(0, 45) + '...' : firstSentence;
        } else if (!sessData.title || sessData.title === 'New Chat') {
            const firstSentence = message.split('.')[0];
            updates.title = firstSentence.length > 48 ? firstSentence.slice(0, 45) + '...' : firstSentence;
        }
        await sessionRef.set(updates, { merge: true });

        await userRef.set({
            msgCount: (userData.msgCount || 0) + 1,
            lastMsgDate: today,
            lastActiveAt: new Date().toISOString(),
        }, { merge: true });

        res.json({
            isCrisis: false,
            aiMessage: aiReply,
            suggestWellnessActivity: highlyDistressed,
        });
    } catch (err) {
        console.error('Chat route error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
