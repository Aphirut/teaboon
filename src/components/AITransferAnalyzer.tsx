import React, { useState } from "react";
import { 
  StudentInfo, 
  StandardSubject2567, 
  OriginSubjectInput, 
  ContinuingEdInput, 
  ForeignCredentialInput, 
  ExperienceInput 
} from "../types";
import { Sparkles, Brain, CheckCircle, AlertTriangle, HelpCircle, GraduationCap, ChevronDown, ChevronUp, Hammer } from "lucide-react";

interface AITransferAnalyzerProps {
  studentInfo: StudentInfo;
  standardList: StandardSubject2567[];
  originSubjects: OriginSubjectInput[];
  continuingEd: ContinuingEdInput[];
  foreignCreds: ForeignCredentialInput[];
  experiences: ExperienceInput[];
}

interface MappingCheck {
  sourceSubject: string;
  targetSubject: string;
  status: string;
  comment: string;
}

interface OccupationalSubject {
  code: string;
  name: string;
  benefit: string;
}

interface OccupationalBonus {
  title: string;
  advice: string;
  recommendedSubjects: OccupationalSubject[];
}

interface AIAnalysisResult {
  rating: string;
  matchPercentage: number;
  summary: string;
  mappingChecks: MappingCheck[];
  occupationalBonus: OccupationalBonus;
  regulationCompliance: string;
  isSimulated?: boolean;
}

export default function AITransferAnalyzer({
  studentInfo,
  standardList,
  originSubjects,
  continuingEd,
  foreignCreds,
  experiences
}: AITransferAnalyzerProps) {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  const loadingSteps = [
    "กำลังเรียกใช้งานโมเดลวิเคราะห์ข้อมูลความปลอดภัย...",
    "กำลังสแกนเปรียบเทียบวิชาสะสมเดิม กับตัวเลือกหลักสูตรเป้าหมาย...",
    "กำลังวิเคราะห์ข้อมูลประวัตินักศึกษา รวมถึงความสอดคล้องกับพญาณสายอาชีพ...",
    "กำลังตรวจสอบข้อกำหนดพิกัดหน่วยกิตและกฎเกณฑ์ สกร. 2567...",
    "ใกล้เสร็จแล้ว! กำลังสรุปข้อมูลในรูปแบบรายงานแนะนำ..."
  ];

  const handleRunAIAnalysis = async () => {
    setLoading(true);
    setError(null);
    setLoadingStep(0);

    // Dynamic loading text step intervals
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 1500);

    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          studentInfo,
          originSubjects,
          continuingEd,
          foreignCreds,
          experiences,
          standardList
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "ไม่สามารถติดต่อกับเซิร์ฟเวอร์ปัญญาประดิษฐ์ได้");
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อวิเคราะห์ข้อมูล");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  // Helper function to color code the rating
  const getRatingStyle = (rating: string = "") => {
    if (rating.includes("มีความเป็นไปได้สูง") || rating.includes("สูง")) {
      return {
        badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
        bg: "from-emerald-50 to-teal-50/20 border-emerald-100",
        text: "text-emerald-700",
        icon: <CheckCircle className="w-5 h-5 text-emerald-600" />
      };
    } else if (rating.includes("ปานกลาง")) {
      return {
        badge: "bg-amber-50 text-amber-800 border-amber-200",
        bg: "from-amber-50 to-yellow-50/20 border-amber-100",
        text: "text-amber-700",
        icon: <AlertTriangle className="w-5 h-5 text-amber-600" />
      };
    } else {
      return {
        badge: "bg-rose-50 text-rose-800 border-rose-200",
        bg: "from-rose-50 to-pink-50/20 border-rose-100",
        text: "text-rose-700",
        icon: <HelpCircle className="w-5 h-5 text-rose-600" />
      };
    }
  };

  const currentTheme = getRatingStyle(result?.rating);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all" id="ai-transfer-analyzer-card">
      {/* Header section */}
      <div 
        className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 flex items-center justify-between cursor-pointer border-b border-slate-800"
        onClick={() => setIsOpen(!isOpen)}
        id="ai-header-trigger"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40 shadow-inner">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-white tracking-wide flex items-center gap-1.5 uppercase">
              ระบบตรวจสอบวิเคราะห์ข้อมูลด้วยปัญญาประดิษฐ์ <span className="text-[10px] bg-emerald-600/30 text-emerald-400 rounded-full px-2 py-0.5 border border-emerald-500/20 font-bold">Typhoon AI</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">วิเคราะห์ความถูกต้อง ความสมเหตุสมผลของวิชา และแนะแนวทางสู่อนาคตผู้เรียน</p>
          </div>
        </div>
        <div className="text-slate-400 hover:text-white transition-colors">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {isOpen && (
        <div className="p-6 space-y-6">
          {/* AI Engine Selection Bar */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3" id="ai-engine-selector-bar">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Brain className="w-3 h-3 text-emerald-400 animate-pulse" />
                เลือกเครื่องยนต์ปัญญาประดิษฐ์ (AI Engine)
              </span>
              <p className="text-[10px] text-slate-500 font-medium">สลับโมเดลสมองกลสําหรับวิเคราะห์ความเสถียรและการเปรียบเทียบเทียบวิชาสะสม</p>
            </div>
            <div className="flex gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <span
                className="px-3 py-1.5 rounded-md text-[10px] font-black flex items-center gap-1.5 bg-indigo-600 text-white shadow"
                id="ai-engine-typhoon"
              >
                <span>🌀</span>
                Typhoon 2.5 (SCB 10X)
              </span>
            </div>
          </div>

          {/* Default actions / No analysis run yet */}
          {!loading && !result && !error && (
            <div className="text-center py-6 px-4 space-y-4 max-w-xl mx-auto">
              <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto border border-slate-700">
                <Brain className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white">ตรวจสอบการจับคู่วิชาและประวัติเบื้องต้นด้วยระบบ AI</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  เมื่อกรอกประวัติ ทักษะการศึกษาต่อเนื่อง เกียรตินิยม หรือผลช่างจริงเสร็จสิ้น ระบบสามารถส่งให้สมองกลร่วมตรวจสอบความถูกต้อง ความคุ้มค่า และแนะนำกลุ่มวิชาเลือกที่ตรงกับสายอาชีพของผู้เรียน เพื่ออำนวยความสะดวกให้นายทะเบียน
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunAIAnalysis}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                id="btn-run-ai-analysis"
              >
                <Sparkles className="w-4 h-4 text-white" />
                เริ่มต้นวิเคราะห์เทียบโอนด้วย AI
              </button>
            </div>
          )}

          {/* Loading status */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 max-w-md mx-auto text-center">
              <div className="relative">
                <div className="w-12 h-12 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-emerald-400 animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-white transition-all animate-pulse">
                  {loadingSteps[loadingStep]}
                </p>
                <div className="w-48 h-1 overflow-hidden bg-slate-800 rounded-full mx-auto">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-1000" 
                    style={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-500">ขั้นตอนการประมวลใช้เวลาประมาณ 2-4 วินาที โปรดรอสักครู่</p>
              </div>
            </div>
          )}

          {/* Error fallback */}
          {error && (
            <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-3 max-w-xl mx-auto">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <h4 className="text-xs font-bold text-rose-400">เกิดข้อผิดพลาดในการวิเคราะห์เชิงสัมบูรณ์</h4>
                <p className="text-[11px] text-rose-300 leading-relaxed">{error}</p>
                <button
                  type="button"
                  onClick={handleRunAIAnalysis}
                  className="px-3 py-1 bg-rose-800/40 hover:bg-rose-800 text-white rounded text-[10px] font-bold transition-all cursor-pointer"
                >
                  ลองใหม่อีกครั้ง
                </button>
              </div>
            </div>
          )}

          {/* Display Analysis Results */}
          {result && !loading && (
            <div className="space-y-6 animate-fadeIn text-slate-200">
              {result.isSimulated && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                  <span className="text-amber-400 text-lg mt-0.5">⚠️</span>
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-amber-400">ระบบคลาวด์ทำงานใน [โหมดจำลองพรีวิวแบบปัญญาประดิษฐ์]</h5>
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                      ระบบตรวจไม่พบการตั้งค่า <strong className="text-white">TYPHOON_API_KEY</strong> ในไฟล์ <strong className="text-white">.env</strong> หากต้องการวิเคราะห์ด้วย Typhoon จริง ให้ใส่คีย์แล้วรีสตาร์ตเซิร์ฟเวอร์
                    </p>
                  </div>
                </div>
              )}

              {result.warning && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3">
                  <span className="text-rose-400 text-lg mt-0.5">⚠️</span>
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-rose-400">ประสิทธิผลเกิดข้อผิดพลาดในการเชื่อมโยงภายนอก</h5>
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                      {result.warning}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Row 1: KPI Dashboard Block */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                {/* Visual score circle - col span 4 */}
                <div className="md:col-span-4 bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    {/* SVG Progress Circle */}
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="40" className="stroke-slate-800 fill-none" strokeWidth="8" />
                      <circle 
                        cx="48" 
                        cy="48" 
                        r="40" 
                        className="stroke-emerald-500 fill-none transition-all duration-1000" 
                        strokeWidth="8" 
                        strokeDasharray="251.2"
                        strokeDashoffset={251.2 - (251.2 * (result.matchPercentage || 0)) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black text-white font-mono">{result.matchPercentage}%</span>
                      <span className="text-[9px] text-slate-400 font-semibold tracking-wider">MATCH WEIGHT</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">ผลการประเมินเทียบเคียง</span>
                    <div className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${currentTheme.badge} inline-block`}>
                      {result.rating}
                    </div>
                  </div>
                </div>

                {/* AI Executive Summary - col span 8 */}
                <div className="md:col-span-8 bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Brain className="w-4 h-4 text-emerald-400" />
                      สรุปผลการวิเคราะห์สําหรับนายทะเบียนศึกษาธิการ
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed text-justify">
                      {result.summary}
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>วิเคราะห์ตามโครงสร้างเนื้อหาเปรียบเทียบมาตรฐาน สกร. 2567</span>
                    </div>
                    <span>โมเดลแบบจำลอง: {result.providerName || "Typhoon 2.5"} (โหมด {result.isSimulated ? "จำลองพรีวิว" : "ใช้งานจริง"})</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Audit Mapping Lists */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-slate-400" />
                  รายการตรวจสอบการจับคู่ความถูกต้องรายวิชา (Matching Audit List)
                </h4>
                
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                  <table className="w-full text-xs text-slate-300">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold text-left">
                        <th className="px-4 py-2 text-[10px] uppercase font-bold tracking-wider">วิชาต้นทางเดิม</th>
                        <th className="px-4 py-2 text-[10px] uppercase font-bold tracking-wider">วิชา สกร. 2567 ที่จับคู่ไว้</th>
                        <th className="px-4 py-2 text-[10px] uppercase font-bold tracking-wider text-center">สถานะ AI</th>
                        <th className="px-4 py-2 text-[10px] uppercase font-bold tracking-wider">คำแนะนําและข้อสังเกตนายทะเบียน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {result.mappingChecks && result.mappingChecks.length > 0 ? (
                        result.mappingChecks.map((check, idx) => {
                          const isSuccess = check.status.includes("ตรง") || check.status.includes("สอดคล้อง") || check.status.includes("ถูกต้อง");
                          return (
                            <tr key={idx} className="hover:bg-slate-900/30 transition-colors">
                              <td className="px-4 py-3 font-semibold text-slate-200">{check.sourceSubject}</td>
                              <td className="px-4 py-3 font-mono text-emerald-400">{check.targetSubject}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                  isSuccess 
                                    ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40" 
                                    : "bg-amber-950/80 text-amber-400 border border-amber-800/40"
                                }`}>
                                  {check.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[11px] text-slate-400 leading-relaxed">{check.comment}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-center text-slate-500 text-[11px]">ไม่พบรายการรายวิชาสำหรับการจับคู่ประเมินผล</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Row 3: Occupational Elective Recommendations & Regulations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Occupational Enhancements Section */}
                {result.occupationalBonus && (
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                      <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                        <Hammer className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-white tracking-wide">
                        {result.occupationalBonus.title}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed text-justify">
                      {result.occupationalBonus.advice}
                    </p>
                    
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase">วิชาเลือก สกร. 2567 ที่แนะนำเป็นพิเศษ:</p>
                      <div className="space-y-1.5">
                        {result.occupationalBonus.recommendedSubjects && result.occupationalBonus.recommendedSubjects.map((sub, idx) => (
                          <div key={idx} className="bg-slate-900 border border-slate-850 p-2.5 rounded-xl space-y-1 hover:bg-slate-900 hover:border-slate-800 transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-extrabold text-white">{sub.name}</span>
                              <span className="text-[9px] font-mono bg-slate-800 text-slate-300 px-1.5 rounded font-bold">{sub.code}</span>
                            </div>
                            <p className="text-[10px] text-slate-400">{sub.benefit}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Regulation Audit compliance card */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                      <div className="p-1.5 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-white tracking-wide">
                        การวิเคราะห์ตามระเบียบข้อกำหนดเทียบโอน สกร.
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed text-justify font-normal">
                      {result.regulationCompliance}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-850 flex items-center justify-between">
                    <span className="text-[9px] text-slate-500 font-bold uppercase">ความปลอดภัยสิทธิผู้เรียนและวิชาการ</span>
                    <button
                      type="button"
                      onClick={handleRunAIAnalysis}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      วิเคราะห์ผลใหม่อีกครั้ง
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
