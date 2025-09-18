"use client";

import { useState } from "react";
import TeacherDashboard from "../../teacher-app/pages/index";

export default function TeacherPage() {
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const ADMIN_PASSWORD = "teacher";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === ADMIN_PASSWORD) {
      setAuthed(true);
      setError("");
    } else {
      setError("パスワードが違います");
    }
  };

  if (!authed) {
    return (
      <div style={{ padding: 40 }}>
        <h2>教員用ダッシュボード閲覧</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="パスワード"
            style={{ fontSize: 18, padding: 8 }}
          />
          <button type="submit" style={{ marginLeft: 12, fontSize: 18 }}>
            ログイン
          </button>
        </form>
        {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
      </div>
    );
  }

  return <TeacherDashboard />;
}
