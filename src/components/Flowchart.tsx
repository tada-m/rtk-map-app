"use client";

import { useState, useEffect, useRef } from "react";
import { collection, doc, getDocs } from "firebase/firestore";
import { User } from "firebase/auth";
import { db } from "../firebase/clientApp";
import DetailPanel from "./DetailPanel";

// --- 型定義 (エクスポートしてDetailPanelでも使えるように) ---
export interface Unit {
  id: string;
  UnitName: string;
  DependsOn?: string;
  PosX: number;
  PosY: number;
  imagePath?: string;
}

export interface Problem {
  id: string;
  UnitID: string;
  ProblemNumber: number;
}

export interface ProblemRecord {
  attempts: number;
  probremPriority: number;
  history: { scs: string; scsReason: string; timestamp: any }[];
}

export interface AppState {
  units: Unit[];
  problems: Problem[];
  records: { [problemId: string]: ProblemRecord };
  unitPriorities: { [unitId: string]: number };
}

interface FlowchartProps {
  user: User;
}

// --- コンポーネント本体 ---
export default function Flowchart({ user }: FlowchartProps) {
  const [appState, setAppState] = useState<AppState>({
    units: [],
    problems: [],
    records: {},
    unitPriorities: {},
  });
  const [loading, setLoading] = useState(true);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const linesRef = useRef<any[]>([]);

  useEffect(() => {
    const initialize = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const unitsSnapshot = await getDocs(collection(db, "units"));
        const units = unitsSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Unit)
        );

        const problemsSnapshot = await getDocs(collection(db, "problems"));
        const problems = problemsSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Problem)
        );

        const userDocRef = doc(db, "users", user.uid);
        const problemRecordsSnapshot = await getDocs(
          collection(userDocRef, "problemRecords")
        );
        const records: { [problemId: string]: ProblemRecord } = {};
        problemRecordsSnapshot.forEach((doc) => {
          records[doc.id] = doc.data() as ProblemRecord;
        });

        const unitPrioritiesSnapshot = await getDocs(
          collection(userDocRef, "unitPriorities")
        );
        const unitPriorities: { [unitId: string]: number } = {};
        unitPrioritiesSnapshot.forEach((doc) => {
          unitPriorities[doc.id] = doc.data().priority;
        });

        setAppState({ units, problems, records, unitPriorities });
      } catch (error) {
        console.error("Initialization failed:", error);
        alert("データの読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, [user]);

  useEffect(() => {
    linesRef.current.forEach((line) => line.remove());
    linesRef.current = [];
    if (appState.units.length > 0 && !loading) {
      import("leader-line-new").then((LeaderLine) => {
        appState.units.forEach((unit) => {
          if (unit.DependsOn) {
            const targetNode = document.getElementById(unit.id);
            const dependencyIds = String(unit.DependsOn).split(",");
            dependencyIds.forEach((depId) => {
              const startNode = document.getElementById(depId.trim());
              if (startNode && targetNode) {
                const line = new LeaderLine.default(startNode, targetNode, {
                  color: "rgba(0, 0, 0, 0.6)",
                  size: 2,
                  path: "straight", //grid or straight
                  endPlug: "arrow1",
                  dropShadow: true,
                });
                linesRef.current.push(line);
              }
            });
          }
        });
      });
    }
    return () => {
      linesRef.current.forEach((line) => line.remove());
      linesRef.current = [];
    };
  }, [appState.units, loading]);

  if (loading) {
    return <div style={{ padding: "2rem" }}>Loading Flowchart...</div>;
  }

  const maxPosY =
    appState.units.length > 0
      ? Math.max(...appState.units.map((u) => u.PosY || 0))
      : 1;

  // ⭐の数が最大のノードを赤く、それ以外は白
  const unitStars: { [unitId: string]: number } = {};
  let maxStars = 0;
  appState.units.forEach((u) => {
    const priority = appState.unitPriorities[u.id];
    if (priority !== undefined && priority > 0) {
      const stars = Math.ceil(priority);
      unitStars[u.id] = stars;
      if (stars > maxStars) maxStars = stars;
    } else {
      unitStars[u.id] = 0;
    }
  });

  return (
    <>
      <div id="flowchart-container">
        {appState.units.map((unit) => {
          const unitPriority = appState.unitPriorities[unit.id];
          let nodeClass = "flowchart-node";
          // ⭐の数が最大のノードのみ赤、それ以外は白
          if (unitStars[unit.id] === maxStars && maxStars > 0) {
            nodeClass += " node-top-priority";
          }
          let priorityBadge = null;
          if (unitPriority !== undefined && unitPriority > 0) {
            const numberOfStars = Math.ceil(unitPriority);
            if (numberOfStars > 0) {
              priorityBadge = (
                <span className="priority-badge">
                  {"⭐".repeat(numberOfStars)}
                </span>
              );
            }
          }
          return (
            <div
              key={unit.id}
              id={unit.id}
              className={nodeClass}
              style={{
                left: `${(unit.PosX - 1) * 200}px`, // 220→200
                top: `${(maxPosY - unit.PosY) * 130}px`, // 150→130
              }}
              onClick={() => setSelectedUnitId(unit.id)}
            >
              <span>{unit.UnitName}</span>
              {priorityBadge}
            </div>
          );
        })}
      </div>
      {selectedUnitId && (
        <DetailPanel
          user={user}
          unitId={selectedUnitId}
          appState={appState}
          setAppState={setAppState}
          onClose={() => setSelectedUnitId(null)}
        />
      )}
    </>
  );
}
