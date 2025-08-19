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
import { AppState, ProblemRecord } from "./Flowchart"; // Flowchart.tsxから型定義をインポート

// --- Propsの型定義 ---
interface DetailPanelProps {
  user: User;
  unitId: string;
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  onClose: () => void;
}

// --- コンポーネント本体 ---
export default function DetailPanel({
  user,
  unitId,
  appState,
  setAppState,
  onClose,
}: DetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [localRecords, setLocalRecords] = useState(appState.records);

  // appState.recordsが外部から更新されたら、ローカルの表示も同期する
  useEffect(() => {
    setLocalRecords(appState.records);
  }, [appState.records]);

  const unit = appState.units.find((u) => u.id === unitId);
  const unitProblems = appState.problems.filter((p) => p.UnitID === unitId);

  const scsReasonOptions = {
    "正解（微妙）": ["たまたま解けた", "時間がかかってしまった"],
    "不正解（惜しい）": [
      "解き方をギリギリ思い出せなかった",
      "防げた計算ミスがあった",
    ],
  };

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
    let newPriority = parseFloat(newRecords[problemId].probremPriority);

    const currentProblem = appState.problems.find((p) => p.id === problemId);
    if (!currentProblem) return newRecords;
    const currentUnit = appState.units.find(
      (u) => u.id === currentProblem.UnitID
    );
    if (!currentUnit) return newRecords;

    const getProblemsInUnits = (unitIds: string[]) => {
      return appState.problems
        .filter((p) => unitIds.includes(p.UnitID))
        .map((p) => p.id);
    };

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
    if (!scs) return alert("理解状況を選択してください。");
    if ((scs === "正解（微妙）" || scs === "不正解（惜しい）") && !scsReason) {
      return alert("理解状況の詳細を選択してください。");
    }
    setLoading(true);
    try {
      const updatedRecords = calculateAllPriorities(problemId, scs, scsReason);
      const { updatedUnitPriorities } = calculateUnitPriorities(
        problemId,
        updatedRecords
      );

      // --- 修正点: UIを即時反映させる ---
      setLocalRecords(updatedRecords); // ローカルの表示をすぐに更新

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

      // --- 修正点: 親コンポーネントの全体の状態を更新 ---
      setAppState((prevState) => ({
        ...prevState,
        records: updatedRecords,
        unitPriorities: {
          ...prevState.unitPriorities,
          ...updatedUnitPriorities,
        },
      }));
    } catch (error) {
      console.error("記録エラー:", error);
      alert("記録中にエラーが発生しました。");
      setLocalRecords(appState.records); // エラー時は元の状態に戻す
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
          <button id="close-detail" title="閉じる" onClick={onClose}>
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
                  };
                  const historyArr = Array.isArray(
                    appState.records[problem.id]?.history
                  )
                    ? appState.records[problem.id].history
                    : [];
                  const lastRecord = historyArr.slice(-1)[0] || {};
                  const displayPriority =
                    record.attempts > 0
                      ? record.probremPriority.toFixed(1)
                      : "不明";

                  return (
                    <tr key={problem.id}>
                      <td>{problem.ProblemNumber}</td>
                      <td>
                        <select className="scs-select">
                          <option value=""></option>
                          <option value="正解（完璧）">😀 正解（完璧）</option>
                          <option value="正解（微妙）">🙂 正解（微妙）</option>
                          <option value="不正解（惜しい）">
                            🤔 不正解（惜しい）
                          </option>
                          <option value="不正解（まだまだ）">
                            😥 不正解（まだまだ）
                          </option>
                        </select>
                        <div className="previous-record">
                          前回: {lastRecord?.scs || "記録なし"}
                        </div>
                      </td>
                      <td>
                        <select className="scsReason-select"></select>
                        <div className="previous-record">
                          {lastRecord?.scsReason || ""}
                        </div>
                      </td>
                      <td className="problemPriority-display">
                        {displayPriority}
                      </td>
                      <td className="attempts-count">{record.attempts}</td>
                      <td>
                        <button
                          className="record-btn"
                          disabled={loading}
                          onClick={(e) => {
                            const row = e.currentTarget.closest("tr");
                            if (row) {
                              const scs = (
                                row.querySelector(
                                  ".scs-select"
                                ) as HTMLSelectElement
                              ).value;
                              const scsReason = (
                                row.querySelector(
                                  ".scsReason-select"
                                ) as HTMLSelectElement
                              ).value;
                              handleRecord(problem.id, scs, scsReason);
                            }
                          }}
                        >
                          {loading ? "記録中..." : "記録"}
                        </button>
                      </td>
                    </tr>
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
