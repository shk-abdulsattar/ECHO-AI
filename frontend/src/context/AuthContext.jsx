import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import {
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    deleteUser,
    reauthenticateWithCredential,
    EmailAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { deleteUserSubcollections } from '../utils/firestoreCleanup';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

function applyThemeClass(theme) {
    const root = document.documentElement;
    if (theme === 'light') root.classList.add('light');
    else root.classList.remove('light');
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    
    useEffect(() => {
        const saved = localStorage.getItem('echo-theme');
        if (saved === 'light') {
            applyThemeClass('light');
        } else if (!saved || saved === 'dark') {
            applyThemeClass('dark');
        } else if (saved === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            applyThemeClass(prefersDark ? 'dark' : 'light');
        }
    }, []);

    async function register(email, password, displayName, age, goals, tone) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            name: displayName,
            age: age || '',
            goals: goals || [],
            tone: tone || 'Friendly',
            isOnboarded: false,
            createdAt: new Date(),
            msgCount: 0,
            lastMsgDate: new Date().toLocaleDateString('en-CA'),
            theme: localStorage.getItem('echo-theme') || 'dark',
            streak: 0,
            bestStreak: 0,
            lastStreakDate: null,
            totalSessions: 0,
            meditationsDone: 0,
            goalsAchieved: 0,
            emergencyContacts: [],
        });

        return user;
    }

    function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    function logout() {
        return signOut(auth);
    }

    function resetPassword(email) {
        return sendPasswordResetEmail(auth, email);
    }

    async function completeOnboarding(data) {
        if (!currentUser) throw new Error('No user logged in');
        return updateDoc(doc(db, 'users', currentUser.uid), {
            ...data,
            isOnboarded: true,
        });
    }

    async function updateProfile(patch) {
        if (!currentUser) throw new Error('No user logged in');
        await updateDoc(doc(db, 'users', currentUser.uid), patch);
    }

    async function deleteAccount(password) {
        if (!currentUser) throw new Error('No user logged in');
        const credential = EmailAuthProvider.credential(currentUser.email, password);
        await reauthenticateWithCredential(auth.currentUser, credential);
        const uid = currentUser.uid;
        await deleteUserSubcollections(db, uid);
        await deleteUser(auth.currentUser);
    }

    useEffect(() => {
        let unsubscribeDoc = () => {};

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            setLoading(true);
            setCurrentUser(user);
            if (user) {
                const docRef = doc(db, 'users', user.uid);
                const snap = await getDoc(docRef);
                
                if (!snap.exists()) {
                    await setDoc(docRef, {
                        email: user.email,
                        name: user.displayName || 'Soul',
                        isOnboarded: false,
                        createdAt: new Date(),
                        tone: 'Friendly',
                        goals: [],
                        theme: localStorage.getItem('echo-theme') || 'dark',
                        msgCount: 0,
                        lastMsgDate: new Date().toLocaleDateString('en-CA'),
                        streak: 0,
                        bestStreak: 0,
                        emergencyContacts: [],
                    });
                }

                unsubscribeDoc = onSnapshot(
                    docRef,
                    (docSnap) => {
                        if (docSnap.exists()) {
                            const data = docSnap.data();
                            setUserData(data);
                            const t = data.theme;
                            if (t === 'system') {
                                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                                applyThemeClass(prefersDark ? 'dark' : 'light');
                            } else if (t === 'light') {
                                applyThemeClass('light');
                            } else {
                                applyThemeClass('dark');
                            }
                            localStorage.setItem('echo-theme', t || 'dark');
                        }
                        setLoading(false);
                    },
                    (error) => {
                        console.error('Error fetching user data:', error);
                        setLoading(false);
                    }
                );

                updateDoc(docRef, { lastActiveAt: new Date().toISOString() }).catch(() => {});
            } else {
                setUserData(null);
                setLoading(false);
             
            }
        });

        return () => {
            unsubscribeAuth();
            unsubscribeDoc();
        };
    }, []);

    const value = {
        currentUser,
        userData,
        loading,
        register,
        login,
        logout,
        resetPassword,
        completeOnboarding,
        updateProfile,
        deleteAccount,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
