import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { apiGet, apiPost } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Attempt to fetch profile from backend
          const data = await apiGet('/auth/me');
          if (data && data.user) {
            setUser(data.user);
          } else {
            // Fallback user object from Firebase auth if backend user record is pending
            setUser({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email || 'User',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || '',
            });
          }
        } catch (err) {
          console.warn('Backend session fetch failed, falling back to Firebase Auth user:', err);
          setUser({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email || 'User',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  function login(userData) {
    setUser(userData);
  }

  async function logout() {
    try {
      await apiPost('/auth/revoke');
      await auth.signOut();
    } catch (err) {
      console.warn('Sign out error:', err);
    } finally {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>. Check that App is wrapped correctly.');
  }
  return context;
}
