"use client"; // このページはインタラクティブな機能を持つため、クライアントコンポーネントとしてマーク

import { useState, useEffect } from "react";
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../firebase/clientAppPhysics";
import FlowchartPhysics from "../components/FlowchartPhysics";
import ProfileDialog from "../components/ProfileDialog";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/clientApp";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileStatus, setProfileStatus] = useState<
    "loading" | "registered" | "unregistered"
  >("loading");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // プロフィール情報の取得
  useEffect(() => {
    if (!user) {
      setProfileStatus("loading");
      return;
    }
    const fetchProfile = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        const data = snap.data();
        if (
          data &&
          data.studentData &&
          data.studentData.studentId &&
          data.studentData.name &&
          data.studentData.class
        ) {
          setProfileStatus("registered");
        } else {
          setProfileStatus("unregistered");
        }
      } catch {
        setProfileStatus("unregistered");
      }
    };
    fetchProfile();
  }, [user, profileOpen]);

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
        <h1>物理学習マップ（剛体にはたらく力）</h1>
        <div id="auth-container">
          {user ? (
            <>
              <p id="user-info">
                ようこそ, <span id="user-email">{user.email}</span> さん
              </p>
              <button
                onClick={() => setProfileOpen(true)}
                style={
                  profileStatus === "unregistered"
                    ? {
                        marginRight: 8,
                        background: "orange",
                        color: "#fff",
                        fontWeight: "bold",
                      }
                    : { marginRight: 8 }
                }
              >
                {profileStatus === "unregistered"
                  ? "プロフィールを登録してください"
                  : "プロフィール変更"}
              </button>
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
          <>
            <FlowchartPhysics user={user} />
            <ProfileDialog
              user={user}
              open={profileOpen}
              onClose={() => setProfileOpen(false)}
            />
          </>
        ) : (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <p>Googleアカウントでログインしてください。</p>
          </div>
        )}
      </main>
    </div>
  );
}
