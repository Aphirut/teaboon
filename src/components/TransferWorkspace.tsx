import React, { useState } from "react";
import { 
  EducationLevel, 
  OriginCurriculum, 
  StudentInfo, 
  StandardSubject2567, 
  OriginSubjectInput,
  ContinuingEdInput,
  ForeignCredentialInput,
  ExperienceInput
} from "../types";
import { standardSubjects2567 } from "../data/curriculumData";
import { electiveSubjects2567 } from "../data/electiveSubjects";
import { COURSE_MATCH_THRESHOLD, courseMatchKey, type OriginSourceInfo } from "../data/courseMatch";
import {
  calculateTransferResults,
  isCodeMatch,
  findCompulsoryCounterpart,
  getRequiredTypeForSourceSubject,
  getMaxTransferCredits,
  isInvalidGrade,
  isForeignRestrictedTarget,
  detectSubjectCategory,
  getElectiveCandidates,
  setAiMatchScores,
  isLearningSkillsSubject,
  isNfeCompulsorySocial,
  isReligionCivicsSubject,
  normalizeGrade
} from "../utils/transferCalculator";
import { vetCoreCompetencyMinimums } from "../data/curriculumData";
import AITransferAnalyzer from "./AITransferAnalyzer";
import CaseDecisionAssistant from "./CaseDecisionAssistant";
import { 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  HelpCircle, 
  BookOpen, 
  Percent, 
  Clock, 
  Award, 
  Bookmark,
  Info,
  Brain,
  Sparkles,
  Upload,
  FileText,
  Loader2,
  Check
} from "lucide-react";

interface TransferWorkspaceProps {
  studentInfo: StudentInfo;
  standardList: StandardSubject2567[];
  
  originSubjects: OriginSubjectInput[];
  setOriginSubjects: React.Dispatch<React.SetStateAction<OriginSubjectInput[]>>;
  
  continuingEd: ContinuingEdInput[];
  setContinuingEd: React.Dispatch<React.SetStateAction<ContinuingEdInput[]>>;
  
  foreignCreds: ForeignCredentialInput[];
  setForeignCreds: React.Dispatch<React.SetStateAction<ForeignCredentialInput[]>>;
  
  experiences: ExperienceInput[];
  setExperiences: React.Dispatch<React.SetStateAction<ExperienceInput[]>>;
}

export default function TransferWorkspace({
  studentInfo,
  standardList,
  originSubjects,
  setOriginSubjects,
  continuingEd,
  setContinuingEd,
  foreignCreds,
  setForeignCreds,
  experiences,
  setExperiences
}: TransferWorkspaceProps) {
  const [showHelpAlert, setShowHelpAlert] = useState(true);

  // States for AI Transcript / Course Parser
  const [pastedText, setPastedText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [importMode, setImportMode] = useState<"replace" | "append">("append");
  const [parserLoading, setParserLoading] = useState(false);
  const [parserError, setParserError] = useState<string | null>(null);
  const [parserSuccess, setParserSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // ผลเปรียบเทียบคำอธิบายรายวิชาด้วย AI (ร้อยละ) คีย์ = courseMatchKey(ชื่อวิชาเดิม, รหัส สกร. 2567)
  const [aiScores, setAiScores] = useState<Record<string, number>>({});
  // ผลค้นคำอธิบายรายวิชาเดิมจากภายนอก (คีย์ = ชื่อวิชาเดิมที่ตัดช่องว่าง) ใช้แสดงแหล่งอ้างอิงให้เจ้าหน้าที่ตรวจสอบ
  const [aiOriginSources, setAiOriginSources] = useState<Record<string, OriginSourceInfo>>({});
  const [aiMatching, setAiMatching] = useState(false);
  const [aiMatchMsg, setAiMatchMsg] = useState<string | null>(null);
  // ต้องตั้งก่อนคำนวณทุกครั้ง เพื่อให้ตัวคำนวณใช้ร้อยละนี้ตัดสินการเทียบวิชาเลือก
  setAiMatchScores(aiScores);

  const runAiCourseMatch = async (force = false) => {
    const targets = originSubjects.filter(
      s => s.mappedTo2567Code?.startsWith("ELECTIVE_") && !isInvalidGrade(s.grade) && (s.name || "").trim() !== ""
    );
    const jobs: Array<{ name: string; code: string; credits: number; target: string }> = [];
    targets.forEach(s => {
      const cat = detectSubjectCategory(s.name, s.code);
      getElectiveCandidates(cat, studentInfo.level, s.name, 3).forEach(c => {
        if (force || aiScores[courseMatchKey(s.name, c.code)] === undefined) {
          jobs.push({ name: s.name, code: s.code, credits: s.credits, target: c.code });
        }
      });
    });
    if (jobs.length === 0) {
      setAiMatchMsg("ไม่มีคู่รายวิชาที่ต้องเปรียบเทียบเพิ่ม");
      return;
    }
    setAiMatching(true);
    setAiMatchMsg(null);
    const next: Record<string, number> = {};
    const nextSources: Record<string, OriginSourceInfo> = {};
    let failed = 0;
    let cachedCount = 0;
    let lastError = "";
    let cursor = 0;
    const worker = async () => {
      while (cursor < jobs.length) {
        const j = jobs[cursor++];
        try {
          const r = await fetch("/api/match/course", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ originName: j.name, originCode: j.code, originCredits: j.credits, originCurriculum: studentInfo.originCurriculum, targetCode: j.target, force }),
          });
          const data = await r.json();
          if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
          next[courseMatchKey(j.name, j.target)] = data.percent;
          if (data.originSource) nextSources[courseMatchKey(j.name, "")] = data.originSource;
          if (data.cached) cachedCount++;
        } catch (e: any) {
          failed++;
          lastError = e?.message || "ไม่ทราบสาเหตุ";
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    setAiScores(prev => ({ ...prev, ...next }));
    setAiOriginSources(prev => ({ ...prev, ...nextSources }));
    const ok = Object.keys(next).length;
    setAiMatchMsg(
      `เปรียบเทียบแล้ว ${ok} คู่ (ใช้ผลที่บันทึกไว้ ${cachedCount} คู่)` + (failed ? ` • ไม่สำเร็จ ${failed} คู่: ${lastError}` : "")
    );
    setAiMatching(false);
  };

  // Handle uploaded or dropped files
  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    setParserError(null);
    setParserSuccess(null);
    
    const reader = new FileReader();
    
    if (file.type.startsWith("text/") || file.name.endsWith(".txt")) {
      reader.onload = (e) => {
        const textContent = e.target?.result as string;
        setPastedText(textContent);
        setParserSuccess(`อัปโหลดไฟล์ข้อความ "${file.name}" สำเร็จ ระบบนำฝังข้อมูลลงในกล่องเนื้อความเรียบร้อย!`);
      };
      reader.readAsText(file);
    } else if (file.type.startsWith("image/") || file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      if (file.size > 15 * 1024 * 1024) {
        setParserError("ไฟล์มีขนาดเกิน 15 MB กรุณาลดขนาดหรือแยกไฟล์ก่อนอัปโหลด");
        setSelectedFile(null);
        setFileBase64("");
        return;
      }
      reader.onload = (e) => {
        let base64Content = e.target?.result as string;
        // บางเบราว์เซอร์ไม่ระบุ MIME ของ PDF ต้องระบุให้ชัดเจนเพื่อให้เซิร์ฟเวอร์ส่งต่อ Typhoon OCR ถูกประเภทไฟล์
        if (file.name.toLowerCase().endsWith(".pdf") && !base64Content.startsWith("data:application/pdf")) {
          base64Content = base64Content.replace(/^data:[^;]*;/, "data:application/pdf;");
        }
        setFileBase64(base64Content);
        setParserSuccess(`อัปโหลดไฟล์ "${file.name}" พร้อมสำหรับการอ่านด้วย Typhoon OCR!`);
      };
      reader.readAsDataURL(file);
    } else {
      setParserError("ขออภัย! ระบบรองรับเฉพาะรูปภาพใบผลการเรียน (.png, .jpg, .jpeg) ไฟล์ PDF หรือไฟล์ข้อความแบบโครงร่าง (.txt)");
      setSelectedFile(null);
      setFileBase64("");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // call server-side parsing endpoint
  const handleScanTranscript = async () => {
    if (!pastedText.trim() && !fileBase64) {
      setParserError("กรุณากรอกระบุข้อความรายวิชา หรือลากอัปโหลดรูปภาพ/ไฟล์ระเบียนผลการเรียนก่อนกดประมวลผล");
      return;
    }
    
    setParserLoading(true);
    setParserError(null);
    setParserSuccess(null);
    
    try {
      const response = await fetch("/api/ai/parse-transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: pastedText,
          fileBase64: fileBase64,
          originCurriculum: studentInfo.originCurriculum,
          standardList: standardList
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการร้องเรียนสมองกลวิเคราะห์");
      }
      
      const normalizedParsed = (data.parsedSubjects || []).map((s: any) =>
        s && typeof s.grade === "string" ? { ...s, grade: normalizeGrade(s.grade) } : s
      );

      // โหมดต่อท้าย: ข้ามรายการที่ซ้ำกับที่มีอยู่แล้ว (สแกนไฟล์เดิมซ้ำจะได้ไม่ถูกนับหน่วยกิตซ้ำเป็น 8/4 นก.)
      const itemKey = (s: any) =>
        [s.code, s.name, s.courseName, s.subjectName, s.experienceDetail, s.credits, s.hours, s.grade, s.foreignGrade].map(v => String(v ?? "")).join("|");
      const existingForOrigin: any[] =
        studentInfo.originCurriculum === OriginCurriculum.CONTINUING_ED ? continuingEd :
        studentInfo.originCurriculum === OriginCurriculum.FOREIGN_CURRICULUM ? foreignCreds :
        studentInfo.originCurriculum === OriginCurriculum.KNOWLEDGE_EXPERIENCE ? experiences : originSubjects;
      const existingKeys = new Set(existingForOrigin.map(itemKey));
      const seenKeys = new Set<string>();
      const parsedSubjects = normalizedParsed.filter((s: any) => {
        const k = itemKey(s);
        if (seenKeys.has(k)) return false;
        seenKeys.add(k);
        return importMode === "replace" || !existingKeys.has(k);
      });
      
      if (parsedSubjects.length === 0) {
        setParserError("ไม่สามารถพบหรือสกัดรายวิชากลุ่มคะแนนใดๆ จากใบระเบียนที่ส่งมาได้ โปรดปรับเนื้อความหรือเปลี่ยนระดับวิสัยทัศน์รูปภาพ");
        setParserLoading(false);
        return;
      }
      
      // Update states according to current curriculum with automatic quota capping/trimming
      const maxCredits = getMaxTransferCredits(studentInfo);
      let limitExceededDetected = false;
      let totalAssumed = 0;

      if (studentInfo.originCurriculum === OriginCurriculum.CORE_2551 ||
          studentInfo.originCurriculum === OriginCurriculum.NFE_2551 ||
          studentInfo.originCurriculum === OriginCurriculum.VET_2562) {
        const currentList = importMode === "replace" ? [] : originSubjects;
        const prospectiveList = [...currentList, ...parsedSubjects];

        const getGradeWeight = (g: string) => {
          const num = parseFloat(g);
          if (!isNaN(num)) return num;
          const lower = (g || "").toString().trim().toLowerCase();
          if (lower === "ผ่าน" || lower === "ผ" || lower === "p") return 2.0;
          return 0.0; // 0, ร, มส
        };

        const valid = prospectiveList.filter(s => !isInvalidGrade(s.grade));
        const invalid = prospectiveList.filter(s => isInvalidGrade(s.grade));
        totalAssumed = valid.reduce((sum, s) => sum + s.credits, 0);

        if (totalAssumed > maxCredits) {
          limitExceededDetected = true;
          // Sort valid subjects by grade descending to preserve highest achievements (then credits descending for maximum utilization)
          const sortedValid = [...valid].sort((a, b) => {
            const weightB = getGradeWeight(b.grade);
            const weightA = getGradeWeight(a.grade);
            if (weightB !== weightA) return weightB - weightA;
            return b.credits - a.credits;
          });

          let sum = 0;
          const keptValid: any[] = [];
          for (const sub of sortedValid) {
            if (sum + sub.credits <= maxCredits) {
              sum += sub.credits;
              keptValid.push(sub);
            }
          }
          setOriginSubjects([...keptValid, ...invalid]);
        } else {
          setOriginSubjects(prospectiveList);
        }
      } else if (studentInfo.originCurriculum === OriginCurriculum.CONTINUING_ED) {
        const currentList = importMode === "replace" ? [] : continuingEd;
        const prospectiveList = [...currentList, ...parsedSubjects];
        totalAssumed = prospectiveList.reduce((sum, s) => sum + Math.floor(s.hours / 40), 0);

        if (totalAssumed > maxCredits) {
          limitExceededDetected = true;
          const sorted = [...prospectiveList].sort((a, b) => b.hours - a.hours);
          let sumCredits = 0;
          const kept: any[] = [];
          for (const item of sorted) {
            const itemCred = Math.floor(item.hours / 40);
            if (sumCredits + itemCred <= maxCredits) {
              sumCredits += itemCred;
              kept.push(item);
            }
          }
          setContinuingEd(kept);
        } else {
          setContinuingEd(prospectiveList);
        }
      } else if (studentInfo.originCurriculum === OriginCurriculum.FOREIGN_CURRICULUM) {
        const currentList = importMode === "replace" ? [] : foreignCreds;
        const prospectiveList = [...currentList, ...parsedSubjects];
        totalAssumed = prospectiveList.reduce((sum, s) => sum + s.credits, 0);

        if (totalAssumed > maxCredits) {
          limitExceededDetected = true;
          const sorted = [...prospectiveList].sort((a, b) => b.credits - a.credits);
          let sum = 0;
          const kept: any[] = [];
          for (const item of sorted) {
            if (sum + item.credits <= maxCredits) {
              sum += item.credits;
              kept.push(item);
            }
          }
          setForeignCreds(kept);
        } else {
          setForeignCreds(prospectiveList);
        }
      } else if (studentInfo.originCurriculum === OriginCurriculum.KNOWLEDGE_EXPERIENCE) {
        const currentList = importMode === "replace" ? [] : experiences;
        const prospectiveList = [...currentList, ...parsedSubjects];
        
        const getCreditForCode = (code: string) => {
          const targetObj = standardList.find(std => isCodeMatch(code, std.code));
          return targetObj ? targetObj.credits : 0;
        };

        totalAssumed = prospectiveList.reduce((sum, item) => sum + getCreditForCode(item.mappedTo2567Code), 0);

        if (totalAssumed > maxCredits) {
          limitExceededDetected = true;
          let sum = 0;
          const kept: any[] = [];
          for (const item of prospectiveList) {
            const cred = getCreditForCode(item.mappedTo2567Code);
            if (sum + cred <= maxCredits) {
              sum += cred;
              kept.push(item);
            }
          }
          setExperiences(kept);
        } else {
          setExperiences(prospectiveList);
        }
      }
      
      if (limitExceededDetected) {
        setParserSuccess(`สแกนสกัดข้อมูลและประเมินจับคู่สำเร็จ ทว่าพบยอดรวมหน่วยกิตเดิมเกินโควตาสูงสุดของระดับชั้น (${maxCredits} นก.) ระบบ AI จึงได้คัดเก็บวิชาเกรดดีที่สุดและทำการตัดวิชาเรียนส่วนเกินสะสมทิ้งออกให้โดยอัตโนมัติ เพื่อให้ไม่เกินสิทธิ์ขอยอดจำกัด! (${data.isSimulated ? "โหมดจำลองพรีวิว" : `ประมวลทางเลือก AI: ${data.providerName}`})`);
      } else {
        setParserSuccess(`สแกนสกัดข้อมูลและประเมินจับคู่เทียบโอนเข้า สกร. 2567 รายวิชาดั้งเดิมสำเร็จจำนวน ${parsedSubjects.length} วิชา! ข้อมูลโหลดเข้าสู่ตารางด้านล่างโดยอัตโนมัติแล้ว เจ้าหน้าที่พิจารณาสามารถตรวจแก้ในรูปตารางได้ทันที (${data.isSimulated ? "โหมดจำลองพรีวิว" : `ถอดด้วยสมองกล ${data.providerName} จริง`})`);
      }
      
      // Clean inputs for pristine workflow
      setPastedText("");
      setSelectedFile(null);
      setFileBase64("");
      
    } catch (err: any) {
      console.error(err);
      setParserError(err.message || "มีปัญหาสื่อสารไม่สำเร็จ กรุณาสลองอีกครั้งหรือใชังานในโหมดตั้งคีย์ให้พร้อม");
    } finally {
      setParserLoading(false);
    }
  };

  // สรุปข้อมูลหน่วยกิตทั้งหมดกำลังเทียบโอน
  const getMaxCredits = () => getMaxTransferCredits(studentInfo);

  // คำนวณจำนวนหน่วยกิตที่ยื่นเทียบโอนสำเร็จ สอดคล้องเกณฑ์การปิดกั้นยอดโควตาจัดอันดับคะแนน/หน่วยกิตเป้าหมาย
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
      isExceeded: calc.isLimitCapped,
      rawTotal: calc.untrimmedTotalCredits
    };
  };

  const { total: transferCredits, isExceeded, rawTotal } = getTransferredCreditsSummary();
  const activeElectiveCode = standardList.find(s => s.code.startsWith("ELECTIVE_"))?.code || "ELECTIVE_SEN";

  // ปรุงฟังก์ชันเพิ่มแถวสำหรับการเทียบปกติ
  const handleAddOriginSubject = () => {
    const newSubject: OriginSubjectInput = {
      id: `${Date.now()}-${Math.random()}`,
      code: "",
      name: "",
      credits: 3,
      grade: "4",
      mappedTo2567Code: standardList[0]?.code || "",
      originType: "บังคับ"
    };
    setOriginSubjects([...originSubjects, newSubject]);
  };

  const handleUpdateOriginSubject = (id: string, field: keyof OriginSubjectInput, value: any) => {
    setOriginSubjects(originSubjects.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleRemoveOriginSubject = (id: string) => {
    setOriginSubjects(originSubjects.filter(s => s.id !== id));
  };

  // ปรุงฟังก์ชันเวิร์กสเปซการศึกษาต่อเนื่อง
  const handleAddContinuingEd = () => {
    const newItem: ContinuingEdInput = {
      id: `${Date.now()}-${Math.random()}`,
      courseName: "",
      hours: 40,
      organizer: "",
      mappedTo2567Code: standardList[0]?.code || ""
    };
    setContinuingEd([...continuingEd, newItem]);
  };

  const handleUpdateContinuingEd = (id: string, field: keyof ContinuingEdInput, value: any) => {
    setContinuingEd(continuingEd.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleRemoveContinuingEd = (id: string) => {
    setContinuingEd(continuingEd.filter(item => item.id !== id));
  };

  // ปรุงฟังก์ชันเวิร์กสเปซหลักสูตรต่างประเทศ
  const handleAddForeignCred = () => {
    const newItem: ForeignCredentialInput = {
      id: `${Date.now()}-${Math.random()}`,
      subjectName: "",
      foreignGrade: "A",
      credits: 3,
      // ภาษาไทย และสังคมศึกษาฯ เทียบโอนจากหลักสูตรต่างประเทศไม่ได้ จึงไม่ตั้งเป็นค่าเริ่มต้น
      mappedTo2567Code: standardList.find(s => !isForeignRestrictedTarget(s))?.code || ""
    };
    setForeignCreds([...foreignCreds, newItem]);
  };

  const handleUpdateForeignCred = (id: string, field: keyof ForeignCredentialInput, value: any) => {
    setForeignCreds(foreignCreds.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleRemoveForeignCred = (id: string) => {
    setForeignCreds(foreignCreds.filter(item => item.id !== id));
  };

  // ปรุงฟังก์ชันเวิร์กสเปซประเมินความรู้และประสบการณ์
  const handleAddExperience = () => {
    const newItem: ExperienceInput = {
      id: `${Date.now()}-${Math.random()}`,
      experienceDetail: "",
      evidence: "",
      mappedTo2567Code: standardList[0]?.code || "",
      evaluationResult: "ผ่าน"
    };
    setExperiences([...experiences, newItem]);
  };

  const handleUpdateExperience = (id: string, field: keyof ExperienceInput, value: any) => {
    setExperiences(experiences.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleRemoveExperience = (id: string) => {
    setExperiences(experiences.filter(item => item.id !== id));
  };

  // ล้างตาราง
  const handleClearAll = () => {
    if (confirm("คุณต้องการล้างข้อมูลรายวิชาทั้งหมดใช่หรือไม่?")) {
      setOriginSubjects([]);
      setContinuingEd([]);
      setForeignCreds([]);
      setExperiences([]);
    }
  };

  // ปรับทอน/ตัดรายวิชาสะสมที่เกินโควตาสูงสุดออกอัตโนมัติเพื่อให้พอดีเกณฑ์ตามคำสั่งผู้ใช้
  const handleAutoTrimExcess = () => {
    const maxCredits = getMaxCredits();
    
    if (studentInfo.originCurriculum === OriginCurriculum.CORE_2551 ||
        studentInfo.originCurriculum === OriginCurriculum.NFE_2551 ||
        studentInfo.originCurriculum === OriginCurriculum.VET_2562) {
      
      const getGradeWeight = (g: string) => {
        const num = parseFloat(g);
        if (!isNaN(num)) return num;
        const lower = (g || "").toString().trim().toLowerCase();
        if (lower === "ผ่าน" || lower === "ผ" || lower === "p") return 2.0;
        return 0.0; // 0, ร, มส
      };
      
      const valid = originSubjects.filter(s => !isInvalidGrade(s.grade));
      const invalid = originSubjects.filter(s => isInvalidGrade(s.grade));
      
      const sortedValid = [...valid].sort((a, b) => {
        const weightB = getGradeWeight(b.grade);
        const weightA = getGradeWeight(a.grade);
        if (weightB !== weightA) return weightB - weightA;
        return b.credits - a.credits;
      });
      
      let sum = 0;
      const keptValid: any[] = [];
      const trimmed: any[] = [];
      for (const sub of sortedValid) {
        if (sum + sub.credits <= maxCredits) {
          sum += sub.credits;
          keptValid.push(sub);
        } else {
          trimmed.push(sub);
        }
      }
      
      setOriginSubjects([...keptValid, ...invalid]);
      if (trimmed.length > 0) {
        alert(`AI ได้กรองเกรดและตัดวิชาเรียนที่มีความสำคัญต่ำกว่าออกรวม ${trimmed.length} รายวิชา เพื่อควบคุมยอดหน่วยกิตรวมไม่ให้เกินโควตา ${maxCredits} หน่วยกิตสูงสุดแล้ว!`);
      }
    } else if (studentInfo.originCurriculum === OriginCurriculum.CONTINUING_ED) {
      const sorted = [...continuingEd].sort((a, b) => b.hours - a.hours);
      let sumCredits = 0;
      const kept: any[] = [];
      const trimmed: any[] = [];
      for (const item of sorted) {
        const itemCred = Math.floor(item.hours / 40);
        if (sumCredits + itemCred <= maxCredits) {
          sumCredits += itemCred;
          kept.push(item);
        } else {
          trimmed.push(item);
        }
      }
      setContinuingEd(kept);
      if (trimmed.length > 0) {
        alert(`AI ได้ตัดหลักสูตรระยะสั้นส่วนเกินออกรวม ${trimmed.length} รายการ เรียบร้อยแล้ว! เพื่อควบคุมหน่วยกิตไม่ให้เกิน ${maxCredits}`);
      }
    } else if (studentInfo.originCurriculum === OriginCurriculum.FOREIGN_CURRICULUM) {
      const sorted = [...foreignCreds].sort((a, b) => b.credits - a.credits);
      let sum = 0;
      const kept: any[] = [];
      const trimmed: any[] = [];
      for (const item of sorted) {
        if (sum + item.credits <= maxCredits) {
          sum += item.credits;
          kept.push(item);
        } else {
          trimmed.push(item);
        }
      }
      setForeignCreds(kept);
      if (trimmed.length > 0) {
        alert(`AI ได้ตัดวิชานอกระบบสะสมส่วนเกินออกรวม ${trimmed.length} รายการแล้ว! ยอดรวมวิชาเรียนจะไม่เกินโควตา ${maxCredits} หน่วยกิต`);
      }
    } else if (studentInfo.originCurriculum === OriginCurriculum.KNOWLEDGE_EXPERIENCE) {
      const getCreditForCode = (code: string) => {
        const targetObj = standardList.find(std => isCodeMatch(code, std.code));
        return targetObj ? targetObj.credits : 0;
      };
      
      let sum = 0;
      const kept: any[] = [];
      const trimmed: any[] = [];
      for (const item of experiences) {
        const cred = getCreditForCode(item.mappedTo2567Code);
        if (sum + cred <= maxCredits) {
          sum += cred;
          kept.push(item);
        } else {
          trimmed.push(item);
        }
      }
      setExperiences(kept);
      if (trimmed.length > 0) {
        alert(`AI ได้คัดรายวิถีแฟ้มตรวจประเมินส่วนเกินออกรวม ${trimmed.length} รายการเรียบร้อยแล้ว! เพื่อให้อยู่ในกรอบประเมินไม่เกินคุณสมบัติ ${maxCredits} หน่วยกิตหลักสูตร`);
      }
    }
  };

  // คำนวณรวบรวมข้อมูลผลการเรียนเทียบโอนเข้าหลักสูตร สกร. 2567 บังคับและเลือก เพื่อใช้กับแดชบอร์ดความก้าวหน้า
  const getProgressBreakdown = () => {
    const calc = calculateTransferResults(
      studentInfo,
      standardList,
      originSubjects,
      continuingEd,
      foreignCreds,
      experiences
    );

    const compTransferred = calc.results
      .filter(r => r.std.type === "บังคับ" && r.isTransferred)
      .reduce((sum, r) => sum + r.allocatedCredits, 0);

    // กำหนดเกณฑ์จำนวนหน่วยกิตเทียบโอนสูงสุดในแต่ละหมวดตามระเบียบ คู่มือ สกร. 2567 หน้า 19, 21, 23
    let compRequired = 36;
    let elecRequired = 21;

    if (studentInfo.level === EducationLevel.PRIMARY) {
      compRequired = 22;
      elecRequired = 14;
    } else if (studentInfo.level === EducationLevel.JUNIOR_HIGH) {
      compRequired = 29;
      elecRequired = 13;
    } else if (studentInfo.level === EducationLevel.SENIOR_HIGH) {
      compRequired = 36;
      elecRequired = 21;
    }

    const elecTransferred = calc.results
      .filter(r => r.std.type !== "บังคับ" && r.isTransferred)
      .reduce((sum, r) => sum + r.allocatedCredits, 0);

    return {
      compTransferred,
      compRequired,
      elecTransferred,
      elecRequired
    };
  };

  const { compTransferred, compRequired, elecTransferred, elecRequired } = getProgressBreakdown();

  // รายวิชาที่ผู้ใช้จับคู่ไว้ แต่ผิดเงื่อนไขในแนวทางการเทียบโอน (เช่น ภาษาไทยจากต่างประเทศ)
  const calcResults = calculateTransferResults(
    studentInfo,
    standardList,
    originSubjects,
    continuingEd,
    foreignCreds,
    experiences
  ).results;
  const ruleBlockedResults = calcResults.filter(r => r.ruleNote);

  // ถ้าวิชาเดิมนี้เคยเปรียบเทียบแล้วแต่ไม่มีรายวิชาไหนถึงเกณฑ์ → คืนข้อความร้อยละสูงสุด
  const aiBelowThreshold = (name: string): string | null => {
    const prefix = courseMatchKey(name, "");
    const vals = Object.entries(aiScores).filter(([k]) => k.startsWith(prefix));
    if (vals.length === 0) return null;
    const best = Math.max(...vals.map(([, v]) => Number(v)));
    return best >= COURSE_MATCH_THRESHOLD ? null : `สูงสุด ${best}%`;
  };

  // รายวิชาเลือก สกร. 2567 ที่ตัวคำนวณจับคู่ให้วิชาเดิมแต่ละวิชา (วิชาที่ถูกแบ่งหน่วยกิตมี id ต่อท้าย _split_)
  const autoElectiveByOriginId: Record<string, string> = {};
  calcResults.forEach(r => {
    if (r.std.type === "บังคับ") return;
    r.matchingSources.forEach(src => {
      const code = src.mappedTo2567Code;
      if (!code || code.startsWith("ELECTIVE_")) return;
      autoElectiveByOriginId[src.id.split("_split_")[0]] = code;
    });
  });

  // สรุปกลุ่มวิชาเดิมที่นำมารวมกันเพื่อเทียบเข้าวิชาบังคับ 2567 หนึ่งวิชา
  // (หน่วยกิตรวมต้องไม่น้อยกว่าวิชา 2567 ที่รับเทียบโอน)
  const getCompulsoryGroupInfo = (targetCode: string) => {
    const std = standardList.find(s => s.code === targetCode && s.type === "บังคับ");
    if (!std) return null;
    const members = originSubjects.filter(s => {
      if (s.mappedTo2567Code !== targetCode || isInvalidGrade(s.grade)) return false;
      const r = getRequiredTypeForSourceSubject(s.name, s.code, s.originType, studentInfo.level);
      return r.allowedType === "บังคับ" && (r.counterpartCode === null || isCodeMatch(r.counterpartCode, std.code));
    });
    const sum = members.reduce((acc, s) => acc + s.credits, 0);
    const result = calcResults.find(r => r.std.code === targetCode);
    const consumedIds = new Set((result?.matchingSources || []).map(s => s.id));
    return { std, members, sum, transferred: !!result?.isTransferred, consumedIds };
  };

  return (
    <div className="space-y-6">
      {isExceeded && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs shadow-sm" id="exceeded-limit-banner">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-rose-950">⚠️ โควตาการเทียบโอนเกินเกณฑ์สูงสุดที่ สกร. กำหนด!</h4>
              <p className="text-gray-600">
                จำนวนหน่วยกิตสะสมที่เลือกเทียบปัจจุบันคือ <strong className="text-rose-600">{transferCredits}</strong> จากสูงสุดไม่เกิน <strong className="text-emerald-700">{getMaxCredits()}</strong> หน่วยกิต 
                เพื่อความสอดคล้องตามเกณฑ์มาตรฐาน สกร. <strong className="underline">ระบบได้ทำการล็อคหัวข้อพิมพ์รายงานและสลักหลังลงนาม</strong> จนกว่าท่านจะปรับลดหรือลบรายวิชาเทียบโอนส่วนเกินออกให้ไม่เกินโควตาสูงสุด
              </p>
            </div>
          </div>
          <button
            onClick={handleAutoTrimExcess}
            className="shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold rounded-lg transition-colors shadow-sm cursor-pointer text-xs"
            id="btn-auto-trim"
          >
            <span>🌀</span>
            AI ช่วยตัดวิชาเกินทิ้ง
          </button>
        </div>
      )}

      {studentInfo.carryOver2567 && (
        <div className="p-4 bg-sky-50 border border-sky-200 text-sky-950 rounded-2xl flex items-start gap-3 text-xs shadow-sm" id="carry-over-banner">
          <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-extrabold">โหมดลาออกแล้วสมัครใหม่: นำผลการเรียน สกร. 2567 เดิมไปใช้โดยตรง</h4>
            <p className="text-gray-700">
              ให้จับคู่แต่ละรายการเป็นรายวิชา สกร. 2567 ที่เคยได้ผลไว้ ระบบจะนำหน่วยกิตและเกรดตามที่กรอกไปใช้เลย
              โดยไม่ตรวจเกณฑ์หน่วยกิตต้นทาง ประเภทวิชา และโควตาเทียบโอนซ้ำ (ยกเว้นวิชาที่ได้ 0, ร, มส จะไม่ถูกนำมาใช้)
              วิชาบังคับนับไม่เกินหน่วยกิตของวิชานั้น ส่วนวิชาเลือกนับตามหน่วยกิตที่กรอก
            </p>
          </div>
        </div>
      )}

      {studentInfo.legacyPrathom4 && studentInfo.level === EducationLevel.PRIMARY && (
        <div className="p-4 bg-sky-50 border border-sky-200 text-sky-950 rounded-2xl flex items-start gap-3 text-xs shadow-sm" id="legacy-prathom4-banner">
          <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-extrabold">โหมดผู้จบ ป.4 ก่อน พ.ศ. 2507 (ใบสุทธิรวมผลการเรียน)</h4>
            <p className="text-gray-700">
              ระบบกำหนดผลเทียบโอนคงที่ <strong>24 นก. ผล "ผ่าน"</strong> ตามแนวทางฯ (คณิตศาสตร์ 3, ภาษาไทย 3, การงานอาชีพ 3, สุขภาวะและศิลปะ 3, สังคมศึกษาฯ 4, วิชาเลือก 8)
              รายการวิชาในตารางด้านล่างจะไม่ถูกนำมาคำนวณ หากต้องการเทียบจากหลักฐานอื่น ให้ยกเลิกเครื่องหมายในขั้นตอนที่ 1
            </p>
          </div>
        </div>
      )}

      {studentInfo.originCurriculum === OriginCurriculum.VET_2562 && studentInfo.level === EducationLevel.SENIOR_HIGH && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl text-xs shadow-sm space-y-3" id="vet-competency-panel">
          <div>
            <h4 className="font-extrabold">ปวช. 2562 (ปรับปรุง 2565): สมรรถนะแกนกลางที่ยื่นเทียบ</h4>
            <p className="text-gray-700">
              เทียบได้ทั้งวิชาบังคับและวิชาเลือกรวมไม่เกิน <strong>{getMaxCredits()} นก.</strong> (ตามภาคเรียนที่เรียนจบ) หน่วยกิตที่นำมาเทียบต้องไม่น้อยกว่าวิชาที่รับเทียบ
              ส่วนสมรรถนะวิชาชีพและวิชาเลือกเสรี (ไม่น้อยกว่า 10 นก.) นำมาเทียบเข้าวิชาเลือกได้ กิจกรรมเสริมหลักสูตรไม่นับหน่วยกิต
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {vetCoreCompetencyMinimums.map(g => {
              const credits = originSubjects
                .filter(s => !isInvalidGrade(s.grade) && detectSubjectCategory(s.name, s.code) === g.category)
                .reduce((sum, s) => sum + s.credits, 0);
              const enough = credits >= g.minCredits;
              return (
                <div key={g.category} className={`p-2 rounded-lg border ${enough ? "bg-white border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                  <div className="font-bold">{g.label}</div>
                  <div className={enough ? "text-emerald-700" : "text-amber-700"}>
                    {enough ? "✅" : "⚠️"} {credits}/{g.minCredits} นก. (ขั้นต่ำตามแนวทางฯ)
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-500">แสดงเพื่อประกอบการตรวจหลักฐาน: กลุ่มที่ต่ำกว่าขั้นต่ำให้ตรวจสอบใบแสดงผลการเรียนว่ากรอกครบหรือไม่ ไม่ได้ปิดกั้นการเทียบโอน</p>
        </div>
      )}

      {ruleBlockedResults.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl flex items-start gap-3 text-xs shadow-sm" id="rule-blocked-banner">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-extrabold">รายการที่แนวทางการเทียบโอนไม่อนุญาต ระบบจึงไม่นับเป็นหน่วยกิตเทียบโอน</h4>
            <ul className="list-disc pl-4 space-y-0.5 text-gray-700">
              {ruleBlockedResults.map(r => (
                <li key={r.std.code}>
                  <strong>[{r.std.code}] {r.std.name}</strong> — {r.ruleNote}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Dynamic Summary Cards Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Maximum Allowable Transfer Credits Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">ระดับเป้าหมาย สกร.</span>
            <span className="text-lg font-bold text-gray-900 block">{studentInfo.level}</span>
            <span className="text-xs text-gray-400 block">เกณฑ์สูงสุดไม่เกิน {getMaxCredits()} หน่วยกิต</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <BookOpen className="w-6 h-6 text-emerald-600" />
          </div>
        </div>

        {/* Current Transferred Credits Card */}
        <div className={`bg-white rounded-2xl border p-5 shadow-sm flex items-center justify-between transition-colors ${
          isExceeded ? "border-rose-200 bg-rose-50/10" : "border-gray-100"
        }`}>
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">หน่วยกิตยื่นเทียบรวม</span>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-black ${isExceeded ? "text-rose-600 animate-pulse" : "text-emerald-700"}`}>
                {transferCredits}
              </span>
              <span className="text-xs text-gray-400">/ {getMaxCredits()} นก.</span>
            </div>
            {isExceeded ? (
              <span className="text-2xs font-semibold text-rose-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> เกินโควตาเทียบโอนสูงสุด!
              </span>
            ) : (
              <span className="text-2xs text-gray-400 block">โครงสร้างเรียบร้อย ปลอดภัยตามระเบียบ</span>
            )}
          </div>
          <div className={`p-3 rounded-xl ${isExceeded ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-800"}`}>
            {isExceeded ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
          </div>
        </div>

        {/* Selected original curriculum background summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">ประเภทหลักสูตรต้นทาง</span>
            <span className="text-sm font-bold text-gray-900 line-clamp-1 block">{studentInfo.originCurriculum}</span>
            <span className="text-xs text-gray-400 block">มีเกณฑ์และวิธีการเทียบโอนเฉพาะระดับ</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl">
            <Award className="w-6 h-6 text-amber-600" />
          </div>
        </div>
      </div>

      {/* แดชบอร์ดสรุปสิทธิ์ความก้าวหน้าการเทียบโอนแยกหมวดวิชา */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 text-white shadow-xl space-y-4" id="credit-progress-dashboard">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100">แดชบอร์ดตรวจสอบสัดส่วนหน่วยกิตรายหมวด</h3>
              <p className="text-[10px] text-slate-400">สรุปความก้าวหน้าหน่วยกิตเทียบโอนตามคู่มือเทียบโอน สกร. 2567 หน้า 19, 21, 23 (วิชาบังคับ และวิชาเลือก)</p>
            </div>
          </div>
          <span className="text-[9px] px-2.5 py-0.5 bg-slate-800 text-slate-300 font-bold rounded-full border border-slate-700/80 uppercase">
            ระดับการเรียน: {studentInfo.level}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* การเทียบหมวดวิชาบังคับ */}
          <div className="bg-slate-950/40 rounded-xl border border-slate-800 p-4 space-y-3 relative overflow-hidden group hover:border-slate-700 transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest block mb-0.5">📂 หมวดวิชาบังคับ (Compulsory)</span>
                <span className="text-2xl font-black font-mono tracking-tight text-white">
                  {compTransferred.toFixed(1)} <sub className="text-xs font-normal text-slate-500 font-sans">/ {compRequired.toFixed(1)} นก.</sub>
                </span>
              </div>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                compTransferred >= compRequired 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : compTransferred > 0 
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    : "bg-slate-800 text-slate-400 border border-slate-700/60"
              }`}>
                {compTransferred >= compRequired ? "เทียบได้เต็มจำนวน" : compTransferred > 0 ? "มีหน่วยโอนสะสม" : "ยังไม่ได้เลือกวิชา"}
              </span>
            </div>

            {/* Progress indicator bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (compTransferred / (compRequired || 1)) * 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>ความก้าวหน้าเทียบรายหมวด</span>
                <span className="font-bold text-slate-200">
                  {((compTransferred / (compRequired || 1)) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* การเทียบหมวดวิชาเลือก */}
          <div className="bg-slate-950/40 rounded-xl border border-slate-800 p-4 space-y-3 relative overflow-hidden group hover:border-slate-700 transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-widest block mb-0.5">🎓 หมวดวิชาเลือกเสรี (Elective)</span>
                <span className="text-2xl font-black font-mono tracking-tight text-white">
                  {elecTransferred.toFixed(1)} <sub className="text-xs font-normal text-slate-500 font-sans">/ {elecRequired.toFixed(1)} นก.</sub>
                </span>
              </div>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                elecTransferred >= elecRequired 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : elecTransferred > 0 
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    : "bg-slate-800 text-slate-400 border border-slate-700/60"
              }`}>
                {elecTransferred >= elecRequired ? "เทียบได้เต็มจำนวน" : elecTransferred > 0 ? "มีหน่วยโอนสะสม" : "ยังไม่ได้เลือกวิชา"}
              </span>
            </div>

            {/* Progress indicator bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (elecTransferred / (elecRequired || 1)) * 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>ความก้าวหน้าเทียบรายหมวด</span>
                <span className="font-bold text-slate-200">
                  {((elecTransferred / (elecRequired || 1)) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Intelligence Analyzer Panel */}
      <AITransferAnalyzer
        studentInfo={studentInfo}
        standardList={standardList}
        originSubjects={originSubjects}
        continuingEd={continuingEd}
        foreignCreds={foreignCreds}
        experiences={experiences}
      />

      {/* Decision Assistant (OpenRouter Decisions) then Typhoon writes the note */}
      <CaseDecisionAssistant
        studentInfo={studentInfo}
        standardList={standardList}
        originSubjects={originSubjects}
        continuingEd={continuingEd}
        foreignCreds={foreignCreds}
        experiences={experiences}
      />

      {/* Rules Notice Board */}
      {showHelpAlert && (
        <div className="p-4 bg-amber-50 border border-amber-200/50 rounded-xl flex items-start gap-3 text-amber-900 text-xs">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <h4 className="font-semibold text-amber-950">ข้อตกลงและหลักปฏิบัติสำคัญ ตามระเบียบเทียบโอน 2567:</h4>
            <ul className="list-disc pl-4 space-y-1 text-gray-700">
              <li>
                <strong>ห้ามรับผลการเรียนเป็นศูนย์ ร มส:</strong> รายวิชาที่มีผลการเรียนเป็น <code className="bg-amber-100 text-rose-700 px-1 rounded font-bold">0</code>, <code className="bg-amber-100 text-rose-700 px-1 rounded font-bold">ร</code> หรือ <code className="bg-amber-100 text-rose-700 px-1 rounded font-bold">มส</code> จะไม่ถูกนำมารับเทียบโอนเข้าสู่ระบบ
              </li>
              <li>
                <strong>สัดส่วนการคำนวณหน่วยกิตการศึกษาต่อเนื่อง:</strong> ทุกหลักสูตรวิชาชีพระยะสั้นจะคำนวนหน่วยกิตอัตโนมัติในสัดส่วน <strong>40 ชั่วโมงจัดอบรม ต่อ 1 หน่วยกิตเทียบโอน</strong> ของระดับ 2567
              </li>
              <li>
                <strong>กรณีเทียบหลายวิชาเข้าวิชาบังคับเป้าหมายเดียวกัน:</strong> ระบบจะคำนวณ <strong>ค่าเกรดเฉลี่ยแบบถ่วงน้ำหนัก</strong> ตามหน่วยกิตให้อัตโนมัติในหน้าบัตรและรายงานสรุป
              </li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setShowHelpAlert(false)}
            className="text-amber-500 hover:text-amber-800 text-sm font-bold px-1 transition-colors cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* AI Transcript & Text Import Panel */}
      <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 space-y-6 shadow-md" id="ai-transcript-parser-panel">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 shrink-0">
              <Brain className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                ระบบอัปโหลดใบผลการเรียนสแกนและเทียบโอนด้วย AI
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse whitespace-nowrap animate-pulse">
                  อัจฉริยะ 2567
                </span>
              </h3>
              <p className="text-xs text-slate-400">อัปโหลดภาพใบเกรด / ไฟล์ .txt หรือวางข้อความดิบเพื่อทำการสแกนประมวลผลจับคู่เทียบโครงสร้าง สกร. 2567 ทันที</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start md:self-auto">
            <span
              className="px-2.5 py-1 rounded text-[10px] font-black bg-indigo-600 text-white shadow-sm"
              id="parser-engine-typhoon"
            >
              Typhoon OCR + Typhoon 2.5 (SCB 10X)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* File Upload Area */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              1. ลากวางหรืออัปโหลดไฟล์ (รูปภาพ / PDF ใบผลการเรียน หรือไฟล์ .txt)
            </label>
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById("transcript-file-selector")?.click()}
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[160px] ${
                dragActive 
                  ? "border-emerald-400 bg-emerald-500/10 text-white scale-[1.02]" 
                  : selectedFile
                  ? "border-emerald-500/50 bg-slate-950 text-slate-200 hover:bg-slate-950"
                  : "border-slate-800 bg-slate-950/60 hover:bg-slate-950 text-slate-300 hover:border-slate-700"
              }`}
              id="drag-drop-zone"
            >
              <input
                id="transcript-file-selector"
                type="file"
                accept="image/*,.pdf,application/pdf,.txt,text/plain"
                onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                className="hidden"
              />
              {selectedFile ? (
                <div className="space-y-2 text-center">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-full mx-auto flex items-center justify-center">
                    {selectedFile.type.startsWith("image/") ? (
                      <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
                    ) : (
                      <FileText className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-200 line-clamp-1">{selectedFile.name}</h4>
                    <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                      ได้รับหน่วยไฟล์แล้ว (Size: {(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">พร้อมปุ่มเริ่มวิเคราะห์ด้านล่าง</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-full mx-auto flex items-center justify-center text-slate-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">
                      ลากไฟล์รูปถ่าย / สแกนใบเกรดมาวางที่นี่
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">หรือคลิกเพื่อค้นหารูปภาพ (PNG, JPG) ไฟล์ PDF หรือไฟล์ .txt จากเครื่อง</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pasted Text Area */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5" htmlFor="raw-transcript-textarea">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              2. หรือวางรายละเอียดข้อความผลการเรียนที่คัดลอกมา
            </label>
            <textarea
              id="raw-transcript-textarea"
              rows={6}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="คัดลอกรายละเอียดคะแนน ชื่อวิชา และหน่วยกิตจากระบบเดิม แล้วนำมาวางป้อนที่ช่องว่างนี้โดยตรง ตัวอย่างเช่น:&#10;ท31101 ภาษาไทยพื้นฐาน 1 / 1.5 นกก. / เกรด 4&#10;ค31102 คณิตศาสตร์เบื้องต้น / 1.0 นกก. / เกรด 3.5"
              className="w-full text-xs bg-slate-950 p-4 border border-slate-800 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-200 placeholder-slate-600 outline-none resize-none font-sans min-h-[160px]"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Import Mode Radio Toggle */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 px-2 font-bold uppercase tracking-wider">โหมดจัดทำข้อมูล:</span>
              <button
                type="button"
                onClick={() => setImportMode("append")}
                className={`px-3 py-1 rounded text-[10px] font-black transition-all cursor-pointer ${
                  importMode === "append"
                    ? "bg-slate-800 text-emerald-300 border border-slate-700"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                id="import-mode-append"
              >
                เพิ่มเข้าตารางเดิม
              </button>
              <button
                type="button"
                onClick={() => setImportMode("replace")}
                className={`px-3 py-1 rounded text-[10px] font-black transition-all cursor-pointer ${
                  importMode === "replace"
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                id="import-mode-replace"
              >
                ล้างข้อมูลแล้วเขียนทับใหม่
              </button>
            </div>

            <div className="text-[10px] text-slate-400 font-semibold bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800/40">
              วิเคราะห์แบบตาราง: <span className="text-emerald-400 font-extrabold">{studentInfo.originCurriculum}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleScanTranscript}
            disabled={parserLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-xs font-black rounded-xl text-slate-950 shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            id="btn-scan-transcript-execute"
          >
            {parserLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                กำลังสแกนสกัดด้วยสมองกล...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950 shrink-0" />
                เริ่มวิเคราะห์เทียบโอนอัตโนมัติ (AI Scan & Auto-Map)
              </>
            )}
          </button>
        </div>

        {/* Feedback alerts */}
        {parserError && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-4 text-rose-400 text-xs animate-fadeIn animate-pulse" id="parser-error-msg">
            <span className="text-rose-400 text-lg leading-none shrink-0">⚠️</span>
            <div className="space-y-1">
              <h5 className="font-bold text-slate-200">เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูล:</h5>
              <p className="text-slate-300 leading-relaxed text-[11px]">{parserError}</p>
            </div>
          </div>
        )}

        {parserSuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-4 text-emerald-400 text-xs animate-fadeIn" id="parser-success-msg">
            <span className="text-emerald-400 text-lg leading-none shrink-0 font-bold">✓</span>
            <div className="space-y-1">
              <h5 className="font-bold text-slate-200">เทียบโอนจับคู่สำเร็จเป็นที่เรียบร้อย:</h5>
              <p className="text-slate-300 leading-relaxed text-[11px]">{parserSuccess}</p>
            </div>
          </div>
        )}
      </div>

      {/* Primary Workspace Interface depending on Origin Curry */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-semibold text-gray-900 text-md">ตารางจัดทำข้อมูลเทียบโอนประเมินผล</h3>
              <p className="text-xs text-gray-500">ป้อนรหัสวิญญาณรายวิชาเดิมและเลือกรายวิชาเป้าหมายใน สกร. 2567</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1.5 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold border border-gray-200 transition-colors cursor-pointer"
              id="btn-clear-all"
            >
              ล้างทั้งหมด
            </button>
            <button
              type="button"
              onClick={
                studentInfo.originCurriculum === OriginCurriculum.CONTINUING_ED ? handleAddContinuingEd :
                studentInfo.originCurriculum === OriginCurriculum.FOREIGN_CURRICULUM ? handleAddForeignCred :
                studentInfo.originCurriculum === OriginCurriculum.KNOWLEDGE_EXPERIENCE ? handleAddExperience :
                handleAddOriginSubject
              }
              className="inline-flex items-center gap-1 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              id="btn-add-subject"
            >
              <Plus className="w-4 h-4" />
              เพิ่มรายวิชาเทียบโอน
            </button>
          </div>
        </div>

        {/* 1. REGULAR TRANSFER WORKSPACE (CORE_2551, NFE_2551, VET_2562) */}
        {(studentInfo.originCurriculum === OriginCurriculum.CORE_2551 ||
          studentInfo.originCurriculum === OriginCurriculum.NFE_2551 ||
          studentInfo.originCurriculum === OriginCurriculum.VET_2562) && (
          <div className="overflow-x-auto">
            {originSubjects.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm space-y-2">
                <p>ยังไม่มีข้อมูลวิชาในรายการเทียบโอน</p>
                <p className="text-xs text-gray-400">กดปุ่ม "เพิ่มรายวิชาเทียบโอน" หรือคลิกปุ่มเทมเพลตสีเขียวที่แถบหัวข้อเพื่อดึงข้อมูลประวัติแนะนำ</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse" id="table-regular-transfer">
                <thead>
                  <tr className="bg-gray-50 text-2xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-100">
                    <th className="py-3 px-4">วิชาต้นทางเดิม (รหัส - ชื่อวิชา)</th>
                    <th className="py-3 px-4 w-36">ประเภทวิชาเดิม</th>
                    <th className="py-3 px-4 w-24">หน่วยกิตเดิม</th>
                    <th className="py-3 px-4 w-28">เกรดเดิม</th>
                    <th className="py-3 px-4">จับคู่เข้าวิชา สกร. 2567 เป้าหมาย</th>
                    <th className="py-3 px-4 w-12 text-center">ลบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(() => {
                    const compulsorySubs = originSubjects.filter(sub => {
                      const req = getRequiredTypeForSourceSubject(sub.name, sub.code, sub.originType, studentInfo.level);
                      return req.allowedType === "บังคับ";
                    });
                    const electiveSubs = originSubjects.filter(sub => {
                      const req = getRequiredTypeForSourceSubject(sub.name, sub.code, sub.originType, studentInfo.level);
                      return req.allowedType === "เลือก";
                    });

                    const renderRow = (subject: typeof originSubjects[0]) => {
                      const isGradeInvalid = subject.grade === "0" || subject.grade === "ร" || subject.grade === "มส";
                      const req = getRequiredTypeForSourceSubject(subject.name, subject.code, subject.originType, studentInfo.level);
                      const targetStd = standardList.find(std => std.code === subject.mappedTo2567Code);
                      const isCurrentlyCompulsory = targetStd?.type === "บังคับ";

                      // วิชาบังคับเดิมเทียบเข้าวิชาเลือก 2567 ได้ แต่ถ้าเลือกเข้าวิชาบังคับต้องเป็นคู่เทียบของตนเท่านั้น
                      const carry = !!studentInfo.carryOver2567;
                      const isCurrentlyForbidden = !carry && ((req.allowedType === "บังคับ" && isCurrentlyCompulsory && subject.mappedTo2567Code !== req.counterpartCode) ||
                                                   (req.allowedType === "เลือก" && isCurrentlyCompulsory));

                      return (
                        <tr key={subject.id} className={`hover:bg-gray-50/20 text-sm ${isGradeInvalid ? "bg-rose-50/20" : ""}`} id={`row-${subject.id}`}>
                          <td className="py-3.5 px-4 font-sans">
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                type="text"
                                value={subject.code}
                                placeholder="รหัส เช่น พท11001"
                                onChange={(e) => handleUpdateOriginSubject(subject.id, "code", e.target.value)}
                                className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500"
                              />
                              <input
                                type="text"
                                value={subject.name}
                                placeholder="ชื่อวิชา เช่น ภาษาไทย"
                                onChange={(e) => handleUpdateOriginSubject(subject.id, "name", e.target.value)}
                                className="col-span-2 px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500"
                              />
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-sans">
                            <select
                              value={subject.originType || "บังคับ"}
                              onChange={(e) => handleUpdateOriginSubject(subject.id, "originType", e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white focus:border-emerald-500 font-semibold"
                            >
                              <option value="บังคับ">วิชาบังคับ</option>
                              <option value="เลือก/เพิ่มเติม">วิชาเลือก / เพิ่มเติม</option>
                            </select>
                          </td>
                          <td className="py-3.5 px-4 font-sans">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={subject.credits}
                              onChange={(e) => handleUpdateOriginSubject(subject.id, "credits", parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none text-center focus:border-emerald-500"
                            />
                          </td>
                          <td className="py-3.5 px-4 font-sans">
                            <select
                              value={normalizeGrade(subject.grade)}
                              onChange={(e) => handleUpdateOriginSubject(subject.id, "grade", e.target.value)}
                              className={`w-full px-2 py-1.5 border rounded-lg text-xs outline-none text-center bg-white ${
                                isGradeInvalid ? "border-rose-400 text-rose-700 bg-rose-50" : "border-gray-200"
                              }`}
                            >
                              <option value="4">4.0 (A)</option>
                              <option value="3.5">3.5 (B+)</option>
                              <option value="3">3.0 (B)</option>
                              <option value="2.5">2.5 (C+)</option>
                              <option value="2">2.0 (C)</option>
                              <option value="1.5">1.5 (D+)</option>
                              <option value="1">1.0 (D)</option>
                              <option value="ผ่าน">ผ่าน (P)</option>
                              <option value="0">0 (F) - ห้ามเทียบ</option>
                              <option value="ร">ร - ห้ามเทียบ</option>
                              <option value="มส">มส - ห้ามเทียบ</option>
                            </select>
                            {isGradeInvalid && (
                              <span className="text-3xs text-rose-600 block mt-1 font-semibold">❌ ห้ามเทียบตามนโยบาย</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 w-[280px] font-sans">
                            <select
                              value={subject.mappedTo2567Code?.startsWith("ELECTIVE_") ? (autoElectiveByOriginId[subject.id] || activeElectiveCode) : subject.mappedTo2567Code}
                              onChange={(e) => handleUpdateOriginSubject(subject.id, "mappedTo2567Code", e.target.value)}
                              className={`w-full px-2 py-1.5 border rounded-lg text-xs outline-none bg-white focus:border-emerald-500 font-sans ${
                                isCurrentlyForbidden ? "border-rose-400 text-rose-700 bg-rose-50" : "border-gray-200"
                              }`}
                            >
                              <optgroup label="📖 วิชาบังคับ (สกร. 2567)">
                                {standardList.filter(std => std.type === "บังคับ").map(std => {
                                  const isForbiddenOpt = !carry && ((req.allowedType === "บังคับ" && std.code !== req.counterpartCode) || (req.allowedType === "เลือก"));
                                  return (
                                    <option key={std.code} value={std.code} disabled={isForbiddenOpt}>
                                      {isForbiddenOpt ? "🚫 (ห้ามเทียบ) " : ""}[{std.code}] {std.name} ({std.credits} นก.)
                                    </option>
                                  );
                                })}
                              </optgroup>
                              
                              <optgroup label="🌟 วิชาเลือกเสรี (หมวดหลัก)">
                                {standardList.filter(std => std.type === "เลือก").map(std => (
                                  <option key={std.code} value={std.code}>
                                    [{std.code}] {std.name} ({std.credits} นก.)
                                  </option>
                                ))}
                              </optgroup>

                              <optgroup label="👉 รายวิชาเลือกเฉพาะกลุ่ม (สกร. 2567)">
                                {electiveSubjects2567.filter(el => el.level === studentInfo.level).map(el => (
                                  <option key={el.code} value={el.code}>
                                    [{el.code}] {el.name} ({el.credits} นก. - สาระ{el.category})
                                  </option>
                                ))}
                              </optgroup>

                              {subject.mappedTo2567Code && !standardList.some(std => std.code === subject.mappedTo2567Code) && !electiveSubjects2567.some(el => el.code === subject.mappedTo2567Code && el.level === studentInfo.level) && (
                                (() => {
                                  const foundEl = electiveSubjects2567.find(el => el.code === subject.mappedTo2567Code);
                                  return foundEl ? (
                                    <option key={foundEl.code} value={foundEl.code}>
                                      [{foundEl.code}] {foundEl.name} (ต่างระดับ)
                                    </option>
                                  ) : (
                                    <option key={subject.mappedTo2567Code} value={subject.mappedTo2567Code}>
                                      [{subject.mappedTo2567Code}] อื่นๆ
                                    </option>
                                  );
                                })()
                              )}
                            </select>
                            {!carry && subject.mappedTo2567Code?.startsWith("ELECTIVE_") && (
                              autoElectiveByOriginId[subject.id] ? (
                                <span className="text-3xs text-emerald-700 block mt-1 font-semibold leading-snug">
                                  ✅ ระบบจับคู่อัตโนมัติจากชื่อวิชาและสาระ → [{autoElectiveByOriginId[subject.id]}] {electiveSubjects2567.find(el => el.code === autoElectiveByOriginId[subject.id])?.name} {aiScores[courseMatchKey(subject.name, autoElectiveByOriginId[subject.id])] !== undefined
                                    ? ` — คำอธิบายสอดคล้อง ${aiScores[courseMatchKey(subject.name, autoElectiveByOriginId[subject.id])]}%`
                                    : ""} (เปลี่ยนวิชาได้จากรายการ)
                                </span>
                              ) : !isGradeInvalid && aiBelowThreshold(subject.name) ? (
                                <span className="text-3xs text-rose-600 block mt-1 font-semibold leading-snug">
                                  ❌ คำอธิบายรายวิชาสอดคล้องไม่ถึง {COURSE_MATCH_THRESHOLD}% ({aiBelowThreshold(subject.name)}) จึงยังไม่เทียบโอน — เลือกรายวิชาเองจากรายการได้
                                </span>
                              ) : !isGradeInvalid && (
                                <span className="text-3xs text-gray-500 block mt-1 leading-snug">
                                  ℹ️ ยังไม่มีรายวิชาเลือก สกร. 2567 ที่จับคู่ได้ (ต้องรวมหน่วยกิตครบ 3 นก. ในสาระเดียวกัน) หรือเลือกรายวิชาเองจากรายการ
                                </span>
                              )
                            )}
                            {!carry && subject.mappedTo2567Code?.startsWith("ELECTIVE_") && aiOriginSources[courseMatchKey(subject.name, "")] && (() => {
                              const src = aiOriginSources[courseMatchKey(subject.name, "")];
                              return src.found ? (
                                <span className="text-3xs text-sky-700 block mt-1 leading-snug">
                                  🌐 คำอธิบายวิชาเดิมค้นจากภายนอก <b>(ยังไม่ได้ตรวจสอบ)</b>{src.officialName ? ` — ${src.officialName}` : ""}:{" "}
                                  {src.sources.map((u, i) => (
                                    <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="underline mr-1">[{i + 1}]</a>
                                  ))}
                                </span>
                              ) : (
                                <span className="text-3xs text-gray-500 block mt-1 leading-snug">
                                  🌐 ค้นคำอธิบายวิชาเดิมจากภายนอกไม่พบ — เทียบจากชื่อวิชาเท่านั้น (ผลอาจไม่แม่นยำ)
                                </span>
                              );
                            })()}
                            {!carry && req.allowedType === "บังคับ" && isCurrentlyCompulsory && subject.mappedTo2567Code !== req.counterpartCode && (
                              <span className="text-3xs text-rose-600 block mt-1 font-semibold">❌ วิชาบังคับเดิมนี้ถ้าเทียบเข้าวิชาบังคับ ต้องเข้า [{req.counterpartCode}] เท่านั้น (หรือเลือกเทียบเป็นวิชาเลือกได้)</span>
                            )}
                            {!carry && req.allowedType === "บังคับ" && !isCurrentlyCompulsory && (
                              <span className="text-3xs text-gray-500 block mt-1">ℹ️ เทียบโอนแล้วจะใช้ซ้ำกับวิชาอื่นไม่ได้</span>
                            )}
                            {(() => {
                              // สถานะรายแถว: หน่วยกิตวิชาเดิมรวมกันต้องไม่น้อยกว่าวิชา 2567 ที่รับเทียบโอน
                              if (carry) {
                                return isGradeInvalid ? null : (
                                  <span className="text-3xs text-sky-700 block mt-1 font-semibold">✅ นำผล สกร. 2567 เดิมไปใช้โดยตรง (ไม่คำนวณเกณฑ์ซ้ำ)</span>
                                );
                              }
                              if (studentInfo.originCurriculum === OriginCurriculum.NFE_2551 && isNfeCompulsorySocial(subject) && !isCurrentlyCompulsory) {
                                return (
                                  <span className="text-3xs text-rose-600 block mt-1 font-semibold">❌ สังคมศึกษา (วิชาบังคับ) ของ กศน. 2551 เป็นวิชาเลือกไม่ได้ ต้องเทียบเข้า สังคมศึกษา ประวัติศาสตร์ และหน้าที่พลเมือง เท่านั้น</span>
                                );
                              }
                              if (isLearningSkillsSubject(subject.name, subject.code)) {
                                return (
                                  <span className="text-3xs text-rose-600 block mt-1 font-semibold">❌ วิชาทักษะการเรียนรู้ไม่มีรายวิชา สกร. 2567 รับเทียบ จึงเทียบโอนไม่ได้</span>
                                );
                              }
                              if (!isCurrentlyCompulsory || isGradeInvalid || isCurrentlyForbidden) return null;
                              const g = getCompulsoryGroupInfo(subject.mappedTo2567Code);
                              if (!g) return null;
                              if (studentInfo.originCurriculum === OriginCurriculum.NFE_2551 && g.std.code.startsWith("สค") &&
                                  !g.members.some(m => isReligionCivicsSubject(m.name, m.code))) {
                                return (
                                  <span className="text-3xs text-amber-700 block mt-1 font-semibold leading-snug">
                                    ⚠️ ยังเทียบไม่ได้ — กศน. 2551 ต้องมีรายวิชา <u>ศาสนาและหน้าที่พลเมือง</u> ในกลุ่มนี้ด้วย (ขณะนี้มี: {g.members.map(m => m.name || m.code).join(" + ") || "-"})
                                  </span>
                                );
                              }
                              const list = g.members.map(m => `${m.name || m.code} (${m.credits})`).join(" + ");
                              if (g.transferred) {
                                const usedHere = g.consumedIds.has(subject.id);
                                return (
                                  <span className="text-3xs text-emerald-700 block mt-1 font-semibold leading-snug">
                                    ✅ {usedHere ? "เทียบได้" : "ไม่ได้ถูกนำมาใช้ (หน่วยกิตครบแล้ว)"} — รวมกลุ่ม [{g.std.code}]: {list} = {g.sum}/{g.std.credits} นก.
                                  </span>
                                );
                              }
                              if (g.sum >= g.std.credits) {
                                return (
                                  <span className="text-3xs text-amber-700 block mt-1 font-semibold leading-snug">
                                    ⚠️ หน่วยกิตครบ ({g.sum}/{g.std.credits} นก.) แต่ไม่ถูกนับ เพราะเกินโควตาเทียบโอนสูงสุด — รวมกลุ่ม [{g.std.code}]: {list}
                                  </span>
                                );
                              }
                              return (
                                <span className="text-3xs text-amber-700 block mt-1 font-semibold leading-snug">
                                  ⚠️ ยังเทียบไม่ได้ — รวมกลุ่ม [{g.std.code}]: {list} = {g.sum}/{g.std.credits} นก. (ต้องไม่น้อยกว่า {g.std.credits} นก.) เพิ่มวิชาบังคับเดิมในสาระเดียวกันที่จับคู่เข้าวิชานี้ให้ครบ
                                </span>
                              );
                            })()}
                            {!carry && req.allowedType === "เลือก" && isCurrentlyCompulsory && (
                              <span className="text-3xs text-rose-600 block mt-1 font-semibold">❌ วิชาเลือกเดิม หรือวิชาที่ไม่มีในคู่บังคับ ห้ามเทียบวิชาบังคับ — เลือกรายวิชาเลือก สกร. 2567 แทน หรือเปลี่ยนประเภทวิชาเดิมให้ถูกต้อง</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveOriginSubject(subject.id)}
                              className="p-1 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    };

                    return (
                      <>
                        {compulsorySubs.length > 0 && (
                          <tr className="bg-blue-50/40 border-y border-blue-100 select-none">
                            <td colSpan={6} className="py-2.5 px-4 font-bold text-xs text-blue-800 text-left">
                              📘 หมวดวิชาบังคับเดิม (เทียบเข้าคู่บังคับ สกร. 2567 หรือวิชาเลือกก็ได้ แต่เทียบแล้วใช้ซ้ำไม่ได้)
                            </td>
                          </tr>
                        )}
                        {compulsorySubs.map(renderRow)}

                        {electiveSubs.length > 0 && (
                          <tr className="bg-amber-50/40 border-y border-amber-100 select-none">
                            <td colSpan={6} className="py-2.5 px-4 font-bold text-xs text-amber-800 text-left">
                              📙 หมวดวิชาเลือกเดิม / วิชาที่เพิ่มเติมเข้ามา (เทียบเข้าวิชาเลือก สกร. 2567 เท่านั้น)
                              <button
                                type="button"
                                disabled={aiMatching}
                                onClick={() => runAiCourseMatch(false)}
                                className="ml-3 px-2.5 py-1 rounded-lg bg-amber-600 text-white text-3xs font-bold hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
                              >
                                {aiMatching ? "กำลังเปรียบเทียบ..." : `🤖 เปรียบเทียบคำอธิบายรายวิชาด้วย AI (เกณฑ์ ≥ ${COURSE_MATCH_THRESHOLD}%)`}
                              </button>
                              <button
                                type="button"
                                disabled={aiMatching}
                                onClick={() => {
                                  if (window.confirm("เทียบใหม่ทุกวิชาเลือก: ล้างผลที่บันทึกไว้และค้นข้อมูลภายนอก/เรียก AI ใหม่ทั้งหมด (มีค่าใช้จ่ายและใช้เวลา) ต้องการดำเนินการต่อหรือไม่?")) {
                                    runAiCourseMatch(true);
                                  }
                                }}
                                className="ml-2 px-2.5 py-1 rounded-lg border border-amber-600 text-amber-800 bg-white text-3xs font-bold hover:bg-amber-100 disabled:opacity-50 cursor-pointer"
                              >
                                ↻ เทียบใหม่ (ล้างผลเดิม)
                              </button>
                              {aiMatchMsg && <span className="ml-2 font-normal text-3xs text-amber-900">{aiMatchMsg}</span>}
                            </td>
                          </tr>
                        )}
                        {electiveSubs.map(renderRow)}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 2. CONTINUING EDUCATION WORKSPACE */}
        {studentInfo.originCurriculum === OriginCurriculum.CONTINUING_ED && (
          <div className="overflow-x-auto">
            {continuingEd.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm space-y-2">
                <p>ยังไม่มีวิชาฝึกอบรมวิชาชีพระยะสั้นในตาราง</p>
                <p className="text-xs text-gray-400">กรุณากดปุ่ม "เพิ่มรายวิชาเทียบโอน" ด้านบน เพื่อป้อนความต้องการการศึกษาต่อเนื่อง</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse" id="table-continuing-ed">
                <thead>
                  <tr className="bg-gray-50 text-2xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-100">
                    <th className="py-3 px-4">ชื่อหลักสูตรระยะสั้น/ค่ายเรียนรู้</th>
                    <th className="py-3 px-4 w-32">จำนวนชั่วโมงเรียน</th>
                    <th className="py-3 px-4 w-32">นับหน่วยกิตเทียบเคียง</th>
                    <th className="py-3 px-4">หน่วยงานผู้จัดหลักสูตร</th>
                    <th className="py-3 px-4">เทียบเข้าวิชา สกร. 2567 เป้าหมาย</th>
                    <th className="py-3 px-4 w-12 text-center">ลบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {continuingEd.map((item) => {
                    const calculatedCredits = Math.floor(item.hours / 40);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/20 text-sm">
                        <td className="py-3.5 px-4">
                          <input
                            type="text"
                            value={item.courseName}
                            placeholder="เช่น หลักสูตรการทำเบเกอรี่พื้นฐาน"
                            onChange={(e) => handleUpdateContinuingEd(item.id, "courseName", e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500"
                          />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              value={item.hours}
                              onChange={(e) => handleUpdateContinuingEd(item.id, "hours", parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 pr-8 border border-gray-200 rounded-lg text-xs outline-none text-center focus:border-emerald-500"
                            />
                            <span className="absolute right-2 top-2 text-3xs font-bold text-gray-400">ชม.</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg text-xs">
                            {calculatedCredits} หน่วยกิต
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <input
                            type="text"
                            value={item.organizer}
                            placeholder="เช่น กรมพัฒนาฝีมือแรงงาน"
                            onChange={(e) => handleUpdateContinuingEd(item.id, "organizer", e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500"
                          />
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            value={item.mappedTo2567Code?.startsWith("ELECTIVE_") ? activeElectiveCode : item.mappedTo2567Code}
                            onChange={(e) => handleUpdateContinuingEd(item.id, "mappedTo2567Code", e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white focus:border-emerald-500 font-sans"
                          >
                            <optgroup label="📖 วิชาบังคับ (สกร. 2567)">
                              {standardList.filter(std => std.type === "บังคับ").map(std => (
                                <option key={std.code} value={std.code}>
                                  [{std.code}] {std.name} ({std.credits} นก.)
                                </option>
                              ))}
                            </optgroup>
                            
                            <optgroup label="🌟 วิชาเลือกเสรี (หมวดหลัก)">
                              {standardList.filter(std => std.type === "เลือก").map(std => (
                                <option key={std.code} value={std.code}>
                                  [{std.code}] {std.name} ({std.credits} นก.)
                                </option>
                              ))}
                            </optgroup>

                            <optgroup label="👉 รายวิชาเลือกเฉพาะกลุ่ม (สกร. 2567)">
                              {electiveSubjects2567.filter(el => el.level === studentInfo.level).map(el => (
                                <option key={el.code} value={el.code}>
                                  [{el.code}] {el.name} ({el.credits} นก. - สาระ{el.category})
                                </option>
                              ))}
                            </optgroup>

                            {item.mappedTo2567Code && !standardList.some(std => std.code === item.mappedTo2567Code) && !electiveSubjects2567.some(el => el.code === item.mappedTo2567Code && el.level === studentInfo.level) && (
                              (() => {
                                const foundEl = electiveSubjects2567.find(el => el.code === item.mappedTo2567Code);
                                return foundEl ? (
                                  <option key={foundEl.code} value={foundEl.code}>
                                    [{foundEl.code}] {foundEl.name} (ต่างระดับ)
                                  </option>
                                ) : (
                                  <option key={item.mappedTo2567Code} value={item.mappedTo2567Code}>
                                    [{item.mappedTo2567Code}] อื่นๆ
                                  </option>
                                );
                              })()
                            )}
                          </select>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveContinuingEd(item.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 3. FOREIGN CURRICULUM WORKSPACE */}
        {studentInfo.originCurriculum === OriginCurriculum.FOREIGN_CURRICULUM && (
          <div className="overflow-x-auto">
            {foreignCreds.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm space-y-2">
                <p>ยังไม่มีรายวิชาเทียบต่างประเทศในตาราง</p>
                <p className="text-xs text-gray-400">กรุณากดปุ่ม "เพิ่มรายวิชาเทียบโอน" ด้านบน เพื่อป้อนวิชาจากพาสปอร์ตหรือ Transcript</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse" id="table-foreign">
                <thead>
                  <tr className="bg-gray-50 text-2xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-100">
                    <th className="py-3 px-4">ชื่อวิชาสากล (Foreign School Subject)</th>
                    <th className="py-3 px-4 w-32">เกรดเดิมเดิม (Grade)</th>
                    <th className="py-3 px-4 w-32">หน่วยกิตทาง สกร. รับ</th>
                    <th className="py-3 px-4">เทียบเข้าวิชา สกร. 2567 เป้าหมาย</th>
                    <th className="py-3 px-4 w-12 text-center">ลบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {foreignCreds.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/20 text-sm">
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          value={item.subjectName}
                          placeholder="เช่น World Literature / Physics Level 1"
                          onChange={(e) => handleUpdateForeignCred(item.id, "subjectName", e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          value={item.foreignGrade}
                          placeholder="เช่น A, B, 85%, Pass"
                          onChange={(e) => handleUpdateForeignCred(item.id, "foreignGrade", e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none text-center focus:border-emerald-500 font-mono"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={item.credits}
                          onChange={(e) => handleUpdateForeignCred(item.id, "credits", parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none text-center focus:border-emerald-500"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={item.mappedTo2567Code?.startsWith("ELECTIVE_") ? activeElectiveCode : item.mappedTo2567Code}
                          onChange={(e) => handleUpdateForeignCred(item.id, "mappedTo2567Code", e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white focus:border-emerald-500 font-sans"
                        >
                          <optgroup label="📖 วิชาบังคับ (สกร. 2567)">
                            {standardList.filter(std => std.type === "บังคับ").map(std => (
                              <option key={std.code} value={std.code} disabled={isForeignRestrictedTarget(std)}>
                                [{std.code}] {std.name} ({std.credits} นก.){isForeignRestrictedTarget(std) ? " - เทียบจากต่างประเทศไม่ได้" : ""}
                              </option>
                            ))}
                          </optgroup>
                          
                          <optgroup label="🌟 วิชาเลือกเสรี (หมวดหลัก)">
                            {standardList.filter(std => std.type === "เลือก").map(std => (
                              <option key={std.code} value={std.code}>
                                [{std.code}] {std.name} ({std.credits} นก.)
                              </option>
                            ))}
                          </optgroup>

                          <optgroup label="👉 รายวิชาเลือกเฉพาะกลุ่ม (สกร. 2567)">
                            {electiveSubjects2567.filter(el => el.level === studentInfo.level).map(el => (
                              <option key={el.code} value={el.code}>
                                [{el.code}] {el.name} ({el.credits} นก. - สาระ{el.category})
                              </option>
                            ))}
                          </optgroup>

                          {item.mappedTo2567Code && !standardList.some(std => std.code === item.mappedTo2567Code) && !electiveSubjects2567.some(el => el.code === item.mappedTo2567Code && el.level === studentInfo.level) && (
                            (() => {
                              const foundEl = electiveSubjects2567.find(el => el.code === item.mappedTo2567Code);
                              return foundEl ? (
                                <option key={foundEl.code} value={foundEl.code}>
                                  [{foundEl.code}] {foundEl.name} (ต่างระดับ)
                                </option>
                              ) : (
                                <option key={item.mappedTo2567Code} value={item.mappedTo2567Code}>
                                  [{item.mappedTo2567Code}] อื่นๆ
                                </option>
                              );
                            })()
                          )}
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveForeignCred(item.id)}
                          className="p-1 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 4. EXEPRIENCE AND KNOWLEDGE WORKSPACE */}
        {studentInfo.originCurriculum === OriginCurriculum.KNOWLEDGE_EXPERIENCE && (
          <div className="overflow-x-auto">
            {experiences.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm space-y-2">
                <p>ยังไม่มีประวัติการประเมินยื่นเทียบความรู้และประสบการณ์</p>
                <p className="text-xs text-gray-400">กรุณากดปุ่ม "เพิ่มรายวิชาเทียบโอน" ด้านบน เพื่อเข้าสู่ตารางการยื่นประเมินสําคัญ</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse" id="table-experience">
                <thead>
                  <tr className="bg-gray-50 text-2xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-100">
                    <th className="py-3 px-4">รายละเอียดผลงาน/อาชีพ/ประสบการณ์เชิงประจักษ์</th>
                    <th className="py-3 px-4">หลักฐาน แหล่งยืนยันตัวตน และแฟ้มผลงาน</th>
                    <th className="py-3 px-4">ประเมินเข้าวิชา สกร. 2567 เป้าหมาย</th>
                    <th className="py-3 px-4 w-36">ผลสัมภาษณ์กรรมการ</th>
                    <th className="py-3 px-4 w-12 text-center">ลบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {experiences.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/20 text-sm">
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          value={item.experienceDetail}
                          placeholder="เช่น มีประสบการณ์เปิดร้านคอมพิวเตอร์และเขียนโปรแกรม 3 ปี"
                          onChange={(e) => handleUpdateExperience(item.id, "experienceDetail", e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          value={item.evidence}
                          placeholder="เช่น แฟ้มสะสมงาน / ทะเบียนพาณิชย์ หรือ คาราบาวสเตทแบรนด์"
                          onChange={(e) => handleUpdateExperience(item.id, "evidence", e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={item.mappedTo2567Code?.startsWith("ELECTIVE_") ? activeElectiveCode : item.mappedTo2567Code}
                          onChange={(e) => handleUpdateExperience(item.id, "mappedTo2567Code", e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white focus:border-emerald-500 font-sans"
                        >
                          <optgroup label="📖 วิชาบังคับ (สกร. 2567)">
                            {standardList.filter(std => std.type === "บังคับ").map(std => (
                              <option key={std.code} value={std.code}>
                                [{std.code}] {std.name} ({std.credits} นก.)
                              </option>
                            ))}
                          </optgroup>

                          {/* แนวทางฯ บทที่ 5: ประเมินความรู้และประสบการณ์ได้เฉพาะรายวิชาบังคับของแต่ละสาระ */}
                          <optgroup label="🚫 วิชาเลือก (ประเมินความรู้และประสบการณ์ไม่ได้)">
                            {standardList.filter(std => std.type === "เลือก").map(std => (
                              <option key={std.code} value={std.code} disabled>
                                [{std.code}] {std.name} ({std.credits} นก.)
                              </option>
                            ))}
                            {electiveSubjects2567.filter(el => el.level === studentInfo.level).map(el => (
                              <option key={el.code} value={el.code} disabled>
                                [{el.code}] {el.name} ({el.credits} นก. - สาระ{el.category})
                              </option>
                            ))}
                          </optgroup>

                          {item.mappedTo2567Code && !standardList.some(std => std.code === item.mappedTo2567Code) && !electiveSubjects2567.some(el => el.code === item.mappedTo2567Code && el.level === studentInfo.level) && (
                            (() => {
                              const foundEl = electiveSubjects2567.find(el => el.code === item.mappedTo2567Code);
                              return foundEl ? (
                                <option key={foundEl.code} value={foundEl.code}>
                                  [{foundEl.code}] {foundEl.name} (ต่างระดับ)
                                </option>
                              ) : (
                                <option key={item.mappedTo2567Code} value={item.mappedTo2567Code}>
                                  [{item.mappedTo2567Code}] อื่นๆ
                                </option>
                              );
                            })()
                          )}
                        </select>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={item.evaluationResult}
                          onChange={(e) => handleUpdateExperience(item.id, "evaluationResult", e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white focus:border-emerald-500 text-center font-bold"
                        >
                          <option value="ผ่าน">ผ่าน (P)</option>
                          <option value="ไม่ผ่าน">ไม่ผ่าน (F)</option>
                          <option value="4">ระดับเกรด 4</option>
                          <option value="3.5">ระดับเกรด 3.5</option>
                          <option value="3">ระดับเกรด 3</option>
                          <option value="2.5">ระดับเกรด 2.5</option>
                          <option value="2">ระดับเกรด 2</option>
                          <option value="1.5">ระดับเกรด 1.5</option>
                          <option value="1">ระดับเกรด 1</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveExperience(item.id)}
                          className="p-1 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
