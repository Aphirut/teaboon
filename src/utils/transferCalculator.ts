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
import { maxTransferCredits, foreignGradeOptions, vetSemesterCaps, legacyPrathom4Credits } from "../data/curriculumData";
import { electiveSubjects2567 } from "../data/electiveSubjects";
import { COURSE_MATCH_THRESHOLD, courseMatchKey } from "../data/courseMatch";

export interface SourceAllocation {
  id: string;
  code: string;
  name: string;
  creditsSelected: number;
  origCredits: number;
  grade: string;
  mappedTo2567Code?: string;
}

export interface ComputedSubjectResult {
  std: StandardSubject2567;
  isTransferred: boolean;
  matchedCredits: number;      // raw credit matched (untrimmed)
  allocatedCredits: number;    // credit allocated under global quota
  finalGrade: string;          // Weighted grade (or "ผ่าน")
  matchingSources: SourceAllocation[];
  isOverQuota: boolean;        // Whether it was trimmed because of global quota
  quotaNotes?: string;
  ruleNote?: string;           // เหตุผลที่แนวทางการเทียบโอนไม่อนุญาตให้เทียบโอนรายวิชานี้
}

export interface TransferSummaryResult {
  results: ComputedSubjectResult[];
  totalTransferredCredits: number; // total credits allocated under quota (matches <= maxAllowable)
  untrimmedTotalCredits: number;   // what total credits would be without the global ceiling
  gpa: string;                     // GPA computed ONLY from quota-allocated numeric subjects
  isLimitCapped: boolean;          // True if raw total exceeds maxAllowable
  maxAllowable: number;
  failedElectiveGroups?: Array<{ code: string; name: string; currentCredits: number }>;
}

// Helper to get numeric grade weights
export const getGradeWeight = (g: string): number => {
  const num = parseFloat(g);
  if (!isNaN(num)) return num;
  const lower = (g || "").toString().trim().toLowerCase();
  if (lower === "ผ่าน" || lower === "ผ" || lower === "p") return 2.0;
  return 0.0;
};

// บทที่ 2 ข้อ 2.4: ไม่รับเทียบโอนรายวิชาที่ได้ค่าระดับผลการเรียนเป็น 0, ร, มส
export const isInvalidGrade = (g: string): boolean => {
  const t = normalizeGrade(g || "");
  if (t === "") return true;
  const num = parseFloat(t);
  if (!isNaN(num)) return num <= 0;
  const lower = t.toLowerCase();
  return lower === "ร" || lower === "มส" || lower === "มผ" || lower === "ไม่ผ่าน" || lower === "f";
};

// แปลงเกรดที่อ่านได้จากใบระเบียน/AI ให้เป็นรูปแบบเดียวกับตัวเลือกในระบบ ("3.0" -> "3", "B+" -> "3.5", "ผ" -> "ผ่าน")
// เพื่อไม่ให้ช่องเลือกเกรดแสดงค่าไม่ตรงกับค่าที่เก็บอยู่จริง
export const normalizeGrade = (g: string): string => {
  const t = (g ?? "").toString().trim();
  if (t === "") return t;
  // ใบระเบียนบางแบบเขียนเกรดเป็น "3(1)" โดยตัวเลขในวงเล็บคือจำนวนครั้ง/ภาคเรียน ไม่ใช่เกรด
  const withCount = t.match(/^([0-9]+(?:\.[0-9]+)?)\s*\(\s*[0-9]+\s*\)$/);
  if (withCount) return String(parseFloat(withCount[1]));
  const num = parseFloat(t);
  if (!isNaN(num) && /^[0-9]+(\.[0-9]+)?$/.test(t)) return String(num);
  const letters: Record<string, string> = { "A": "4", "B+": "3.5", "B": "3", "C+": "2.5", "C": "2", "D+": "1.5", "D": "1", "F": "0" };
  const up = t.toUpperCase();
  if (letters[up] !== undefined) return letters[up];
  if (up === "P" || t === "ผ" || t === "ผ่าน") return "ผ่าน";
  return t;
};

// บทที่ 2 หลักเกณฑ์ข้อ 4: เมื่อนำหลายรายวิชามาเฉลี่ยเป็น 1 รายวิชา หากมีทศนิยมให้ปรับตามหลักคณิตศาสตร์
// ให้เป็นค่าระดับผลการเรียน 8 ระดับ (4, 3.5, 3, 2.5, 2, 1.5, 1, 0) โดยปัดครึ่งขึ้น
export const roundToGradeLevel = (avg: number): number => {
  const rounded = Math.round(avg * 2) / 2;
  return Math.min(4, Math.max(0, rounded));
};

export const formatGradeLevel = (avg: number): string => String(roundToGradeLevel(avg));

// เพดานหน่วยกิตเทียบโอนจริงของผู้ยื่นคำขอ: ใช้ค่าต่ำสุดระหว่างเพดานร้อยละ 75 ของระดับ
// กับเพดานเฉพาะหลักสูตรต้นทาง (ปวช. ตามภาคเรียนที่จบ, ต่างประเทศ ตามชั้นปี/เกรดที่จบ)
export function getMaxTransferCredits(studentInfo: StudentInfo): number {
  const base = maxTransferCredits[studentInfo.level] || 57;

  if (
    studentInfo.originCurriculum === OriginCurriculum.VET_2562 &&
    studentInfo.level === EducationLevel.SENIOR_HIGH
  ) {
    const sem = Math.min(5, Math.max(1, studentInfo.vetSemestersCompleted ?? 5));
    return Math.min(base, vetSemesterCaps[sem]);
  }

  if (studentInfo.originCurriculum === OriginCurriculum.FOREIGN_CURRICULUM) {
    const options = foreignGradeOptions[studentInfo.level] || [];
    if (options.length === 0) return base;
    const selected =
      options.find(o => o.grade === studentInfo.foreignGradeCompleted) || options[options.length - 1];
    return Math.min(base, selected.maxCredits);
  }

  return base;
}

// รายวิชา "ศาสนาและหน้าที่พลเมือง" ของ กศน. 2551 (สค11002 / สค21002 / สค31002)
export function isReligionCivicsSubject(name: string, code: string): boolean {
  return /ศาสนา|หน้าที่พลเมือง/.test(name || "") || /^สค\d{2}002$/.test((code || "").trim());
}

// วิชาบังคับกลุ่มสังคมศึกษาของ กศน. 2551 (สังคมศึกษา, ศาสนาและหน้าที่พลเมือง, การพัฒนาตนเอง ชุมชน สังคม)
export function isNfeCompulsorySocial(s: { name: string; code: string; originType?: string }): boolean {
  if (s.originType !== "บังคับ") return false;
  return /^สค\d{2}00\d$/.test((s.code || "").trim()) || /^สังคมศึกษา|ศาสนา|หน้าที่พลเมือง/.test((s.name || "").trim());
}

// วิชา "ทักษะการเรียนรู้" (ทร11001 / ทร21001 / ทร31001) ของหลักสูตรนอกระบบ 2551
// ไม่มีรายวิชาใน สกร. 2567 รับเทียบโอน (ช่องรายวิชาที่รับเทียบเป็น "-" ในตารางที่ 3-5 ของแนวทางฯ)
export function isLearningSkillsSubject(name: string, code: string): boolean {
  const n = (name || "").trim();
  const c = (code || "").trim();
  return n.startsWith("ทักษะการเรียนรู้") || /^ทร\d/.test(c);
}

// หลักสูตรต่างประเทศ: ภาษาไทย และสังคมศึกษา ประวัติศาสตร์ และหน้าที่พลเมือง เทียบโอนไม่ได้ในทุกระดับ (บทที่ 4)
export function isForeignRestrictedTarget(std: StandardSubject2567): boolean {
  return std.type === "บังคับ" && (std.code.startsWith("พท") || std.code.startsWith("สค"));
}

// Helper to detect academic subject category for dynamic elective mapping
export function detectSubjectCategory(name: string, code: string): string {
  const n = (name || "").toLowerCase().trim();
  const c = (code || "").toUpperCase().trim();

  // Social studies / History / Geography
  if (
    n.includes("ประวัติศาสตร์") ||
    n.includes("สังคม") ||
    n.includes("หน้าที่พลเมือง") ||
    n.includes("ศีลธรรม") ||
    n.includes("ภูมิศาสตร์") ||
    n.includes("อารยธรรม") ||
    n.includes("ท้องถิ่น") ||
    n.includes("การเงิน") ||
    n.includes("กฎหมาย") ||
    n.includes("ลูกเสือ") ||
    c.startsWith("ส") ||
    c.startsWith("สค")
  ) {
    return "SOCIAL";
  }

  // Thai Language
  if (n.includes("ภาษาไทย") || n === "ไทย" || c.startsWith("ท") || c.startsWith("ทท") || c.startsWith("พท")) {
    return "THAI";
  }

  // English
  if (n.includes("อังกฤษ") || n.includes("english") || n.includes("eng") || c.startsWith("อ") || c.startsWith("พต")) {
    return "ENGLISH";
  }

  // Mathematics
  if (n.includes("คณิต") || n.includes("math") || c.startsWith("ค") || c.startsWith("พค")) {
    return "MATH";
  }

  // Digital Technology / Computer / ICT
  if (
    n.includes("คอมพิวเตอร์") ||
    n.includes("ดิจิทัล") ||
    n.includes("เทคโนโลยี") ||
    n.includes("วิทยาการคำนวณ") ||
    n.includes("วิทยาการคำนวน") ||
    n.includes("สารสนเทศ") ||
    c.startsWith("ทค") ||
    c.startsWith("ทด")
  ) {
    return "DIGITAL";
  }

  // Science
  if (n.includes("วิทยาศาสตร์") || n.includes("วิทย์") || n.includes("science") || n.includes("ฟิสิกส์") || n.includes("เคมี") || n.includes("ชีวะ") || n.includes("โลกและอวกาศ") || n.includes("สิ่งแวดล้อม") || c.startsWith("ว") || c.startsWith("พว")) {
    return "SCIENCE";
  }

  // Career / Vocational
  if (n.includes("อาชีพ") || n.includes("การงาน") || n.includes("ธุรกิจ") || n.includes("บัญชี") || c.startsWith("ง") || c.startsWith("กล")) {
    return "CAREER";
  }

  // Arts / Music (Separate from Health now!)
  if (
    n.includes("ศิลปะ") ||
    n.includes("ดนตรี") ||
    n.includes("นาฏศิลป์") ||
    n.includes("ทัศนศิลป์") ||
    n.includes("วาดเขียน") ||
    n.includes("สุนทรียภาพ") ||
    n.includes("การเขียนภาพ") ||
    n.includes("การเขียนลาย") ||
    n.includes("จิตรกรรม") ||
    n.includes("ประติมากรรม") ||
    c.startsWith("ศ")
  ) {
    return "ART";
  }

  // Health / PE
  if (
    n.includes("สุขศึกษา") ||
    n.includes("พลศึกษา") ||
    n.includes("กีฬา") ||
    n.includes("ปฐมพยาบาล") ||
    n.includes("โรค") ||
    c.startsWith("พ")
  ) {
    return "HEALTH";
  }

  return "OTHER";
}

// หมวดวิชาเลือก สกร. 2567 (ตามไฟล์รายวิชาเลือก) ที่สอดคล้องกับหมวดที่ตรวจพบจากวิชาต้นทาง
const ELECTIVE_CATEGORIES_BY_DETECTED: Record<string, string[]> = {
  SOCIAL: ["สังคมศึกษา"],
  THAI: ["ภาษาไทย"],
  ENGLISH: ["ภาษาต่างประเทศ"],
  MATH: ["คณิตศาสตร์"],
  SCIENCE: ["วิทยาศาสตร์"],
  DIGITAL: ["เทคโนโลยีดิจิทัล"],
  CAREER: ["การงานอาชีพ"],
  ART: ["สุขภาวะและศิลปะ"],
  HEALTH: ["สุขภาวะและศิลปะ"]
};

// สุขภาวะและศิลปะเป็นสาระเดียว แต่แยกความหมายสุขภาพกับศิลปะเพื่อเลือกรายวิชาให้ตรงกว่า
const ART_WORDS = ["ศิลป", "ดนตรี", "ขับร้อง", "นาฏ", "เพลง", "วาด"];
const HEALTH_WORDS = ["สุขภาพ", "ปฐมพยาบาล", "โรค", "ดูแล", "ป้องกัน", "สาธารณภัย", "กีฬา", "พละ"];

// ความคล้ายของข้อความแบบ Dice บนคู่อักขระ (ไม่นับช่องว่าง/ตัวเลข) ใช้จับคู่ชื่อวิชาต้นทางกับรายวิชาเลือก สกร. 2567
const bigramSimilarity = (a: string, b: string): number => {
  const norm = (s: string) => (s || "").toLowerCase().replace(/[\s0-9๐-๙()\-:.,]/g, "");
  const x = norm(a);
  const y = norm(b);
  if (x.length < 2 || y.length < 2) return x && x === y ? 1 : 0;
  const grams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      m.set(g, (m.get(g) || 0) + 1);
    }
    return m;
  };
  const gx = grams(x);
  const gy = grams(y);
  let overlap = 0;
  gx.forEach((cnt, g) => {
    overlap += Math.min(cnt, gy.get(g) || 0);
  });
  return (2 * overlap) / ((x.length - 1) + (y.length - 1));
};

// ผลเปรียบเทียบคำอธิบายรายวิชาด้วย AI (ร้อยละ) คีย์ = courseMatchKey(ชื่อวิชาเดิม, รหัส สกร. 2567)
// ตั้งค่าจากหน้าจอก่อนคำนวณ ถ้ามีผลของรายวิชาไหน ตัวคำนวณจะใช้ร้อยละนี้ตัดสินแทนความคล้ายของชื่อวิชา
let aiMatchScores: Record<string, number> = {};
export function setAiMatchScores(scores: Record<string, number>) {
  aiMatchScores = scores || {};
}

// รายวิชาเลือก สกร. 2567 ที่เป็นผู้สมัครในหมวดเดียวกัน เรียงตามความคล้ายของชื่อ (ใช้คัดก่อนส่งให้ AI เปรียบเทียบ)
export function getElectiveCandidates(category: string, level: EducationLevel, nameHint: string, limit = 3) {
  const cats = ELECTIVE_CATEGORIES_BY_DETECTED[category];
  if (!cats) return [];
  let candidates = electiveSubjects2567.filter(e => e.level === level && cats.includes(e.category));
  if (category === "ART" || category === "HEALTH") {
    const words = category === "ART" ? ART_WORDS : HEALTH_WORDS;
    const narrowed = candidates.filter(e => words.some(w => e.name.includes(w)));
    if (narrowed.length > 0) candidates = narrowed;
  }
  return candidates
    .map(e => ({ e, score: bigramSimilarity((nameHint || "").toLowerCase(), e.name) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.e);
}

// เลือกรายวิชาเลือก สกร. 2567 (จากรายการรายวิชาเลือกจริง) ที่สอดคล้องกับชื่อวิชาต้นทางมากที่สุดในหมวดเดียวกัน
// excludeCodes: รายวิชาที่ถูกใช้ไปแล้ว (รายวิชา 2567 หนึ่งวิชาเทียบได้ครั้งเดียว)
export function getSpecificElectiveForCategory(
  category: string,
  level: EducationLevel,
  nameHint: string,
  excludeCodes?: Set<string>,
  originNames?: string[]
): { code: string; name: string } {
  const generic =
    level === EducationLevel.PRIMARY
      ? { code: "ELECTIVE_PRI", name: "วิชาเลือก/วิชาเลือกเสรี" }
      : level === EducationLevel.JUNIOR_HIGH
        ? { code: "ELECTIVE_JUN", name: "วิชาเลือก/วิชาเลือกเสรี" }
        : { code: "ELECTIVE_SEN", name: "วิชาเลือก/วิชาเลือกเสรี" };

  const cats = ELECTIVE_CATEGORIES_BY_DETECTED[category];
  if (!cats) return generic;

  const hint = (nameHint || "").toLowerCase();
  let candidates = electiveSubjects2567.filter(
    e => e.level === level && cats.includes(e.category) && !(excludeCodes && excludeCodes.has(e.code))
  );
  if (candidates.length === 0) return generic;

  if (category === "ART" || category === "HEALTH") {
    const words = category === "ART" ? ART_WORDS : HEALTH_WORDS;
    const narrowed = candidates.filter(e => words.some(w => e.name.includes(w)));
    if (narrowed.length > 0) candidates = narrowed;
  }

  // ถ้ามีผลเปรียบเทียบคำอธิบายด้วย AI ให้ใช้ร้อยละนั้น (เฉลี่ยทุกวิชาเดิมในก้อน) และต้องถึงเกณฑ์ขั้นต่ำ
  if (originNames && originNames.length > 0) {
    let aiBest: { code: string; name: string } | null = null;
    let aiBestPercent = -1;
    let anyAi = false;
    for (const e of candidates) {
      const vals = originNames
        .map(n => aiMatchScores[courseMatchKey(n, e.code)])
        .filter((v): v is number => typeof v === "number");
      if (vals.length === 0) continue;
      anyAi = true;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      if (avg > aiBestPercent) {
        aiBestPercent = avg;
        aiBest = { code: e.code, name: e.name };
      }
    }
    // ต่ำกว่าเกณฑ์ → คืนรหัสว่าง เพื่อให้ตัวคำนวณนับเป็น "เทียบไม่ได้" (failedElectiveGroups)
    if (anyAi) return aiBestPercent >= COURSE_MATCH_THRESHOLD && aiBest ? aiBest : { code: "", name: "" };
  }

  let best = candidates[0];
  let bestScore = -1;
  for (const e of candidates) {
    const score = bigramSimilarity(hint, e.name);
    if (score > bestScore) {
      best = e;
      bestScore = score;
    }
  }
  return { code: best.code, name: best.name };
}


interface ChunkResult {
  chunks: OriginSubjectInput[][];
  remaining: OriginSubjectInput[];
}

export function chunkSubjectsByThreeCredits(subjects: OriginSubjectInput[]): ChunkResult {
  let pool = subjects.map(s => ({ ...s }));
  const chunks: OriginSubjectInput[][] = [];

  // Helper to find exact subset
  const findSubsetScaled = (arr: OriginSubjectInput[], targetScaled: number): OriginSubjectInput[] | null => {
    const search = (index: number, currentSum: number, currentSet: OriginSubjectInput[]): OriginSubjectInput[] | null => {
      if (currentSum === targetScaled) {
        return currentSet;
      }
      if (currentSum > targetScaled || index >= arr.length) {
        return null;
      }
      
      const item = arr[index];
      const itemCreditsScaled = Math.round(item.credits * 10);
      if (itemCreditsScaled > 0) {
        const res1 = search(index + 1, currentSum + itemCreditsScaled, [...currentSet, item]);
        if (res1) return res1;
      }
      
      const res2 = search(index + 1, currentSum, currentSet);
      if (res2) return res2;
      
      return null;
    };
    return search(0, 0, []);
  };

  while (pool.length > 0) {
    const subset = findSubsetScaled(pool, 30); // 3.0 * 10
    if (subset) {
      chunks.push(subset);
      const subsetIds = new Set(subset.map(s => s.id));
      pool = pool.filter(s => !subsetIds.has(s.id));
    } else {
      // Look for a subject with >= 3.0 credits that we can split
      const largeIdx = pool.findIndex(s => s.credits >= 3.0);
      if (largeIdx !== -1) {
        const s = pool[largeIdx];
        // Clone it as a 3.0 credit sub-subject
        const splitId = `${s.id}_split_${Date.now()}_${Math.random()}`;
        chunks.push([{ ...s, id: splitId, credits: 3.0 }]);
        s.credits -= 3.0;
        if (s.credits <= 0) {
          pool.splice(largeIdx, 1);
        }
      } else {
        // No match found
        break;
      }
    }
  }

  return { chunks, remaining: pool };
}

// Helper to match target subject codes, treating all elective codes (ELECTIVE_PRI, ELECTIVE_JUN, ELECTIVE_SEN) as interchangeable matches
export function isCodeMatch(mappedToCode: string, targetCode: string): boolean {
  if (!mappedToCode || !targetCode) return false;
  
  // Direct match
  if (mappedToCode === targetCode) return true;

  // Generic-to-generic match
  if (mappedToCode.startsWith("ELECTIVE_") && targetCode.startsWith("ELECTIVE_")) {
    return true;
  }

  // Look up mappedToCode in elective database
  const elective = electiveSubjects2567.find(s => s.code === mappedToCode);
  if (elective) {
    if (targetCode === "ELECTIVE_SEN" && elective.level === EducationLevel.SENIOR_HIGH) {
      return true;
    }
    if (targetCode === "ELECTIVE_JUN" && elective.level === EducationLevel.JUNIOR_HIGH) {
      return true;
    }
    if (targetCode === "ELECTIVE_PRI" && elective.level === EducationLevel.PRIMARY) {
      return true;
    }
  }

  // Fallback pattern matching on code characters (e.g. พท320001 -> '3' indicates Senior High)
  const thirdChar = mappedToCode.length >= 3 ? mappedToCode.charAt(2) : "";
  if (thirdChar === "3" && targetCode === "ELECTIVE_SEN") return true;
  if (thirdChar === "2" && targetCode === "ELECTIVE_JUN") return true;
  if (thirdChar === "1" && targetCode === "ELECTIVE_PRI") return true;

  return false;
}

export function isNonEnglishForeignLanguage(name: string, code: string): boolean {
  const n = (name || "").toLowerCase().trim();
  const c = (code || "").toUpperCase().trim();

  // If name contains English/American/British keywords, it is English!
  if (
    n.includes("อังกฤษ") || 
    n.includes("english") || 
    n.includes("eng") || 
    n.includes("conversation") || 
    n.includes("listening") || 
    n.includes("speaking") || 
    n.includes("reading") || 
    n.includes("writing") || 
    n.includes("grammar") ||
    n.includes("eapol") ||
    n.includes("toeic") ||
    n.includes("toefl") ||
    n.includes("ielts")
  ) {
    return false;
  }

  // Non-English foreign language names:
  const foreignKeywords = [
    "จีน", "chinese", "mandarin",
    "ญี่ปุ่น", "japanese",
    "ฝรั่งเศส", "french",
    "เกาหลี", "korean",
    "เยอรมัน", "german",
    "พม่า", "burmese", "myanmar",
    "เวียดนาม", "vietnamese",
    "กัมพูชา", "เขมร", "khmer", "cambodian",
    "มลายู", "malay",
    "บาลี", "pali",
    "รัสเซีย", "russian",
    "สเปน", "spanish",
    "อาหรับ", "arabic",
    "สันสกฤต", "sanskrit",
    "อินโดนีเซีย", "indonesian",
    "ฟิลิปปินส์", "filipino",
    "ลาว", "laotian"
  ];

  for (const kw of foreignKeywords) {
    if (n.includes(kw)) {
      return true;
    }
  }

  // Check code prefixes in Thai schools:
  // จ = จีน, ญ = ญี่ปุ่น, ฝ = ฝรั่งเศส, ร = รัสเซีย, ย = เยอรมัน
  // Must be followed by numbers (e.g. จ31201)
  if (/^[จญฝรย][0-9]/.test(c)) {
    return true;
  }

  return false;
}

export function findCompulsoryCounterpart(name: string, code: string, level: EducationLevel): string | null {
  const n = (name || "").toLowerCase().trim();
  const c = (code || "").toUpperCase().trim();

  // 1. Thai Language
  if (n.includes("ภาษาไทย") || n === "ไทย" || c.startsWith("ท1") || c.startsWith("ท2") || c.startsWith("ท3") || c.startsWith("พท1") || c.startsWith("พท2") || c.startsWith("พท3")) {
    if (level === EducationLevel.PRIMARY) return "พท110001";
    if (level === EducationLevel.JUNIOR_HIGH) return "พท210001";
    if (level === EducationLevel.SENIOR_HIGH) return "พท310001";
  }

  // 2. English
  if (n.includes("อังกฤษ") || n.includes("english") || n.includes("eng ") || c.startsWith("อ1") || c.startsWith("อ2") || c.startsWith("อ3") || c.startsWith("พต1") || c.startsWith("พต2") || c.startsWith("พต3")) {
    if (!isNonEnglishForeignLanguage(name, code)) {
      if (level === EducationLevel.PRIMARY) return "พต110001";
      if (level === EducationLevel.JUNIOR_HIGH) return "พต210001";
      if (level === EducationLevel.SENIOR_HIGH) return "พต310001";
    }
  }

  // 3. Math
  if (n.includes("คณิต") || n.includes("math") || c.startsWith("ค1") || c.startsWith("ค2") || c.startsWith("ค3") || c.startsWith("พค1") || c.startsWith("พค2") || c.startsWith("พค3")) {
    if (level === EducationLevel.PRIMARY) return "พค110001";
    if (level === EducationLevel.JUNIOR_HIGH) return "พค210001";
    if (level === EducationLevel.SENIOR_HIGH) return "พค310001";
  }

  // 4. Science - general only (exclude specific elective sciences)
  const isElectiveScience = n.includes("เคมี") || n.includes("ฟิสิกส์") || n.includes("ชีววิทยา") || n.includes("ชีวะ") || n.includes("ดาราศาสตร์") || n.includes("สิ่งแวดล้อม") || n.includes("ธรณี") || n.includes("วัสดุศาสตร์") || n.includes("พลังงาน");
  if ((n.includes("วิทยาศาสตร์") || n.includes("วิทย์") || n.includes("science") || c.startsWith("ว1") || c.startsWith("ว2") || c.startsWith("ว3") || c.startsWith("พว1") || c.startsWith("พว2") || c.startsWith("พว3")) && !isElectiveScience) {
    if (level === EducationLevel.PRIMARY) return "พว110001";
    if (level === EducationLevel.JUNIOR_HIGH) return "พว210001";
    if (level === EducationLevel.SENIOR_HIGH) return "พว310001";
  }

  // 5. Work Orientation (การงานอาชีพ)
  if (n.includes("การงานอาชีพ") || n.includes("การงาน") || n.includes("งานอาชีพ") || c.startsWith("ง1") || c.startsWith("ง2") || c.startsWith("ง3") || c.startsWith("กอ1") || c.startsWith("กอ2") || c.startsWith("กอ3") || c.startsWith("อช1") || c.startsWith("อช2") || c.startsWith("อช3")) {
    if (!n.includes("ฝึกอาชีพ") && !n.includes("หลักสูตรระยะสั้น") && !n.includes("วิชาชีพ")) {
      if (level === EducationLevel.PRIMARY) return "กอ110001";
      if (level === EducationLevel.JUNIOR_HIGH) return "กอ210001";
      if (level === EducationLevel.SENIOR_HIGH) return "กอ310001";
    }
  }

  // 6. Health & Arts
  const artOrHealth = n.includes("สุขศึกษา") || n.includes("พลศึกษา") || n.includes("ศิลปกรรม") || n.includes("ดนตรี") || n.includes("นาฏศิลป์") || n.includes("ทัศนศิลป์") || n.includes("สุขภาวะและศิลปะ") || c.startsWith("พ1") || c.startsWith("พ2") || c.startsWith("พ3") || c.startsWith("ศ1") || c.startsWith("ศ2") || c.startsWith("ศ3") || c.startsWith("สศ1") || c.startsWith("สศ2") || c.startsWith("สศ3") || c.startsWith("ทช");
  if (artOrHealth) {
    if (level === EducationLevel.PRIMARY) return "สศ110001";
    if (level === EducationLevel.JUNIOR_HIGH) return "สศ210001";
    if (level === EducationLevel.SENIOR_HIGH) return "สศ310001";
  }

  // 7. Social Studies
  const isElectiveSocial = n.includes("ประวัติศาสตร์ชาติไทย") || n.includes("ประวัติศาสตร์ไทย") || n.includes("การเงินเพื่อชีวิต") || n.includes("ลูกเสือ") || n.includes("ลูกเสือกศน") || n.includes("พัฒนาคุณภาพชีวิต") || n.includes("ศึกษาประวัติศาสตร์");
  const socialStudies = n.includes("สังคมศึกษา") || n.includes("ประวัติศาสตร์") || n.includes("หน้าที่พลเมือง") || n.includes("ศีลธรรม") || n.includes("ภูมิศาสตร์") || c.startsWith("ส1") || c.startsWith("ส2") || c.startsWith("ส3") || c.startsWith("สค1") || c.startsWith("สค2") || c.startsWith("สค3");
  if (socialStudies && !isElectiveSocial) {
    if (level === EducationLevel.PRIMARY) return "สค110001";
    if (level === EducationLevel.JUNIOR_HIGH) return "สค210001";
    if (level === EducationLevel.SENIOR_HIGH) return "สค310001";
  }

  // 8. Digital Technology (ทุกระดับ: ประถม 3 นก., ม.ต้น 4 นก., ม.ปลาย 5 นก.)
  if (n.includes("เทคโนโลยีดิจิทัล") || n.includes("คอมพิวเตอร์พื้นฐาน") || c.startsWith("ทด")) {
    if (level === EducationLevel.PRIMARY) return "ทด110001";
    if (level === EducationLevel.JUNIOR_HIGH) return "ทด210001";
    if (level === EducationLevel.SENIOR_HIGH) return "ทด310001";
  }

  return null;
}

export function getRequiredTypeForSourceSubject(
  name: string,
  code: string,
  originType: "บังคับ" | "เลือก/เพิ่มเติม" | undefined,
  level: EducationLevel
): { allowedType: "บังคับ" | "เลือก"; counterpartCode: string | null } {
  if (originType === "บังคับ") {
    const counterpartCode = findCompulsoryCounterpart(name, code, level);
    if (counterpartCode) {
      return { allowedType: "บังคับ", counterpartCode };
    } else {
      // "วิชาหลักสูตรแกนกลางไหนที่ไม่มีในรายวิชาบังคับถือว่าเป็นวิชาเลือก..."
      return { allowedType: "เลือก", counterpartCode: null };
    }
  }
  return { allowedType: "เลือก", counterpartCode: null };
}

export function calculateTransferResults(
  studentInfo: StudentInfo,
  standardList: StandardSubject2567[],
  originSubjects: OriginSubjectInput[],
  continuingEd: ContinuingEdInput[],
  foreignCreds: ForeignCredentialInput[],
  experiences: ExperienceInput[]
): TransferSummaryResult {
  const maxAllowable = getMaxTransferCredits(studentInfo);

  // ผู้จบ ป.4 ก่อน พ.ศ. 2507: เทียบโอนคงที่ 24 นก. ผล "ผ่าน" ตามรายวิชาที่แนวทางฯ กำหนด
  if (studentInfo.legacyPrathom4 && studentInfo.level === EducationLevel.PRIMARY) {
    const results: ComputedSubjectResult[] = standardList.map(std => {
      const fixed = legacyPrathom4Credits.find(f => f.code === std.code);
      if (!fixed) {
        return { std, isTransferred: false, matchedCredits: 0, allocatedCredits: 0, finalGrade: "N/A", matchingSources: [], isOverQuota: false };
      }
      return {
        std,
        isTransferred: true,
        matchedCredits: fixed.credits,
        allocatedCredits: fixed.credits,
        finalGrade: "ผ่าน",
        matchingSources: [{
          id: `legacy-prathom4-${std.code}`,
          code: "-",
          name: "จบประถมศึกษาปีที่ 4 (ก่อน พ.ศ. 2507) ตามใบสุทธิ",
          creditsSelected: fixed.credits,
          origCredits: fixed.credits,
          grade: "ผ่าน",
          mappedTo2567Code: std.code
        }],
        isOverQuota: false
      };
    });
    const total = results.reduce((sum, r) => sum + r.allocatedCredits, 0);
    return {
      results,
      totalTransferredCredits: total,
      untrimmedTotalCredits: total,
      gpa: "ผ่าน",
      isLimitCapped: false,
      maxAllowable,
      failedElectiveGroups: []
    };
  }

  // (carryOver2567 ใช้ได้กับหลักสูตรต้นทางแบบตารางรายวิชาเท่านั้น)
  // ผู้เรียนลาออกแล้วสมัครใหม่: รายวิชาในตารางคือผลการเรียน สกร. 2567 ที่เทียบโอน/เรียนไว้แล้ว
  // นำไปใช้โดยตรงตามที่จับคู่ไว้ ไม่ตรวจเกณฑ์หน่วยกิตเทียบโอน/ประเภทวิชา/โควตาใหม่ (ยกเว้นวิชาที่ไม่ผ่าน 0, ร, มส)
  const isRegularOrigin =
    studentInfo.originCurriculum === OriginCurriculum.CORE_2551 ||
    studentInfo.originCurriculum === OriginCurriculum.NFE_2551 ||
    studentInfo.originCurriculum === OriginCurriculum.VET_2562;
  if (studentInfo.carryOver2567 && isRegularOrigin) {
    const passed = originSubjects.filter(s => !isInvalidGrade(s.grade));
    const compulsoryCodes = new Set(standardList.filter(s => s.type === "บังคับ").map(s => s.code));

    const avgGrade = (rows: OriginSubjectInput[]): string => {
      const numeric = rows.filter(r => !isNaN(parseFloat(normalizeGrade(r.grade))));
      if (numeric.length === 0) return "ผ่าน";
      if (numeric.length === 1) return normalizeGrade(numeric[0].grade);
      const credits = numeric.reduce((a, r) => a + r.credits, 0);
      const sum = numeric.reduce((a, r) => a + parseFloat(normalizeGrade(r.grade)) * r.credits, 0);
      return formatGradeLevel(credits > 0 ? sum / credits : 0);
    };

    const results: ComputedSubjectResult[] = standardList.map(std => {
      const rows = std.type === "บังคับ"
        ? passed.filter(s => s.mappedTo2567Code === std.code)
        : passed.filter(s => !compulsoryCodes.has(s.mappedTo2567Code));
      if (rows.length === 0) {
        return { std, isTransferred: false, matchedCredits: 0, allocatedCredits: 0, finalGrade: "N/A", matchingSources: [], isOverQuota: false };
      }
      const sumCredits = rows.reduce((a, r) => a + r.credits, 0);
      const credits = parseFloat((std.type === "บังคับ" ? Math.min(sumCredits, std.credits) : sumCredits).toFixed(2));
      return {
        std,
        isTransferred: true,
        matchedCredits: credits,
        allocatedCredits: credits,
        finalGrade: avgGrade(rows),
        matchingSources: rows.map(r => ({
          id: r.id,
          code: r.code || "-",
          name: r.name,
          creditsSelected: r.credits,
          origCredits: r.credits,
          grade: normalizeGrade(r.grade),
          mappedTo2567Code: r.mappedTo2567Code
        })),
        isOverQuota: false
      };
    });

    const total = parseFloat(results.reduce((a, r) => a + r.allocatedCredits, 0).toFixed(2));
    let sumW = 0;
    let credW = 0;
    results.forEach(r => {
      const g = parseFloat(r.finalGrade);
      if (r.allocatedCredits > 0 && !isNaN(g)) { sumW += g * r.allocatedCredits; credW += r.allocatedCredits; }
    });
    return {
      results,
      totalTransferredCredits: total,
      untrimmedTotalCredits: total,
      gpa: credW > 0 ? (sumW / credW).toFixed(2) : "ผ่าน",
      isLimitCapped: false,
      maxAllowable,
      failedElectiveGroups: []
    };
  }

  // Filter out non-English foreign language subjects so they won't transfer or count
  const allowedOriginSubjects = originSubjects.filter(
    s => !isNonEnglishForeignLanguage(s.name, s.code) && !isLearningSkillsSubject(s.name, s.code)
  );
  const allowedContinuingEd = continuingEd.filter(
    s => !isNonEnglishForeignLanguage(s.courseName, "")
  );
  const allowedForeignCreds = foreignCreds.filter(
    s => !isNonEnglishForeignLanguage(s.subjectName, "")
  );
  const allowedExperiences = experiences.filter(
    s => !isNonEnglishForeignLanguage(s.experienceDetail, "")
  );

  const usedSourceIds = new Set<string>();
  // รายวิชาเลือก สกร. 2567 ที่ถูกจับคู่ไปแล้ว: รายวิชาหนึ่งเทียบโอนได้ครั้งเดียว ก้อนถัดไปจึงเลือกวิชาอื่นที่สอดคล้องรองลงมา
  const usedElectiveCodes = new Set<string>();
  const failedElectiveGroups: Array<{ code: string; name: string; currentCredits: number }> = [];

  // Core processing function for a single target standard subject
  const processSubject = (
    std: StandardSubject2567,
    srcSubjects: OriginSubjectInput[],
    srcContinuingEd: ContinuingEdInput[],
    srcForeignCreds: ForeignCredentialInput[],
    srcExperiences: ExperienceInput[]
  ): ComputedSubjectResult => {
    let matchingSources: SourceAllocation[] = [];
    let finalGrade = "N/A";
    let isTransferred = false;
    let matchedCredits = 0;
    let ruleNote: string | undefined;

    if (
      studentInfo.originCurriculum === OriginCurriculum.CORE_2551 ||
      studentInfo.originCurriculum === OriginCurriculum.NFE_2551 ||
      studentInfo.originCurriculum === OriginCurriculum.VET_2562
    ) {
      // Filter out invalid grades (0, ร, มส) and match target สกร 2567 code
      let matched = srcSubjects.filter(
        s => isCodeMatch(s.mappedTo2567Code, std.code) && !isInvalidGrade(s.grade)
      );

      // วิชาบังคับ 2567 รับได้เฉพาะวิชาบังคับเดิมที่เป็นคู่เทียบของตนเท่านั้น
      // ส่วนวิชาเลือก 2567 รับได้ทั้งวิชาเลือกเดิม และวิชาบังคับเดิมที่ยังไม่ถูกนำไปเทียบโอนวิชาใดแล้ว
      // (วิชาเดิมแต่ละวิชาเทียบโอนได้ครั้งเดียว ดูการกัน usedSourceIds ด้านล่าง)
      if (std.type === "บังคับ") {
        matched = matched.filter(s => {
          const req = getRequiredTypeForSourceSubject(s.name, s.code, s.originType, studentInfo.level);
          return req.allowedType === "บังคับ" && (req.counterpartCode === null || isCodeMatch(req.counterpartCode, std.code));
        });
      }

      if (studentInfo.originCurriculum === OriginCurriculum.NFE_2551) {
        if (std.type !== "บังคับ") {
          // หลักสูตร กศน. 2551: สังคมศึกษา/ศาสนาและหน้าที่พลเมือง (วิชาบังคับ) นำไปเป็นวิชาเลือกไม่ได้
          matched = matched.filter(s => !isNfeCompulsorySocial(s));
        } else if (std.code.startsWith("สค") && matched.length > 0 && !matched.some(s => isReligionCivicsSubject(s.name, s.code))) {
          // ต้องมีรายวิชาศาสนาและหน้าที่พลเมือง จึงเทียบสังคมศึกษา ประวัติศาสตร์ และหน้าที่พลเมืองได้
          ruleNote = "หลักสูตร กศน. 2551: ต้องมีรายวิชาศาสนาและหน้าที่พลเมือง จึงจะเทียบโอนสังคมศึกษา ประวัติศาสตร์ และหน้าที่พลเมืองได้";
          matched = [];
        }
      }

      if (matched.length > 0) {
        if (std.type !== "บังคับ") {
          // ELECTIVE (เลือก)
          // Group matched original subjects by their mappedTo2567Code
          const groups: { [targetCode: string]: OriginSubjectInput[] } = {};
          matched.forEach(s => {
            const target = s.mappedTo2567Code || std.code;
            if (!groups[target]) {
              groups[target] = [];
            }
            groups[target].push(s);
          });

          const selectedAllocations: SourceAllocation[] = [];
          let totalAllocatedCredits = 0;

          Object.entries(groups).forEach(([grpCode, grpSubjects]) => {
            if (grpCode.startsWith("ELECTIVE_")) {
              // Dynamic elective matching and categorization:
              // Sub-group original elective subjects by their categories to find any specific 3.0 credit matches!
              const catSubgroups: Record<string, OriginSubjectInput[]> = {};
              grpSubjects.forEach(s => {
                const cat = detectSubjectCategory(s.name, s.code);
                if (!catSubgroups[cat]) {
                  catSubgroups[cat] = [];
                }
                catSubgroups[cat].push(s);
              });

              // Process each category subgroup
              Object.entries(catSubgroups).forEach(([cat, catSubjects]) => {
                const { chunks, remaining } = chunkSubjectsByThreeCredits(catSubjects);

                chunks.forEach(chunk => {
                  const chunkCreditsSum = chunk.reduce((sum, s) => sum + s.credits, 0);
                  const nameSample = chunk.map(s => s.name || "").join(" ");
                  const electiveMatch = getSpecificElectiveForCategory(cat, studentInfo.level, nameSample, usedElectiveCodes, chunk.map(s => s.name || ""));
                  if (!electiveMatch.code.startsWith("ELECTIVE_")) usedElectiveCodes.add(electiveMatch.code);

                  if (electiveMatch.code) {
                    chunk.forEach(s => {
                      selectedAllocations.push({
                        id: s.id,
                        code: s.code,
                        name: s.name,
                        creditsSelected: s.credits, // FULL original credit value
                        origCredits: (s as any).origCredits || s.credits,
                        grade: s.grade,
                        mappedTo2567Code: electiveMatch.code
                      });
                    });
                    totalAllocatedCredits += chunkCreditsSum;
                  } else {
                    // Cannot match a specific course code - treat as not compared / not transferred
                    failedElectiveGroups.push({
                      code: grpCode,
                      name: `กลุ่มวิชาเลือก (${cat === "OTHER" ? "ทั่วไป" : cat}) ไม่สามารถหาวิชาหลักสูตร สกร. 2567 ที่สอดคล้องตรงกันเจาะจงได้`,
                      currentCredits: chunkCreditsSum
                    });
                  }
                });

                // Handle remaining subjects under this category that could not form a complete 3.0 credit chunk
                const remainingCredits = remaining.reduce((sum, s) => sum + s.credits, 0);
                if (remainingCredits > 0) {
                  failedElectiveGroups.push({
                    code: grpCode,
                    name: `รายวิชาเลือกกลุ่ม (${cat === "OTHER" ? "ทั่วไป" : cat}) ที่เหลือหน่วยกิตไม่พอครบเกณฑ์ 3 หน่วยกิต`,
                    currentCredits: remainingCredits
                  });
                }
              });
            } else {
              // Specific elective matching (e.g. พท220001, สศ220001)
              const { chunks, remaining } = chunkSubjectsByThreeCredits(grpSubjects);

              chunks.forEach(chunk => {
                const chunkCreditsSum = chunk.reduce((sum, s) => sum + s.credits, 0);
                chunk.forEach(s => {
                  selectedAllocations.push({
                    id: s.id,
                    code: s.code,
                    name: s.name,
                    creditsSelected: s.credits, // FULL original credit value
                    origCredits: (s as any).origCredits || s.credits,
                    grade: s.grade,
                    mappedTo2567Code: grpCode
                  });
                });
                totalAllocatedCredits += chunkCreditsSum;
              });

              // Handle remaining
              const remainingCredits = remaining.reduce((sum, s) => sum + s.credits, 0);
              if (remainingCredits > 0) {
                const elSub = electiveSubjects2567.find(el => el.code === grpCode);
                failedElectiveGroups.push({
                  code: grpCode,
                  name: elSub ? elSub.name : `วิชาเลือก (${grpCode})`,
                  currentCredits: remainingCredits
                });
              }
            }
          });

          if (selectedAllocations.length > 0) {
            isTransferred = true;
            matchedCredits = parseFloat(totalAllocatedCredits.toFixed(2));
            matchingSources = selectedAllocations;

            const numericProportions = selectedAllocations.filter(alloc => {
              const g = parseFloat(alloc.grade);
              return !isNaN(g);
            });

            if (numericProportions.length > 0) {
              const sumWeight = numericProportions.reduce((sum, alloc) => {
                return sum + (parseFloat(alloc.grade) * alloc.creditsSelected);
              }, 0);
              const totalCreditsSelected = numericProportions.reduce((sum, alloc) => {
                return sum + alloc.creditsSelected;
              }, 0);

              const avg = totalCreditsSelected > 0 ? sumWeight / totalCreditsSelected : 4.0;
              finalGrade = formatGradeLevel(avg);
            } else {
              finalGrade = "ผ่าน";
            }
          }
        } else {
          // COMPULSORY (บังคับ)
          const totalMatchedCredits = matched.reduce((sum, s) => sum + s.credits, 0);
          if (totalMatchedCredits < std.credits) {
            isTransferred = false;
            matchedCredits = 0;
            matchingSources = [];
            finalGrade = "N/A";
          } else {
            isTransferred = true;

            // Sort: highest grade first, then larger credits
            const sorted = [...matched].sort((a, b) => {
              const wB = getGradeWeight(b.grade);
              const wA = getGradeWeight(a.grade);
              if (wB !== wA) return wB - wA;
              return b.credits - a.credits;
            });

            // Proportional accumulation up to std.credits
            let runningCredits = 0;
            const selectedAllocations: SourceAllocation[] = [];

            for (const item of sorted) {
              const gap = std.credits - runningCredits;
              if (gap <= 0) break;

              const taken = Math.min(item.credits, gap);
              selectedAllocations.push({
                id: item.id,
                code: item.code,
                name: item.name,
                creditsSelected: parseFloat(taken.toFixed(2)),
                origCredits: item.credits,
                grade: item.grade,
                mappedTo2567Code: item.mappedTo2567Code
              });
              runningCredits += taken;
            }

            matchedCredits = std.credits; // Ensure full required credits are set for compulsory targets
            matchingSources = selectedAllocations;

            // Calculate weighted GPA for this standard subject
            const numericProportions = selectedAllocations.filter(alloc => {
              const g = parseFloat(alloc.grade);
              return !isNaN(g);
            });

            if (numericProportions.length > 0) {
              const sumWeight = numericProportions.reduce((sum, alloc) => {
                return sum + (parseFloat(alloc.grade) * alloc.creditsSelected);
              }, 0);
              const totalCreditsSelected = numericProportions.reduce((sum, alloc) => {
                return sum + alloc.creditsSelected;
              }, 0);

              const avg = totalCreditsSelected > 0 ? sumWeight / totalCreditsSelected : 4.0;
              finalGrade = formatGradeLevel(avg);
            } else {
              finalGrade = "ผ่าน";
            }
          }
        }
      }
    } else if (studentInfo.originCurriculum === OriginCurriculum.CONTINUING_ED) {
      const matched = srcContinuingEd.filter(c => isCodeMatch(c.mappedTo2567Code, std.code));
      if (matched.length > 0) {
        const totalMatchedCredits = matched.reduce((sum, item) => sum + Math.floor(item.hours / 40), 0);
        if (std.type === "บังคับ" && totalMatchedCredits < std.credits) {
          isTransferred = false;
          matchedCredits = 0;
          matchingSources = [];
          finalGrade = "N/A";
        } else {
          isTransferred = true;
          // Sort by hours descending (highest hours first)
          const sorted = [...matched].sort((a, b) => b.hours - a.hours);

          let runningCredits = 0;
          const selectedAllocations: SourceAllocation[] = [];

          for (const item of sorted) {
            const gap = std.credits - runningCredits;
            if (gap <= 0) break;

            const itemCredits = Math.floor(item.hours / 40);
            if (itemCredits <= 0) continue;

            const taken = Math.min(itemCredits, gap);
            selectedAllocations.push({
              id: item.id,
              code: "-",
              name: `${item.courseName} (${item.hours} ชม.)`,
              creditsSelected: taken,
              origCredits: itemCredits,
              grade: "ผ่าน",
              mappedTo2567Code: item.mappedTo2567Code
            });
            runningCredits += taken;
          }

          matchedCredits = std.type === "บังคับ" ? std.credits : Math.min(runningCredits, std.credits);
          matchingSources = selectedAllocations;
          finalGrade = "ผ่าน";
        }
      }
    } else if (studentInfo.originCurriculum === OriginCurriculum.FOREIGN_CURRICULUM) {
      const mappedHere = srcForeignCreds.filter(f => isCodeMatch(f.mappedTo2567Code, std.code));
      const restricted = isForeignRestrictedTarget(std);
      if (restricted && mappedHere.length > 0) {
        ruleNote = "ไม่อนุญาตให้เทียบโอนจากหลักสูตรต่างประเทศ: รายวิชาภาษาไทย และสังคมศึกษา ประวัติศาสตร์ และหน้าที่พลเมือง ต้องลงทะเบียนเรียน (แนวทางฯ บทที่ 4)";
      }
      const matched = restricted ? [] : mappedHere;
      if (matched.length > 0) {
        const totalMatchedCredits = matched.reduce((sum, item) => sum + item.credits, 0);
        if (std.type === "บังคับ" && totalMatchedCredits < std.credits) {
          isTransferred = false;
          matchedCredits = 0;
          matchingSources = [];
          finalGrade = "N/A";
        } else {
          isTransferred = true;
          const sorted = [...matched].sort((a, b) => b.credits - a.credits);

          let runningCredits = 0;
          const selectedAllocations: SourceAllocation[] = [];

          for (const item of sorted) {
            const gap = std.credits - runningCredits;
            if (gap <= 0) break;

            const taken = Math.min(item.credits, gap);
            selectedAllocations.push({
              id: item.id,
              code: "-",
              name: item.subjectName,
              creditsSelected: taken,
              origCredits: item.credits,
              grade: item.foreignGrade,
              mappedTo2567Code: item.mappedTo2567Code
            });
            runningCredits += taken;
          }

          matchedCredits = std.type === "บังคับ" ? std.credits : Math.min(runningCredits, std.credits);
          matchingSources = selectedAllocations;
          finalGrade = "ผ่าน";
        }
      }
    } else if (studentInfo.originCurriculum === OriginCurriculum.KNOWLEDGE_EXPERIENCE) {
      // แนวทางฯ บทที่ 5: ประเมินได้เฉพาะรายวิชาหลักของแต่ละสาระ (วิชาบังคับ) และต้องผ่านการประเมิน
      const mappedHere = srcExperiences.filter(e => isCodeMatch(e.mappedTo2567Code, std.code));
      if (std.type !== "บังคับ" && mappedHere.length > 0) {
        ruleNote = "การประเมินความรู้และประสบการณ์ทำได้เฉพาะรายวิชาบังคับของแต่ละสาระการเรียนรู้ ไม่สามารถประเมินเข้ารายวิชาเลือกได้ (แนวทางฯ บทที่ 5)";
      }
      const matched = std.type === "บังคับ"
        ? mappedHere.filter(e => !isInvalidGrade(e.evaluationResult))
        : [];
      if (matched.length > 0) {
        isTransferred = true;
        
        // Sum up the credits or allocate std.credits directly
        matchedCredits = std.credits;
        matchingSources = matched.map(m => ({
          id: m.id,
          code: "-",
          name: `${m.experienceDetail} (หลักฐาน: ${m.evidence})`,
          creditsSelected: std.credits,
          origCredits: std.credits,
          grade: m.evaluationResult,
          mappedTo2567Code: m.mappedTo2567Code
        }));

        const grades = matched.map(m => m.evaluationResult);
        if (grades.includes("ผ่าน")) {
          finalGrade = "ผ่าน";
        } else {
          // If evaluated numerically, keep the first one or average
          const numGrades = grades.map(g => parseFloat(g)).filter(g => !isNaN(g));
          if (numGrades.length > 0) {
            const sum = numGrades.reduce((s, g) => s + g, 0);
            finalGrade = formatGradeLevel(sum / numGrades.length);
          } else {
            finalGrade = grades[0] || "ผ่าน";
          }
        }
      }
    }

    return {
      std,
      isTransferred,
      matchedCredits: matchedCredits,
      allocatedCredits: 0, // Assigned in global pool below
      finalGrade,
      matchingSources,
      isOverQuota: false,
      ruleNote
    };
  };

  const restrictedForeignCodes = new Set(
    standardList.filter(isForeignRestrictedTarget).map(s => s.code)
  );

  // วิชาเดิม/หลักฐานแต่ละรายการเทียบโอนได้เพียงครั้งเดียว: เมื่อถูกนำไปเทียบโอนเป็นวิชาใดแล้ว
  // (แม้ใช้หน่วยกิตเพียงบางส่วน) จะไม่ถูกนำไปเทียบโอนซ้ำกับวิชา 2567 อื่นอีก
  // รหัสที่มี _split_ คือสำเนาที่ถูกแบ่งทีละ 3 หน่วยกิต ให้ถือเป็นวิชาเดิมเดียวกัน
  const markSourcesUsed = (res: ComputedSubjectResult) => {
    if (!res.isTransferred) return;
    res.matchingSources.forEach(src => {
      if (src.id) usedSourceIds.add(src.id.replace(/_split_.*$/, ""));
    });
  };

  // 1. Split into Compulsory (บังคับ) and Elective (เลือก)
  const compulsoryStandards = standardList.filter(s => s.type === "บังคับ");
  const electiveStandards = standardList.filter(s => s.type !== "บังคับ");

  // Step A: First compute compulsory subjects, taking any filtered allowed subjects
  const compulsoryResults = compulsoryStandards.map(std => {
    const res = processSubject(
      std,
      allowedOriginSubjects,
      allowedContinuingEd,
      allowedForeignCreds,
      allowedExperiences
    );
    markSourcesUsed(res);
    return res;
  });

  // Step B: Now compute elective subjects, strictly removing already matched/consumed source IDs
  const electiveResults = electiveStandards.map(std => {
    const filteredOriginSubjects = allowedOriginSubjects.filter(s => !usedSourceIds.has(s.id));
    const filteredContinuingEd = allowedContinuingEd.filter(s => !usedSourceIds.has(s.id));
    // วิชาที่จับคู่ไว้กับภาษาไทย/สังคมศึกษาฯ ซึ่งเทียบจากต่างประเทศไม่ได้ ต้องไม่ไหลไปนับเป็นวิชาเลือกแทน
    const filteredForeignCreds = allowedForeignCreds.filter(
      s => !usedSourceIds.has(s.id) && !restrictedForeignCodes.has(s.mappedTo2567Code)
    );
    const filteredExperiences = allowedExperiences.filter(s => !usedSourceIds.has(s.id));

    const res = processSubject(
      std,
      filteredOriginSubjects,
      filteredContinuingEd,
      filteredForeignCreds,
      filteredExperiences
    );
    markSourcesUsed(res);
    return res;
  });

  // Re-combine in original standardList order to maintain correct rendering in view tables
  const rawResults: ComputedSubjectResult[] = standardList.map(std => {
    if (std.type === "บังคับ") {
      return compulsoryResults.find(r => r.std.code === std.code)!;
    } else {
      return electiveResults.find(r => r.std.code === std.code)!;
    }
  });

  const untrimmedTotalCredits = rawResults
    .filter(r => r.isTransferred)
    .reduce((sum, r) => sum + r.matchedCredits, 0);

  // 2. Second Pass: Global Quota limiting (e.g. max 57, 42, 36)
  // Sort priority: Compulsory first, Elective second.
  // Within same type, higher average grade first, then higher credits.
  const matchedList = rawResults.filter(r => r.isTransferred);
  const untransferredList = rawResults.filter(r => !r.isTransferred);

  const sortedMatched = [...matchedList].sort((a, b) => {
    // 1. Compulsory (บังคับ) wins over Elective (เลือก)
    const isCompA = a.std.type === "บังคับ";
    const isCompB = b.std.type === "บังคับ";
    if (isCompA && !isCompB) return -1;
    if (!isCompA && isCompB) return 1;

    // 2. Higher average grade wins
    const valA = getGradeWeight(a.finalGrade);
    const valB = getGradeWeight(b.finalGrade);
    if (valB !== valA) return valB - valA;

    // 3. Higher credits wins
    return b.matchedCredits - a.matchedCredits;
  });

  let runningGlobalCredits = 0;
  const processedResults: ComputedSubjectResult[] = [];

  for (const item of sortedMatched) {
    const spaceLeft = maxAllowable - runningGlobalCredits;

    if (spaceLeft <= 0) {
      // Over budget - this subject must be excluded
      processedResults.push({
        ...item,
        isTransferred: false,
        allocatedCredits: 0,
        isOverQuota: true,
        quotaNotes: `เกินโควตาเทียบโอนสูงสุด (${maxAllowable} นก.)`
      });
    } else if (item.matchedCredits <= spaceLeft) {
      // Fits perfectly
      runningGlobalCredits += item.matchedCredits;
      processedResults.push({
        ...item,
        allocatedCredits: item.matchedCredits,
        isOverQuota: false
      });
    } else {
      // Fits partially - trim to exact maximum capacity
      const fractionalAllocation = parseFloat(spaceLeft.toFixed(2));
      runningGlobalCredits += fractionalAllocation;
      
      // We can keep it transferred but with restricted allocated credits!
      processedResults.push({
        ...item,
        allocatedCredits: fractionalAllocation,
        isOverQuota: true,
        quotaNotes: `ตัดลดยอดจัดสรรให้ไม่เกินลิมิตคงเหลือ ${fractionalAllocation} นก.`
      });
    }
  }

  // Combine back in standardList order to maintain consistency of the visual tables
  const finalResults: ComputedSubjectResult[] = standardList.map(std => {
    const processed = processedResults.find(r => r.std.code === std.code);
    if (processed) {
      return processed;
    }
    // For non-transferred ones
    const unMatched = untransferredList.find(r => r.std.code === std.code);
    return unMatched || {
      std,
      isTransferred: false,
      matchedCredits: 0,
      allocatedCredits: 0,
      finalGrade: "N/A",
      matchingSources: [],
      isOverQuota: false
    };
  });

  const totalTransferredCredits = parseFloat(runningGlobalCredits.toFixed(2));
  const isLimitCapped = untrimmedTotalCredits > maxAllowable;

  // 3. GPA Calculation - computed ONLY from NUMERIC allocated subjects in the quota
  let sumWeight = 0;
  let totalCreditsForGPA = 0;

  processedResults.forEach(r => {
    if (r.allocatedCredits > 0) {
      const g = parseFloat(r.finalGrade);
      if (!isNaN(g)) {
        sumWeight += g * r.allocatedCredits;
        totalCreditsForGPA += r.allocatedCredits;
      }
    }
  });

  const gpaStr = totalCreditsForGPA > 0 ? (sumWeight / totalCreditsForGPA).toFixed(2) : "ผ่าน";

  return {
    results: finalResults,
    totalTransferredCredits,
    untrimmedTotalCredits,
    gpa: gpaStr,
    isLimitCapped,
    maxAllowable,
    failedElectiveGroups
  };
}
