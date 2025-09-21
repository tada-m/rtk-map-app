import React from "react";

import { Unit } from "./FlowchartPhysicsMapAvg";
interface DetailPanelPhysicsAvgProps {
  unitName: string;
  problems: {
    problemNumber: string;
    avgPriority: number;
    avgAttempts: number;
    imagePath?: string;
    dependsOn?: string;
  }[];
  units: Unit[];
  onClose: () => void;
  onUnitNodeClick?: (unitId: string) => void;
}

const DetailPanelPhysicsAvg: React.FC<DetailPanelPhysicsAvgProps> = ({
  unitName,
  problems,
  units,
  onClose,
  onUnitNodeClick,
}) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const selectedProblem = problems[selectedIndex];

  // 関連unit取得
  let relatedUnits: Unit[] = [];
  if (selectedProblem?.dependsOn) {
    const ids = selectedProblem.dependsOn
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    relatedUnits = units.filter((u: Unit) => ids.includes(u.id));
  }

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: 24,
        minWidth: 500,
        boxShadow: "0 2px 8px #aaa",
        position: "absolute",
        top: 60,
        left: 100,
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
            }}
          >
            <h2 style={{ margin: 0 }}>{unitName}</h2>
            <button
              onClick={onClose}
              style={{
                fontSize: 18,
                background: "#eee",
                border: "none",
                borderRadius: 8,
                padding: "4px 12px",
                cursor: "pointer",
                marginLeft: 16,
              }}
            >
              ×
            </button>
          </div>
          {/* 問題画像表示エリア */}
          {selectedProblem?.imagePath && (
            <div style={{ margin: "16px 0 8px 0", textAlign: "left" }}>
              <img
                src={selectedProblem.imagePath}
                alt={selectedProblem.problemNumber}
                style={{
                  maxWidth: 320,
                  maxHeight: 180,
                  border: "1px solid #ccc",
                  borderRadius: 8,
                }}
              />
            </div>
          )}
        </div>
        {/* 関連知識枠 */}
        {relatedUnits.length > 0 && (
          <div
            style={{
              margin: "16px 0 8px 24px",
              minWidth: 220,
              border: "2px solid #222",
              borderRadius: 16,
              padding: 12,
              background: "#fafafa",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: 8 }}>
              この問題に関連する知識
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {relatedUnits.map((u) => (
                <div
                  key={u.id}
                  style={{
                    border: "1px solid #aaa",
                    borderRadius: 8,
                    padding: 8,
                    width: 100,
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                  onClick={() => {
                    if (onUnitNodeClick) {
                      onClose();
                      onUnitNodeClick(u.id);
                    }
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {u.UnitName}
                  </div>
                  {u.imagePath && (
                    <img
                      src={u.imagePath}
                      alt={u.UnitName}
                      style={{ maxWidth: 80, maxHeight: 50, marginTop: 4 }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <h3 style={{ margin: "16px 0 8px 0" }}>問題リスト（全ユーザー平均）</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ borderBottom: "1px solid #ccc", padding: 6 }}>
              問題番号
            </th>
            <th style={{ borderBottom: "1px solid #ccc", padding: 6 }}>
              復習優先度（平均）
            </th>
            <th style={{ borderBottom: "1px solid #ccc", padding: 6 }}>
              解いた回数（平均）
            </th>
          </tr>
        </thead>
        <tbody>
          {problems.map((p, i) => (
            <tr
              key={p.problemNumber ? p.problemNumber : `row-${i}`}
              style={{
                cursor: "pointer",
                background: i === selectedIndex ? "#ffeedd" : undefined,
              }}
              onClick={() => setSelectedIndex(i)}
            >
              <td style={{ padding: 6, textAlign: "center" }}>
                {p.problemNumber}
              </td>
              <td style={{ padding: 6, textAlign: "center" }}>
                {isNaN(p.avgPriority) ? "" : p.avgPriority.toFixed(2)}
              </td>
              <td style={{ padding: 6, textAlign: "center" }}>
                {isNaN(p.avgAttempts) ? "" : p.avgAttempts.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DetailPanelPhysicsAvg;
