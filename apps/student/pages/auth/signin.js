import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AuthPortal, AnimatedBackground } from '@transit/ui';
import { initFirebase } from '../../firebaseClient';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

export default function SignIn() {
  const router = useRouter();
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(false);
  const [isAuthInProgress, setIsAuthInProgress] = useState(false);

  initFirebase();

  // Handle redirect result when user returns from Google Sign-In
  // Redirect result handling removed as we are using Popup now
  useEffect(() => {
    // Just cleanup if needed
  }, [router]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isProcessingRedirect || isAuthInProgress) return;

    const auth = getAuth();
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        if (user.email === 'admin@transit.com') {
          auth.signOut();
          alert('Admin access is restricted to the Driver App.');
          return;
        }
        console.log('User already logged in, redirecting...');
        router.replace('/dashboard');
      }
    });
    return () => unsub();
  }, [isProcessingRedirect, isAuthInProgress]);

  async function handleAuth({ type, email, password, displayName }) {
    if (isAuthInProgress) return;
    setIsAuthInProgress(true);

    const auth = getAuth();
    const db = getFirestore();

    try {
      console.log('Starting auth...', type);
      if (type === 'google') {
        const provider = new GoogleAuthProvider();
        console.log('Initiating Google Sign-In popup...');
        const result = await signInWithPopup(auth, provider);

        console.log('Google signin success', result.user.uid);
        await setDoc(doc(db, 'users', result.user.uid), {
          displayName: result.user.displayName,
          email: result.user.email,
          role: 'student',
          lastLogin: Date.now(),
        }, { merge: true });
      } else if (type === 'signin') {
        console.log('Attempting verify password...');
        await signInWithEmailAndPassword(auth, email, password);
        console.log('Password verified');
      } else {
        console.log('Creating user...');
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        console.log('User created', cred.user.uid);
        await updateProfile(cred.user, { displayName });
        console.log('Saving profile to firestore...');
        await setDoc(doc(db, 'users', cred.user.uid), {
          displayName,
          email,
          role: 'student',
          createdAt: Date.now(),
        });
        console.log('Firestore save success');
      }
      console.log('Redirecting to dashboard...');
      if (auth.currentUser?.email === 'admin@transit.com') {
        auth.signOut();
        alert('Admin access is restricted to the Driver App.');
        setIsAuthInProgress(false);
      } else {
        router.replace('/dashboard');
      }
    } catch (err) {
      console.error('Auth error full object:', err);
      console.error('Auth error message:', err.message);
      console.error('Auth error code:', err.code);
      console.error('Auth error code:', err.code);
      setIsAuthInProgress(false);
      alert('Authentication error: ' + err.message + ' (' + err.code + ')');
    }
  }

  // Show loading state while checking for redirect result
  if (isProcessingRedirect) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <AnimatedBackground />
        <div style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          color: 'white',
          fontSize: '1.2rem'
        }}>
          <div style={{ marginBottom: '1rem' }}>Processing authentication...</div>
          <div className="spinner" style={{
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <AnimatedBackground />
      <AuthPortal
        onAuth={handleAuth}
        appName="student"
        driverUrl="http://localhost:3000/auth/signin"
        studentUrl="/auth/signin"
        showAppSwitcher={false}
      />
    </div>
  );
}
