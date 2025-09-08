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
import { db } from "../firebase/clientAppPhysics";
import { AppState, ProblemRecord, Unit, Problem } from "./FlowchartPhysics";

interface DetailPanelPhysicsProps {
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
    setScsReason("");
    setAvailableReasons(
      scsReasonOptions[newScs as keyof typeof scsReasonOptions] || []
    );
  };

  const displayPriority =
    record.attempts > 0 || record.probremPriority > 0
      ? record.probremPriority.toFixed(1)
      : "不明";

  const [, forceUpdate] = useState({});
  const handleRecordClick = async () => {
    const result: boolean = await handleRecord(problem.id, scs, scsReason);
    if (!result) return;
    if (record && record.history) {
      record.history.push({ scs, scsReason, timestamp: new Date() });
      forceUpdate({});
    }
    setIsRecorded(true);
    setTimeout(() => setFade(true), 1200);
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
          <option value="正解（完璧）"> ⭕（😀完璧）</option>
          <option value="正解（微妙）"> ⭕（🙂微妙）</option>
          <option value="不正解（惜しい）"> ❌（🤔惜しい）</option>
          <option value="不正解（まだまだ）"> ❌（😥まだまだ）</option>
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

export default function DetailPanelPhysics({
  user,
  unitId,
  appState,
  setAppState,
  onClose,
}: DetailPanelPhysicsProps) {
  const [loading, setLoading] = useState(false);
  const [localRecords, setLocalRecords] = useState(appState.records);
  const [panelKey, setPanelKey] = useState(0);

  useEffect(() => {
    setLocalRecords(appState.records);
  }, [appState.records]);

  const handleClose = () => {
    setPanelKey((k) => k + 1);
    onClose();
  };

  const unit = appState.units.find((u) => u.id === unitId);
  const unitProblems = appState.problems.filter((p) => p.UnitID === unitId);

  // 画像パスはunit.imagePathをそのまま使う
  const getImagePath = (unit: Unit) => {
    if (!unit.imagePath) return undefined;
    return unit.imagePath;
  };

  // --- 数学版と同じロジック ---
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
    newRecords[problemId].attempts = (newRecords[problemId].attempts || 0) + 1;
    let newPriority = newRecords[problemId].probremPriority;
    const currentProblem = appState.problems.find((p) => p.id === problemId);
    if (!currentProblem) return newRecords;
    const currentUnit = appState.units.find(
      (u) => u.id === currentProblem.UnitID
    );
    if (!currentUnit) return newRecords;

    if (newScs === "正解（完璧）") {
      newPriority = 0;
      if (newRecords[problemId].history) {
        newRecords[problemId].history.push({
          scs: "正解（完璧）",
          scsReason: newScsReason,
          timestamp: new Date(),
        });
      } else {
        newRecords[problemId].history = [
          {
            scs: "正解（完璧）",
            scsReason: newScsReason,
            timestamp: new Date(),
          },
        ];
      }
    }
    if (newScsReason === "たまたま解けた") {
      newPriority = Math.min(newPriority + 1, 4);
      if (newRecords[problemId].history) {
        newRecords[problemId].history.push({
          scs: newScs,
          scsReason: newScsReason,
          timestamp: new Date(),
        });
      } else {
        newRecords[problemId].history = [
          { scs: newScs, scsReason: newScsReason, timestamp: new Date() },
        ];
      }
      for (const p of appState.problems) {
        if (p.UnitID === currentUnit.id && p.id !== problemId) {
          const record = newRecords[p.id];
          if (
            !record ||
            (record.attempts === 0 &&
              (!record.history || record.history.length === 0))
          ) {
            newRecords[p.id] = {
              attempts: 0,
              history: [],
              probremPriority: 1,
            };
            continue;
          }
          const lastScs =
            record.history && record.history.length > 0
              ? record.history[record.history.length - 1].scs
              : undefined;
          if (lastScs !== "正解（完璧）") {
            record.probremPriority = Math.min(record.probremPriority + 1, 4);
          }
        }
      }
    }
    if (newScsReason === "時間がかかってしまった") {
      newPriority = Math.min(newPriority + 1, 4);
      if (newRecords[problemId].history) {
        newRecords[problemId].history.push({
          scs: newScs,
          scsReason: newScsReason,
          timestamp: new Date(),
        });
      } else {
        newRecords[problemId].history = [
          { scs: newScs, scsReason: newScsReason, timestamp: new Date() },
        ];
      }
    }
    if (newScsReason === "防げた計算ミスがあった") {
      newPriority = Math.min(newPriority + 1, 4);
      if (newRecords[problemId].history) {
        newRecords[problemId].history.push({
          scs: newScs,
          scsReason: newScsReason,
          timestamp: new Date(),
        });
      } else {
        newRecords[problemId].history = [
          { scs: newScs, scsReason: newScsReason, timestamp: new Date() },
        ];
      }
    }
    if (newScsReason === "解き方をギリギリ思い出せなかった") {
      newPriority = Math.min(newPriority + 2, 4);
      const relatedUnitIds = [currentUnit.id];
      if (currentUnit.DependsOn) {
        relatedUnitIds.push(
          ...String(currentUnit.DependsOn)
            .split(",")
            .map((id) => id.trim())
        );
      }
      for (const p of appState.problems) {
        if (relatedUnitIds.includes(p.UnitID) && p.id !== problemId) {
          const record = newRecords[p.id];
          if (
            !record ||
            (record.attempts === 0 &&
              (!record.history || record.history.length === 0))
          ) {
            newRecords[p.id] = {
              attempts: 0,
              history: [],
              probremPriority: 1,
            };
            continue;
          }
          const lastScs =
            record.history && record.history.length > 0
              ? record.history[record.history.length - 1].scs
              : undefined;
          if (lastScs !== "正解（完璧）") {
            record.probremPriority = Math.min(record.probremPriority + 1, 4);
          }
        }
      }
    }
    if (newScs === "不正解（まだまだ）") {
      newPriority = Math.min(newPriority + 2, 4);
      const relatedUnitIds = [currentUnit.id];
      if (currentUnit.DependsOn) {
        relatedUnitIds.push(
          ...String(currentUnit.DependsOn)
            .split(",")
            .map((id) => id.trim())
        );
      }
      for (const p of appState.problems) {
        if (relatedUnitIds.includes(p.UnitID) && p.id !== problemId) {
          const record = newRecords[p.id];
          if (
            !record ||
            (record.attempts === 0 &&
              (!record.history || record.history.length === 0))
          ) {
            newRecords[p.id] = {
              attempts: 0,
              history: [],
              probremPriority: 1,
            };
            continue;
          }
          const lastScs =
            record.history && record.history.length > 0
              ? record.history[record.history.length - 1].scs
              : undefined;
          if (lastScs !== "正解（完璧）") {
            record.probremPriority = Math.min(record.probremPriority + 1, 4);
          }
        }
      }
    }
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
        if (
          updatedRecords[pid] &&
          (updatedRecords[pid].probremPriority > 0 ||
            (updatedRecords[pid].attempts || 0) > 0)
        ) {
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
      alert("正解・不正解を選択してください。");
      return false;
    }
    if ((scs === "正解（微妙）" || scs === "不正解（惜しい）") && !scsReason) {
      alert("理解状況を選択してください。");
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
              <img
                id="detail-image"
                src={getImagePath(unit)}
                alt={unit.UnitName}
              />
            </div>
          )}
          <h3>問題リスト</h3>
          <div className="table-wrapper">
            <table id="problem-table">
              <thead>
                <tr>
                  <th>問題番号</th>
                  <th>正解・不正解</th>
                  <th>理解状況</th>
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
