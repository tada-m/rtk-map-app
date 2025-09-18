// 管理者用データ登録ページ（Firebase Auth認証付き）
// 旧: /teacher/page.tsx

"use client";

import { useState, useEffect } from "react";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase/clientAppPhysics";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { app } from "../../firebase/clientAppPhysics";

function UnitsProblemsTable() {
  const [units, setUnits] = useState<any[]>([]);
  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editUnitId, setEditUnitId] = useState<string | null>(null);
  const [editUnit, setEditUnit] = useState<any>({});
  const [editProblemId, setEditProblemId] = useState<string | null>(null);
  const [editProblem, setEditProblem] = useState<any>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const unitsSnap = await getDocs(collection(db, "units"));
      const problemsSnap = await getDocs(collection(db, "problems"));
      setUnits(unitsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setProblems(problemsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setError("");
    } catch (e) {
      setError("データ取得失敗: " + (e instanceof Error ? e.message : ""));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 編集UI
  const handleUnitEdit = (u: any) => {
    setEditUnitId(u.id);
    setEditUnit({ ...u });
  };
  const handleUnitEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditUnit({ ...editUnit, [e.target.name]: e.target.value });
  };
  const handleUnitEditSave = async () => {
    try {
      await updateDoc(doc(db, "units", editUnitId!), {
        ...editUnit,
        PosX: Number(editUnit.PosX),
        PosY: Number(editUnit.PosY),
      });
      setEditUnitId(null);
      fetchData();
    } catch (e) {
      alert("保存失敗: " + (e instanceof Error ? e.message : ""));
    }
  };
  const handleUnitDelete = async (id: string) => {
    if (!window.confirm("本当に削除しますか？")) return;
    try {
      await deleteDoc(doc(db, "units", id));
      fetchData();
    } catch (e) {
      alert("削除失敗: " + (e instanceof Error ? e.message : ""));
    }
  };

  const handleProblemEdit = (p: any) => {
    setEditProblemId(p.id);
    setEditProblem({ ...p });
  };
  const handleProblemEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditProblem({ ...editProblem, [e.target.name]: e.target.value });
  };
  const handleProblemEditSave = async () => {
    try {
      await updateDoc(doc(db, "problems", editProblemId!), {
        ...editProblem,
      });
      setEditProblemId(null);
      fetchData();
    } catch (e) {
      alert("保存失敗: " + (e instanceof Error ? e.message : ""));
    }
  };
  const handleProblemDelete = async (id: string) => {
    if (!window.confirm("本当に削除しますか？")) return;
    try {
      await deleteDoc(doc(db, "problems", id));
      fetchData();
    } catch (e) {
      alert("削除失敗: " + (e instanceof Error ? e.message : ""));
    }
  };

  return (
    <div style={{ marginTop: 40 }}>
      <h3>unitsコレクション一覧</h3>
      {loading ? (
        <div>読み込み中...</div>
      ) : error ? (
        <div style={{ color: "red" }}>{error}</div>
      ) : (
        <table border={1} cellPadding={6} style={{ marginBottom: 24 }}>
          <thead>
            <tr>
              <th>DocID</th>
              <th>DependsOn</th>
              <th>PosX</th>
              <th>PosY</th>
              <th>UnitName</th>
              <th>imagePath</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) =>
              editUnitId === u.id ? (
                <tr key={u.id} style={{ background: "#ffe" }}>
                  <td>{u.id}</td>
                  <td>
                    <input
                      name="DependsOn"
                      value={editUnit.DependsOn}
                      onChange={handleUnitEditChange}
                    />
                  </td>
                  <td>
                    <input
                      name="PosX"
                      value={editUnit.PosX}
                      onChange={handleUnitEditChange}
                    />
                  </td>
                  <td>
                    <input
                      name="PosY"
                      value={editUnit.PosY}
                      onChange={handleUnitEditChange}
                    />
                  </td>
                  <td>
                    <input
                      name="UnitName"
                      value={editUnit.UnitName}
                      onChange={handleUnitEditChange}
                    />
                  </td>
                  <td>
                    <input
                      name="imagePath"
                      value={editUnit.imagePath}
                      onChange={handleUnitEditChange}
                    />
                  </td>
                  <td>
                    <button onClick={handleUnitEditSave}>保存</button>
                    <button onClick={() => setEditUnitId(null)}>
                      キャンセル
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.DependsOn}</td>
                  <td>{u.PosX}</td>
                  <td>{u.PosY}</td>
                  <td>{u.UnitName}</td>
                  <td>{u.imagePath}</td>
                  <td>
                    <button onClick={() => handleUnitEdit(u)}>編集</button>
                    <button onClick={() => handleUnitDelete(u.id)}>削除</button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
      <h3>problemsコレクション一覧</h3>
      {loading ? (
        <div>読み込み中...</div>
      ) : error ? (
        <div style={{ color: "red" }}>{error}</div>
      ) : (
        <table border={1} cellPadding={6}>
          <thead>
            <tr>
              <th>DocID</th>
              <th>ProblemNumber</th>
              <th>UnitID</th>
              <th>page</th>
              <th>imagePath</th>
              <th>DependsOn</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {problems.map((p) =>
              editProblemId === p.id ? (
                <tr key={p.id} style={{ background: "#ffe" }}>
                  <td>{p.id}</td>
                  <td>
                    <input
                      name="ProblemNumber"
                      value={editProblem.ProblemNumber}
                      onChange={handleProblemEditChange}
                    />
                  </td>
                  <td>
                    <input
                      name="UnitID"
                      value={editProblem.UnitID}
                      onChange={handleProblemEditChange}
                    />
                  </td>
                  <td>
                    <input
                      name="page"
                      value={editProblem.page || ""}
                      onChange={handleProblemEditChange}
                    />
                  </td>
                  <td>
                    <input
                      name="imagePath"
                      value={editProblem.imagePath || ""}
                      onChange={handleProblemEditChange}
                    />
                  </td>
                  <td>
                    <input
                      name="DependsOn"
                      value={editProblem.DependsOn || ""}
                      onChange={handleProblemEditChange}
                    />
                  </td>
                  <td>
                    <button onClick={handleProblemEditSave}>保存</button>
                    <button onClick={() => setEditProblemId(null)}>
                      キャンセル
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.ProblemNumber}</td>
                  <td>{p.UnitID}</td>
                  <td>{p.page}</td>
                  <td>{p.imagePath}</td>
                  <td>{p.DependsOn}</td>
                  <td>
                    <button onClick={() => handleProblemEdit(p)}>編集</button>
                    <button onClick={() => handleProblemDelete(p.id)}>
                      削除
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

function UnitForm() {
  const [docId, setDocId] = useState("");
  const [unit, setUnit] = useState({
    DependsOn: "",
    PosX: "",
    PosY: "",
    UnitName: "",
    imagePath: "",
  });
  const [msg, setMsg] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUnit({ ...unit, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docId) return setMsg("ドキュメントIDを入力してください");
    try {
      await setDoc(doc(db, "units", docId), {
        ...unit,
        PosX: Number(unit.PosX),
        PosY: Number(unit.PosY),
      });
      setMsg("登録成功");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMsg("登録失敗: " + err.message);
      } else {
        setMsg("登録失敗: 不明なエラー");
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ border: "1px solid #ccc", padding: 16, marginBottom: 24 }}
    >
      <h3>units 登録</h3>
      <input
        placeholder="ドキュメントID (例: U001)"
        value={docId}
        onChange={(e) => setDocId(e.target.value)}
      />
      <input
        name="DependsOn"
        placeholder="DependsOn"
        value={unit.DependsOn}
        onChange={handleChange}
      />
      <input
        name="PosX"
        placeholder="PosX (数値)"
        value={unit.PosX}
        onChange={handleChange}
      />
      <input
        name="PosY"
        placeholder="PosY (数値)"
        value={unit.PosY}
        onChange={handleChange}
      />
      <input
        name="UnitName"
        placeholder="UnitName"
        value={unit.UnitName}
        onChange={handleChange}
      />
      <input
        name="imagePath"
        placeholder="imagePath (例: /images/physics/omori_tsuriai.png)"
        value={unit.imagePath}
        onChange={handleChange}
      />
      <button type="submit">登録</button>
      <div>{msg}</div>
    </form>
  );
}

function ProblemForm() {
  const [docId, setDocId] = useState("");
  const [problem, setProblem] = useState({
    ProblemNumber: "",
    UnitID: "",
    page: "",
    imagePath: "",
    DependsOn: "",
  });
  const [msg, setMsg] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProblem({ ...problem, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docId) return setMsg("ドキュメントIDを入力してください");
    try {
      await setDoc(doc(db, "problems", docId), {
        ...problem,
      });
      setMsg("登録成功");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMsg("登録失敗: " + err.message);
      } else {
        setMsg("登録失敗: 不明なエラー");
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ border: "1px solid #ccc", padding: 16 }}
    >
      <h3>problems 登録</h3>
      <input
        placeholder="ドキュメントID (例: P001-01)"
        value={docId}
        onChange={(e) => setDocId(e.target.value)}
      />
      <input
        name="ProblemNumber"
        placeholder="ProblemNumber"
        value={problem.ProblemNumber}
        onChange={handleChange}
      />
      <input
        name="UnitID"
        placeholder="UnitID"
        value={problem.UnitID}
        onChange={handleChange}
      />
      <input
        name="page"
        placeholder="page (例: 12)"
        value={problem.page}
        onChange={handleChange}
      />
      <input
        name="imagePath"
        placeholder="imagePath (例: /images/physics/problems/p001-01.png)"
        value={problem.imagePath}
        onChange={handleChange}
      />
      <input
        name="DependsOn"
        placeholder="DependsOn (例: U001,U002)"
        value={problem.DependsOn}
        onChange={handleChange}
      />
      <button type="submit">登録</button>
      <div>{msg}</div>
    </form>
  );
}

const ADMIN_UID = "IzbNbRAdETeV7MEZDVYnyFfXLl22";

import TeacherDashboard from "../../teacher-app/pages/index";

export default function ManagerPage() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [dashboardAuthed, setDashboardAuthed] = useState(false);
  const [dashboardPw, setDashboardPw] = useState("");
  const auth = getAuth(app);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, [auth]);

  const handleLogin = async () => {
    setError("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      setError("ログイン失敗: " + (e instanceof Error ? e.message : ""));
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // 管理者登録UI
  if (user && user.uid === ADMIN_UID) {
    return (
      <div style={{ maxWidth: 500, margin: "40px auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2>管理者用データ登録ページ</h2>
          <div>
            <span style={{ fontSize: 14, marginRight: 8 }}>{user.email}</span>
            <button onClick={handleLogout}>ログアウト</button>
          </div>
        </div>
        <UnitForm />
        <ProblemForm />
        <UnitsProblemsTable />
        <div
          style={{ marginTop: 40, borderTop: "1px solid #ccc", paddingTop: 24 }}
        >
          <h3>教員用ダッシュボード閲覧</h3>
          {dashboardAuthed ? (
            <TeacherDashboard />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (dashboardPw === "teacher") {
                  setDashboardAuthed(true);
                  setError("");
                } else {
                  setError("パスワードが違います");
                }
              }}
            >
              <input
                type="password"
                value={dashboardPw}
                onChange={(e) => setDashboardPw(e.target.value)}
                placeholder="パスワード"
                style={{ fontSize: 18, padding: 8 }}
              />
              <button type="submit" style={{ marginLeft: 12, fontSize: 18 }}>
                ログイン
              </button>
              {error && (
                <div style={{ color: "red", marginTop: 8 }}>{error}</div>
              )}
            </form>
          )}
        </div>
      </div>
    );
  }

  // 管理者以外
  if (!user) {
    return (
      <div style={{ padding: 40 }}>
        <h2>管理者ログイン</h2>
        <button onClick={handleLogin} style={{ fontSize: 18, padding: 8 }}>
          Googleでログイン
        </button>
        {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
        <div
          style={{ marginTop: 40, borderTop: "1px solid #ccc", paddingTop: 24 }}
        >
          <h3>教員用ダッシュボード閲覧</h3>
          {dashboardAuthed ? (
            <TeacherDashboard />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (dashboardPw === "teacher") {
                  setDashboardAuthed(true);
                  setError("");
                } else {
                  setError("パスワードが違います");
                }
              }}
            >
              <input
                type="password"
                value={dashboardPw}
                onChange={(e) => setDashboardPw(e.target.value)}
                placeholder="パスワード"
                style={{ fontSize: 18, padding: 8 }}
              />
              <button type="submit" style={{ marginLeft: 12, fontSize: 18 }}>
                ログイン
              </button>
              {error && (
                <div style={{ color: "red", marginTop: 8 }}>{error}</div>
              )}
            </form>
          )}
        </div>
      </div>
    );
  }

  // ログイン済みだが管理者でない
  return (
    <div style={{ padding: 40 }}>
      <h2>管理者権限がありません</h2>
      <div style={{ margin: "16px 0" }}>ログイン中: {user.email}</div>
      <button onClick={handleLogout}>ログアウト</button>
      <div
        style={{ marginTop: 40, borderTop: "1px solid #ccc", paddingTop: 24 }}
      >
        <h3>教員用ダッシュボード閲覧</h3>
        {dashboardAuthed ? (
          <TeacherDashboard />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (dashboardPw === "teacher") {
                setDashboardAuthed(true);
                setError("");
              } else {
                setError("パスワードが違います");
              }
            }}
          >
            <input
              type="password"
              value={dashboardPw}
              onChange={(e) => setDashboardPw(e.target.value)}
              placeholder="パスワード"
              style={{ fontSize: 18, padding: 8 }}
            />
            <button type="submit" style={{ marginLeft: 12, fontSize: 18 }}>
              ログイン
            </button>
            {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
          </form>
        )}
      </div>
    </div>
  );
}
