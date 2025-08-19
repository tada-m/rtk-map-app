"use client"; // このページはインタラクティブな機能を持つため、クライアントコンポーネントとしてマーク

import { useState, useEffect } from "react";
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../firebase/clientApp";
import Flowchart from "../components/Flowchart";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem" }}>Loading...</div>;
  }

  return (
    <div id="app">
      <header>
        <h1>数学学習フローチャート</h1>
        <div id="auth-container">
          {user ? (
            <>
              <p id="user-info">
                ようこそ, <span id="user-email">{user.email}</span> さん
              </p>
              <button id="logout-btn" onClick={handleLogout}>
                ログアウト
              </button>
            </>
          ) : (
            <button id="login-btn" onClick={handleLogin}>
              Googleアカウントでログイン
            </button>
          )}
        </div>
      </header>
      <main>
        {user ? (
          <Flowchart user={user} />
        ) : (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <p>Googleアカウントでログインしてください。</p>
          </div>
        )}
      </main>
    </div>
  );
}
