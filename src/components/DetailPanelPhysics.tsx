"use client";

import { useState, useEffect } from "react";
import { marked } from "marked";
import Button from "@mui/material/Button";
import DialogActions from "@mui/material/DialogActions";
import Stack from "@mui/material/Stack";
// teachingMaterialsのURLをリンク化するコンポーネント
// teachingMaterialsのURLをリンク化し、動画:タイトル,URL形式やオブジェクト配列形式に対応
type TeachingMaterial = {
  label: string;
  title: string;
  url?: string | null;
};

type LinkifiedTextProps =
  | { text: string; materials?: undefined }
  | { text?: undefined; materials: TeachingMaterial[] };

function teachingMaterialsToMarkdown(materials: TeachingMaterial[]): string {
  return materials
    .map((mat) =>
      mat.url
        ? `- ${mat.label}：[${mat.title}](${mat.url})`
        : `- ${mat.label}：${mat.title}`
    )
    .join("\n");
}

function LinkifiedText(props: LinkifiedTextProps) {
  // オブジェクト配列優先、なければ従来のtext型
  if (props.materials) {
    const md = teachingMaterialsToMarkdown(props.materials);
    // カスタムレンダラーでリンクの後ろにURLを出さない
    const renderer = new marked.Renderer();
    renderer.link = ({ href, text }) => {
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    };
    const html = marked(md, { renderer });
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  }
  // 従来のstring型（後方互換）
  const text = props.text || "";
  const lines = text.split(/\n/);
  const urlRegex = /(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+)/g;
  return (
    <div>
      {lines.map((line, i) => {
        // ラベル：[タイトル],URL の形式（カンマやスペースの有無も柔軟に対応）
        const match = line.match(/^(.+?):\s*\[(.+?)\]\s*,?\s*(https?:\/\/.+)$/);
        if (match) {
          const label = match[1].trim();
          const title = match[2].trim();
          const url = match[3].trim();
          return (
            <div key={i}>
              {label}:{" "}
              <a href={url} target="_blank" rel="noopener noreferrer">
                {title}
              </a>
            </div>
          );
        }
        // 通常のURLはリンク化
        const html = line.replace(
          urlRegex,
          (url) =>
            `<a href='${url}' target='_blank' rel='noopener noreferrer'>${url}</a>`
        );
        return <div key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </div>
  );
}
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
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
import { useEnqueueSnackbar } from "./Toast";

interface DetailPanelPhysicsProps {
  user: User;
  unitId: string;
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  onClose: () => void;
  onUnitNodeClick?: (unitId: string) => void;
  initialProblemId?: string | null;
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
  "正解（微妙）": ["たまたま解けたが微妙", "時間がかかってしまった"],
  "不正解（惜しい）": [
    "理解したので次は解けそう",
    "計算ミスなどの惜しい間違い方をした",
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
  const enqueueSnackbar = useEnqueueSnackbar();
  const handleRecordClick = async () => {
    const result: boolean = await handleRecord(problem.id, scs, scsReason);
    if (!result) {
      enqueueSnackbar("記録に失敗しました", { variant: "error" });
      return;
    }
    if (record && record.history) {
      record.history.push({ scs, scsReason, timestamp: new Date() });
      forceUpdate({});
    }
    setIsRecorded(true);
    enqueueSnackbar("記録に成功しました", { variant: "success" });
    setTimeout(() => setFade(true), 1200);
  };

  return (
    <>
      <td>
        {problem.ProblemNumber}
        <div className="previous-record">
          セミナー物理基礎+物理 P. {problem.page}
        </div>
      </td>
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
    </>
  );
}

export default function DetailPanelPhysics({
  user,
  unitId,
  appState,
  setAppState,
  onClose,
  onUnitNodeClick,
  initialProblemId = null,
}: DetailPanelPhysicsProps) {
  // 選択中の問題ID
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(
    initialProblemId
  );
  const [loading, setLoading] = useState(false);
  const [localRecords, setLocalRecords] = useState(appState.records);
  const [panelKey, setPanelKey] = useState(0);

  // 教材ダイアログ用state
  const [openTeachingDialog, setOpenTeachingDialog] = useState(false);
  // string | TeachingMaterial[] 型で保持
  const [teachingMaterials, setTeachingMaterials] = useState<
    string | TeachingMaterial[]
  >("");
  const [loadingTeaching, setLoadingTeaching] = useState(false);

  useEffect(() => {
    setLocalRecords(appState.records);
  }, [appState.records]);

  const handleClose = () => {
    setPanelKey((k) => k + 1);
    onClose();
  };

  const unit = appState.units.find((u) => u.id === unitId);
  const unitProblems = appState.problems.filter((p) => p.UnitID === unitId);

  // 教材ダイアログを開く
  const handleOpenTeachingDialog = async () => {
    setOpenTeachingDialog(true);
    if (!teachingMaterials && unit) {
      setLoadingTeaching(true);
      try {
        // FirestoreからteachingMaterials取得
        const docRef = doc(db, "units", unit.id);
        const docSnap = await import("firebase/firestore").then((m) =>
          m.getDoc(docRef)
        );
        if (docSnap.exists()) {
          const data = docSnap.data();
          // 配列ならそのまま、なければstringで格納
          if (Array.isArray(data.teachingMaterials)) {
            setTeachingMaterials(data.teachingMaterials);
          } else if (typeof data.teachingMaterials === "string") {
            setTeachingMaterials(data.teachingMaterials);
          } else {
            setTeachingMaterials("教材情報が登録されていません。");
          }
        } else {
          setTeachingMaterials("教材情報が見つかりませんでした。");
        }
      } catch (e) {
        setTeachingMaterials("教材情報の取得に失敗しました。");
      } finally {
        setLoadingTeaching(false);
      }
    }
  };
  const handleCloseTeachingDialog = () => {
    setOpenTeachingDialog(false);
  };

  // 選択中の問題
  const selectedProblem = selectedProblemId
    ? appState.problems.find((p) => p.id === selectedProblemId)
    : null;

  // 画像パス: 問題選択時はproblems.imagePath、未選択時はunit.imagePath
  const getImagePath = () => {
    if (selectedProblem && selectedProblem.imagePath)
      return selectedProblem.imagePath;
    if (unit && unit.imagePath) return unit.imagePath;
    return undefined;
  };

  // 関連知識ノード: 問題選択時のみDependsOnから取得
  let relatedUnits: Unit[] = [];
  if (selectedProblem && selectedProblem.DependsOn) {
    const ids = String(selectedProblem.DependsOn)
      .split(",")
      .map((id) => id.trim());
    relatedUnits = appState.units.filter((u) => ids.includes(u.id));
  }

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

    // "正解（完璧）"を選択した場合、その問題の復習優先度を0にする。
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
    // "たまたま解けたが微妙"を選択した場合、その問題の復習優先度を1上げ、その問題のunitに属する他の問題の中で主観的な理解状況が"正解（完璧）"以外の問題の復習優先度も1上げる。
    if (newScsReason === "たまたま解けたが微妙") {
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
    // "時間がかかってしまった"を選択した場合、その問題の復習優先度を1上げる。
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
    // "計算ミスなどの惜しい間違い方をした"を選択した場合、その問題の復習優先度を1上げる。
    if (newScsReason === "計算ミスなどの惜しい間違い方をした") {
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
    // "理解したので次は解けそう"を選択した場合、その問題の復習優先度を2上げ、その問題のunitに属する他の問題の中で主観的な理解状況が"正解（完璧）"以外の問題の復習優先度も1上げる。その問題に関連する知識（problemコレクションのDependsOn）全ての問題の中で、主観的な理解状況が"正解（完璧）"以外の問題の復習優先度を1上げる。
    if (newScsReason === "理解したので次は解けそう") {
      newPriority = Math.min(newPriority + 2, 4);
      // currentUnit, currentUnit.DependsOn, currentProblem.DependsOn すべてを関連unit候補に
      const relatedUnitIds = [currentUnit.id];
      if (currentUnit.DependsOn) {
        relatedUnitIds.push(
          ...String(currentUnit.DependsOn)
            .split(",")
            .map((id) => id.trim())
        );
      }
      if (currentProblem.DependsOn) {
        relatedUnitIds.push(
          ...String(currentProblem.DependsOn)
            .split(",")
            .map((id) => id.trim())
        );
      }
      // 重複排除
      const uniqueRelatedUnitIds = Array.from(new Set(relatedUnitIds));
      // 関連知識（DependsOnで指定されたunit）ごとに全problemを走査
      for (const relatedUnitId of uniqueRelatedUnitIds) {
        for (const p of appState.problems) {
          if (p.UnitID === relatedUnitId && p.id !== problemId) {
            const record = newRecords[p.id];
            const lastScs =
              record && record.history && record.history.length > 0
                ? record.history[record.history.length - 1].scs
                : undefined;
            if (
              !record ||
              (record.attempts === 0 &&
                (!record.history || record.history.length === 0))
            ) {
              // 記録なし: 既にpriorityが1以上なら+1、0なら1
              const prevPriority =
                record && typeof record.probremPriority === "number"
                  ? record.probremPriority
                  : 0;
              newRecords[p.id] = {
                attempts: 0,
                history: [],
                probremPriority: Math.min((prevPriority || 0) + 1, 4),
              };
            } else if (lastScs !== "正解（完璧）") {
              // 既に1以上のものも+1
              record.probremPriority = Math.min(
                (record.probremPriority || 0) + 1,
                4
              );
              // attemptsは変更しない
            }
          }
        }
      }
    }
    // "不正解（まだまだ）"を選択した場合、その問題の復習優先度を2上げ、その問題のunitに属する他の問題の中で主観的な理解状況が"正解（完璧）"以外の問題の復習優先度を1上げる。関連する知識全ての問題の中で、主観的な理解状況が"正解（完璧）"以外の問題の復習優先度を2上げる。
    if (newScs === "不正解（まだまだ）") {
      newPriority = Math.min(newPriority + 2, 4);
      // currentUnit, currentUnit.DependsOn, currentProblem.DependsOn すべてを関連unit候補に
      const relatedUnitIds = [currentUnit.id];
      if (currentUnit.DependsOn) {
        relatedUnitIds.push(
          ...String(currentUnit.DependsOn)
            .split(",")
            .map((id) => id.trim())
        );
      }
      if (currentProblem.DependsOn) {
        relatedUnitIds.push(
          ...String(currentProblem.DependsOn)
            .split(",")
            .map((id) => id.trim())
        );
      }
      // 重複排除
      const uniqueRelatedUnitIds = Array.from(new Set(relatedUnitIds));
      // 関連知識（DependsOnで指定されたunit）ごとに全problemを走査
      for (const relatedUnitId of uniqueRelatedUnitIds) {
        for (const p of appState.problems) {
          if (p.UnitID === relatedUnitId && p.id !== problemId) {
            const record = newRecords[p.id];
            const lastScs =
              record && record.history && record.history.length > 0
                ? record.history[record.history.length - 1].scs
                : undefined;
            // ★ここで加算値を分岐
            const addValue = relatedUnitId === currentUnit.id ? 1 : 2;
            if (
              !record ||
              (record.attempts === 0 &&
                (!record.history || record.history.length === 0))
            ) {
              const prevPriority =
                record && typeof record.probremPriority === "number"
                  ? record.probremPriority
                  : 0;
              newRecords[p.id] = {
                attempts: 0,
                history: [],
                probremPriority: Math.min((prevPriority || 0) + addValue, 4),
              };
            } else if (lastScs !== "正解（完璧）") {
              // 既に1以上のものも+2
              record.probremPriority = Math.min(
                (record.probremPriority || 0) + 2,
                4
              );
              // attemptsは変更しない
            }
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

  const enqueueSnackbar = useEnqueueSnackbar();
  const handleRecord = async (
    problemId: string,
    scs: string,
    scsReason: string
  ) => {
    if (!scs) {
      enqueueSnackbar("正解・不正解を選択してください。", {
        variant: "warning",
      });
      return false;
    }
    if ((scs === "正解（微妙）" || scs === "不正解（惜しい）") && !scsReason) {
      enqueueSnackbar("理解状況を選択してください。", { variant: "warning" });
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

      // priorityが変化した全てのproblemRecordsをFirestoreに保存
      Object.entries(updatedRecords).forEach(([pid, rec]) => {
        // 変更があったものだけ書き込む（probremPriority>0またはattempts>0）
        if (rec && (rec.probremPriority > 0 || rec.attempts > 0)) {
          const problemRecordRef = doc(userDocRef, "problemRecords", pid);
          batch.set(
            problemRecordRef,
            {
              probremPriority: rec.probremPriority,
              attempts: rec.attempts,
              // historyはarrayUnionだと新規は追加されないので、常に全履歴を保存
              history: rec.history || [],
            },
            { merge: true }
          );
        }
      });

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
      enqueueSnackbar("記録中にエラーが発生しました。", { variant: "error" });
      setLocalRecords(appState.records);
      return false;
    } finally {
      setLoading(false);
    }
  };

  if (!unit) return null;

  return (
    <>
      {/* 教材ダイアログ */}
      <Dialog
        open={openTeachingDialog}
        onClose={handleCloseTeachingDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          教材リスト
          <IconButton onClick={handleCloseTeachingDialog} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {loadingTeaching ? (
            <div>読み込み中...</div>
          ) : (
            <LinkifiedText
              {...(Array.isArray(teachingMaterials)
                ? { materials: teachingMaterials }
                : { text: teachingMaterials })}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTeachingDialog}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* 既存の詳細パネル本体 */}
      <Dialog
        open={true}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{ style: { borderRadius: 16, minWidth: 900 } }}
      >
        <DialogTitle
          sx={{
            m: 0,
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{unit.UnitName}</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Button
              variant="contained"
              color="success"
              size="small"
              onClick={handleOpenTeachingDialog}
              sx={{ minWidth: 120 }}
            >
              教材を確認する
            </Button>
            <IconButton
              aria-label="close"
              onClick={handleClose}
              sx={{
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </div>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <div
            style={{ display: "flex", flexDirection: "row", minHeight: 200 }}
          >
            {/* 左側: 画像 */}
            <div
              id="detail-image-container"
              style={{
                width: 400,
                height: 300,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#fff",
              }}
            >
              {getImagePath() && (
                <img
                  id="detail-image"
                  src={getImagePath()}
                  alt={unit.UnitName}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    width: "auto",
                    height: "auto",
                    display: "block",
                  }}
                />
              )}
            </div>
            {/* 右上: 関連知識ノード */}
            <div style={{ flex: 1, marginLeft: 24 }}>
              {selectedProblem && (
                <div
                  style={{
                    border: "2px solid #222",
                    borderRadius: 16,
                    padding: 12,
                    marginBottom: 12,
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
                          setSelectedProblemId(null); // unit遷移時は必ずunit画像を表示
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
                            style={{
                              maxWidth: 80,
                              maxHeight: 50,
                              marginTop: 4,
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* 問題リスト */}
          <h3 style={{ margin: "24px 0 8px 0", paddingLeft: 8 }}>問題リスト</h3>
          <div className="table-wrapper" style={{ padding: 8 }}>
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
                  const isSelected = selectedProblemId === problem.id;
                  return (
                    <tr
                      key={problem.id + "-" + panelKey}
                      style={isSelected ? { background: "#ffeedd" } : {}}
                      onClick={() => setSelectedProblemId(problem.id)}
                    >
                      <ProblemRow
                        problem={problem}
                        record={record}
                        lastRecord={lastRecord}
                        handleRecord={handleRecord}
                        loading={loading}
                      />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
