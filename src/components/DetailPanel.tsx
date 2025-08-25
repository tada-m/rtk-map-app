"use client";

import { useState, useEffect } from "react";
import {
  doc,
  collection,
  writeBatch,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import { User } from "firebase/auth";
import { db } from "../firebase/clientApp";
import { AppState, ProblemRecord, Unit, Problem } from "./Flowchart"; // Flowchart.tsxから型定義をインポート

// --- Propsの型定義 ---
interface DetailPanelProps {
  user: User;
  unitId: string;
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  onClose: () => void;
}

interface ProblemRowProps {
  problem: Problem;
  record: ProblemRecord;
  lastRecord: any;
  handleRecord: (
    problemId: string,
    scs: string,
    scsReason: string
  ) => Promise<boolean>;
  loading: boolean;
}

const scsReasonOptions = {
  "正解（微妙）": ["たまたま解けた", "時間がかかってしまった"],
  "不正解（惜しい）": [
    "解き方をギリギリ思い出せなかった",
    "防げた計算ミスがあった",
  ],
};

// --- 各問題行を管理するサブコンポーネント ---
function ProblemRow({
  problem,
  record,
  lastRecord,
  handleRecord,
  loading,
}: ProblemRowProps) {
  const [scs, setScs] = useState("");
  const [scsReason, setScsReason] = useState("");
  const [availableReasons, setAvailableReasons] = useState<string[]>([]);
  const [isRecorded, setIsRecorded] = useState(false);
  const [fade, setFade] = useState(false);

  // DetailPanelの再表示時にリセット
  useEffect(() => {
    setIsRecorded(false);
    setFade(false);
    setScs("");
    setScsReason("");
    setAvailableReasons([]);
  }, [problem.id]);

  const handleScsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newScs = e.target.value;
    setScs(newScs);
    setScsReason(""); // 理由をリセット
    setAvailableReasons(
      scsReasonOptions[newScs as keyof typeof scsReasonOptions] || []
    );
  };

  const displayPriority =
    record.attempts > 0 ? record.probremPriority.toFixed(1) : "不明";

  const [, forceUpdate] = useState({});
  const handleRecordClick = async () => {
    const result: boolean = await handleRecord(problem.id, scs, scsReason);
    if (!result) return; // エラー時は何もしない
    // 記録直後にrecord.historyへ即時push（localRecordsの参照を利用）
    if (record && record.history) {
      record.history.push({ scs, scsReason, timestamp: new Date() });
      forceUpdate({}); // 強制再レンダリング
    }
    // 入力値はリセットしない
    setIsRecorded(true);
    setTimeout(() => setFade(true), 1200); // 1.2秒後にフェードアウト
  };

  return (
    <tr>
      <td>{problem.ProblemNumber}</td>
      <td>
        <select
          className="scs-select"
          value={scs}
          onChange={handleScsChange}
          disabled={isRecorded}
        >
          <option value=""></option>
          <option value="正解（完璧）">😀 正解（完璧）</option>
          <option value="正解（微妙）">🙂 正解（微妙）</option>
          <option value="不正解（惜しい）">🤔 不正解（惜しい）</option>
          <option value="不正解（まだまだ）">😥 不正解（まだまだ）</option>
        </select>
        <div className="previous-record">
          前回: {lastRecord?.scs || "記録なし"}
        </div>
      </td>
      <td>
        <select
          className="scsReason-select"
          value={scsReason}
          onChange={(e) => setScsReason(e.target.value)}
          disabled={availableReasons.length === 0 || isRecorded}
        >
          <option value=""></option>
          {availableReasons.map((reason) => (
            <option key={reason} value={reason}>
              {reason}
            </option>
          ))}
        </select>
        <div className="previous-record">{lastRecord?.scsReason || ""}</div>
      </td>
      <td className="problemPriority-display">{displayPriority}</td>
      <td className="attempts-count">{record.attempts}</td>
      <td>
        <button
          className={`record-btn${isRecorded ? " recorded" : ""}${
            fade ? " fade" : ""
          }`}
          disabled={loading || isRecorded}
          onClick={handleRecordClick}
          style={
            isRecorded
              ? { background: "#ccc", color: "#888", cursor: "not-allowed" }
              : {}
          }
        >
          {isRecorded ? "記録完了" : loading ? "記録中..." : "記録"}
        </button>
      </td>
    </tr>
  );
}

// --- DetailPanelコンポーネント本体 ---
export default function DetailPanel({
  user,
  unitId,
  appState,
  setAppState,
  onClose,
}: DetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [localRecords, setLocalRecords] = useState(appState.records);
  const [panelKey, setPanelKey] = useState(0); // DetailPanel再表示用

  useEffect(() => {
    setLocalRecords(appState.records);
  }, [appState.records]);

  // タブを閉じたらProblemRowの状態をリセットするためkeyを更新
  const handleClose = () => {
    setPanelKey((k) => k + 1);
    onClose();
  };

  const unit = appState.units.find((u) => u.id === unitId);
  const unitProblems = appState.problems.filter((p) => p.UnitID === unitId);

  const calculateAllPriorities = (
    problemId: string,
    newScs: string,
    newScsReason: string
  ) => {
    const newRecords: AppState["records"] = JSON.parse(
      JSON.stringify(localRecords)
    );
    if (!newRecords[problemId]) {
      newRecords[problemId] = { attempts: 0, history: [], probremPriority: 0 };
    }
    // 記録直後のattemptsをインクリメント
    newRecords[problemId].attempts = (newRecords[problemId].attempts || 0) + 1;
    let newPriority = newRecords[problemId].probremPriority;
    const currentProblem = appState.problems.find((p) => p.id === problemId);
    if (!currentProblem) return newRecords;
    const currentUnit = appState.units.find(
      (u) => u.id === currentProblem.UnitID
    );
    if (!currentUnit) return newRecords;

    if (newScs === "正解（完璧）") newPriority = 0;
    if (newScsReason === "たまたま解けた")
      newPriority = Math.min(newPriority + 1, 4);
    if (newScsReason === "時間がかかってしまった")
      newPriority = Math.min(newPriority + 1, 4);
    if (newScsReason === "防げた計算ミスがあった")
      newPriority = Math.min(newPriority + 1, 4);
    if (newScsReason === "解き方をギリギリ思い出せなかった")
      newPriority = Math.min(newPriority + 2, 4);
    if (newScs === "不正解（まだまだ）")
      newPriority = Math.min(newPriority + 2, 4);

    newRecords[problemId].probremPriority = newPriority;
    return newRecords;
  };

  const calculateUnitPriorities = (
    problemId: string,
    updatedRecords: AppState["records"]
  ) => {
    const updatedUnitPriorities: { [unitId: string]: number } = {};
    const problemToUnitMap = appState.problems.reduce((map, p) => {
      map[p.id] = p.UnitID;
      return map;
    }, {} as { [key: string]: string });
    const unitMap = appState.units.reduce((map, u) => {
      map[u.id] = u;
      return map;
    }, {} as { [key: string]: any });

    const currentUnitId = problemToUnitMap[problemId];
    const currentUnit = unitMap[currentUnitId];
    const unitsToUpdate = [currentUnitId];
    if (currentUnit.DependsOn) {
      unitsToUpdate.push(
        ...String(currentUnit.DependsOn)
          .split(",")
          .map((id) => id.trim())
      );
    }
    const uniqueUnitsToUpdate = [...new Set(unitsToUpdate)];

    for (const unitId of uniqueUnitsToUpdate) {
      const problemsInUnit = appState.problems
        .filter((p) => p.UnitID === unitId)
        .map((p) => p.id);
      let sum = 0;
      let count = 0;
      problemsInUnit.forEach((pid) => {
        if (updatedRecords[pid] && (updatedRecords[pid].attempts || 0) > 0) {
          sum += updatedRecords[pid].probremPriority;
          count++;
        }
      });
      if (count > 0) {
        updatedUnitPriorities[unitId] = Math.min(sum / count, 4);
      }
    }
    return { updatedUnitPriorities };
  };

  const handleRecord = async (
    problemId: string,
    scs: string,
    scsReason: string
  ) => {
    if (!scs) {
      alert("理解状況を選択してください。");
      return false;
    }
    if ((scs === "正解（微妙）" || scs === "不正解（惜しい）") && !scsReason) {
      alert("理解状況の詳細を選択してください。");
      return false;
    }
    setLoading(true);
    try {
      const updatedRecords = calculateAllPriorities(problemId, scs, scsReason);
      const { updatedUnitPriorities } = calculateUnitPriorities(
        problemId,
        updatedRecords
      );

      setLocalRecords(updatedRecords);

      const userDocRef = doc(db, "users", user.uid);
      const batch = writeBatch(db);

      const logRef = doc(collection(userDocRef, "learningLog"));
      batch.set(logRef, {
        problemId,
        scs,
        scsReason,
        probremPriority: updatedRecords[problemId].probremPriority,
        timestamp: serverTimestamp(),
      });

      const problemRecordRef = doc(userDocRef, "problemRecords", problemId);
      batch.set(
        problemRecordRef,
        {
          probremPriority: updatedRecords[problemId].probremPriority,
          attempts: (appState.records[problemId]?.attempts || 0) + 1,
          history: arrayUnion({ scs, scsReason, timestamp: new Date() }),
        },
        { merge: true }
      );

      Object.keys(updatedUnitPriorities).forEach((uid) => {
        const unitPriorityRef = doc(userDocRef, "unitPriorities", uid);
        batch.set(unitPriorityRef, { priority: updatedUnitPriorities[uid] });
      });

      await batch.commit();

      setAppState((prevState) => ({
        ...prevState,
        records: updatedRecords,
        unitPriorities: {
          ...prevState.unitPriorities,
          ...updatedUnitPriorities,
        },
      }));
      return true;
    } catch (error) {
      console.error("記録エラー:", error);
      alert("記録中にエラーが発生しました。");
      setLocalRecords(appState.records);
      return false;
    } finally {
      setLoading(false);
    }
  };

  if (!unit) return null;

  return (
    <div id="detail-panel">
      <div className="panel-content">
        <div id="detail-header">
          <h2 id="detail-unit-name">{unit.UnitName}</h2>
          <button id="close-detail" title="閉じる" onClick={handleClose}>
            ×
          </button>
        </div>
        <div id="detail-body">
          {unit.imagePath && (
            <div id="detail-image-container">
              <img id="detail-image" src={unit.imagePath} alt={unit.UnitName} />
            </div>
          )}
          <h3>問題リスト</h3>
          <div className="table-wrapper">
            <table id="problem-table">
              <thead>
                <tr>
                  <th>問題番号</th>
                  <th>理解状況 (SCS)</th>
                  <th>理解状況の詳細</th>
                  <th>復習優先度</th>
                  <th>解いた回数</th>
                  <th>アクション</th>
                </tr>
              </thead>
              <tbody>
                {unitProblems.map((problem) => {
                  const record = localRecords[problem.id] || {
                    attempts: 0,
                    probremPriority: 0,
                    history: [],
                  };
                  const lastRecord = record.history?.slice(-1)[0] || {};

                  return (
                    <ProblemRow
                      key={problem.id + "-" + panelKey}
                      problem={problem}
                      record={record}
                      lastRecord={lastRecord}
                      handleRecord={handleRecord}
                      loading={loading}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
