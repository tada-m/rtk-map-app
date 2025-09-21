"use client";

import { useState, useEffect, useRef } from "react";
import { collection, doc, getDocs } from "firebase/firestore";
import { User } from "firebase/auth";
import { db } from "../firebase/clientAppPhysics"; // 物理用firebase
import styles from "./FlowchartPhysics.module.css";
import DetailPanelPhysics from "./DetailPanelPhysics";
import { useEnqueueSnackbar } from "./Toast";
import ProblemSearchAutocomplete from "./ProblemSearchAutocomplete";

export interface Unit {
  id: string;
  UnitName: string;
  DependsOn?: string;
  PosX: number;
  PosY: number;
  imagePath?: string;
  group?: string;
}

export interface Problem {
  id: string;
  UnitID: string;
  ProblemNumber: number;
  imagePath?: string;
  DependsOn?: string;
  page?: string | number;
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

interface FlowchartPhysicsProps {
  user: User;
}

export default function FlowchartPhysics({ user }: FlowchartPhysicsProps) {
  const [searchSelectedProblem, setSearchSelectedProblem] =
    useState<Problem | null>(null);
  const [appState, setAppState] = useState<AppState>({
    units: [],
    problems: [],
    records: {},
    unitPriorities: {},
  });
  const [loading, setLoading] = useState(true);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const enqueueSnackbar = useEnqueueSnackbar();
  const linesRef = useRef<any[]>([]);

  useEffect(() => {
    const initialize = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const unitsSnapshot = await getDocs(collection(db, "units"));
        // PosX,PosYからグループ名を割り当てる関数
        const getGroupName = (posX: number, posY: number): string => {
          if (posX === 1 && posY >= 2 && posY <= 4) return "モーメントの基本";
          if (posX === 2 && posY >= 3 && posY <= 4) return "つり合いの式";
          if (posX === 3 && posY >= 3 && posY <= 4) return "棒のつり合い";
          if (posX === 4 && posY >= 2 && posY <= 4) return "重心";
          if (posX === 5 && posY >= 2 && posY <= 4) return "モーメントの応用";
          if (posY === 1 && posX >= 1 && posX <= 5) return "今までの復習";
          return "";
        };
        const units = unitsSnapshot.docs.map((doc) => {
          const data = doc.data() as Unit;
          const group = getGroupName(data.PosX, data.PosY);
          return { ...data, id: doc.id, group };
        });

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

        // 復習優先度を「unit内のproblem（UnitIDがunit.id）」のprobremPriority平均で計算
        const unitPriorities: { [unitId: string]: number } = {};
        units.forEach((unit) => {
          const relatedProblems = problems.filter((p) => p.UnitID === unit.id);
          let sum = 0;
          let count = 0;
          relatedProblems.forEach((p) => {
            const rec = records[p.id];
            if (
              rec &&
              typeof rec.probremPriority === "number" &&
              rec.probremPriority > 0
            ) {
              sum += rec.probremPriority;
              count++;
            }
          });
          unitPriorities[unit.id] = count > 0 ? sum / count : 0;
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
    let removeScrollListener: (() => void) | null = null;
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
                  path: "straight",
                  endPlug: "arrow1",
                  dropShadow: true,
                  startSocket: "auto",
                  endSocket: "auto",
                });
                linesRef.current.push(line);
              }
            });
          }
        });
        // スクロール時に矢印を再描画
        const container = document.getElementById("flowchart-container");
        if (container) {
          const onScroll = () => {
            linesRef.current.forEach((line) => line.position());
          };
          container.addEventListener("scroll", onScroll, { passive: true });
          removeScrollListener = () => {
            container.removeEventListener("scroll", onScroll);
          };
        }
      });
    }
    return () => {
      linesRef.current.forEach((line) => line.remove());
      linesRef.current = [];
      if (removeScrollListener) removeScrollListener();
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

  // グループごとにまとめる
  const groupNames = [
    "モーメントの基本",
    "つり合いの式",
    "棒のつり合い",
    "重心",
    "モーメントの応用",
    "今までの復習",
  ];
  // グループごとにノードをまとめる
  const groupUnits: { [group: string]: typeof appState.units } = {};
  groupNames.forEach((g) => {
    groupUnits[g] = appState.units.filter((u) => u.group === g);
  });

  // グループごとの枠の位置とサイズを計算（暫定: ノードのmin/max座標から自動算出）
  const groupFrames = groupNames.map((group) => {
    const units = groupUnits[group];
    if (units.length === 0) return null;
    const minX = Math.min(...units.map((u) => u.PosX));
    const maxX = Math.max(...units.map((u) => u.PosX));
    const minY = Math.min(...units.map((u) => u.PosY));
    const maxY = Math.max(...units.map((u) => u.PosY));
    // ノードの位置計算式に合わせる
    // iPad第8世代 1080x810ptに収まるよう調整
    const nodeW = 170,
      nodeH = 120,
      gapX = 30,
      gapY = 30;
    const padX = 40,
      padY = 50; // y方向の余白を+10px
    const left = padX + (minX - 1) * (nodeW + gapX);
    const top = padY + (maxPosY - maxY) * (nodeH + gapY);
    const width = (maxX - minX + 1) * (nodeW + gapX) - gapX;
    const height = (maxY - minY + 1) * (nodeH + gapY) - gapY;
    return { group, left, top, width, height };
    return { group, left, top, width, height };
  });

  // ヘッダ部分に検索窓を追加
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        <ProblemSearchAutocomplete
          options={[...appState.problems].sort(
            (a, b) => Number(a.page) - Number(b.page)
          )}
          onSelect={(problem) => {
            setSelectedUnitId(problem.UnitID);
            setSearchSelectedProblem(problem);
          }}
        />
      </div>
      <div
        id="flowchart-container"
        style={{
          position: "relative",
          minHeight: 810,
          minWidth: 1080,
          maxWidth: 1080,
          maxHeight: 810,
          overflow: "hidden",
          padding: "40px",
        }}
      >
        {/* グループ枠とラベル */}
        {groupFrames.map(
          (frame, idx) =>
            frame && (
              <div
                key={frame.group}
                className={styles["group-frame"]}
                style={{
                  left: frame.left,
                  top: frame.top,
                  width: frame.width,
                  height: frame.height,
                }}
              >
                <span className={styles["group-label"]}>{frame.group}</span>
              </div>
            )
        )}
        {/* ノード本体 */}
        {appState.units.map((unit) => {
          const unitPriority = appState.unitPriorities[unit.id];
          let nodeClass = styles["flowchart-physics-node"];
          if (unitStars[unit.id] === maxStars && maxStars > 0) {
            nodeClass += " " + styles["node-top-priority"];
          }
          let priorityBadge = null;
          if (unitPriority !== undefined && unitPriority > 0) {
            const numberOfStars = Math.ceil(unitPriority);
            if (numberOfStars > 0) {
              priorityBadge = (
                <span className={styles["priority-badge"]}>
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
                left: `${42 + (unit.PosX - 1) * 200}px`,
                top: `${60 + (maxPosY - unit.PosY) * 150}px`,
                zIndex: 10,
              }}
              onClick={() => setSelectedUnitId(unit.id)}
            >
              <span>{unit.UnitName}</span>
              {priorityBadge}
              {unit.imagePath && (
                <img
                  src={unit.imagePath}
                  alt={unit.UnitName}
                  style={{ maxWidth: 120, maxHeight: 80, marginTop: 8 }}
                />
              )}
            </div>
          );
        })}
      </div>
      {selectedUnitId && (
        <DetailPanelPhysics
          user={user}
          unitId={selectedUnitId}
          appState={appState}
          setAppState={setAppState}
          onClose={() => setSelectedUnitId(null)}
          onUnitNodeClick={(unitId) => {
            setSelectedUnitId(unitId);
            setSearchSelectedProblem(null);
            const unit = appState.units.find((u) => u.id === unitId);
            if (unit) {
              enqueueSnackbar(`${unit.UnitName}のパネルに移動しました`, {
                variant: "default",
              });
            }
          }}
          initialProblemId={searchSelectedProblem?.id || null}
        />
      )}
      {/* トーストはenqueueSnackbarで表示するためToastコンポーネントは不要 */}
    </>
  );
}
