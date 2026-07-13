const express = require('express');
const router = express.Router();
const verifyAuth = require('../middleware/auth');

function isoWeekId(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

router.post('/generate', verifyAuth, async (req, res) => {
    const db = req.app.locals.db;
    const ai = req.app.locals.ai;
    const uid = req.user.uid;

    try {
        const weekId = isoWeekId(new Date());
        const reportRef = db.collection(`users/${uid}/weeklyReports`).doc(weekId);
        const existing = await reportRef.get();
        if (existing.exists && existing.data().moodSummary) {
            return res.json({ weekId, report: existing.data(), cached: true });
        }

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const goalDates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            goalDates.push(d.toLocaleDateString('en-CA'));
        }

        const [userDoc, moodsSnap, ...goalDocs] = await Promise.all([
            db.collection('users').doc(uid).get(),
            db.collection(`users/${uid}/moodLogs`).where('timestamp', '>=', weekAgo).orderBy('timestamp', 'asc').get(),
            ...goalDates.map((date) => db.collection(`users/${uid}/dailyGoals`).doc(date).get()),
        ]);

        const medSnap = await db.collection(`users/${uid}/meditationSessions`).where('endedAt', '>=', weekAgo).limit(80).get();
        const breathSnap = await db.collection(`users/${uid}/breathingSessions`).where('endedAt', '>=', weekAgo).limit(80).get();
        const gameSnap = await db.collection(`users/${uid}/memoryGameSessions`).where('endedAt', '>=', weekAgo).limit(80).get();

        const inWeek = (ts) => ts && ts.toDate && ts.toDate() >= weekAgo;

        const userData = userDoc.exists ? userDoc.data() : {};
        const moods = [];
        moodsSnap.forEach((d) => moods.push(d.data().mood));

        let goalsCompleted = 0;
        goalDocs.forEach((d) => {
            if (!d.exists) return;
            const g = d.data().goals || [];
            g.forEach((x) => {
                if (x.completed) goalsCompleted += 1;
            });
        });

        let meditationCount = 0;
        medSnap.forEach((d) => {
            if (inWeek(d.data().endedAt)) meditationCount += 1;
        });
        let breathingCount = 0;
        breathSnap.forEach((d) => {
            if (inWeek(d.data().endedAt)) breathingCount += 1;
        });
        let gameCount = 0;
        gameSnap.forEach((d) => {
            if (inWeek(d.data().endedAt)) gameCount += 1;
        });

        const prompt = `You are ECHO AI. Respond with ONLY valid JSON (no markdown):
{
  "moodSummary": "2-4 sentences on mood trend",
  "chatToneAnalysis": "1-2 sentences",
  "streakNarrative": "1-2 sentences about consistency/streak mindset",
  "recommendations": ["...","...","..."]
}
Context: User ${userData.name || 'User'}, focus: ${(userData.goals || []).join(', ')}.
Moods this week (labels): ${moods.join(', ') || 'none'}.
Goals items completed (count): ${goalsCompleted}.
Meditation sessions: ${meditationCount}, breathing sessions: ${breathingCount}, memory games: ${gameCount}.
Streak (profile): ${userData.streak ?? 0}, best: ${userData.bestStreak ?? 0}.`;

        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        const raw = (result.text || '').trim();
        let parsed;
        try {
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        } catch {
            return res.status(502).json({ error: 'Could not parse report from AI' });
        }

        const report = {
            weekId,
            generatedAt: new Date(),
            moodSummary: parsed.moodSummary || '',
            goalsCompletedCount: goalsCompleted,
            meditationCount,
            breathingCount,
            gameCount,
            chatToneAnalysis: parsed.chatToneAnalysis || '',
            streakNarrative: parsed.streakNarrative || '',
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 3) : [],
        };

        await reportRef.set(report, { merge: true });
        res.json({ weekId, report, cached: false });
    } catch (err) {
        console.error('Report route error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
