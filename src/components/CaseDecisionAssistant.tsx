import React, { useState } from "react";
import {
  StudentInfo,
  StandardSubject2567,
  OriginSubjectInput,
  ContinuingEdInput,
  ForeignCredentialInput,
  ExperienceInput,
} from "../types";
import { calculateTransferResults } from "../utils/transferCalculator";
import {
  decisionQuestionSets,
  defaultDecisionQuestionSetId,
  findDecisionQuestionSet,
  DecisionQuestion,
} from "../data/decisionQuestions";
import { Sparkles, ChevronDown, ChevronUp, ClipboardCheck, AlertTriangle, PenLine } from "lucide-react";

interface CaseDecisionAssistantProps {
  studentInfo: StudentInfo;
  standardList: StandardSubject2567[];
  originSubjects: OriginSubjectInput[];
  continuingEd: ContinuingEdInput[];
  foreignCreds: ForeignCredentialInput[];
  experiences: ExperienceInput[];
}

interface DecisionAnswer {
  type: "noul" | "choice" | "score";
  noul?: number;
  choice?: string;
  score?: number;
  legend?: Record<string, string>;
  confidence?: number;
  probabilities?: Record<string, number>;
}

interface WrittenNote {
  headline?: string;
  summary?: string;
  recommendation?: string;
  next_steps?: string[];
}

interface DecisionResult {
  answers: Record<string, DecisionAnswer>;
  written: WrittenNote | null;
  questionSet: { id: string; label: string; questions: Record<string, DecisionQuestion> };
  model: string;
  provider: string | null;
  usage: { cost?: number; input_tokens?: number; output_tokens?: number } | null;
  writerModel: string;
  writerWarning?: string;
}

export default function CaseDecisionAssistant({
  studentInfo,
  standardList,
  originSubjects,
  continuingEd,
  foreignCreds,
  experiences,
}: CaseDecisionAssistantProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [questionSetId, setQuestionSetId] = useState(defaultDecisionQuestionSetId);
  const [stateText, setStateText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [error, setError] = useState<{ message: string; detail?: string; hint?: string } | null>(null);

  const questionSet = findDecisionQuestionSet(questionSetId);

  // สร้างข้อความบริบทของเคสจากข้อมูลที่กรอกไว้ในระบบ เพื่อให้ผู้ใช้แก้ไขต่อได้
  const buildStateFromCase = () => {
    const calc = calculateTransferResults(
      studentInfo,
      standardList,
      originSubjects,
      continuingEd,
      foreignCreds,
      experiences
    );
    const limit = calc.maxAllowable;
    const lines = [
      `คำขอเทียบโอนผลการเรียน ระดับ ${studentInfo.level} จากหลักสูตรต้นทาง ${studentInfo.originCurriculum}`,
      `ผู้ยื่นคำขอ: ${studentInfo.name || "ไม่ระบุชื่อ"}${studentInfo.occupation ? ` อาชีพ ${studentInfo.occupation}` : ""}`,
      `สถานศึกษาเดิม: ${studentInfo.previousSchool || "ไม่ระบุ"}${studentInfo.previousProvince ? ` จังหวัด ${studentInfo.previousProvince}` : ""}`,
      `รายการผลการเรียนที่ยื่นเทียบ: วิชาสามัญ ${originSubjects.length} รายการ, การศึกษาต่อเนื่อง ${continuingEd.length} หลักสูตร, วุฒิต่างประเทศ ${foreignCreds.length} รายการ, ประสบการณ์ ${experiences.length} รายการ`,
      `ผลการเทียบโอนที่ระบบคำนวณได้: ${calc.totalTransferredCredits} หน่วยกิต จากเพดาน ${limit} หน่วยกิต (GPAX ${calc.gpa})`,
      `วิชาที่ยังเทียบไม่ได้: ${calc.results.filter((r) => !r.isTransferred).length} รายการ`,
    ];
    return lines.join("\n");
  };

  const handleRunDecision = async () => {
    const trimmed = stateText.trim();
    if (trimmed === "") {
      setError({ message: "โปรดกรอกข้อความหรือบริบทของเคสก่อนกดวิเคราะห์" });
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/decisions/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: trimmed,
          context: {
            level: studentInfo.level,
            originCurriculum: studentInfo.originCurriculum,
            semester: `${studentInfo.semester}/${studentInfo.academicYear}`,
          },
          questionSetId,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setResult(null);
        setError({
          message: data.error || "เรียกตัวช่วยตัดสินใจไม่สำเร็จ",
          detail: data.detail,
          hint: data.hint,
        });
        return;
      }

      setResult(data as DecisionResult);
    } catch (err: any) {
      setResult(null);
      setError({ message: err?.message || "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ" });
    } finally {
      setLoading(false);
    }
  };

  // แสดงผลคำตอบตามชนิดของคำถาม (จริง/เท็จ, เลือกหนึ่งข้อ, ให้คะแนน)
  const renderAnswer = (key: string, answer?: DecisionAnswer) => {
    const question = result?.questionSet?.questions?.[key] || questionSet.questions[key];

    if (!answer) {
      return (
        <div key={key} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-500" id={`decision-answer-${key}`}>
          ไม่ได้รับคำตอบสำหรับหัวข้อนี้
        </div>
      );
    }

    let headline = "";
    let detail = "";
    let confidenceNote = "";

    // ชื่อเกณฑ์ของแถบความน่าจะเป็น: ใช้ legend จาก API ก่อน แล้วค่อยใช้เกณฑ์ที่ประกาศไว้
    const probabilityLabel = (labelKey: string) => {
      if (answer.legend && answer.legend[labelKey]) return answer.legend[labelKey];
      if (question?.type === "choice" && question.criteria[labelKey]) return question.criteria[labelKey];
      if (question?.type === "score") {
        const index = Number(labelKey);
        if (question.criteria[index]) return question.criteria[index];
      }
      return labelKey;
    };

    if (answer.type === "noul") {
      // ค่าที่ API ส่งกลับคือความน่าจะเป็นของคำตอบ "จริง" ช่วง 0-1
      const trueProbability = typeof answer.noul === "number" ? answer.noul : 0;
      const isTrue = trueProbability >= 0.5;
      headline = isTrue ? "จริง" : "เท็จ";
      detail = question?.type === "noul" ? (isTrue ? question.criteria.true : question.criteria.false) : "";
      confidenceNote = `โอกาส ${((isTrue ? trueProbability : 1 - trueProbability) * 100).toFixed(1)}%`;
    } else if (answer.type === "choice") {
      headline = answer.choice || "-";
      detail = question?.type === "choice" ? question.criteria[answer.choice || ""] || "" : "";
    } else if (answer.type === "score") {
      // คะแนนเป็นทศนิยมบนสเกลเดียวกับจำนวนเกณฑ์ จึงปัดให้อ่านง่ายและเทียบกับเกณฑ์ที่ใกล้ที่สุด
      const legendEntries = Object.keys(answer.legend || {})
        .map((key) => ({ key, value: Number(key) }))
        .filter((entry) => !Number.isNaN(entry.value));
      const scoreValue = typeof answer.score === "number" ? answer.score : 0;
      const maxScore =
        legendEntries.length > 0
          ? Math.max(...legendEntries.map((entry) => entry.value))
          : question?.type === "score"
            ? question.criteria.length - 1
            : undefined;

      headline = maxScore !== undefined && maxScore > 0 ? `${scoreValue.toFixed(2)} / ${maxScore}` : scoreValue.toFixed(2);

      if (legendEntries.length > 0) {
        const nearest = legendEntries.reduce((best, entry) =>
          Math.abs(entry.value - scoreValue) < Math.abs(best.value - scoreValue) ? entry : best
        );
        detail = answer.legend?.[nearest.key] || "";
      } else if (question?.type === "score") {
        const index = Math.min(question.criteria.length - 1, Math.max(0, Math.round(scoreValue)));
        detail = question.criteria[index] || "";
      }
    }

    return (
      <div key={key} className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1.5" id={`decision-answer-${key}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{key}</span>
          <span className="text-[11px] font-black text-emerald-400">
            {headline}
            {confidenceNote && <span className="text-slate-500 font-medium"> ({confidenceNote})</span>}
            {!confidenceNote && typeof answer.confidence === "number" && (
              <span className="text-slate-500 font-medium"> (ความเชื่อมั่น {(answer.confidence * 100).toFixed(0)}%)</span>
            )}
          </span>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">{question?.instructions}</p>
        {detail && <p className="text-[10px] text-slate-300 leading-relaxed">{detail}</p>}
        {answer.probabilities && (
          <div className="space-y-1 pt-1">
            {Object.entries(answer.probabilities).map(([label, value]) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[9px] text-slate-400 w-24 shrink-0 truncate" title={probabilityLabel(label)}>
                  {probabilityLabel(label)}
                </span>
                <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}></div>
                </div>
                <span className="text-[9px] text-slate-400 font-mono w-9 text-right">{(value * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all" id="decision-assistant-card">
      <div
        className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 flex items-center justify-between cursor-pointer border-b border-slate-800"
        onClick={() => setIsOpen(!isOpen)}
        id="decision-header-trigger"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center border border-sky-500/40 shadow-inner">
            <ClipboardCheck className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-white tracking-wide flex items-center gap-1.5 uppercase">
              ตัวช่วยตัดสินใจ (Decisions)
              <span className="text-[10px] bg-sky-600/30 text-sky-300 rounded-full px-2 py-0.5 border border-sky-500/20 font-bold">
                แล้วให้ Typhoon เขียนบันทึก
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              ส่งบริบทของเคสให้โมเดลตัดสินใจตามเกณฑ์ที่กำหนด แล้วส่งผลที่ได้ให้ Typhoon เรียบเรียงเป็นบันทึกความเห็น
            </p>
          </div>
        </div>
        <div className="text-slate-400 hover:text-white transition-colors">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {isOpen && (
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest" htmlFor="decision-state-input">
                  ข้อความหรือบริบทของเคส
                </label>
                <button
                  type="button"
                  onClick={() => setStateText(buildStateFromCase())}
                  className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                  id="btn-build-decision-state"
                >
                  ดึงข้อมูลจากเคสปัจจุบัน
                </button>
              </div>
              <textarea
                id="decision-state-input"
                value={stateText}
                onChange={(event) => setStateText(event.target.value)}
                rows={7}
                placeholder="พิมพ์คำขอหรือบริบทของเคสที่ต้องการให้ระบบตัดสินใจ หรือกดปุ่มดึงข้อมูลจากเคสปัจจุบัน"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-600 rounded-xl text-[11px] text-slate-200 outline-none placeholder-slate-600 leading-relaxed resize-y"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest" htmlFor="decision-question-set">
                ชุดคำถามที่ใช้ตัดสินใจ
              </label>
              <select
                id="decision-question-set"
                value={questionSetId}
                onChange={(event) => setQuestionSetId(event.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-600 rounded-xl text-[11px] text-slate-200 outline-none cursor-pointer"
              >
                {decisionQuestionSets.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 leading-relaxed">{questionSet.description}</p>
              <ul className="space-y-1 pt-1">
                {Object.entries(questionSet.questions).map(([key, question]) => (
                  <li key={key} className="text-[10px] text-slate-400 leading-relaxed">
                    <span className="font-mono text-sky-300">{key}</span>
                    <span className="text-slate-600"> · {question.type} · </span>
                    {question.instructions}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <p className="text-[10px] text-slate-500 leading-relaxed">
              ต้องตั้งค่า <code className="text-slate-300">OPENROUTER_API_KEY</code> สำหรับขั้นตัดสินใจ และ{" "}
              <code className="text-slate-300">TYPHOON_API_KEY</code> สำหรับขั้นเขียนบันทึก
            </p>
            <button
              type="button"
              onClick={handleRunDecision}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black shadow-md shadow-emerald-950/40 transition-all cursor-pointer whitespace-nowrap"
              id="btn-run-decision"
            >
              <Sparkles className="w-4 h-4 text-white" />
              {loading ? "กำลังประมวลผล..." : "ตัดสินใจและเขียนบันทึก"}
            </button>
          </div>

          {error && (
            <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-3" id="decision-error-msg">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1 text-[11px]">
                <p className="font-bold text-rose-400">{error.message}</p>
                {error.detail && <p className="text-rose-300/80 font-mono text-[10px] break-all">{error.detail}</p>}
                {error.hint && <p className="text-rose-200/80">{error.hint}</p>}
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-5 animate-fadeIn" id="decision-result-block">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300">ผลการตัดสินใจจากโมเดล</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3" id="decision-answers">
                  {Object.keys(result.questionSet?.questions || result.answers).map((key) =>
                    renderAnswer(key, result.answers?.[key])
                  )}
                </div>
              </div>

              {result.writerWarning && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300" id="decision-writer-warning">
                  {result.writerWarning}
                </div>
              )}

              {result.written && (
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3" id="decision-written">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                    <PenLine className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-white">
                      {result.written.headline || "บันทึกความเห็นที่ Typhoon เรียบเรียง"}
                    </h4>
                  </div>
                  {result.written.summary && (
                    <p className="text-[11px] text-slate-300 leading-relaxed text-justify">{result.written.summary}</p>
                  )}
                  {result.written.recommendation && (
                    <p className="text-[11px] text-slate-400 leading-relaxed text-justify">
                      <span className="text-slate-200 font-bold">ข้อเสนอแนะ: </span>
                      {result.written.recommendation}
                    </p>
                  )}
                  {result.written.next_steps && result.written.next_steps.length > 0 && (
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
                      {result.written.next_steps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500">
                <span>โมเดลตัดสินใจ: {result.model}</span>
                {result.provider && <span>ผู้ให้บริการ: {result.provider}</span>}
                <span>โมเดลเขียนบันทึก: {result.writerModel}</span>
                {result.usage && (
                  <span>
                    โทเคน {result.usage.input_tokens ?? 0} เข้า / {result.usage.output_tokens ?? 0} ออก
                    {typeof result.usage.cost === "number" ? ` · ค่าใช้จ่าย $${result.usage.cost.toFixed(4)}` : ""}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
