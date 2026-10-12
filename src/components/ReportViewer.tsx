import React, { useState, useRef } from "react";
import { 
  StudentInfo, 
  StandardSubject2567, 
  OriginSubjectInput, 
  ContinuingEdInput, 
  ForeignCredentialInput, 
  ExperienceInput,
  EducationLevel,
  OriginCurriculum
} from "../types";
import { maxTransferCredits } from "../data/curriculumData";
import { calculateTransferResults, formatGradeLevel } from "../utils/transferCalculator";
import { electiveSubjects2567 } from "../data/electiveSubjects";
import { Printer, FileText, Check, ListFilter, AlertCircle, FileCheck, ShieldAlert } from "lucide-react";

interface ReportViewerProps {
  studentInfo: StudentInfo;
  standardList: StandardSubject2567[];
  originSubjects: OriginSubjectInput[];
  continuingEd: ContinuingEdInput[];
  foreignCreds: ForeignCredentialInput[];
  experiences: ExperienceInput[];
  onNavigateToWorkspace?: () => void;
}

type ActiveForm = "all" | "application" | "summary" | "approval" | "assessment" | "stamp";

const THAI_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const DOTS = "......................................";

export default function ReportViewer({
  studentInfo,
  standardList,
  originSubjects,
  continuingEd,
  foreignCreds,
  experiences,
  onNavigateToWorkspace
}: ReportViewerProps) {
  const [activeForm, setActiveForm] = useState<ActiveForm>("all");
  // รายชื่อกรรมการเว้นว่างไว้ให้สถานศึกษากรอกเอง (ห้ามตั้งค่าเริ่มต้นเป็นชื่อบุคคลจริง)
  const [governingCommittee, setGoverningCommittee] = useState({
    chairman: "",
    member1: "",
    member2: "",
    member3: "",
    registrar: ""
  });
  const committeeName = (name: string) => name.trim() || DOTS;

  // วันที่ทำเอกสาร ใช้วันที่ปัจจุบัน (พ.ศ.)
  const now = new Date();
  const docDay = String(now.getDate());
  const docMonth = THAI_MONTHS[now.getMonth()];
  const docYear = String(now.getFullYear() + 543);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // คำนวณรวบรวมข้อมูลผลการเรียนเทียบโอนเข้าหลักสูตร สกร. 2567 บังคับและเลือก
  const transferCalculation = calculateTransferResults(
    studentInfo,
    standardList,
    originSubjects,
    continuingEd,
    foreignCreds,
    experiences
  );

  const transferResults = transferCalculation.results.map(r => ({
    std: r.std,
    isTransferred: r.isTransferred && r.allocatedCredits > 0,
    matchedCredits: r.allocatedCredits, // ใช้หน่วยกิตที่ได้รับจัดสรรจริง
    originalMatchedCredits: r.matchedCredits,
    matchingSources: r.matchingSources.map(s => ({
      name: s.name,
      code: s.code,
      credits: s.creditsSelected, // แปลงเป็นฟิลด์ credits เพื่อรองรับการสอดคล้องข้อมูล
      grade: s.grade,
      mappedTo2567Code: s.mappedTo2567Code
    })),
    finalGrade: r.finalGrade,
    isOverQuota: r.isOverQuota,
    quotaNotes: r.quotaNotes
  }));

  const successfulTransfers = transferResults.filter(r => r.isTransferred);
  const totalTransferredCredits = transferCalculation.totalTransferredCredits;
  const untrimmedTotalCredits = transferCalculation.untrimmedTotalCredits;
  const maxAllowable = transferCalculation.maxAllowable;
  const isLimitCapped = transferCalculation.isLimitCapped;
  const gpaVal = transferCalculation.gpa;

  const calculateGPA = () => gpaVal;
  const transferGpaSummary = calculateGPA();

  const formatGrade = (val: string) => {
    const num = parseFloat(val);
    return !isNaN(num) ? num.toFixed(2) : val;
  };

  // Compile detailed course mappings matching PDF Side-by-Side and 8-Column requirements
  const getTransferredPairs = () => {
    const pairs: Array<{
      srcCode: string;
      srcName: string;
      srcCredits: number;
      srcGrade: string;
      dstCode: string;
      dstName: string;
      dstCredits: number;
      dstGrade: string;
      dstType: string;
      isCompulsory: boolean;
    }> = [];

    transferResults.forEach((r) => {
      if (!r.isTransferred) return;

      if (r.std.code.startsWith("ELECTIVE_") && r.matchingSources.length > 0) {
        const groups: { [mappedCode: string]: typeof r.matchingSources } = {};
        r.matchingSources.forEach((source) => {
          const mappedCode = source.mappedTo2567Code || r.std.code;
          if (!groups[mappedCode]) {
            groups[mappedCode] = [];
          }
          groups[mappedCode].push(source);
        });

        Object.entries(groups).forEach(([mappedCode, group]) => {
          const foundEl = electiveSubjects2567.find(el => el.code === mappedCode);
          const foundStd = standardList.find(std => std.code === mappedCode);
          
          const targetCode = foundEl ? foundEl.code : (foundStd ? foundStd.code : (mappedCode.startsWith("ELECTIVE_") ? r.std.code : mappedCode));
          let targetName = "";
          if (foundEl) {
            targetName = foundEl.name;
          } else if (foundStd) {
            targetName = foundStd.name;
          } else if (mappedCode.startsWith("ELECTIVE_")) {
            targetName = r.std.name;
          } else {
            targetName = `วิชาเลือก (${mappedCode})`;
          }

          // Group final grade calculation
          const numericProportions = group.filter(s => !isNaN(parseFloat(s.grade)));
          let calculatedGrade = "N/A";
          if (numericProportions.length > 0) {
            const sumWeight = numericProportions.reduce((sum, s) => sum + (parseFloat(s.grade) * s.credits), 0);
            const totalGroupCredits = numericProportions.reduce((sum, s) => sum + s.credits, 0);
            calculatedGrade = formatGradeLevel(totalGroupCredits > 0 ? sumWeight / totalGroupCredits : 4);
          } else {
            const grades = group.map(s => s.grade);
            if (grades.includes("ผ่าน")) {
              calculatedGrade = "ผ่าน";
            } else {
              calculatedGrade = group[0]?.grade || "ผ่าน";
            }
          }

          group.forEach((source) => {
            pairs.push({
              srcCode: source.code || "-",
              srcName: source.name,
              srcCredits: source.credits,
              srcGrade: source.grade,
              dstCode: targetCode,
              dstName: targetName,
              dstCredits: source.credits,
              dstGrade: formatGrade(calculatedGrade),
              dstType: "เลือก",
              isCompulsory: false
            });
          });
        });
      } else {
        // Compulsory
        r.matchingSources.forEach((source) => {
          pairs.push({
            srcCode: source.code || "-",
            srcName: source.name,
            srcCredits: source.credits,
            srcGrade: source.grade,
            dstCode: r.std.code,
            dstName: r.std.name,
            dstCredits: source.credits,
            dstGrade: formatGrade(r.finalGrade),
            dstType: "บังคับ",
            isCompulsory: true
          });
        });
      }
    });

    return pairs;
  };

  const transferredPairs = getTransferredPairs();

  const getGroupedTransferredPairs = () => {
    const groups: { [dstCode: string]: typeof transferredPairs } = {};
    transferredPairs.forEach((pair) => {
      if (!groups[pair.dstCode]) {
        groups[pair.dstCode] = [];
      }
      groups[pair.dstCode].push(pair);
    });

    return Object.entries(groups).map(([dstCode, items]) => {
      const firstItem = items[0];
      
      let officialCredit = firstItem.dstCredits;
      if (firstItem.isCompulsory) {
        // Find matching standard subject in standardList to get the official credit limit
        const matchingStd = standardList.find(std => std.code === dstCode);
        if (matchingStd) {
          // The official credit is the sum of target allocated (transferred) source credits, capped at destination required credits
          const sumSourceCredits = items.reduce((sum, item) => sum + item.srcCredits, 0);
          officialCredit = Math.min(sumSourceCredits, matchingStd.credits);
        }
      } else {
        // Find if it maps to any standard elective or elective subjects list
        const matchingEl = electiveSubjects2567.find(el => el.code === dstCode);
        if (matchingEl) {
          officialCredit = matchingEl.credits;
        } else {
          // Fallback to the sum of the original source credits if it is a generic/custom elective
          officialCredit = items.reduce((sum, item) => sum + item.srcCredits, 0);
        }
      }

      return {
        dstCode,
        dstName: firstItem.dstName,
        dstCredits: officialCredit,
        dstGrade: firstItem.dstGrade,
        dstType: firstItem.dstType,
        isCompulsory: firstItem.isCompulsory,
        srcList: items.map(item => ({
          code: item.srcCode,
          name: item.srcName,
          credits: item.srcCredits,
          grade: item.srcGrade
        }))
      };
    });
  };

  const groupedPairs = getGroupedTransferredPairs().sort((a, b) => {
    if (a.isCompulsory && !b.isCompulsory) return -1;
    if (!a.isCompulsory && b.isCompulsory) return 1;
    return a.dstCode.localeCompare(b.dstCode);
  });

  const compulsoryPairs = groupedPairs.filter(p => p.isCompulsory);
  const electivePairs = groupedPairs.filter(p => !p.isCompulsory);

  const handlePrint = () => {
    window.print();
  };

  // Helper Custom Static Checkbox for identical print rendering across browsers
  const CheckboxPrint = ({ checked }: { checked: boolean }) => (
    <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-gray-600 rounded-sm mr-1.5 text-[10px] font-bold text-gray-950 bg-white select-none shrink-0" style={{ minWidth: '14px', minHeight: '14px', lineHeight: '10px' }}>
      {checked ? "✓" : ""}
    </span>
  );

  // 1. PAGE 1: APPLICATION FORM (แบบยื่นความจำนง)
  const renderPage1 = () => (
    <div className="space-y-6 text-xs text-gray-900 leading-relaxed font-sans max-w-3xl mx-auto p-4 bg-white relative print:p-0 min-h-[960px] flex flex-col justify-between" id="print-page-1">
      <div>
        {/* Seal stamp placeholder */}
        <div className="absolute top-4 right-4 w-24 h-24 border border-dashed border-gray-300 rounded-full flex flex-col items-center justify-center text-[9px] text-gray-400 font-sans text-center select-none print:border-gray-400 no-print">
          <span>ตราประทับ</span>
          <span>สกร.อำเภอ</span>
        </div>

        <div className="text-center space-y-1 pb-4 pt-4">
          <h1 className="text-lg font-black text-gray-950 uppercase tracking-wide">แบบยื่นความจำนงขอเทียบโอนผลการเรียน</h1>
        </div>

        <div className="flex flex-col items-end space-y-1.5 text-xs text-right pr-6">
          <div>เขียนที่ <span className="border-b border-dotted border-gray-500 px-4 font-bold text-gray-950">{studentInfo.centerName || "................................................"}</span></div>
          <div>วันที่ <span className="border-b border-dotted border-gray-500 px-5 font-semibold">{docDay}</span> เดือน <span className="border-b border-dotted border-gray-500 px-5 font-semibold">{docMonth}</span> พ.ศ. <span className="border-b border-dotted border-gray-500 px-5 font-semibold">{docYear}</span></div>
        </div>

        <div className="space-y-4 pt-6 text-xs">
          <p><strong>เรื่อง</strong> ขอเทียบโอนผลการเรียน</p>
          <p><strong>เรียน</strong> ผู้อำนวยการ{studentInfo.centerName || "ศูนย์ส่งเสริมการเรียนรู้ระดับอำเภอ/เขต............................."}</p>
          
          <p className="indent-12 text-justify">
            ข้าพเจ้า (นาย/นาง/นางสาว) <span className="border-b border-dotted border-gray-500 px-4 font-bold text-gray-950">{studentInfo.name || "..................................................."}</span> 
            รหัสประจำตัวผู้เรียน <span className="border-b border-dotted border-gray-500 px-4 font-bold font-mono text-gray-950">{studentInfo.studentId || "...................................."}</span> 
            อาชีพ <span className="border-b border-dotted border-gray-500 px-4 text-gray-900">{studentInfo.occupation || "........................................"}</span>
            เกิดวันที่ <span className="border-b border-dotted border-gray-500 px-4 text-gray-900">{studentInfo.birthDate || "................................."}</span>
          </p>

          <p className="indent-0 text-justify">
            เลขประจำตัวประชาชน <span className="border-b border-dotted border-gray-500 px-4 font-mono font-bold text-gray-950">{studentInfo.citizenId || "............................................"}</span> 
            วุฒิการศึกษาเดิม <span className="border-b border-dotted border-gray-500 px-4 text-gray-900">{studentInfo.originCurriculum}</span>
          </p>

          <p className="indent-0 text-justify">
            จากสถานศึกษา <span className="border-b border-dotted border-gray-500 px-4 font-semibold text-gray-955">{studentInfo.previousSchool || "................................................."}</span> 
            อำเภอ <span className="border-b border-dotted border-gray-500 px-4 text-gray-900">{studentInfo.previousDistrict || "......................."}</span> 
            จังหวัด <span className="border-b border-dotted border-gray-500 px-4 text-gray-900">{studentInfo.previousProvince || ".........................."}</span>
          </p>
          
          <p className="indent-12 text-justify">
            มีความประสงค์ขอให้เทียบโอนผลการเรียนเพื่อเข้าศึกษาต่อในระดับ <span className="border-b border-dotted border-gray-500 px-4 font-bold text-gray-950">{studentInfo.level}</span> 
            ภาคเรียนที่ <span className="border-b border-dotted border-gray-500 px-4 font-semibold text-gray-900">{studentInfo.semester}</span> 
            ปีการศึกษา <span className="border-b border-dotted border-gray-500 px-4 font-semibold text-gray-900">{studentInfo.academicYear}</span>
          </p>

          <p className="pt-3 font-semibold text-gray-900">
            โดยมีเอกสาร/หลักฐาน/ผลงาน ประกอบการพิจารณาดังนี้ (ให้ทำเครื่องหมาย ✓ ในช่อง เพื่อระบุเอกสารประกอบการพิจารณา)
          </p>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 pl-4 pt-1 text-[11.5px]">
            <div className="flex items-start">
              <CheckboxPrint checked={studentInfo.originCurriculum !== OriginCurriculum.KNOWLEDGE_EXPERIENCE} />
              <span>ระเบียนแสดงผลการเรียน (Transcript) / สุพรรณบัตร</span>
            </div>
            <div className="flex items-start">
              <CheckboxPrint checked={studentInfo.originCurriculum === OriginCurriculum.CORE_2551 || studentInfo.originCurriculum === OriginCurriculum.NFE_2551} />
              <span>สมุดพก</span>
            </div>
            <div className="flex items-start">
              <CheckboxPrint checked={studentInfo.originCurriculum === OriginCurriculum.CORE_2551 || studentInfo.originCurriculum === OriginCurriculum.NFE_2551} />
              <span>ระเบียนสะสม</span>
            </div>
            <div className="flex items-start">
              <CheckboxPrint checked={studentInfo.originCurriculum === OriginCurriculum.KNOWLEDGE_EXPERIENCE} />
              <span>แฟ้มสะสมผลงาน (Portfolio) / ทะเบียนพาณิชย์</span>
            </div>
            <div className="flex items-start">
              <CheckboxPrint checked={studentInfo.originCurriculum === OriginCurriculum.VET_2562 || studentInfo.originCurriculum === OriginCurriculum.CORE_2551} />
              <span>หลักสูตรสถานศึกษา</span>
            </div>
            <div className="flex items-start">
              <CheckboxPrint checked={studentInfo.originCurriculum === OriginCurriculum.CONTINUING_ED} />
              <span>โครงการฝึกอาชีพ/ฝึกงาน</span>
            </div>
            <div className="flex items-start">
              <CheckboxPrint checked={studentInfo.originCurriculum === OriginCurriculum.FOREIGN_CURRICULUM} />
              <span>ใบรับรองเวลาเรียนและผลการเรียนระหว่างภาค</span>
            </div>
            <div className="flex items-start">
              <CheckboxPrint checked={studentInfo.originCurriculum === OriginCurriculum.FOREIGN_CURRICULUM} />
              <span>หลักฐานกลุ่มเป้าหมายเฉพาะ</span>
            </div>
          </div>

          <div className="pl-4 space-y-2 pt-1 text-[11.5px]">
            <div className="flex items-center gap-1.5">
              <span>อื่น ๆ (โปรดระบุ)</span>
              <span className="border-b border-dotted border-gray-400 flex-1 px-2 font-mono text-gray-700">
                {studentInfo.vetTrack ? `วิชาโครงสร้างสายอาชีพเดิมกลุ่มงาน ${studentInfo.vetTrack}` : "................................................................................................................................................."}
              </span>
            </div>
            <div className="flex items-start gap-1">
              <CheckboxPrint checked={studentInfo.originCurriculum === OriginCurriculum.KNOWLEDGE_EXPERIENCE} />
              <div className="flex-1 flex gap-1.5">
                <span>มีความรู้และประสบการณ์ทางด้าน (โปรดระบุ)</span>
                <span className="border-b border-dotted border-gray-400 flex-1 px-2 font-mono text-gray-700">
                  {studentInfo.originCurriculum === OriginCurriculum.KNOWLEDGE_EXPERIENCE ? (experiences[0]?.experienceDetail || ".................................................................................................................................") : "................................................................................................................................."}
                </span>
              </div>
            </div>
          </div>

          <p className="indent-12 pt-4">
            จึงเรียนมาเพื่อโปรดพิจารณา
          </p>

          <div className="grid grid-cols-2 gap-8 pt-6">
            <div></div>
            <div className="text-center space-y-1">
              <p>(ลงชื่อ)........................................................................ผู้เรียน</p>
              <p className="font-bold text-gray-950">({studentInfo.name || "นาย/นาง/นางสาว ..................................."})</p>
            </div>
          </div>
        </div>
      </div>

      {/* Official Checklist - Page 47 of standard guide */}
      <div className="border border-gray-300 p-4.5 rounded-xl space-y-3 bg-gray-50/20 mt-8 print:mt-4">
        <p className="font-bold text-gray-950 text-xs text-center border-b border-gray-200 pb-1.5 uppercase">สำหรับเจ้าหน้าที่</p>
        <p className="indent-6">ได้พิจารณาคุณสมบัติและเอกสารหลักฐานแล้วเห็นว่า</p>
        
        <div className="space-y-2.5 pl-6">
          <div className="flex items-center">
            <CheckboxPrint checked={studentInfo.originCurriculum !== OriginCurriculum.KNOWLEDGE_EXPERIENCE} />
            <span>สามารถเทียบโอนผลการเรียนได้จากหลักฐาน</span>
          </div>
          <div className="flex items-center">
            <CheckboxPrint checked={studentInfo.originCurriculum === OriginCurriculum.KNOWLEDGE_EXPERIENCE} />
            <span>สามารถเทียบโอนผลการเรียนได้โดยการประเมินความรู้และประสบการณ์</span>
          </div>
          <div className="flex items-center">
            <CheckboxPrint checked={false} />
            <div className="flex-1 flex gap-1.5 items-center">
              <span>ไม่สามารถเทียบโอนผลการเรียนได้เนื่องจาก</span>
              <span className="border-b border-dotted border-gray-400 flex-1"></span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 pt-4">
          <div></div>
          <div className="text-center space-y-1">
            <p>(ลงชื่อ)........................................................................</p>
            <p className="text-[11px] font-bold text-gray-800">({committeeName(governingCommittee.registrar)})</p>
            <p className="text-[10px] text-gray-500">วันที่...........เดือน......................พ.ศ. {docYear}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // 2. PAGE 2: SUMMARY GRID FORM (แบบสรุปผลการเทียบโอน)
  const renderPage2 = () => {
    const totalSrcCredits = transferredPairs.reduce((sum, p) => sum + p.srcCredits, 0);
    const totalDstCredits = groupedPairs.reduce((sum, p) => sum + p.dstCredits, 0);

    return (
      <div className="space-y-6 text-xs text-gray-900 leading-relaxed font-sans max-w-4xl mx-auto p-4 bg-white relative print:p-0 min-h-[960px] flex flex-col justify-between" id="print-page-2">
        <div>
          <div className="text-center space-y-1 pb-4 pt-4">
            <h1 className="text-lg font-black text-gray-950 uppercase tracking-wide">แบบสรุปผลการเทียบโอนผลการเรียน</h1>
          </div>

          <div className="space-y-2 pt-2 pb-4 text-xs">
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <div>สถานศึกษา: <span className="font-bold text-gray-955">{studentInfo.centerName || "................................................"}</span></div>
              <div>ระดับการศึกษา: <span className="font-bold text-gray-955">{studentInfo.level}</span></div>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <div>ชื่อผู้เรียน: <span className="font-extrabold text-gray-950 text-sm">{studentInfo.name}</span></div>
              <div>รหัสประจำตัวผู้เรียน: <span className="font-bold text-gray-955 font-mono">{studentInfo.studentId}</span></div>
            </div>
          </div>

          {/* Grid Layout conforming to PDF screenshot Page 2 */}
          <table className="w-full text-xs border border-gray-300 border-collapse mt-2" id="table-compiled-grid">
            <thead>
              <tr className="bg-slate-50 text-gray-850 font-bold border-b border-gray-300 text-center text-[11px]">
                <th colSpan={3} className="py-2.5 px-3 border border-gray-300 bg-gray-50/50 w-1/2">
                  จากหลักสูตร/กลุ่มเป้าหมายเฉพาะ<br/>
                  <span className="font-medium text-[9.5px] text-gray-500">({studentInfo.originCurriculum})</span>
                </th>
                <th colSpan={3} className="py-2.5 px-3 border border-gray-300 bg-emerald-50/20 w-1/2 text-emerald-950">
                  เข้าสู่หลักสูตรส่งเสริมการเรียนรู้เพื่อคุณวุฒิ<br/>
                  <span className="font-medium text-[9.5px] text-emerald-800">ตามระดับการศึกษาขั้นพื้นฐาน พุทธศักราช 2567</span>
                </th>
              </tr>
              <tr className="bg-slate-100/50 text-gray-800 font-semibold border-b border-gray-300 text-[10px] text-center">
                <th className="py-2 px-1 border border-gray-300">รายวิชาเดิม</th>
                <th className="py-2 px-1 border border-gray-300 w-14">นก.เดิม</th>
                <th className="py-2 px-1 border border-gray-300 w-14">ผลการเรียน</th>
                <th className="py-2 px-1 border border-gray-300">รายวิชามาตรฐาน สกร. 2567</th>
                <th className="py-2 px-1 border border-gray-300 w-14 bg-emerald-50/5">นก.ใหม่</th>
                <th className="py-2 px-1 border border-gray-300 w-14 bg-emerald-50/5 font-bold">ผลการเรียนเทียบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-[11px]">
              {/* รายวิชาบังคับ */}
              {compulsoryPairs.length > 0 && (
                <tr className="bg-slate-50 border-y border-gray-300 select-none">
                  <td colSpan={6} className="py-1.5 px-3 font-semibold text-[10px] text-slate-900 text-left bg-slate-100/70 border-r border-l border-gray-300">
                    📂 หมวดวิชาบังคับ (Compulsory Subjects)
                  </td>
                </tr>
              )}
              {compulsoryPairs.map((pair, idx) => (
                <tr key={`comp-${idx}`} className="hover:bg-slate-50/5">
                  <td className="py-1.5 px-2 border border-gray-300 text-left">
                    <div className="space-y-1">
                      {pair.srcList.map((src, sIdx) => (
                        <div key={sIdx} className="truncate max-w-[190px]" title={src.name}>
                          {src.code && src.code !== "-" ? `[${src.code}] ` : ""}{src.name}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-1.5 px-1 border border-gray-300 text-center font-mono align-middle">
                    <div className="space-y-1">
                      {pair.srcList.map((src, sIdx) => (
                        <div key={sIdx}>{src.credits}</div>
                      ))}
                    </div>
                  </td>
                  <td className="py-1.5 px-1 border border-gray-300 text-center font-mono font-medium align-middle">
                    <div className="space-y-1">
                      {pair.srcList.map((src, sIdx) => (
                        <div key={sIdx}>{formatGrade(src.grade)}</div>
                      ))}
                    </div>
                  </td>

                  <td className="py-1.5 px-2 border border-gray-300 text-left font-medium text-emerald-950 align-middle" title={pair.dstName}>
                    <span className="font-semibold text-xs text-emerald-900 pr-1">[{pair.dstCode}]</span> {pair.dstName}
                    <span className="text-[8px] font-bold px-1 py-0.2 rounded ml-1 bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {pair.dstType}
                    </span>
                  </td>
                  <td className="py-1.5 px-1 border border-gray-300 text-center font-mono font-bold text-emerald-900 bg-emerald-50/5 align-middle">
                    {pair.dstCredits}
                  </td>
                  <td className="py-1.5 px-1 border border-gray-300 text-center font-mono font-bold text-emerald-850 bg-emerald-50/5 align-middle">
                    {pair.dstGrade}
                  </td>
                </tr>
              ))}

              {/* รายวิชาเลือก */}
              {electivePairs.length > 0 && (
                <tr className="bg-slate-50 border-y border-gray-300 select-none">
                  <td colSpan={6} className="py-1.5 px-3 font-semibold text-[10px] text-slate-900 text-left bg-slate-100/70 border-r border-l border-gray-300">
                    📂 หมวดวิชาเลือก / วิชาเลือกเสรี (Elective Subjects)
                  </td>
                </tr>
              )}
              {electivePairs.map((pair, idx) => (
                <tr key={`elec-${idx}`} className="hover:bg-slate-50/5">
                  <td className="py-1.5 px-2 border border-gray-300 text-left">
                    <div className="space-y-1">
                      {pair.srcList.map((src, sIdx) => (
                        <div key={sIdx} className="truncate max-w-[190px]" title={src.name}>
                          {src.code && src.code !== "-" ? `[${src.code}] ` : ""}{src.name}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-1.5 px-1 border border-gray-300 text-center font-mono align-middle">
                    <div className="space-y-1">
                      {pair.srcList.map((src, sIdx) => (
                        <div key={sIdx}>{src.credits}</div>
                      ))}
                    </div>
                  </td>
                  <td className="py-1.5 px-1 border border-gray-300 text-center font-mono font-medium align-middle">
                    <div className="space-y-1">
                      {pair.srcList.map((src, sIdx) => (
                        <div key={sIdx}>{formatGrade(src.grade)}</div>
                      ))}
                    </div>
                  </td>

                  <td className="py-1.5 px-2 border border-gray-300 text-left font-medium text-emerald-950 align-middle" title={pair.dstName}>
                    <span className="font-semibold text-xs text-emerald-900 pr-1">[{pair.dstCode}]</span> {pair.dstName}
                    <span className="text-[8px] font-bold px-1 py-0.2 rounded ml-1 bg-blue-50 text-blue-700 border border-blue-200">
                      {pair.dstType}
                    </span>
                  </td>
                  <td className="py-1.5 px-1 border border-gray-300 text-center font-mono font-bold text-emerald-900 bg-emerald-50/5 align-middle">
                    {pair.dstCredits}
                  </td>
                  <td className="py-1.5 px-1 border border-gray-300 text-center font-mono font-bold text-emerald-850 bg-emerald-50/5 align-middle">
                    {pair.dstGrade}
                  </td>
                </tr>
              ))}

              <tr className="bg-slate-100 text-gray-950 font-bold border-t border-gray-300 text-[11.5px]">
                <td className="py-2 px-2 border border-gray-300 text-center text-[11px] font-bold text-gray-800">
                  รวมหน่วยกิตเทียบโอนต้นทาง
                </td>
                <td className="py-2 px-1 border border-gray-300 text-center font-mono">
                  {totalSrcCredits.toFixed(2)}
                </td>
                <td className="py-2 px-1 border border-gray-300 text-center">-</td>
                
                <td className="py-2 px-2 border border-gray-300 text-center text-[11px] font-bold text-emerald-900">
                  รวมหน่วยกิตที่เทียบโอนสำเร็จ
                </td>
                <td className="py-2 px-1 border border-gray-300 text-center font-mono text-emerald-900 font-extrabold">
                  {totalDstCredits.toFixed(2)}
                </td>
                <td className="py-2 px-1 border border-gray-300 text-center text-emerald-800 font-mono">
                  X̄ = {transferGpaSummary}
                </td>
              </tr>
            </tbody>
          </table>

          {transferCalculation.failedElectiveGroups && transferCalculation.failedElectiveGroups.length > 0 && (
            <div className="p-3 bg-red-50/85 border border-red-200/50 rounded-lg text-[10px] text-red-800 leading-relaxed mt-3 break-inside-avoid print:bg-red-50/50">
              <strong className="text-red-950 font-bold flex items-center gap-1 mb-1">
                <ShieldAlert className="w-3.5 h-3.5 text-red-700 inline-block shrink-0" />
                ระวัง: รายวิชาแกนกลางที่สลักรหัสเทียบโอนไม่ผ่านเกณฑ์ (หน่วยกิตเดิมสะสมไม่ครบ 3.0 หน่วยกิต)
              </strong>
              <div className="pl-4.5 space-y-0.5 text-gray-750">
                {transferCalculation.failedElectiveGroups.map((grp, gidx) => (
                  <div key={gidx} className="list-item decimal text-[10px]">
                    คู่สลักเทียบรหัส <strong>[{grp.code}] {grp.name}</strong> — มีหน่วยกิตต้นทางสะสมรวมเพียง <strong>{grp.currentCredits.toFixed(2)}</strong> หน่วยกิต (ระเบียบหลักสูตร สกร. 2567 กำหนดให้วิชาเทียบเลือกต้องเกี่ยวข้องและรวมกันได้ไม่น้อยกว่า <strong>3.0 หน่วยกิต</strong> จึงจะอนุมัติโอนได้)
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLimitCapped && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-850 leading-tight mt-3">
              • <strong>เพดานสูงสุดระเบียบควบคุม:</strong> จำนวนหน่วยกิตเทียบสะสมรวม {untrimmedTotalCredits} นก. ซึ่งเกินเกณฑ์เพดานสภาระดับชาติสูงสุดสำหรับระดับ {studentInfo.level} (ไม่เกิน {maxAllowable} นก.) ระบบคัดแยกความถูกสลักหลังออกแล้วโดยจัดเกรดมากที่สุดครบสิทธิ์เรียบร้อย
            </div>
          )}
        </div>

        {/* Committee Signature Blocks (Page 48) */}
        <div className="pt-20 text-center space-y-12">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[11px] text-gray-500">นายทะเบียนผู้รับสิทธิ์สลักสลาก</p>
              <p className="pt-6">ลงชื่อ............................................................ นายทะเบียน/ผู้สลักหลัง</p>
              <p className="text-xs text-gray-800 font-bold mt-1">({committeeName(governingCommittee.registrar)})</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-850 font-bold">ความถูกต้องผ่านเกณฑ์กระทรวงศึกษาธิการ</p>
              <p className="pt-6">ลงชื่อ............................................................ ประธานกรรมการเทียบโอน</p>
              <p className="text-xs text-gray-950 font-black mt-1">({committeeName(governingCommittee.chairman)})</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 3. PAGE 3: DETAILED APPROVAL COMPARISON TABLE (แบบเสนอขออนุมัติผลการเทียบโอนผลการเรียน)
  const renderPage3 = () => (
    <div className="space-y-6 text-xs text-gray-900 leading-relaxed font-sans max-w-4xl mx-auto p-4 bg-white relative print:p-0 min-h-[960px] flex flex-col justify-between" id="print-page-3">
      <div>
        <div className="text-center space-y-1 pb-4 pt-4">
          <h1 className="text-lg font-black text-gray-950 uppercase tracking-wide">แบบเสนอขออนุมัติผลการเทียบโอนผลการเรียน</h1>
        </div>

        <div className="flex justify-end text-xs text-right pr-6 pb-2">
          <div>วันที่ <span className="border-b border-dotted border-gray-500 px-5 font-semibold">{docDay}</span> เดือน <span className="border-b border-dotted border-gray-500 px-5 font-semibold">{docMonth}</span> พ.ศ. <span className="border-b border-dotted border-gray-500 px-5 font-semibold">{docYear}</span></div>
        </div>

        <div className="space-y-3.5 pt-4 text-xs font-sans">
          <p><strong>เรื่อง</strong> ขออนุมัติผลการเทียบโอนผลการเรียน</p>
          <p><strong>เรียน</strong> ผู้อำนวยการ{studentInfo.centerName || "ศูนย์ส่งเสริมการเรียนรู้ระดับอำเภอ/เขต............................."}</p>
          
          <p className="indent-12 text-justify leading-relaxed">
            ตามที่คณะกรรมการเทียบโอนผลการเรียน ได้ดำเนินการเทียบโอนผลการเรียนของ
          </p>
          
          <p className="indent-0 text-justify leading-relaxed">
            ชื่อ (นาย/นาง/นางสาว) <span className="border-b border-dotted border-gray-500 px-3 font-extrabold text-gray-950 text-sm">{studentInfo.name || "นายอดิเรก พลประมูล"}</span> 
            เกิดวันที่ <span className="border-b border-dotted border-gray-500 px-3 text-gray-950 font-medium">{studentInfo.birthDate || "................................."}</span>
            เลขบัตรประจำตัวประชาชน <span className="border-b border-dotted border-gray-500 px-3 font-mono font-bold text-gray-950">{studentInfo.citizenId || "...................................."}</span>
          </p>

          <p className="indent-0 text-justify leading-relaxed">
            ระดับการศึกษา <span className="border-b border-dotted border-gray-500 px-3 font-bold text-gray-950">{studentInfo.level}</span>
            จากสถานศึกษา <span className="border-b border-dotted border-gray-500 px-3 font-semibold text-gray-955">{studentInfo.previousSchool || "................................."}</span>
            หลักสูตรเดิม <span className="border-b border-dotted border-gray-500 px-3 text-gray-900">{studentInfo.originCurriculum}</span>
          </p>

          <p className="indent-0 text-justify leading-relaxed">
            อำเภอ <span className="border-b border-dotted border-gray-500 px-3 text-gray-900">{studentInfo.previousDistrict || "......................."}</span>
            จังหวัด <span className="border-b border-dotted border-gray-500 px-3 text-gray-900">{studentInfo.previousProvince || ".........................."}</span>
            ภาคเรียนที่ <span className="border-b border-dotted border-gray-500 px-3 text-gray-900 font-semibold">{studentInfo.semester}</span>
            ปีการศึกษา <span className="border-b border-dotted border-gray-500 px-3 text-gray-900 font-semibold">{studentInfo.academicYear}</span>
          </p>
          
          <p className="indent-12 text-justify leading-relaxed font-semibold text-gray-900">
            ปรากฏผลการเทียบโอนผลการเรียนตามหลักสูตรสกร. เพื่อขออนุมัติโครงสร้างผลเรียนบังคับและผลเรียนเลือก รายละเอียดแบบเรียงรายสายตามพระราชบัญญัติดังนี้:
          </p>
        </div>

        {/* 8 Columns Table conforming to PDF Page 3 */}
        <table className="w-full text-xs border border-gray-400 border-collapse mt-4 text-[11.5px]" id="table-matching-8-columns">
          <thead>
            <tr className="bg-slate-50 text-gray-800 font-bold border-b border-gray-400 text-center">
              <th colSpan={4} className="py-2 px-1 border border-gray-400 bg-gray-50/50 w-1/2">
                จากรายวิชาหลักสูตรเดิม
              </th>
              <th colSpan={4} className="py-2 px-1 border border-gray-400 bg-emerald-50/20 w-1/2 text-emerald-950">
                เข้าสู่รายวิชาเป้าหมายในหลักสูตร สกร. 2567
              </th>
            </tr>
            <tr className="bg-slate-100/60 text-gray-850 font-semibold border-b border-gray-400 text-[9.5px] text-center leading-snug">
              <th className="py-1.5 px-0.5 border border-gray-400 w-18">รหัสรายวิชา</th>
              <th className="py-1.5 px-1 border border-gray-400">ชื่อรายวิชาเดิมที่ใช้ประเมิน</th>
              <th className="py-1.5 px-0.5 border border-gray-400 w-10">หน่วยกิต</th>
              <th className="py-1.5 px-0.5 border border-gray-400 w-12">ผลการเรียน</th>
              
              <th className="py-1.5 px-0.5 border border-gray-400 w-18 text-emerald-900">รหัสรายวิชา</th>
              <th className="py-1.5 px-1 border border-gray-400 text-emerald-900">ชื่อรายวิชาตาม สกร. 2567</th>
              <th className="py-1.5 px-0.5 border border-gray-400 w-10 text-emerald-900">หน่วยกิต</th>
              <th className="py-1.5 px-0.5 border border-gray-400 w-12 text-emerald-900">ผลการเรียน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {/* รายวิชาบังคับ */}
            {compulsoryPairs.length > 0 && (
              <tr className="bg-slate-50 border-y border-gray-400 select-none">
                <td colSpan={8} className="py-1 px-3 font-semibold text-[10px] text-slate-900 text-left bg-slate-100/70 border-r border-l border-gray-400">
                  📂 หมวดวิชาบังคับ (Compulsory Subjects)
                </td>
              </tr>
            )}
            {compulsoryPairs.map((pair, idx) => (
              <tr key={`comp-${idx}`} className="hover:bg-slate-50/5">
                <td className="py-1 px-1 border border-gray-400 font-mono text-center align-middle">
                  <div className="space-y-1">
                    {pair.srcList.map((src, sIdx) => (
                      <div key={sIdx}>{src.code}</div>
                    ))}
                  </div>
                </td>
                <td className="py-1 px-1.5 border border-gray-400 text-left align-middle">
                  <div className="space-y-1">
                    {pair.srcList.map((src, sIdx) => (
                      <div key={sIdx} className="truncate max-w-[160px]" title={src.name}>
                        {src.name}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="py-1 px-0.5 border border-gray-400 font-mono text-center align-middle">
                  <div className="space-y-1">
                    {pair.srcList.map((src, sIdx) => (
                      <div key={sIdx}>{src.credits}</div>
                    ))}
                  </div>
                </td>
                <td className="py-1 px-0.5 border border-gray-400 font-mono text-center align-middle">
                  <div className="space-y-1">
                    {pair.srcList.map((src, sIdx) => (
                      <div key={sIdx}>{formatGrade(src.grade)}</div>
                    ))}
                  </div>
                </td>

                <td className="py-1 px-1 border border-gray-400 font-mono text-center font-bold text-emerald-950 align-middle">
                  {pair.dstCode}
                </td>
                <td className="py-1 px-1.5 border border-gray-400 text-left text-emerald-900 font-semibold align-middle">
                  <span className="truncate max-w-[160px] inline-block" title={pair.dstName}>
                    {pair.dstName}
                  </span>
                  <span className="text-[8px] font-bold px-1 py-0.1 outline outline-emerald-200 bg-emerald-50 text-emerald-700 rounded ml-1 select-none">
                    {pair.dstType}
                  </span>
                </td>
                <td className="py-1 px-0.5 border border-gray-400 font-mono text-center font-bold text-emerald-900 align-middle">
                  {pair.dstCredits}
                </td>
                <td className="py-1 px-0.5 border border-gray-400 font-mono text-center font-black text-emerald-800 align-middle">
                  {pair.dstGrade}
                </td>
              </tr>
            ))}

            {/* รายวิชาเลือก */}
            {electivePairs.length > 0 && (
              <tr className="bg-slate-50 border-y border-gray-400 select-none">
                <td colSpan={8} className="py-1 px-3 font-semibold text-[10px] text-slate-900 text-left bg-slate-100/70 border-r border-l border-gray-400">
                  📂 หมวดวิชาเลือก / วิชาเลือกเสรี (Elective Subjects)
                </td>
              </tr>
            )}
            {electivePairs.map((pair, idx) => (
              <tr key={`elec-${idx}`} className="hover:bg-slate-50/5">
                <td className="py-1 px-1 border border-gray-400 font-mono text-center align-middle">
                  <div className="space-y-1">
                    {pair.srcList.map((src, sIdx) => (
                      <div key={sIdx}>{src.code}</div>
                    ))}
                  </div>
                </td>
                <td className="py-1 px-1.5 border border-gray-400 text-left align-middle">
                  <div className="space-y-1">
                    {pair.srcList.map((src, sIdx) => (
                      <div key={sIdx} className="truncate max-w-[160px]" title={src.name}>
                        {src.name}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="py-1 px-0.5 border border-gray-400 font-mono text-center align-middle">
                  <div className="space-y-1">
                    {pair.srcList.map((src, sIdx) => (
                      <div key={sIdx}>{src.credits}</div>
                    ))}
                  </div>
                </td>
                <td className="py-1 px-0.5 border border-gray-400 font-mono text-center align-middle">
                  <div className="space-y-1">
                    {pair.srcList.map((src, sIdx) => (
                      <div key={sIdx}>{formatGrade(src.grade)}</div>
                    ))}
                  </div>
                </td>

                <td className="py-1 px-1 border border-gray-400 font-mono text-center font-bold text-emerald-950 align-middle">
                  {pair.dstCode}
                </td>
                <td className="py-1 px-1.5 border border-gray-400 text-left text-emerald-900 font-semibold align-middle">
                  <span className="truncate max-w-[160px] inline-block" title={pair.dstName}>
                    {pair.dstName}
                  </span>
                  <span className="text-[8px] font-bold px-1 py-0.1 outline outline-blue-200 bg-blue-50 text-blue-700 rounded ml-1 select-none">
                    {pair.dstType}
                  </span>
                </td>
                <td className="py-1 px-0.5 border border-gray-400 font-mono text-center font-bold text-emerald-900 align-middle">
                  {pair.dstCredits}
                </td>
                <td className="py-1 px-0.5 border border-gray-400 font-mono text-center font-black text-emerald-800 align-middle">
                  {pair.dstGrade}
                </td>
              </tr>
            ))}

            <tr className="bg-slate-100 font-bold border-t border-gray-400 text-[11px]">
              <td colSpan={2} className="py-1.5 px-2 border border-gray-400 text-center font-bold text-gray-900">รวมหน่วยกิตเทียบโอนสำแดงรายละเอียด</td>
              <td className="py-1.5 px-0.5 border border-gray-400 font-mono text-center">
                {transferredPairs.reduce((sum, p) => sum + p.srcCredits, 0).toFixed(2)}
              </td>
              <td className="py-1.5 px-0.5 border border-gray-400 text-center">-</td>

              <td colSpan={2} className="py-1.5 px-2 border border-gray-400 text-center font-bold text-emerald-950">รวมหน่วยกิตเทียบผ่านสำเร็จทั้งสิ้น</td>
              <td className="py-1.5 px-0.5 border border-gray-400 font-mono text-center text-emerald-900 font-extrabold">
                {groupedPairs.reduce((sum, p) => sum + p.dstCredits, 0).toFixed(2)}
              </td>
              <td className="py-1.5 px-0.5 border border-gray-400 font-mono text-center text-emerald-850 font-black">
                {transferGpaSummary}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Visual Indicator of continuity onto Page 4 */}
      <div className="text-center text-2xs text-gray-400 italic font-mono pt-4 no-print select-none">
        -- ตารางสิ้นสุดหัวข้อมัดเปรียบเทียบ (แบบฟอร์มเสนออนุมัติต่อเนื่่องหน้า 4) --
      </div>
    </div>
  );

  // 4. PAGE 4: COMMITTEE & DIRECTOR APPROVAL (แบบเสนอขออนุมัติ หน้า 50)
  const renderPage4 = () => (
    <div className="space-y-6 text-xs text-gray-900 leading-relaxed font-sans max-w-4xl mx-auto p-4 bg-white relative print:p-0 min-h-[960px] flex flex-col justify-between" id="print-page-4">
      <div className="space-y-6 pt-4">
        <p className="indent-12 leading-relaxed text-justify text-[12px] text-gray-900">
          จึงเรียนมาเพื่อโปรดอนุมัติผลการเทียบโอนผลการเรียนดังกล่าว ทั้งนี้ คณะทำงานและคณะกรรมการเทียบโอนระดับสถานศึกษา ได้ตรวจสอบคุณสมบัติและประเมินทบทวนตามความพิจารณาถูกต้องตามระเบียบพุทธศักราช 2567 สมบูรณ์เรียบร้อยแล้ว
        </p>

        {/* Dynamic committee lists conforming to Page 50 of PDF */}
        <div className="pt-4">
          <p className="text-gray-950 font-black border-b border-gray-200 pb-1.5 mb-7 text-center text-xs uppercase tracking-wide">คณะกรรมการเทียบโอนผลการเรียน</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-7 gap-x-12 text-center text-[11.5px] leading-relaxed">
            <div className="space-y-1">
              <p>ลงชื่อ....................................................................ประธานกรรมการ</p>
              <p className="font-extrabold text-gray-950">({committeeName(governingCommittee.chairman)})</p>
            </div>
            
            <div className="space-y-1">
              <p>ลงชื่อ....................................................................กรรมการ</p>
              <p className="font-semibold text-gray-800">({committeeName(governingCommittee.registrar)})</p>
            </div>

            <div className="space-y-1">
              <p>ลงชื่อ....................................................................กรรมการ</p>
              <p className="font-semibold text-gray-800">({committeeName(governingCommittee.member1)})</p>
            </div>

            <div className="space-y-1">
              <p>ลงชื่อ....................................................................กรรมการ</p>
              <p className="font-semibold text-gray-800">({committeeName(governingCommittee.member2)})</p>
            </div>

            <div className="space-y-1 col-span-1 md:col-span-2 max-w-sm mx-auto pt-2">
              <p>ลงชื่อ....................................................................กรรมการและเลขานุการ</p>
              <p className="font-semibold text-gray-800">({committeeName(governingCommittee.member3)})</p>
            </div>
          </div>
        </div>

        {/* Director approval slots - Page 50 */}
        <div className="border-2 border-double border-gray-400 p-5 rounded-xl space-y-4 bg-gray-50/50 mt-10 print:border-gray-500">
          <p className="font-bold text-gray-900 text-center text-xs uppercase tracking-wide">คำสั่งและการอนุมัติของผู้อำนวยการศูนย์ส่งเสริมการเรียนรู้</p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-6 pl-6 text-2xs sm:text-xs">
            <div className="flex items-center">
              <CheckboxPrint checked={false} />
              <span className="font-extrabold text-gray-950">อนุมัติตามคณะกรรมการเสนอ</span>
            </div>
            <div className="flex items-center">
              <CheckboxPrint checked={false} />
              <span className="text-gray-600">ไม่อนุมัติคุณสมบัติ เนื่องจาก.........................................................................</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 pt-6">
            <div></div>
            <div className="text-center space-y-1.5 pt-4">
              <p>ลงชื่อ................................................................................... ผู้อำนวยการสถานศึกษา</p>
              <p className="font-extrabold text-gray-950 text-xs">(...................................................................................)</p>
              <p className="text-[10px] text-gray-500">ตำแหน่ง ผู้อำนวยการศูนย์ส่งเสริมการเรียนรู้อำเภอ/เขต..............................................</p>
              <p className="text-[9.5px] text-gray-400 font-mono mt-1">วันที่...........เดือน............................พ.ศ. {docYear}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const targetNameOf = (code: string) => {
    const std = standardList.find(s => s.code === code);
    if (std) return std.name;
    const el = electiveSubjects2567.find(e => e.code === code);
    return el ? el.name : "";
  };

  const Dotted = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
    <span className={`border-b border-dotted border-gray-500 px-3 font-semibold text-gray-950 ${className}`}>{children || DOTS}</span>
  );

  // 5. แบบประเมินความรู้และประสบการณ์ + ความเห็นชอบของคณะกรรมการประเมินเบื้องต้น (แนวทางฯ บทที่ 5 หน้า 43-44)
  const renderAssessmentForms = () => {
    // แยกฟอร์มตามรายวิชา สกร. 2567 ที่ขอประเมิน (ประเมินได้เฉพาะรายวิชาบังคับ)
    const groups: Array<{ subject: string; items: ExperienceInput[] }> = [];
    experiences.forEach(e => {
      const subject = targetNameOf(e.mappedTo2567Code);
      const g = groups.find(x => x.subject === subject);
      if (g) g.items.push(e); else groups.push({ subject, items: [e] });
    });
    if (groups.length === 0) groups.push({ subject: "", items: [] });

    return (
      <div className="space-y-16">
        {groups.map((g, gi) => {
          const rows = [...g.items, ...Array.from({ length: Math.max(0, 4 - g.items.length) }, () => null)];
          return (
            <div key={gi} className="space-y-16">
              <div className="page-break text-xs text-gray-900 leading-relaxed font-sans max-w-3xl mx-auto p-4 bg-white space-y-5" id={`print-assessment-${gi}-1`}>
                <h1 className="text-lg font-black text-center">แบบประเมินความรู้และประสบการณ์</h1>
                <div className="text-right space-y-1 pr-6">
                  <div>เขียนที่ <Dotted>{studentInfo.centerName}</Dotted></div>
                  <div>วันที่ <Dotted>{docDay}</Dotted> เดือน <Dotted>{docMonth}</Dotted> พ.ศ. <Dotted>{docYear}</Dotted></div>
                </div>
                <p><strong>เรื่อง</strong> ขอประเมินความรู้และประสบการณ์</p>
                <p><strong>เรียน</strong> ผู้อำนวยการ{studentInfo.centerName || "ศูนย์ส่งเสริมการเรียนรู้ระดับอำเภอ/เขต............................."}</p>
                <p className="indent-12 text-justify">
                  ด้วยข้าพเจ้า <Dotted>{studentInfo.name}</Dotted> รหัสประจำตัวผู้เรียน <Dotted>{studentInfo.studentId}</Dotted> อาชีพ <Dotted>{studentInfo.occupation}</Dotted>
                  {" "}เกิดวันที่ <Dotted>{studentInfo.birthDate}</Dotted> เลขประจำตัวประชาชน <Dotted>{studentInfo.citizenId}</Dotted>
                  {" "}ผู้เรียนของ <Dotted>{studentInfo.centerName}</Dotted> ระดับ <Dotted>{studentInfo.level}</Dotted>
                  {" "}มีความประสงค์เข้ารับการประเมินความรู้และประสบการณ์ รายวิชา <Dotted>{g.subject}</Dotted>
                  {" "}เพื่อนำมาเป็นส่วนหนึ่งของผลการเรียน ภาคเรียนที่ <Dotted>{studentInfo.semester}</Dotted> ปีการศึกษา <Dotted>{studentInfo.academicYear}</Dotted>
                  {" "}โดยมีความรู้และประสบการณ์ พร้อมหลักฐานผลงาน ประวัติโดยสังเขป ประกอบการพิจารณา ดังนี้
                </p>
                <table className="w-full border-collapse border border-gray-500 text-[11.5px]">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-500 p-2 w-10">ที่</th>
                      <th className="border border-gray-500 p-2">รายละเอียดความรู้และประสบการณ์</th>
                      <th className="border border-gray-500 p-2">หลักฐาน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="h-9">
                        <td className="border border-gray-500 p-2 text-center">{r ? i + 1 : ""}</td>
                        <td className="border border-gray-500 p-2">{r?.experienceDetail || ""}</td>
                        <td className="border border-gray-500 p-2">{r?.evidence || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="indent-12 text-justify">
                  ข้าพเจ้าขอรับรองว่าข้อความข้างบนนี้เป็นความจริง หากพบว่าภายหลังไม่เป็นความจริงให้ถือว่าผลการประเมินครั้งนี้เป็นอันยกเลิก และจะไม่เรียกร้องใด ๆ ทั้งสิ้น
                </p>
                <div className="text-center pt-4 space-y-1 ml-auto w-72">
                  <p>ลงชื่อ........................................ผู้เรียน</p>
                  <p className="font-bold">({studentInfo.name || DOTS})</p>
                  <p>วันที่..........เดือน....................พ.ศ. {docYear}</p>
                </div>
              </div>

              <div className="text-xs text-gray-900 leading-relaxed font-sans max-w-3xl mx-auto p-4 bg-white space-y-6" id={`print-assessment-${gi}-2`}>
                <h2 className="text-base font-black text-center">ความเห็นชอบของคณะกรรมการประเมินเบื้องต้น</h2>
                <p className="indent-12 text-justify">ได้พิจารณาคุณสมบัติ เอกสารหลักฐาน และสัมภาษณ์เพิ่มเติมแล้ว เห็นว่า</p>
                <div className="space-y-3 pl-8">
                  <div className="flex items-start"><CheckboxPrint checked={false} /><span>ผ่านการประเมินเบื้องต้น สามารถเข้ารับการประเมินความรู้และประสบการณ์ รายวิชา <Dotted>{g.subject}</Dotted> ได้</span></div>
                  <div className="flex items-start"><CheckboxPrint checked={false} /><span>ไม่ผ่านการประเมินเบื้องต้น เนื่องจาก {DOTS}{DOTS}</span></div>
                </div>
                <div className="grid grid-cols-1 gap-5 pt-4 text-center">
                  <p>ลงชื่อ........................................ประธานกรรมการ<br />({committeeName(governingCommittee.chairman)})</p>
                  <p>ลงชื่อ........................................กรรมการ<br />({committeeName(governingCommittee.member1)})</p>
                  <p>ลงชื่อ........................................กรรมการ<br />({committeeName(governingCommittee.member2)})</p>
                  <p className="text-[11px] text-gray-500">วันที่........./................/{docYear}</p>
                </div>
                <div className="border border-gray-400 rounded-lg p-4 space-y-3">
                  <p className="font-bold">ความเห็นของผู้อำนวยการศูนย์ส่งเสริมการเรียนรู้ระดับอำเภอ/เขต</p>
                  <p>{DOTS}{DOTS}{DOTS}</p>
                  <p>{DOTS}{DOTS}{DOTS}</p>
                  <div className="text-center pt-2 space-y-1 ml-auto w-72">
                    <p>ลงชื่อ........................................</p>
                    <p>(........................................)</p>
                    <p>ตำแหน่ง........................................</p>
                    <p>วันที่........./................/{docYear}</p>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 no-print">
                  ผลการประเมินตัดสินเป็นระดับผลการเรียน 8 ระดับ (4, 3.5, 3, 2.5, 2, 1.5, 1, 0) บันทึกผลลงทะเบียนเช่นเดียวกับการเทียบโอน
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 6. ข้อความประทับด้านหลังหลักฐานฉบับจริง ของการเทียบโอนจากการศึกษาต่อเนื่อง (แนวทางฯ บทที่ 3 หน้า 27)
  const renderEvidenceStamps = () => {
    const items = continuingEd.length > 0 ? continuingEd : [null];
    return (
      <div className="space-y-8 max-w-3xl mx-auto p-4 bg-white text-xs text-gray-900 font-sans leading-loose" id="print-evidence-stamps">
        {items.map((c, i) => (
          <div key={i} className="border-2 border-gray-500 p-5 rounded-md space-y-1">
            {c && (
              <p className="text-[10px] text-gray-500 no-print">
                หลักฐาน: {c.courseName} ({c.hours} ชม. = {Math.floor(c.hours / 40)} นก.) ผู้จัด: {c.organizer || "-"}
              </p>
            )}
            <p>ศูนย์ส่งเสริมการเรียนรู้ระดับอำเภอ/เขต <Dotted>{studentInfo.centerName}</Dotted></p>
            <p>หลักฐานฉบับนี้ผ่านการเทียบโอนผลการเรียนรายวิชา <Dotted>{c ? targetNameOf(c.mappedTo2567Code) : ""}</Dotted></p>
            <p>ตามหลักสูตรส่งเสริมการเรียนรู้เพื่อคุณวุฒิตามระดับการศึกษาขั้นพื้นฐาน พุทธศักราช 2567</p>
            <p>ภาคเรียนที่ <Dotted>{studentInfo.semester}</Dotted> ปีการศึกษา <Dotted>{studentInfo.academicYear}</Dotted></p>
            <div className="text-center pt-3 ml-auto w-72 space-y-1">
              <p>ลงชื่อ........................................</p>
              <p className="font-semibold">นายทะเบียน</p>
              <p>วันที่........เดือน..................พ.ศ. {docYear}</p>
            </div>
          </div>
        ))}
        <p className="text-[10px] text-gray-500 no-print">
          ใช้ประทับ/พิมพ์ลงด้านหลังหลักฐานฉบับจริง เพื่อป้องกันการนำผลการเรียนไปเทียบโอนซ้ำ (หลักฐานใช้เทียบโอนได้ในระดับใดระดับหนึ่งเท่านั้น)
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Inject complete @media print styles to guarantee pixel-perfect A4 sheets */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Force standard layout overrides on parents for multi-page printing support */
          html, body, #root, #root-container, #main-content-flow, #scrollable-content-viewport {
            background-color: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            width: 100% !important;
            overflow: visible !important;
            display: block !important;
            position: static !important;
          }

          /* Hide menus, layouts, sidebars, headers, and UI helper controls completely */
          aside, header, #main-sidebar, #top-header, #dashboard-summary-cards, .no-print, 
          #active-component-host > *:not(#printable-document-block), 
          #print-settings-block, .bg-white.border.border-gray-100.rounded-2xl {
            display: none !important;
          }

          /* Style of main wrapper during print */
          #printable-document-block {
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
            display: block !important;
          }

          /* Strict Page break control */
          .page-break {
            page-break-after: always;
            break-after: page;
            clear: both;
            display: block !important;
          }
          table {
            page-break-inside: avoid;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}} />

      {/* Tab Selectors & Print Action Bar */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex flex-wrap items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setActiveForm("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeForm === "all" 
                ? "bg-emerald-600 text-white shadow-sm" 
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            พิมพ์รายงานครบชุด 4 หน้า (แนะนำ)
          </button>

          <button
            type="button"
            onClick={() => setActiveForm("application")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeForm === "application" 
                ? "bg-white text-gray-950 shadow-sm border border-gray-200" 
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            หน้า 1: แบบยื่นความจำนง
          </button>
          
          <button
            type="button"
            onClick={() => setActiveForm("summary")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeForm === "summary" 
                ? "bg-white text-gray-950 shadow-sm border border-gray-200" 
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <ListFilter className="w-3.5 h-3.5 text-emerald-600" />
            หน้า 2: แบบสรุปผลการโอน
          </button>
          
          <button
            type="button"
            onClick={() => setActiveForm("approval")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeForm === "approval" 
                ? "bg-white text-gray-950 shadow-sm border border-gray-200" 
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
            หน้า 3-4: ใบเสนออนุมัติตารางร่วม
          </button>

          <button
            type="button"
            onClick={() => setActiveForm("assessment")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeForm === "assessment"
                ? "bg-white text-gray-950 shadow-sm border border-gray-200"
                : "text-gray-600 hover:text-gray-900"
            }`}
            id="tab-assessment-form"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            แบบประเมินความรู้และประสบการณ์
          </button>

          <button
            type="button"
            onClick={() => setActiveForm("stamp")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeForm === "stamp"
                ? "bg-white text-gray-950 shadow-sm border border-gray-200"
                : "text-gray-600 hover:text-gray-900"
            }`}
            id="tab-evidence-stamp"
          >
            <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
            ตราประทับหลังหลักฐาน
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover:shadow-lg"
            id="btn-print-report"
          >
            <Printer className="w-4 h-4" />
            สั่งพิมพ์หน้านี้ / บันทึกเป็น PDF
          </button>
        </div>
      </div>

      {isLimitCapped && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-900 text-xs shadow-sm">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 animate-pulse" />
          <p>
            <strong>ระบบจัดสรรเสร็จสมบูรณ์ (เกินเกณฑ์สูงสุด):</strong> ตรวจพบหน่วยกิตรวมสะสมจริงที่ยื่นเข้ามาจำนวน {untrimmedTotalCredits} นก. ซึ่งเกินเกณฑ์คุณวุฒิสูงสุด ({maxAllowable} นก.) <strong className="text-amber-800">ระบบ AI จึงได้คัดเลือกวิชาที่มีเกรดสูงสุดเรียงลำดับสะสมให้ครบ และตัดส่วนเกินทิ้งทั้งหมดโดยอัตโนมัติ</strong> เพื่อความถูกต้องตามคู่มือการเทียบโอนและไม่จำกัดการออกสลักหลังพิมพ์เอกสาร ท่านสามารถดำเนินการขั้นตอนอื่นหรือพิมพ์ PDF ต่อได้ทันที!
          </p>
        </div>
      )}

      {/* Printable Area Wrapper */}
      <div 
        ref={printAreaRef}
        className="bg-white border border-gray-200 rounded-3xl p-6 md:p-12 shadow-sm font-sans text-gray-900 min-h-[500px] relative overflow-hidden print:p-0 print:border-none print:shadow-none"
        id="printable-document-block"
      >
        {activeForm === "all" ? (
          <div className="space-y-16">
            {/* Page 1 */}
            <div className="page-break">
              {renderPage1()}
            </div>
            
            {/* Page 2 */}
            <div className="page-break">
              {renderPage2()}
            </div>

            {/* Page 3 */}
            <div className="page-break">
              {renderPage3()}
            </div>

            {/* Page 4 */}
            <div>
              {renderPage4()}
            </div>

            {/* แบบประเมินความรู้และประสบการณ์ แนบเฉพาะกรณีเทียบโอนโดยการประเมิน */}
            {studentInfo.originCurriculum === OriginCurriculum.KNOWLEDGE_EXPERIENCE && (
              <div className="page-break pt-8">
                {renderAssessmentForms()}
              </div>
            )}

            {/* ข้อความประทับหลังหลักฐาน แนบเฉพาะกรณีเทียบโอนจากการศึกษาต่อเนื่อง */}
            {studentInfo.originCurriculum === OriginCurriculum.CONTINUING_ED && (
              <div className="pt-8">
                {renderEvidenceStamps()}
              </div>
            )}
          </div>
        ) : (
          <>
            {activeForm === "application" && renderPage1()}
            {activeForm === "summary" && renderPage2()}
            {activeForm === "assessment" && renderAssessmentForms()}
            {activeForm === "stamp" && renderEvidenceStamps()}
            {activeForm === "approval" && (
              <div className="space-y-16">
                <div>
                  {renderPage3()}
                </div>
                <hr className="border-t-2 border-dashed border-gray-300 my-10 no-print" />
                <div>
                  {renderPage4()}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Editor helper popup to edit names of committees if needed */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 no-print" id="print-settings-block">
        <h3 className="text-xs font-semibold text-gray-700 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-emerald-600" />
          แก้ไขรายชื่อคณะกรรมการผู้จัดทำการเทียบโอน (สําหรับออกรายงานทางการ)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-2xs font-semibold text-gray-500">1. ประธานคณะกรรมการ</label>
            <input
              type="text"
              value={governingCommittee.chairman}
              onChange={(e) => setGoverningCommittee({ ...governingCommittee, chairman: e.target.value })}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-2xs font-semibold text-gray-500">2. นายทะเบียน/กรรมการ</label>
            <input
              type="text"
              value={governingCommittee.registrar}
              onChange={(e) => setGoverningCommittee({ ...governingCommittee, registrar: e.target.value })}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-2xs font-semibold text-gray-500">3. กรรมการตรวจสอบ 1</label>
            <input
              type="text"
              value={governingCommittee.member1}
              onChange={(e) => setGoverningCommittee({ ...governingCommittee, member1: e.target.value })}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-2xs font-semibold text-gray-500">4. กรรมการตรวจสอบ 2</label>
            <input
              type="text"
              value={governingCommittee.member2}
              onChange={(e) => setGoverningCommittee({ ...governingCommittee, member2: e.target.value })}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-2xs font-semibold text-gray-500">5. กรรมการและเลขานุการ</label>
            <input
              type="text"
              value={governingCommittee.member3}
              onChange={(e) => setGoverningCommittee({ ...governingCommittee, member3: e.target.value })}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
