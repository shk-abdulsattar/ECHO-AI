import {
    collection,
    getDocs,
    deleteDoc,
    doc,
    writeBatch,
} from 'firebase/firestore';

export async function deleteSessionDeep(db, uid, sessionId) {
    const base = `users/${uid}/sessions/${sessionId}/messages`;
    const snapshot = await getDocs(collection(db, base));
    let batch = writeBatch(db);
    let n = 0;
    const commits = [];
    snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
        n += 1;
        if (n >= 450) {
            commits.push(batch.commit());
            batch = writeBatch(db);
            n = 0;
        }
    });
    if (n > 0) commits.push(batch.commit());
    await Promise.all(commits);
    await deleteDoc(doc(db, 'users', uid, 'sessions', sessionId));
}

async function deleteQueryBatch(db, queryRef) {
    const snapshot = await getDocs(queryRef);
    if (snapshot.empty) return;
    let batch = writeBatch(db);
    let n = 0;
    const commits = [];
    snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
        n += 1;
        if (n >= 450) {
            commits.push(batch.commit());
            batch = writeBatch(db);
            n = 0;
        }
    });
    if (n > 0) commits.push(batch.commit());
    await Promise.all(commits);
}

export async function deleteUserSubcollections(db, uid) {
    const base = `users/${uid}`;

    const sessionsSnap = await getDocs(collection(db, `${base}/sessions`));
    for (const s of sessionsSnap.docs) {
        await deleteQueryBatch(db, collection(db, `${base}/sessions/${s.id}/messages`));
        await deleteDoc(doc(db, `${base}/sessions`, s.id));
    }

    await deleteQueryBatch(db, collection(db, `${base}/moodLogs`));
    await deleteQueryBatch(db, collection(db, `${base}/dailyGoals`));
    await deleteQueryBatch(db, collection(db, `${base}/weeklyReports`));
    await deleteQueryBatch(db, collection(db, `${base}/meditationSessions`));
    await deleteQueryBatch(db, collection(db, `${base}/breathingSessions`));
    await deleteQueryBatch(db, collection(db, `${base}/memoryGameSessions`));

    await deleteDoc(doc(db, 'users', uid));
}
