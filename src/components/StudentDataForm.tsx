"use client";
import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/clientApp";
import { User } from "firebase/auth";

interface Props {
  user: User;
  onRegistered: () => void;
}

export default function StudentDataForm({ user, onRegistered }: Props) {
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !name || !studentClass) {
      setError("クラス・学籍番号・名前を入力してください");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        { studentData: { studentId, name, class: studentClass } },
        { merge: true }
      );
      onRegistered();
    } catch (err: any) {
      setError("登録に失敗しました: " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: 320,
        margin: "40px auto",
        padding: 24,
        border: "1px solid #ccc",
        borderRadius: 8,
      }}
    >
      <h2>初回登録</h2>
      <div style={{ marginBottom: 12 }}>
        <label>クラス</label>
        <select
          value={studentClass}
          onChange={(e) => setStudentClass(e.target.value)}
          style={{ width: "100%", fontSize: 16, padding: 6 }}
        >
          <option value="">選択してください</option>
          <option value="A">A</option>
          <option value="B">B</option>
        </select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>学籍番号</label>
        <input
          type="text"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          style={{ width: "100%", fontSize: 16, padding: 6 }}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>名前</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: "100%", fontSize: 16, padding: 6 }}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        style={{ width: "100%", fontSize: 16, padding: 8 }}
      >
        {loading ? "登録中..." : "登録"}
      </button>
      {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
    </form>
  );
}
