import React, { useState } from "react";
import { EducationLevel, OriginCurriculum, StudentInfo, OriginSubjectInput,  ContinuingEdInput, ForeignCredentialInput, ExperienceInput } from "./types";
import { standardSubjects2567, curriculumPresets } from "./data/curriculumData";
import { calculateTransferResults } from "./utils/transferCalculator";
import StudentInfoForm from "./components/StudentInfoForm";
import TransferWorkspace from "./components/TransferWorkspace";
import ReportViewer from "./components/ReportViewer";
import InfoGuide from "./components/InfoGuide";
import { 
  UserCheck, 
  Layers, 
  Printer, 
  BookMarked, 
  GraduationCap
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"info" | "workspace" | "report" | "guide">("info");

  // ปล่อยว่างข้อมูลตั้งต้นของผู้เรียน เพื่อให้ระบบพร้อมใช้งานป้อนข้อมูลผู้เรียนคนจริงได้ทันที
  const [studentInfo, setStudentInfo] = useState<StudentInfo>({
    name: "",
    studentId: "",
    citizenId: "",
    birthDate: "",
    occupation: "",
    previousSchool: "",
    previousDistrict: "",
    previousProvince: "",
    centerName: "",
    academicYear: "2567",
    semester: "1",
    level: EducationLevel.SENIOR_HIGH,
    originCurriculum: OriginCurriculum.CORE_2551
  });

  // รายการวิชาเทียบโอน แยกประเภทตามแท็บหลักสูตรต้นทาง (เริ่มต้นเป็นค่าว่าง)
  const [originSubjects, setOriginSubjects] = useState<OriginSubjectInput[]>([]);

  const [continuingEd, setContinuingEd] = useState<ContinuingEdInput[]>([]);

  const [foreignCreds, setForeignCreds] = useState<ForeignCredentialInput[]>([]);

  const [experiences, setExperiences] = useState<ExperienceInput[]>([]);

  // เคลียร์วิชาที่เคยป้อนไว้หากมีการเปลี่ยนระดับเพื่อไม่ให้หน่วยกิตปะปนสะสมข้ามระดับชั้น
  const handleStudentInfoChange = (updatedInfo: StudentInfo) => {
    let updated = updatedInfo;
    if (updated.level !== studentInfo.level) {
      setOriginSubjects([]);
      setContinuingEd([]);
      setForeignCreds([]);
      setExperiences([]);
      // ตัวเลือกเกรดต่างประเทศแตกต่างกันตามระดับ จึงต้องล้างค่าเดิมเพื่อไม่ให้เพดานหน่วยกิตคลาดเคลื่อน
      updated = { ...updated, foreignGradeCompleted: undefined, legacyPrathom4: false };
    }
    setStudentInfo(updated);
  };

  // ฟังก์ชันสลับเทมเพลตอัตโนมัติเมื่อขอโหลด Preset
  const handleLoadAutoPreset = () => {
    const preset = curriculumPresets[studentInfo.level]?.[studentInfo.originCurriculum];
    if (preset && preset.length > 0) {
      const formatted: OriginSubjectInput[] = preset.map((p, idx) => ({
        id: `${idx}-${Date.now()}`,
        code: p.code,
        name: p.name,
        credits: p.credits,
        grade: p.grade,
        mappedTo2567Code: p.mappedTo2567Code,
        // เทมเพลตที่จับคู่เข้าวิชาเลือกถือเป็นวิชาเลือก/เพิ่มเติม ที่เหลือคือวิชาบังคับเดิม
        // (หากไม่ระบุ ตัวคำนวณจะถือเป็นวิชาเลือกทั้งหมดและเทียบเข้าวิชาบังคับไม่ได้)
        originType: p.originType ?? (p.mappedTo2567Code.startsWith("ELECTIVE_") ? "เลือก/เพิ่มเติม" : "บังคับ")
      }));
      setOriginSubjects(formatted);
      setActiveTab("workspace");
    } else {
      alert("ขออภัย! ไม่มีวิชาเทมเพลตตัวอย่างประกอบสำหรับตัวย่อนี้ โปรดเพิ่มวิชาเทียบโอนแบบป้อนข้อมูลเองในตาราง");
    }
  };

  const hasPresetAvailable = !!curriculumPresets[studentInfo.level]?.[studentInfo.originCurriculum];

  const standardList = standardSubjects2567[studentInfo.level] || [];

  // คำนวณสรุปหน่วยกิตและวิชาสำหรับการแสดงผลแผงหน้าปัดส่วนบน พร้อมสอดคล้องการทรานส์เฟอร์แบบจัดอันดับเกรดตามจริง
  const getTransferredCreditsSummary = () => {
    const calc = calculateTransferResults(
      studentInfo,
      standardList,
      originSubjects,
      continuingEd,
      foreignCreds,
      experiences
    );

    return {
      total: calc.totalTransferredCredits,
      count: calc.results.filter(r => r.isTransferred).length,
      gpa: calc.gpa
    };
  };

  const dummyRun = () => {
    return;
    /*
    let total = 0;
    let count = 0;
    let sumWeight = 0;
    let totalCredForGpa = 0;

    standardList.forEach(std => {
      if (
        studentInfo.originCurriculum === OriginCurriculum.CORE_2551 ||
        studentInfo.originCurriculum === OriginCurriculum.NFE_2551 ||
        studentInfo.originCurriculum === OriginCurriculum.VET_2562
      ) {
        const matched = originSubjects.filter(
          s => s.mappedTo2567Code === std.code && s.grade !== "0" && s.grade !== "ร" && s.grade !== "มส"
        );
        if (matched.length > 0) {
          const sorted = [...matched].sort((a, b) => {
            const wB = getGradeWeight(b.grade);
            const wA = getGradeWeight(a.grade);
            if (wB !== wA) return wB - wA;
            return b.credits - a.credits;
          });

          let runningCredits = 0;
          const selected: typeof matched = [];
          for (const item of sorted) {
            selected.push(item);
            runningCredits += item.credits;
            if (runningCredits >= std.credits) {
              break;
            }
          }

          total += std.credits; // หน่วยกิตมาตรฐาน สกร. 2567 ที่สำเร็จจริง
          count += selected.length;

          const numericGrades = selected.map(s => parseFloat(s.grade)).filter(g => !isNaN(g));
          if (numericGrades.length > 0) {
            const sumOfSubjects = selected.reduce((s, m) => {
              const g = parseFloat(m.grade);
              return s + (isNaN(g) ? 0 : g * m.credits);
            }, 0);
            const totalSubjectCreds = selected.reduce((s, m) => s + (isNaN(parseFloat(m.grade)) ? 0 : m.credits), 0);
            const avg = totalSubjectCreds > 0 ? sumOfSubjects / totalSubjectCreds : 4.0;
            
            sumWeight += avg * std.credits;
            totalCredForGpa += std.credits;
          }
        }
      } else if (studentInfo.originCurriculum === OriginCurriculum.CONTINUING_ED) {
        const matched = continuingEd.filter(c => c.mappedTo2567Code === std.code);
        if (matched.length > 0) {
          const sorted = [...matched].sort((a, b) => b.hours - a.hours);
          let runningCredits = 0;
          const selected: typeof matched = [];
          for (const item of sorted) {
            selected.push(item);
            runningCredits += Math.floor(item.hours / 40);
            if (runningCredits >= std.credits) {
              break;
            }
          }
          const stdCredResult = Math.min(runningCredits, std.credits);
          total += stdCredResult;
          count += selected.length;
        }
      } else if (studentInfo.originCurriculum === OriginCurriculum.FOREIGN_CURRICULUM) {
        const matched = foreignCreds.filter(f => f.mappedTo2567Code === std.code);
        if (matched.length > 0) {
          const sorted = [...matched].sort((a, b) => b.credits - a.credits);
          let runningCredits = 0;
          const selected: typeof matched = [];
          for (const item of sorted) {
            selected.push(item);
            runningCredits += item.credits;
            if (runningCredits >= std.credits) {
              break;
            }
          }
          total += std.credits;
          count += selected.length;
        }
      } else if (studentInfo.originCurriculum === OriginCurriculum.KNOWLEDGE_EXPERIENCE) {
        const matched = experiences.filter(e => e.mappedTo2567Code === std.code);
        if (matched.length > 0) {
          total += std.credits;
          count += matched.length;

          const grades = matched.map(m => m.evaluationResult);
          let finalGradeNum = NaN;
          if (!grades.includes("ผ่าน")) {
            finalGradeNum = parseFloat(grades[0] || "");
          }
          if (!isNaN(finalGradeNum)) {
            sumWeight += finalGradeNum * std.credits;
            totalCredForGpa += std.credits;
          }
        }
      }
    });

    const calculatedGpa = totalCredForGpa > 0 ? (sumWeight / totalCredForGpa).toFixed(2) : "ผ่าน";
    return {
      total,
      count,
      gpa: calculatedGpa
    };
    */
  };

  const transferCalculation = calculateTransferResults(
    studentInfo,
    standardList,
    originSubjects,
    continuingEd,
    foreignCreds,
    experiences
  );

  const transferCreditsSummary = transferCalculation.untrimmedTotalCredits;
  const transferCreditsAllocated = transferCalculation.totalTransferredCredits;
  const transferGpaSummary = transferCalculation.gpa;
  const isLimitCapped = transferCalculation.isLimitCapped;

  return (
    <div className="flex h-screen w-full bg-slate-100 font-sans overflow-hidden text-slate-800" id="root-container">
      
      {/* 1. Sidebar Navigation (Professional Polish Slate-900 styling) */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0" id="main-sidebar">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center font-bold text-white shadow-sm">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-white tracking-tight text-sm flex items-center gap-1.5 leading-none">
                สกร.เทียบโอน <span className="text-emerald-500 font-bold">2567</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-medium mt-1">ระบบบริหารจัดการผลการเรียน</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto" id="sidebar-nav">
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-xs font-semibold ${
              activeTab === "info" 
                ? "bg-slate-800 text-white font-bold" 
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            }`}
            id="sidebar-btn-info"
          >
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <span>1. ข้อมูลผู้ยื่นเทียบประวัติ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("workspace")}
            className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-xs font-semibold ${
              activeTab === "workspace" 
                ? "bg-slate-800 text-white font-bold" 
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            }`}
            id="sidebar-btn-workspace"
          >
            <Layers className="w-4 h-4 text-emerald-500" />
            <span>2. จับคู่วิชาหลักสูตร 2567</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("report")}
            className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-xs font-semibold ${
              activeTab === "report" 
                ? "bg-slate-800 text-white font-bold" 
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            }`}
            id="sidebar-btn-report"
          >
            <Printer className="w-4 h-4 text-emerald-500" />
            <span>3. บันทึกและพิมพ์รายงาน</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("guide")}
            className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-xs font-semibold ${
              activeTab === "guide" 
                ? "bg-slate-800 text-white font-bold" 
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            }`}
            id="sidebar-btn-guide"
          >
            <BookMarked className="w-4 h-4 text-emerald-500" />
            <span>4. คู่มือมาตรฐานระเบียบ</span>
          </button>
        </nav>

        <div className="p-5 text-[10px] text-slate-500 border-t border-slate-800 space-y-2">
          <p className="font-mono">เวอร์ชัน 1.4.2 Build 2567.01</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-emerald-500/90 font-semibold text-[9px]">ระบบตรวจสอบลงนามพร้อมใช้</span>
          </div>
        </div>
      </aside>

      {/* 2. Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden" id="main-content-flow">
        
        {/* Top Header Section */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0" id="top-header">
          <div className="flex items-center gap-4">
            <h2 className="text-sm md:text-sm font-extrabold text-slate-900">
              {activeTab === "info" && "ส่วนตรวจสอบคุณสมบัติและระเบียบประวัติผู้เรียนดั้งเดิม"}
              {activeTab === "workspace" && "ขั้นตอนจัดวางคู่เทียบสัญชาตญาณวิชาและเกรด 2567"}
              {activeTab === "report" && "รายงานผลสรุป สร.สกร.2/2567 และทะเบียนลงนาม"}
              {activeTab === "guide" && "คลังอธิบายระเบียบการยึดพยานเทียบโอนศึกษาธิการ"}
            </h2>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-100 uppercase">
              งานทะเบียน สกร.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-900">{studentInfo.centerName || "สกร. ท้องถิ่น"}</p>
              <p className="text-[10px] text-slate-500">ภาคเรียนที่ {studentInfo.semester}/{studentInfo.academicYear}</p>
            </div>
            <div className="w-8 h-8 bg-slate-900 text-slate-200 rounded-full flex items-center justify-center font-bold text-[10px] uppercase shadow-sm">
              สส
            </div>
          </div>
        </header>

        {/* Content viewport area (Dual-Scroll protection) */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6 bg-slate-50" id="scrollable-content-viewport">
          
          {/* Dynamic Summary KPI Cards Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 shrink-0" id="dashboard-summary-cards">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">ระดับรับเข้าศึกษาใหม่</p>
              <p className="text-xs font-black text-slate-800 line-clamp-1">{studentInfo.level}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">หลักสูตรโอนต้นทาง</p>
              <p className="text-xs font-black text-slate-800 line-clamp-1">{studentInfo.originCurriculum}</p>
            </div>
            <div className={`p-4 rounded-xl border shadow-sm transition-colors ${
              isLimitCapped ? "bg-amber-50/70 border-amber-200" : "bg-white border-slate-200"
            }`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                isLimitCapped ? "text-amber-600" : "text-slate-400"
              }`}>หน่วยกิตเทียบโอนที่ได้จัดสรร</p>
              <p className="text-xs font-bold text-slate-800">
                <span className="text-emerald-600 font-extrabold text-sm">{transferCreditsAllocated}</span> / {transferCalculation.maxAllowable} นก.
                {isLimitCapped && (
                  <span className="block text-[10px] text-amber-600 mt-1 font-medium">
                    (จากที่ยื่น {transferCreditsSummary} นก. ส่วนเกินตัดออก)
                  </span>
                )}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">GPAX สะสมเทียบโอน</p>
              <p className="text-xs font-extrabold text-blue-600 font-mono text-sm">{transferGpaSummary}</p>
            </div>
          </div>

          {/* Active section component view */}
          <div className="animate-fadeIn" id="active-component-host">
            {activeTab === "info" && (
              <div className="space-y-6">
                <StudentInfoForm
                  info={studentInfo}
                  onChange={handleStudentInfoChange}
                  onAutoPreset={handleLoadAutoPreset}
                  hasPresetAvailable={hasPresetAvailable}
                />
                
                {/* Advanced guidance layout alert link */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl text-white gap-4 shadow-sm">
                  <div>
                    <h3 className="text-xs font-bold flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
                      ขั้นตอนบันทึกข้อมูลและประวัติคุณสมบัตินักศึกษาเสร็จเรียบร้อย!
                    </h3>
                    <p className="text-[11px] text-slate-300 mt-1">
                      สามารถกดเข้าสู่หัวข้อถัดไป เพื่อจัดวางโครงสร้างวิชาสะสมเดิมเข้าสู่เป้าหมายของ ร่างสกร.2567 สะดวกด้วยระบบสูตรแนะนำสลักหลัง
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("workspace")}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer whitespace-nowrap"
                  >
                    จับคู่รายวิชาเทียบโอน →
                  </button>
                </div>
              </div>
            )}

            {activeTab === "workspace" && (
              <TransferWorkspace
                studentInfo={studentInfo}
                standardList={standardList}
                originSubjects={originSubjects}
                setOriginSubjects={setOriginSubjects}
                continuingEd={continuingEd}
                setContinuingEd={setContinuingEd}
                foreignCreds={foreignCreds}
                setForeignCreds={setForeignCreds}
                experiences={experiences}
                setExperiences={setExperiences}
              />
            )}

            {activeTab === "report" && (
              <ReportViewer
                studentInfo={studentInfo}
                standardList={standardList}
                originSubjects={originSubjects}
                continuingEd={continuingEd}
                foreignCreds={foreignCreds}
                experiences={experiences}
                onNavigateToWorkspace={() => setActiveTab("workspace")}
              />
            )}

            {activeTab === "guide" && (
              <InfoGuide />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
