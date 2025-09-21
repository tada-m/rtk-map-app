import React from "react";

interface DetailPanelPhysicsAvgProps {
  unitName: string;
  problems: {
    problemNumber: string;
    avgPriority: number;
    avgAttempts: number;
  }[];
  onClose: () => void;
}

const DetailPanelPhysicsAvg: React.FC<DetailPanelPhysicsAvgProps> = ({
  unitName,
  problems,
  onClose,
}) => {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: 24,
        minWidth: 400,
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
          justifyContent: "space-between",
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
          }}
        >
          ×
        </button>
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
            <tr key={p.problemNumber ? p.problemNumber : `row-${i}`}>
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
