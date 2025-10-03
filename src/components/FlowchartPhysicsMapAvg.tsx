import { useEffect, useRef, useState } from "react";
import styles from "./FlowchartPhysics.module.css";

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

interface Props {
  units: Unit[];
  problems: Problem[];
  unitPriorityMap: { [unitId: string]: number };
  problemStats: {
    [problemId: string]: { avgPriority: number; avgAttempts: number };
  };
  onUnitClick?: (unitId: string) => void;
  onProblemClick?: (problemId: string) => void;
}

export default function FlowchartPhysicsMapAvg({
  units,
  problems,
  unitPriorityMap,
  problemStats,
  onUnitClick,
  onProblemClick,
}: Props) {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const maxPosY =
    units.length > 0 ? Math.max(...units.map((u) => u.PosY || 0)) : 1;

  // 星の数（全ユーザー平均）
  const unitStars: { [unitId: string]: number } = {};
  let maxStars = 0;
  units.forEach((u) => {
    const priority = unitPriorityMap[u.id];
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
  const getGroupName = (posX: number, posY: number): string => {
    if (posX === 1 && posY >= 2 && posY <= 4) return "モーメントの基本";
    if (posX === 2 && posY >= 3 && posY <= 4) return "つり合いの式";
    if (posX === 3 && posY >= 3 && posY <= 4) return "棒のつり合い";
    if (posX === 4 && posY >= 2 && posY <= 4) return "重心";
    if (posX === 5 && posY >= 2 && posY <= 4) return "モーメントの応用";
    if (posY === 1 && posX >= 1 && posX <= 5) return "今までの復習";
    return "";
  };
  const groupUnits: { [group: string]: typeof units } = {};
  groupNames.forEach((g) => {
    groupUnits[g] = units.filter((u) => getGroupName(u.PosX, u.PosY) === g);
  });
  const groupFrames = groupNames.map((group) => {
    const units = groupUnits[group];
    if (units.length === 0) return null;
    const minX = Math.min(...units.map((u) => u.PosX));
    const maxX = Math.max(...units.map((u) => u.PosX));
    const minY = Math.min(...units.map((u) => u.PosY));
    const maxY = Math.max(...units.map((u) => u.PosY));
    const nodeW = 170,
      nodeH = 120,
      gapX = 30,
      gapY = 30;
    const padX = 40,
      padY = 50;
    const left = padX + (minX - 1) * (nodeW + gapX);
    const top = padY + (maxPosY - maxY) * (nodeH + gapY);
    const width = (maxX - minX + 1) * (nodeW + gapX) - gapX;
    const height = (maxY - minY + 1) * (nodeH + gapY) - gapY;
    return { group, left, top, width, height };
  });

  return (
    <div
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
      {units.map((unit) => {
        const unitPriority = unitPriorityMap[unit.id];
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
            onClick={() => onUnitClick && onUnitClick(unit.id)}
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
  );
}
