const express = require('express');
const router = express.Router();
const verifyAuth = require('../middleware/auth');


const FEATURE_MAP = {
    chat: { label: 'Chat with ECHO', route: '/chat' },
    mood: { label: 'Log your mood', route: '/mood' },
    meditation: { label: 'Do a meditation session', route: '/meditation' },
    breathing: { label: 'Try a breathing exercise', route: '/breathe' },
    memory: { label: 'Play the memory game', route: '/game' },
};

router.post('/generate', verifyAuth, async (req, res) => {
    const db = req.app.locals.db;
    const ai = req.app.locals.ai;
    const uid = req.user.uid;
    const date = (req.body && req.body.date) || new Date().toLocaleDateString('en-CA');

    try {
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();
        const userData = userDoc.exists ? userDoc.data() : {};

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const moodsSnap = await db.collection(`users/${uid}/moodLogs`)
            .where('timestamp', '>=', weekAgo)
            .orderBy('timestamp', 'asc')
            .get();
        const moods = [];
        moodsSnap.forEach((d) => {
            const x = d.data();
            moods.push(`${x.mood} @ ${x.timestamp?.toDate?.()?.toISOString?.() || ''}`);
        });

        const goalsRef = db.collection(`users/${uid}/dailyGoals`).doc(date);
        const existing = await goalsRef.get();
        if (
            existing.exists &&
            Array.isArray(existing.data().goals) &&
            existing.data().goals.length > 0 &&
            existing.data().goals[0]?.type  
        ) {
            return res.json({ date, goals: existing.data().goals, cached: true });
        }

        const systemBlock = `You are ECHO AI. Output ONLY valid JSON in this exact format with no markdown:
{"goals":[{"text":"motivating short goal description","type":"chat"}]}
Generate 3 to 5 personalized wellness goals for today. Each goal MUST map to one ECHO app feature.
Use ONLY these exact type values:
- "chat": have a meaningful conversation with the ECHO AI
- "mood": log their emotional state in the mood tracker  
- "meditation": complete a guided meditation session
- "breathing": do a breathing exercise (box breathing, 4-7-8, etc.)
- "memory": play the nature memory card game for mindfulness
Output raw JSON only. No extra text.`;

        const userBlock = `Name: ${userData.name || 'User'}. Age: ${userData.age || 'unknown'}. Focus areas: ${(userData.goals || []).join(', ')}. Tone: ${userData.tone || 'Friendly'}.
Recent moods (7d): ${moods.join('; ') || 'none logged'}.
Generate in-app activity goals for ${date}. Make text motivating and specific to the app feature.`;

        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: `${systemBlock}\n\n${userBlock}` }] }],
        });

        const raw = (result.text || '').trim();
        let parsed;
        try {
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        } catch {
            return res.status(502).json({ error: 'Could not parse goals from AI' });
        }

        const list = Array.isArray(parsed.goals) ? parsed.goals : [];
        const goals = list
            .filter((g) => g && typeof g.text === 'string' && g.text.trim())
            .slice(0, 5)
            .map((g, i) => ({
                id: `g-${date}-${i}`,
                text: g.text.trim(),
                type: Object.keys(FEATURE_MAP).includes(g.type) ? g.type : 'chat',
                completed: false,
            }));

        if (goals.length === 0) {
            return res.status(502).json({ error: 'No goals generated' });
        }

        await goalsRef.set({
            date,
            goals,
            allCompleted: false,
            freezeUsed: false,
            generatedAt: new Date(),
        }, { merge: true });

        res.json({ date, goals, cached: false });
    } catch (err) {
        console.error('Goals route error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
