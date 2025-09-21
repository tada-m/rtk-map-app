"use client";

import { useEffect, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { db } from "../../firebase/clientAppPhysics";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  getFirestore,
} from "firebase/firestore";

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

interface UserData {
  uid: string;
  email: string;
  studentId?: string;
  name?: string;
  class?: string;
  learningLog: any[];
  problemRecords: any[];
  unitPriorities: any[];
  problemRecordsDocNames?: string[];
  unitPrioritiesDocNames?: string[];
}

function TeacherDashboard() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // 問題・ユニットのID→表示名マップ
  const [problemIdMap, setProblemIdMap] = useState<{ [id: string]: string }>(
    {}
  );
  const [unitIdMap, setUnitIdMap] = useState<{ [id: string]: string }>({});
  const [allUnitPriorities, setAllUnitPriorities] = useState<
    { id: string; name: string; priority: number }[]
  >([]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      // problems, unitsのID→表示名マップを作成
      const problemsSnap = await getDocs(collection(db, "problems"));
      const problemMap: { [id: string]: string } = {};
      problemsSnap.forEach((doc) => {
        const data = doc.data();
        problemMap[doc.id] = data.ProblemNumber || doc.id;
      });
      setProblemIdMap(problemMap);

      const unitsSnap = await getDocs(collection(db, "units"));
      const unitMap: { [id: string]: string } = {};
      const allUnits: { id: string; name: string; priority: number }[] = [];
      unitsSnap.forEach((doc) => {
        const data = doc.data();
        unitMap[doc.id] = data.UnitName || doc.id;
        allUnits.push({
          id: doc.id,
          name: data.UnitName || doc.id,
          priority: 0,
        });
      });
      setUnitIdMap(unitMap);

      // 各ユーザーのunitPriorities取得後、全unitのpriorityを集計
      const usersCol = collection(db, "users");
      const usersSnap = await getDocs(usersCol);
      const userList: UserData[] = [];
      // unitId→priority[]
      const unitPriorityMap: { [id: string]: number[] } = {};
      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        // studentData対応
        const studentId =
          userData.studentData?.studentId || userData.studentId || "";
        const name = userData.studentData?.name || userData.name || "";
        const studentClass =
          userData.studentData?.class || userData.class || "";
        // learningLog
        const learningLogSnap = await getDocs(
          collection(userDoc.ref, "learningLog")
        );
        const learningLog = learningLogSnap.docs.map((d) => {
          const log = d.data();
          // problemIdをProblemNumberに変換
          return {
            ...log,
            problemId: problemMap[log.problemId] || log.problemId,
          };
        });
        // problemRecords
        const problemRecordsSnap = await getDocs(
          collection(userDoc.ref, "problemRecords")
        );
        const problemRecords = problemRecordsSnap.docs.map((d) => d.data());
        const problemRecordsDocNames = problemRecordsSnap.docs.map(
          (d) => problemMap[d.id] || d.id
        );
        // unitPriorities
        const unitPrioritiesSnap = await getDocs(
          collection(userDoc.ref, "unitPriorities")
        );
        const unitPriorities = unitPrioritiesSnap.docs.map((d) => d.data());
        const unitPrioritiesDocNames = unitPrioritiesSnap.docs.map(
          (d) => unitMap[d.id] || d.id
        );
        // 集計用: unitIdごとにpriorityを配列で保存
        unitPrioritiesSnap.docs.forEach((d) => {
          const unitId = d.id;
          const priority = d.data().priority;
          if (!unitPriorityMap[unitId]) unitPriorityMap[unitId] = [];
          unitPriorityMap[unitId].push(priority);
        });
        userList.push({
          uid: userDoc.id,
          email: userData.email || "(no email)",
          studentId,
          name,
          class: studentClass,
          learningLog,
          problemRecords,
          problemRecordsDocNames,
          unitPriorities,
          unitPrioritiesDocNames,
        });
      }
      // 各unitのpriority平均を計算
      const allUnitsWithPriority = allUnits.map((u) => {
        const arr = unitPriorityMap[u.id] || [];
        const avg =
          arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        return { ...u, priority: avg };
      });
      setAllUnitPriorities(allUnitsWithPriority);
      setUsers(userList);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  // 検索フィルタ（部分一致: クラス・学籍番号・名前）
  const filteredUsers = users.filter((u) => {
    const s = search.trim().toLowerCase();
    return (
      (u.class && u.class.toLowerCase().includes(s)) ||
      (u.studentId && u.studentId.toLowerCase().includes(s)) ||
      (u.name && u.name.toLowerCase().includes(s))
    );
  });

  if (authLoading) return <div>Loading...</div>;
  if (!user) {
    return (
      <div style={{ padding: 24 }}>
        <h1>教員用ダッシュボード</h1>
        <button
          onClick={async () => {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(getAuth(), provider);
          }}
          style={{
            fontSize: 18,
            padding: "10px 24px",
            background: "#4285F4",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Googleアカウントでログイン
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>教員用ダッシュボード</h1>
      {/* 全unitのpriorityデバッグ表示 */}
      <div style={{ marginBottom: 24 }}>
        <h3>全unitのpriority（全ユーザー平均）</h3>
        <table border={1} cellPadding={6} style={{ marginBottom: 12 }}>
          <thead>
            <tr>
              <th>UnitID</th>
              <th>UnitName</th>
              <th>priority（平均）</th>
            </tr>
          </thead>
          <tbody>
            {allUnitPriorities.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.name}</td>
                <td>{u.priority.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="クラス・学籍番号・名前で検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ fontSize: 16, padding: 6, width: 260 }}
        />
      </div>
      {loading ? (
        <div>読み込み中...</div>
      ) : selectedUser ? (
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => setSelectedUser(null)}
            style={{ marginBottom: 12 }}
          >
            ← 一覧に戻る
          </button>
          <h2>
            {selectedUser.name || "(名前なし)"}（{selectedUser.studentId || "-"}
            ）{selectedUser.class ? ` / クラス: ${selectedUser.class}` : ""}
          </h2>
          <div>メール: {selectedUser.email}</div>
          <div style={{ marginTop: 24 }}>
            <h3>learningLog</h3>
            <LearningLogTable data={selectedUser.learningLog} />
            <h3>problemRecords</h3>
            <ProblemRecordsTable
              data={selectedUser.problemRecords}
              docNames={selectedUser.problemRecordsDocNames || []}
            />
            <h3>unitPriorities</h3>
            <UnitPrioritiesTable
              data={selectedUser.unitPriorities}
              docNames={selectedUser.unitPrioritiesDocNames || []}
            />
          </div>
        </div>
      ) : (
        <table border={1} cellPadding={8}>
          <thead>
            <tr>
              <th>学籍番号</th>
              <th>名前</th>
              <th>クラス</th>
              <th>メールアドレス</th>
              <th>学習記録件数</th>
              <th>問題記録件数</th>
              <th>詳細</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.uid}>
                <td>{user.studentId}</td>
                <td>{user.name}</td>
                <td>{user.class}</td>
                <td>{user.email}</td>
                <td>{user.learningLog.length}</td>
                <td>{user.problemRecords.length}</td>
                <td>
                  <button onClick={() => setSelectedUser(user)}>表示</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// learningLogテーブル
function LearningLogTable({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div>データなし</div>;
  return (
    <table
      border={1}
      cellPadding={6}
      style={{ marginBottom: 24, width: "100%" }}
    >
      <thead>
        <tr>
          <th>problemId</th>
          <th>probremPriority</th>
          <th>scs</th>
          <th>scsReason</th>
          <th>timestamp</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            <td>{row.problemId || ""}</td>
            <td>{row.probremPriority ?? ""}</td>
            <td>{row.scs || ""}</td>
            <td>{row.scsReason || ""}</td>
            <td>
              {row.timestamp
                ? row.timestamp.seconds
                  ? new Date(row.timestamp.seconds * 1000)
                      .toISOString()
                      .replace("T", " ")
                      .slice(0, 19)
                  : String(row.timestamp)
                : ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// problemRecordsテーブル
function ProblemRecordsTable({
  data,
  docNames,
}: {
  data: any[];
  docNames: string[];
}) {
  if (!data || data.length === 0) return <div>データなし</div>;
  return (
    <table
      border={1}
      cellPadding={6}
      style={{ marginBottom: 24, width: "100%" }}
    >
      <thead>
        <tr>
          <th>ドキュメント名</th>
          <th>attempts</th>
          <th>probremPriority</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            <td>{docNames[i]}</td>
            <td>{row.attempts ?? ""}</td>
            <td>{row.probremPriority ?? ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// unitPrioritiesテーブル
function UnitPrioritiesTable({
  data,
  docNames,
}: {
  data: any[];
  docNames: string[];
}) {
  if (!data || data.length === 0) return <div>データなし</div>;
  return (
    <table
      border={1}
      cellPadding={6}
      style={{ marginBottom: 24, width: "100%" }}
    >
      <thead>
        <tr>
          <th>ドキュメント名</th>
          <th>priority</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            <td>{docNames[i]}</td>
            <td>{row.priority ?? ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
