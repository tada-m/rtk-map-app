"use client";
import { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/clientApp";
import { User } from "firebase/auth";

interface Props {
  user: User;
  open: boolean;
  onClose: () => void;
}

export default function ProfileDialog({ user, open, onClose }: Props) {
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!open) return;
    const fetchProfile = async () => {
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        const data = snap.data();
        if (data && data.studentData) {
          setStudentId(data.studentData.studentId || "");
          setName(data.studentData.name || "");
          setStudentClass(data.studentData.class || "");
        }
      } catch (err: any) {
        setError("プロフィール取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 半角数字チェック
    if (!studentId || !name || !studentClass) {
      setError("クラス（組）・学籍番号・名前を入力してください");
      return;
    }
    if (!/^[0-9]+$/.test(studentId)) {
      setError("学籍番号は半角数字で入力してください");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          email: user.email,
          studentData: { studentId, name, class: studentClass },
        },
        { merge: true }
      );
      setSuccess("プロフィールを更新しました");
    } catch (err: any) {
      setError("更新に失敗しました: " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>プロフィール編集</span>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label>クラス（組）</label>
            <input
              type="text"
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              style={{ width: "100%", fontSize: 16, padding: 6 }}
              placeholder="クラス名"
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>学籍番号</label>
            <input
              type="text"
              value={studentId}
              onChange={(e) =>
                setStudentId(e.target.value.replace(/[^0-9]/g, ""))
              }
              style={{ width: "100%", fontSize: 16, padding: 6 }}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="半角数字のみ"
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>名前</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", fontSize: 16, padding: 6 }}
              placeholder="氏名"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", fontSize: 16, padding: 8 }}
          >
            {loading ? "保存中..." : "保存"}
          </button>
          {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
          {success && (
            <div style={{ color: "green", marginTop: 8 }}>{success}</div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
