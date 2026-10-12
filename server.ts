import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import OpenAI from "openai";
import { findDecisionQuestionSet } from "./src/data/decisionQuestions";
import { courseMatchQuestions, COURSE_MATCH_VERSION, scoreToPercent, type CourseMatchRequest } from "./src/data/courseMatch";

// โหลดคีย์จาก .env.local ก่อน (ตามคู่มือติดตั้ง) แล้วค่อยเสริมด้วย .env
dotenv.config({ path: [".env.local", ".env"] });

// Helper for generating high-fidelity simulated matching and advices
function getSimulatedResponse(
  studentInfo: any,
  originSubjects: any[],
  continuingEd: any[],
  foreignCreds: any[],
  experiences: any[],
  standardList: any[]
) {
  const mappingChecks: any[] = [];
  const electiveItem = standardList?.find((s: any) => s.type === "เลือก" || s.code?.startsWith("ELECTIVE_"));
  const levelElectiveCode = electiveItem ? electiveItem.code : "ELECTIVE_SEN";
  
  if (originSubjects && originSubjects.length > 0) {
    originSubjects.forEach((sub: any) => {
      const mappedCode = sub.mappedTo2567Code;
      const targetSubject = standardList?.find((s: any) => s.code === mappedCode);
      const targetName = targetSubject ? targetSubject.name : "วิชาเลือกเสรีสะสม";
      
      mappingChecks.push({
        sourceSubject: `${sub.code} ${sub.name} (หน่วยกิต ${sub.credits}, เกรด ${sub.grade})`,
        targetSubject: `${mappedCode || levelElectiveCode} ${targetName}`,
        status: sub.grade === "0" || sub.grade === "ร" || sub.grade === "มส" 
          ? "ควรเรียกตรวจหลักฐานการเรียนเพิ่ม" 
          : "สอดคล้องสมบูรณ์",
        comment: sub.grade === "0" || sub.grade === "ร" || sub.grade === "มส"
          ? `วิชาเดิมมีผลการเรียนไม่สมบูรณ์ (${sub.grade}) แนะนำให้นักศึกษาสอบแก้ตัวหรือเข้ารับการประเมินความรู้เพิ่มเติม`
          : `เนื้อหาวิชาตรงตามเกณฑ์และสมรรถนะมาตรฐานพิจารณาโอนวิชา สกร. 2567 ชนิดหน่วยกิตสมมูลตรงเนื้อหาเทียบ`
      });
    });
  }

  if (continuingEd && continuingEd.length > 0) {
    continuingEd.forEach((ce: any) => {
      const hours = ce.hours || 0;
      const computedCredits = Math.floor(hours / 40);
      mappingChecks.push({
        sourceSubject: `${ce.courseName} (${hours} ชม. ผู้จัด: ${ce.organizer || "หน่วยอบรม"})`,
        targetSubject: `${ce.mappedTo2567Code || levelElectiveCode} วิชาเลือกหลักสูตร`,
        status: computedCredits >= 1 ? "สอดคล้องสมบูรณ์" : "แนะปรับเปลี่ยนเป็นวิชาเลือกด้านอื่น",
        comment: computedCredits >= 1 
          ? `ชั่วโมงเรียนอบรม ${hours} ชั่วโมง สามารถเทียบแทนวิชาเลือกเป้าหมายได้ ${computedCredits} หน่วยกิต ตามเกณฑ์ชั่วโมงสะสมหลักสูตร`
          : `เกณฑ์จำนวนชั่วโมงประกอบยังต่ำกว่า 40 ชั่วโมง เพื่อรับการเทียบ 1 หน่วยกิต แนะนำให้นำแฟ้มสะสมผลงานมารวมประกอบ`
      });
    });
  }

  if (foreignCreds && foreignCreds.length > 0) {
    foreignCreds.forEach((fc: any) => {
      mappingChecks.push({
        sourceSubject: `${fc.subjectName} (เกรดต่างประเทศ ${fc.foreignGrade}, ${fc.credits} หน่วย)`,
        targetSubject: `${fc.mappedTo2567Code || "พค310001"} รหัสวิชาโอนสิบตรี`,
        status: "สอดคล้องสมบูรณ์",
        comment: `โครงสร้างของวิชาต่างประเทศมีความคู่เคียงและระดับลึกซึ้งเชิงวิชาการสอดคล้องกับคุณลักษณะหน่วยกิตระดับชั้นเป้าหมาย`
      });
    });
  }

  if (experiences && experiences.length > 0) {
    experiences.forEach((exp: any) => {
      mappingChecks.push({
        sourceSubject: `${exp.experienceDetail} (หลักฐาน: ${exp.evidence || "ไม่ระบุ"})`,
        targetSubject: `${exp.mappedTo2567Code || "กอ310001"} กลุ่มทักษะวิชาชีพ`,
        status: exp.evaluationResult === "ผ่าน" || parseFloat(exp.evaluationResult) >= 2 ? "สอดคล้องสมบูรณ์" : "ควรเรียกตรวจหลักฐานการเรียนเพิ่ม",
        comment: `แฟ้มหลักฐานสะสมประจักษ์ชัดเจน ประกอบผลสอบสัมภาษณ์/ทฤษฎีตามมาตรฐานคณะกรรมการสลักหลังเทียบได้หน่วยกิต`
      });
    });
  }

  if (mappingChecks.length === 0) {
    mappingChecks.push({
      sourceSubject: "ไม่พบข้อมูลวิชาที่ยื่นเทียบเคียง",
      targetSubject: "รอป้อนรายวิชา",
      status: "ควรเรียกตรวจหลักฐานการเรียนเพิ่ม",
      comment: "นักศึกษายังไม่ได้ระบุความชัดเจนของประวัติวิชา ขอความกรุณากรอกในขั้นตอนที่ 2 เพื่อจับคู่"
    });
  }

  const matchPct = originSubjects && originSubjects.length > 0 ? 95 : 80;
  const occupation = studentInfo?.occupation || "อาชีพทั่วไปและรับจ้างทั่วไป";
  
  let recommendedJobCode = "กอ310002";
  let recommendedJobName = "การเป็นผู้ประกอบการวิชาชีพใหม่";
  let recommendedJobBenefit = "เสริมทักษะการตั้งราคาสินค้าเบื้องต้น การจัดบัญชีครัวเรือน และช่องทางประกอบตลาดออนไลน์ให้ประสบความสำเร็จ";

  if (occupation.includes("ซ่อม") || occupation.includes("ช่าง") || occupation.includes("งาน") || occupation.includes("เครื่องยนต์") || occupation.includes("โรงงาน")) {
    recommendedJobCode = "กอ310005";
    recommendedJobName = "ช่างซ่อมบำรุงในอุตสาหกรรมยุคใหม่";
    recommendedJobBenefit = "ปูพื้นเรื่องระบบความปลอดภัยในเวิร์กชอปก้าวหน้า การใช้ระบบพลังงานทางเลือก เช่น โซลาร์เซลล์ ควบคู่กับการควบคุมความเสียรูปวัสดุ";
  } else if (occupation.includes("เกษตร") || occupation.includes("ทำสวน") || occupation.includes("ฟาร์ม") || occupation.includes("นา")) {
    recommendedJobCode = "กศ310001";
    recommendedJobName = "เกษตรอินทรีย์เทคโนโลยีชีวภาพ";
    recommendedJobBenefit = "เรียนรู้ทักษะเพิ่มมูลค่าพืชผลการเกษตรผ่านปุ๋ยชีวภาพขั้นสูง และกระประเมินตรวจวิเคราะห์สารอาหารดินดิจิทัล";
  } else if (occupation.includes("ออนไลน์") || occupation.includes("ค้าขาย") || occupation.includes("ตลาด")) {
    recommendedJobCode = "กอ310003";
    recommendedJobName = "สถาปัตยกรรมสื่อการขายและการทำคอนเทนต์ดิจิทัล";
    recommendedJobBenefit = "พัฒนาทักษะการเล่าเรื่องเพื่อสร้างภาพจำในแพลตฟอร์มโซเชียล การใช้วิดีโอสั้นช่วยผลักดันสินค้าชุมชนสู่ลูกค้าสากล";
  }

  // เพดานเทียบโอนตามแนวทางฯ: ประถม 36 / ม.ต้น 42 / ม.ปลาย 57 นก.
  let maxCredForLevel = 57;
  if (studentInfo?.level?.includes("มัธยมศึกษาตอนต้น") || studentInfo?.level?.includes("JUNIOR")) maxCredForLevel = 42;
  if (studentInfo?.level?.includes("ประถมศึกษา") || studentInfo?.level?.includes("PRIMARY")) maxCredForLevel = 36;

  return {
    rating: "มีความเป็นไปได้สูง",
    matchPercentage: matchPct,
    summary: `วิเคราะห์ข้อมูลผลคะแนนรายวิชาและประวัติเบื้องต้นของนักศึกษา ${studentInfo?.name || "ที่ยื่นคำขอ"} หลักสูตรเดิมที่คุณนำมาใช้ในการขอยกฐานฐานะสอดคล้องตามกรอบหลักสูตร สกร. 2567 และเป็นไปตามกฎกระทรวงของคุรุสภา มีทักษะภาคกิจกรรมฝึกอบรมสอดคล้องโดยตรง ตลอดจนประสบการณ์ทำงานมีเอกสารชี้วัดความชำนาญระดับสูงที่เป็นประโยชน์ต่อนายทะเบียนปูพื้นฐานการเทียบโอนอย่างรวดเร็ว`,
    mappingChecks,
    occupationalBonus: {
      title: `คำแนะนำเสริมความเข้ากันได้กับวิชาชีพ (อาชีพ: ${occupation})`,
      advice: `ประสบการณ์ทางสายงานของคุณสอดรับกับแนวคิดเชิงกลุ่มงานฝีมือเชิงเทคนิคและภาคบริการ การเรียนรู้ต่อยอดด้วยทักษะวิชาเฉพาะของ สกร. 2567 จะช่วยพัฒนาสมรรถภาพของตัวผู้เรียนได้อย่างมีระบบ และอำนวยประโยชน์ในการเลื่อนตำแหน่งหรือต่อยอดเปิดห้างร้านวิชาชีพของตนเองได้ด้วยความโปร่งใสในพยานเอกสารสิทธิ์`,
      recommendedSubjects: [
        {
          code: recommendedJobCode,
          name: recommendedJobName,
          benefit: recommendedJobBenefit
        },
        {
          code: "พต310002",
          name: "การสื่อสารภาษาอังกฤษเชิงธุรกิจขั้นพื้นฐาน",
          benefit: "ปรับมุมมองให้เข้าใจศัพท์เฉพาะด้านธุรกิจหรือคู่มือเทคโนโลยีสมัยใหม่ สะดวกต่อการพัฒนาประสิทธิผลอาชีพในยุคโลกาภิวัตน์"
        }
      ]
    },
    regulationCompliance: `ตามกฎระเบียบ สกร. สำหรับวุฒิระดับการศึกษา ${studentInfo?.level || "ที่เลือกยื่น"} ขีดจำกัดรวมหน่วยกิตเทียบโอนจะต้องไม่เกิน ${maxCredForLevel} หน่วยกิต เพื่อให้นักศึกษาได้สะสมวิชาเพิ่มเติมของทาง สกร. ในส่วนที่เหลือ สำหรับประเด็นเกรดเทียบโอน คณะอนุกรรมการพิจารณาตรวจสอบสิทธิ์มีความคิดเห็นว่า ข้อมูลหน่วยกิตและเอกสารรับรองมีความถูกต้องสมบูรณ์และโปร่งใส`
  };
}

// Helper for generating high-fidelity simulated parsed course list
function getSimulatedParsedResponse(
  originCurriculum: string,
  standardList: any[],
  text?: string
) {
  const lowercaseText = text ? text.toLowerCase() : "";
  const mockItems: any[] = [];
  
  const standardCodes = standardList?.map(s => s.code) || [];
  const getRandCode = (idx: number) => standardCodes[idx % standardCodes.length] || "ELECTIVE_SEN";

  // Detect education level from standard subjects
  let level = "Senior High";
  const hasSenior = standardCodes.includes("พท310001");
  const hasJunior = standardCodes.includes("พท210001");
  const hasPrimary = standardCodes.includes("พท110001");
  if (hasPrimary) level = "Primary";
  else if (hasJunior) level = "Junior High";

  let levelPrefix = "3";
  let thaiCode = "พท310001";
  let mathCode = "พค310001";
  let sciCode = "พว310001";
  let electiveCode = "ELECTIVE_SEN";

  if (level === "Primary") {
    levelPrefix = "1";
    thaiCode = "พท110001";
    mathCode = "พค110001";
    sciCode = "พว110001";
    electiveCode = "ELECTIVE_PRI";
  } else if (level === "Junior High") {
    levelPrefix = "2";
    thaiCode = "พท210001";
    mathCode = "พค210001";
    sciCode = "พว210001";
    electiveCode = "ELECTIVE_JUN";
  }

  if (
    originCurriculum === "หลักสูตรแกนกลางฯ 2551" ||
    originCurriculum === "หลักสูตรนอกระบบ/สกร.(กศน.) 2551" ||
    originCurriculum === "หลักสูตร ปวช. 2562"
  ) {
    const subjectsToCreate = [
      { code: `ท${levelPrefix}1101`, name: "ภาษาไทยพื้นฐาน 1 (สาระแกนกลาง)", credits: 1.0, grade: "4", mappedTo: thaiCode, originType: "บังคับ" },
      { code: `ค${levelPrefix}1101`, name: "คณิตศาสตร์ประยุกต์และทักษะคำนวณ", credits: 1.0, grade: "3.5", mappedTo: mathCode, originType: "บังคับ" },
      { code: `ว${levelPrefix}1102`, name: "วิทยาศาสตร์สิ่งแวดล้อมเพื่อเทคโนโลยี", credits: 1.5, grade: "3", mappedTo: sciCode, originType: "บังคับ" },
      { code: `อ${levelPrefix}1101`, name: "ภาษาอังกฤษเพื่อการสื่อสารระดับสากล", credits: 1.0, grade: "4", mappedTo: electiveCode, originType: "เลือก/เพิ่มเติม" }
    ];

    subjectsToCreate.map((sub, i) => {
      mockItems.push({
        id: `parsed-sim-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
        code: sub.code,
        name: sub.name,
        credits: sub.credits,
        grade: sub.grade,
        mappedTo2567Code: sub.mappedTo,
        originType: sub.originType
      });
    });
  } else if (originCurriculum === "การศึกษาต่อเนื่อง (หลักสูตรระยะสั้น)") {
    const courses = [
      { courseName: "หลักสูตรฝึกอาชีพการเขียนเว็บและทำอีคอมเมิร์ซขั้นสูง", hours: 80, organizer: "กรมพัฒนาฝีมือแรงงานภาค 1", mappedIdx: 1 },
      { courseName: "โครงการสัมมนาความเป็นผู้นำเกษตรกรและนวัตกรรมชุมชน", hours: 40, organizer: "สำนักงานเกษตรอำเภอศรอุดม", mappedIdx: 2 }
    ];

    courses.map((c, i) => {
      mockItems.push({
        id: `parsed-sim-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
        courseName: c.courseName,
        hours: c.hours,
        organizer: c.organizer,
        mappedTo2567Code: "ELECTIVE_SEN"
      });
    });
  } else if (originCurriculum === "หลักสูตรต่างประเทศ (เช่น GED, IGCSE)") {
    const creds = [
      { subjectName: "Global Algebra and Science Standard", foreignGrade: "A", credits: 3.5, mappedIdx: 1 },
      { subjectName: "Introduction to Business English GCSE", foreignGrade: "B+", credits: 3.0, mappedIdx: 3 }
    ];

    creds.map((c, i) => {
      mockItems.push({
        id: `parsed-sim-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
        subjectName: c.subjectName,
        foreignGrade: c.foreignGrade,
        credits: c.credits,
        mappedTo2567Code: getRandCode(c.mappedIdx)
      });
    });
  } else {
    // KNOWLEDGE_EXPERIENCE
    const exps = [
      { experienceDetail: "ทำงานด้านการออกแบบและซ่อมบำรุงแผงวงจรควบคุมอุตสาหกรรม 4 ปี", evidence: "หนังสือรับรองการทำงานบริษัทเทคโนโลยีจำกัด + ใบรับรองผลการทดสอบฝีมือ", mappedIdx: 2 },
      { experienceDetail: "ประเมินหลักสูตรผู้จัดการฟาร์มไก่ดิจิทัลชุมชนเพื่อส่วนรวม", evidence: "แฟ้มภาพถ่าย + เกียรติบัตรรับรองจากนายอำเภอ", mappedIdx: 4 }
    ];

    exps.map((e, i) => {
      mockItems.push({
        id: `parsed-sim-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
        experienceDetail: e.experienceDetail,
        evidence: e.evidence,
        mappedTo2567Code: getRandCode(e.mappedIdx),
        evaluationResult: "ผ่าน"
      });
    });
  }

  return mockItems;
}

// Robust helper to automatically repair malformed or truncated JSON from LLMs
function robustJSONRepair(text: string): string {
  let cleaned = text.trim();
  
  // Find first { or [
  const idxObject = cleaned.indexOf("{");
  const idxArray = cleaned.indexOf("[");
  
  if (idxObject === -1 && idxArray === -1) {
    return cleaned;
  }
  
  let firstIndex = -1;
  let startChar = "";
  if (idxObject !== -1 && idxArray !== -1) {
    if (idxObject < idxArray) {
      firstIndex = idxObject;
      startChar = "{";
    } else {
      firstIndex = idxArray;
      startChar = "[";
    }
  } else if (idxObject !== -1) {
    firstIndex = idxObject;
    startChar = "{";
  } else {
    firstIndex = idxArray;
    startChar = "[";
  }
  
  let candidate = cleaned.substring(firstIndex);
  
  let repaired = "";
  let inString = false;
  let escapeNext = false;
  const stack: string[] = [];
  
  for (let i = 0; i < candidate.length; i++) {
    const char = candidate[i];
    
    if (escapeNext) {
      repaired += char;
      escapeNext = false;
      continue;
    }
    
    if (char === "\\") {
      repaired += char;
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      repaired += char;
      continue;
    }
    
    if (inString) {
      // Escape raw control characters inside a JSON string
      if (char === "\n") {
        repaired += "\\n";
      } else if (char === "\r") {
        repaired += "\\r";
      } else if (char === "\t") {
        repaired += "\\t";
      } else {
        repaired += char;
      }
    } else {
      // Outside string
      repaired += char;
      if (char === "{") stack.push("}");
      if (char === "[") stack.push("]");
      if (char === "}" || char === "]") {
        if (stack.length > 0 && stack[stack.length - 1] === char) {
          stack.pop();
        } else {
          const lastIdx = stack.lastIndexOf(char === "}" ? "}" : "]");
          if (lastIdx !== -1) {
            stack.splice(lastIdx, 1);
          }
        }
      }
    }
  }
  
  // If we ended inside a string, close it
  if (inString) {
    if (repaired.endsWith("\\")) {
      repaired = repaired.slice(0, -1);
    }
    repaired += '"';
  }
  
  repaired = repaired.trim();
  
  // Pop any trailing open elements in reverse order and close them
  while (stack.length > 0) {
    const expectedClose = stack.pop();
    
    repaired = repaired.trim();
    repaired = repaired.replace(/,\s*$/, "");
    repaired = repaired.replace(/:\s*$/, "");
    
    // Clean up truncated trailing keys
    repaired = repaired.replace(/,\s*"[^"]*"\s*$/, "");
    repaired = repaired.replace(/\{\s*"[^"]*"\s*$/, "{");
    
    repaired += expectedClose;
  }
  
  // Final clean up for trailing empty structures caused by truncation
  repaired = repaired.trim();
  repaired = repaired.replace(/,\s*\{\s*\}\s*$/, "");
  repaired = repaired.replace(/,\s*\[\s*\]\s*$/, "");
  
  return repaired;
}

// เกรดจากใบระเบียนบางแบบเป็น "3(1)" (ตัวเลขในวงเล็บคือจำนวนครั้ง/ภาคเรียน ไม่ใช่เกรด) หรือ "3.0"
// แปลงให้เหลือค่าเกรดที่ตรงกับตัวเลือกของระบบ ("3(1)" -> "3", "3.0" -> "3")
function normalizeParsedGrade(g: any): any {
  if (typeof g !== "string") return g;
  const t = g.trim();
  const withCount = t.match(/^([0-9]+(?:\.[0-9]+)?)\s*\(\s*[0-9]+\s*\)$/);
  if (withCount) return String(parseFloat(withCount[1]));
  if (/^[0-9]+(\.[0-9]+)?$/.test(t)) return String(parseFloat(t));
  return t;
}

// Robust helper to sanitize and parse JSON response from LLMs, handling markdown wrapping and truncation
function cleanAndParseJSON(text: string): any {
  let cleaned = text.trim();
  
  // Strip any markdown codeblock ticks
  cleaned = cleaned.replace(/```json/gi, "");
  cleaned = cleaned.replace(/```/gi, "");
  cleaned = cleaned.trim();

  // Try parsing directly
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("Direct JSON.parse failed, trying robust extraction/repair:", e);
  }

  // Use robust repair
  const repairedText = robustJSONRepair(cleaned);
  try {
    return JSON.parse(repairedText);
  } catch (error) {
    console.warn("Robust repaired JSON.parse failed, attempting chunk extractor...", error);
  }

  // Ultimate fallback: Match individual JSON objects using regex
  const objectRegex = /\{[^{}]+\}/g;
  const matches = cleaned.match(objectRegex);
  if (matches) {
    const fallbackList: any[] = [];
    for (const match of matches) {
      try {
        let fixedMatch = match.trim();
        if (!fixedMatch.startsWith("{")) fixedMatch = "{" + fixedMatch;
        if (!fixedMatch.endsWith("}")) fixedMatch = fixedMatch + "}";
        fallbackList.push(JSON.parse(fixedMatch));
      } catch (matchErr) {
        // ignore malformed single items
      }
    }
    if (fallbackList.length > 0) {
      return fallbackList;
    }
  }

  throw new Error("ไม่สามารถแปลงข้อมูลที่ส่งกลับจาก AI เป็นรูปแบบที่ต้องการได้ (JSON Parse Failure)");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON parsing middleware with increased limits for larger payloads
  // ไฟล์ PDF/รูปภาพใบระเบียนถูกส่งมาเป็น base64 จึงต้องเพิ่มขนาดที่รับได้
  app.use(express.json({ limit: "30mb" }));

  // Typhoon เป็นผู้ให้บริการ AI เพียงรายเดียว (OCR อ่านภาพ/PDF + โมเดลภาษา)
  const typhoonApiKey = process.env.TYPHOON_API_KEY;

  const openai = new OpenAI({
    apiKey: typhoonApiKey || "MY_TYPHOON_API_KEY",
    baseURL: process.env.TYPHOON_BASE_URL || "https://api.opentyphoon.ai/v1",
  });

  // ---- ตัวช่วยตัดสินใจ (OpenRouter Decisions) แล้วส่งผลให้ Typhoon เขียนสรุป ----
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  const decisionsUrl = process.env.OPENROUTER_DECISIONS_URL || "https://openrouter.ai/api/alpha/decisions";
  const decisionsModel = process.env.OPENROUTER_DECISIONS_MODEL || "perplexity/pplx-decider-v1.1-27b";
  const typhoonWriterModel = process.env.TYPHOON_MODEL || "typhoon-v2.5-30b-a3b-instruct";
  const hasRealTyphoonKey =
    !!typhoonApiKey && typhoonApiKey.trim() !== "" && typhoonApiKey !== "MY_TYPHOON_API_KEY";

  app.post("/api/decisions/analyze", async (req, res) => {
    try {
      const { state, context, questionSetId, questions: customQuestions, model, writeWithTyphoon = true } = req.body || {};

      const isStateBlank =
        state === undefined ||
        state === null ||
        (typeof state === "string" && state.trim() === "") ||
        (Array.isArray(state) && state.length === 0);

      if (isStateBlank) {
        return res.status(400).json({ error: "โปรดระบุข้อความหรือบริบทของเคส (state) ก่อนส่งให้ระบบตัดสินใจ" });
      }

      const questionSet = findDecisionQuestionSet(questionSetId);
      const questions =
        customQuestions && typeof customQuestions === "object" && Object.keys(customQuestions).length > 0
          ? customQuestions
          : questionSet.questions;
      const payloadModel = model || decisionsModel;

      if (!openRouterApiKey || openRouterApiKey.trim() === "") {
        return res.status(400).json({
          error: "ยังไม่ได้ตั้งค่า OPENROUTER_API_KEY ระบบจึงเรียกตัวช่วยตัดสินใจไม่ได้",
          hint: "เพิ่มบรรทัด OPENROUTER_API_KEY=คีย์ของท่าน ในไฟล์ .env.local แล้วเริ่มเซิร์ฟเวอร์ใหม่",
        });
      }

      console.log(`Calling OpenRouter Decisions (${payloadModel})...`);
      const decisionResponse = await fetch(decisionsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openRouterApiKey}`,
          // ค่าของ HTTP header ต้องเป็น ASCII เท่านั้น จึงใช้ชื่อแอปภาษาอังกฤษ
          "X-Title": "SKR Transfer Credit 2567",
        },
        body: JSON.stringify({ model: payloadModel, state, questions }),
      });

      const decisionBody = await decisionResponse.text();

      if (!decisionResponse.ok) {
        console.error(`Decisions API error ${decisionResponse.status}:`, decisionBody);
        return res.status(502).json({
          error: `ตัวช่วยตัดสินใจตอบกลับด้วยรหัส ${decisionResponse.status}`,
          detail: decisionBody.slice(0, 600),
          hint: `ตรวจสอบสิทธิ์ของคีย์ และรหัสโมเดลที่ใช้ (ปัจจุบัน ${payloadModel}) ผ่านตัวแปร OPENROUTER_DECISIONS_MODEL`,
        });
      }

      let decisions: any;
      try {
        decisions = JSON.parse(decisionBody);
      } catch (parseError: any) {
        console.error("Decisions API returned unreadable JSON:", decisionBody.slice(0, 400));
        return res.status(502).json({
          error: "อ่านผลลัพธ์จากตัวช่วยตัดสินใจไม่สำเร็จ",
          detail: decisionBody.slice(0, 600),
        });
      }

      const answers = decisions?.answers || {};
      let written: any = null;
      let writerWarning = "";

      if (writeWithTyphoon) {
        if (!hasRealTyphoonKey) {
          writerWarning = "ยังไม่ได้ตั้งค่า TYPHOON_API_KEY จึงส่งเฉพาะผลการตัดสินใจ โดยไม่มีการเขียนสรุป";
        } else {
          const writerPrompt = `คุณเป็นนายทะเบียนอาวุโสของกรมส่งเสริมการเรียนรู้ (สกร.) ทำหน้าที่เขียนบันทึกความเห็นประกอบการพิจารณาเทียบโอนผลการเรียน

[ผลการตัดสินใจจากระบบ Decisions]
${JSON.stringify(answers, null, 2)}

[คำถามและเกณฑ์ที่ใช้ตัดสิน]
${JSON.stringify(questions, null, 2)}

[ข้อความหรือบริบทของเคสที่ส่งให้ระบบตัดสินใจ]
${typeof state === "string" ? state : JSON.stringify(state, null, 2)}
${context ? `\n[ข้อมูลประกอบจากระบบเทียบโอน]\n${typeof context === "string" ? context : JSON.stringify(context, null, 2)}` : ""}

โปรดเขียนบันทึกความเห็นเป็นภาษาไทยทางการ กระชับ ว่าเหตุใดระบบจึงตัดสินเช่นนั้น และนายทะเบียนควรดำเนินการต่ออย่างไร
ตอบกลับเป็น JSON เพียงก้อนเดียวตามโครงสร้างนี้ ห้ามมีข้อความอื่นนอก JSON:
{
  "headline": "หัวเรื่องบันทึกความเห็นสั้น ๆ",
  "summary": "สรุปเหตุผลประกอบผลการตัดสินใจ 2-4 ประโยค",
  "recommendation": "ข้อเสนอแนะเชิงปฏิบัติสำหรับนายทะเบียน",
  "next_steps": ["ขั้นตอนถัดไป 1", "ขั้นตอนถัดไป 2"]
}`;

          try {
            const completion = await openai.chat.completions.create({
              model: typhoonWriterModel,
              messages: [
                {
                  role: "system",
                  content: "You are an AI assistant named Typhoon created by SCB 10X to be helpful, harmless, and honest.",
                },
                { role: "user", content: writerPrompt },
              ],
              temperature: 0.4,
              max_completion_tokens: 1200,
            });

            const writerText = completion.choices?.[0]?.message?.content || "";
            if (writerText.trim() !== "") {
              try {
                written = cleanAndParseJSON(writerText);
              } catch (parseError: any) {
                written = { summary: writerText.trim() };
              }
            } else {
              writerWarning = "Typhoon ตอบกลับข้อความว่าง จึงไม่มีบันทึกความเห็น";
            }
          } catch (writerError: any) {
            console.error("Typhoon writer error:", writerError);
            writerWarning = `เขียนบันทึกความเห็นด้วย Typhoon ไม่สำเร็จ (${
              writerError?.message || "Unknown error"
            }) แต่ผลการตัดสินใจยังใช้งานได้ตามปกติ`;
          }
        }
      }

      return res.json({
        answers,
        written,
        questionSet: { id: questionSet.id, label: questionSet.label, questions },
        model: decisions?.model || payloadModel,
        provider: decisions?.provider || null,
        usage: decisions?.usage || null,
        writerModel: typhoonWriterModel,
        writerWarning,
      });
    } catch (error: any) {
      console.error("Decisions Endpoint Error:", error);
      return res.status(500).json({ error: error.message || "เกิดข้อผิดพลาดระหว่างเรียกตัวช่วยตัดสินใจ" });
    }
  });

  // ---- เปรียบเทียบคำอธิบายรายวิชาเดิมกับรายวิชาเลือก สกร. 2567 พร้อมแคชผล (วิชาที่เคยเทียบแล้วไม่เรียก AI ซ้ำ) ----
  const matchCachePath = path.join(process.cwd(), "data", "matchCache.json");
  let matchCache: Record<string, { percent: number; at: string }> = {};
  try {
    matchCache = JSON.parse(fs.readFileSync(matchCachePath, "utf-8"));
  } catch {
    matchCache = {};
  }
  const saveMatchCache = () => {
    try {
      fs.mkdirSync(path.dirname(matchCachePath), { recursive: true });
      fs.writeFileSync(matchCachePath, JSON.stringify(matchCache, null, 2), "utf-8");
    } catch (e: any) {
      console.error("Cannot save match cache:", e?.message);
    }
  };
  const skrDescriptions: Array<{ code: string; name: string; credits: number | null; description: string }> = (() => {
    try {
      return JSON.parse(fs.readFileSync(path.join(process.cwd(), "src/data/courseDescriptions/skr2567.json"), "utf-8"));
    } catch {
      return [];
    }
  })();

  app.post("/api/match/course", async (req, res) => {
    try {
      const body = (req.body || {}) as CourseMatchRequest;
      const originName = (body.originName || "").trim();
      const target = skrDescriptions.find(d => d.code === body.targetCode);
      if (!originName || !target) {
        return res.status(400).json({ error: "ต้องระบุชื่อวิชาเดิม (originName) และรหัสรายวิชา สกร. 2567 ที่มีคำอธิบาย (targetCode)" });
      }
      const originDescription = (body.originDescription || "").trim();
      const key = crypto
        .createHash("sha1")
        .update([originName, body.originCode || "", originDescription, target.code, target.description, decisionsModel, COURSE_MATCH_VERSION].join("|"))
        .digest("hex");

      if (!body.force && matchCache[key]) {
        return res.json({ percent: matchCache[key].percent, cached: true, targetCode: target.code, targetName: target.name });
      }
      if (!openRouterApiKey || openRouterApiKey.trim() === "") {
        return res.status(400).json({
          error: "ยังไม่ได้ตั้งค่า OPENROUTER_API_KEY ระบบจึงเปรียบเทียบคำอธิบายรายวิชาไม่ได้",
          hint: "เพิ่มบรรทัด OPENROUTER_API_KEY=คีย์ของท่าน ในไฟล์ .env.local แล้วเริ่มเซิร์ฟเวอร์ใหม่",
        });
      }

      const state =
        `[รายวิชาเดิม]\nรหัส: ${body.originCode || "-"}\nชื่อ: ${originName}\nหน่วยกิต: ${body.originCredits ?? "-"}\n` +
        `คำอธิบาย: ${originDescription || "(ไม่มีคำอธิบายรายวิชา ให้ประเมินจากชื่อวิชา)"}\n\n` +
        `[รายวิชาเป้าหมาย สกร. 2567]\nรหัส: ${target.code}\nชื่อ: ${target.name}\nหน่วยกิต: ${target.credits ?? 3}\nคำอธิบาย: ${target.description}`;

      const r = await fetch(decisionsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openRouterApiKey}`, "X-Title": "SKR Transfer Credit 2567" },
        body: JSON.stringify({ model: decisionsModel, state, questions: courseMatchQuestions }),
      });
      const text = await r.text();
      if (!r.ok) {
        return res.status(502).json({ error: `ตัวช่วยตัดสินใจตอบกลับด้วยรหัส ${r.status}`, detail: text.slice(0, 400) });
      }
      const score = JSON.parse(text)?.answers?.similarity?.score;
      if (typeof score !== "number") {
        return res.status(502).json({ error: "ผลจากตัวช่วยตัดสินใจไม่มีคะแนนความสอดคล้อง", detail: text.slice(0, 400) });
      }
      const percent = scoreToPercent(score);
      matchCache[key] = { percent, at: new Date().toISOString() };
      saveMatchCache();
      return res.json({ percent, cached: false, targetCode: target.code, targetName: target.name });
    } catch (error: any) {
      console.error("Course match error:", error);
      return res.status(500).json({ error: error.message || "เปรียบเทียบคำอธิบายรายวิชาไม่สำเร็จ" });
    }
  });

  // API Route for Typhoon analysis
  app.post("/api/ai/analyze", async (req, res) => {
    try {
      const { studentInfo, originSubjects, continuingEd, foreignCreds, experiences, standardList } = req.body;

      const modelPrompt = `
คุณเป็นผู้เชี่ยวชาญระดับสูงด้านระบบการเทียบโอนผลการเรียนของกรมส่งเสริมการเรียนรู้ (สกร.) พ.ศ. 2567 (หลักสูตรส่งเสริมการเรียนรู้เพื่อคุณวุฒิระดับประถม, ม.ต้น, ม.ปลาย พ.ศ. 2567)

โปรดตรวจสอบและวิเคราะห์การจับคู่รายวิชาสะสมดั้งเดิมทั้งหมดของนักศึกษา เพื่อเทียบเป็นวิชาเป้าหมายของ สกร. 2567 และเพื่อช่วยเพิ่มความรวดเร็ว แม่นยำ และน่าเชื่อถือให้แก่นายทะเบียน

[ข้อมูลประวัตินักศึกษาเพื่อวิเคราะห์]
- ชื่อนักศึกษา: ${studentInfo?.name || "ไม่ระบุ"}
- วุฒิการศึกษารับเข้า: ${studentInfo?.level || "ไม่ระบุ"}
- อาชีพดั้งเดิม/ปัจจุบัน: ${studentInfo?.occupation || "ไม่ระบุ"}
- ชนิดหลักสูตรที่ยื่นเทียบเคียง: ${studentInfo?.originCurriculum || "ไม่ระบุ"}

[รายการวิชา/ผลสัมฤทธิ์สะสมที่ยื่นเทียบโอน]
${JSON.stringify({ originSubjects, continuingEd, foreignCreds, experiences }, null, 2)}

[รายการวิชามาตรฐาน สกร. 2567 ของระดับชั้นนี้]
${JSON.stringify(standardList || [], null, 2)}

โปรดตอบในรูปแบบ JSON ภาษาไทยที่สอดรับกับข้อกำหนดด้านล่างนี้ทันที เพื่อความรวดเร็วในการแสดงป้อนผลหน้าจอ:
{
  "rating": "มีความเป็นไปได้สูง" หรือ "เป็นไปได้ปานกลาง" หรือ "ต้องตรวจสอบข้อมูลเพิ่มเติมเป็นพิเศษ",
  "matchPercentage": 85, // ตัวเลขความสอดคล้องโดยตรง (0 - 100)
  "summary": "สรุปกระชับภาษาทางการ เพื่อรายงานให้นายทะเบียนทราบภาพรวมข้อดีและประเด็นที่วิเคราะห์ได้เด่นชัด",
  "mappingChecks": [
    {
      "sourceSubject": "หัวข้อวิชาเดิม/กิจกรรมเดิม เช่น 'ท31101 ภาษาไทยพื้นฐาน'",
      "targetSubject": "ชื่อรหัสวิชาเทียบโอนเป้าหมาย 2567 เช่น 'พท310001 พัฒนาภาษาไทย'",
      "status": "สอดคล้องสมบูรณ์" หรือ "แนะปรับเปลี่ยนเป็นวิชาเลือกด้านอื่น" หรือ "ควรเรียกตรวจหลักฐานการเรียนเพิ่ม",
      "comment": "คำวิจารณ์เชิงวิชาการสั้นกระชับเข้าใจง่าย"
    }
  ],
  "occupationalBonus": {
    "title": "ข้อแนะนำส่งเสริมอาชีพผู้เรียน (สำหรับอาชีพ: ${studentInfo?.occupation || "ไม่ประกอบอาชีพ"})",
    "advice": "การวิเคราะห์ว่าประสบการณ์เดิมและวุฒิการศึกษารอบนี้สอดคล้องกับความต้องการแรงงานหรือไม่ อย่างไร",
    "recommendedSubjects": [
      { "code": "รหัสวิชาเลือก สกร. 2567 หรือกลุ่มวิชาเลือกที่เกี่ยวข้อง", "name": "ชื่อวิชาเป้าหมาย สกร. 2567", "benefit": "เหตุผลเชิงปฏิบัติว่าทำไมวิชานี้ถึงเหมาะกับอาชีพดังกล่าว เช่น เพิ่มทักษะซ่อมไฟฟ้า, ความปลอดภัยอาหาร" }
    ]
  },
  "regulationCompliance": "คำอธิบายระเบียบว่าสอดคล้องกับกรอบหน่วยกิตเป้าหมาย หรือหากมีวิชาที่ไม่ผ่านเกณฑ์หรือเกรด ร/มส/0 จะสามารถแก้ไขและประเมินใหม่อย่างไร"
}

ตอบกลับเฉพาะ JSON ที่ถูกต้อง ห้ามหุ้มด้วยแท็กคำบอกอื่นๆ เพื่อลดความผิดพลาดในการประมวลผลบน UI.
`;

      if (!hasRealTyphoonKey) {
        console.log("TYPHOON_API_KEY is missing or simulated. Using high-fidelity simulation model for Typhoon.");
        const simulatedResp = getSimulatedResponse(studentInfo, originSubjects, continuingEd, foreignCreds, experiences, standardList);
        return res.json({
          ...simulatedResp,
          isSimulated: true,
          providerName: "Typhoon 2.5 (Simulated)"
        });
      }

      console.log("TYPHOON_API_KEY found. Calling Typhoon 2.5 API.");
      try {
        const completion = await openai.chat.completions.create({
          model: "typhoon-v2.5-30b-a3b-instruct",
          messages: [
            {
              role: "system",
              content: "You are an AI assistant named Typhoon created by SCB 10X to be helpful, harmless, and honest."
            },
            {
              role: "user",
              content: modelPrompt
            }
          ],
          temperature: 0.6,
          max_completion_tokens: 2048,
        });

        const responseText = completion.choices?.[0]?.message?.content || "{}";
        const parsedData = cleanAndParseJSON(responseText);
        
        return res.json({
          ...parsedData,
          isSimulated: false,
          providerName: "Typhoon 2.5 (SCB 10X)"
        });
      } catch (apiError: any) {
        console.error("Typhoon fetch error, falling back to simulation:", apiError);
        const simulatedResp = getSimulatedResponse(studentInfo, originSubjects, continuingEd, foreignCreds, experiences, standardList);
        return res.json({
          ...simulatedResp,
          isSimulated: true,
          providerName: "Typhoon 2.5 (Simulated)",
          warning: `เชื่อมต่อกับ Typhoon 2.5 ไม่สำเร็จ (${apiError.message || "Unknown error"}) ปรับมาใช้งานโหลดจำลองทดแทน`
        });
      }


    } catch (error: any) {
      console.error("Analysis Endpoint Error:", error);
      res.status(500).json({ error: error.message || "มีข้อผิดพลาดระหว่างการคุยประมวลผลกับ AI สมองกล" });
    }
  });

  // API Route for Transcript / Data Parsing (Typhoon OCR อ่านรูปภาพ/PDF แล้ว Typhoon 2.5 สกัดรายวิชา)
  app.post("/api/ai/parse-transcript", async (req, res) => {
    try {
      const { text, fileBase64, originCurriculum, standardList } = req.body;

      const electiveItem = standardList?.find((s: any) => s.type === "เลือก" || s.code?.startsWith("ELECTIVE_"));
      const levelElectiveCode = electiveItem ? electiveItem.code : "ELECTIVE_SEN";

      const isTextEmpty = !text || text.trim() === "";
      const isFileEmpty = !fileBase64 || fileBase64.trim() === "";

      if (isTextEmpty && isFileEmpty) {
        return res.status(400).json({ error: "โปรดนำเข้าไฟล์เอกสารใบผลการเรียน หรือกรอกข้อความ เพื่อวิเคราะห์สกัดข้อมูลรายวิชา" });
      }

      if (!hasRealTyphoonKey) {
        console.log("TYPHOON_API_KEY is missing. Using simulated parser response.");
        const parsedSubjects = getSimulatedParsedResponse(originCurriculum, standardList, text);
        return res.json({
          parsedSubjects,
          isSimulated: true,
          providerName: "Typhoon 2.5 (Simulated)"
        });
      }

      const systemPrompt = `คุณเป็นระบบสกัดข้อมูลรายวิชาและคะแนนสอบสำหรับเจ้าหน้าที่นายทะเบียนของ "กรมส่งเสริมการเรียนรู้ (สกร.) ปี 2567" เท่านั้น
หน้าที่หลักของคุณคือสกัดรายวิชากลุ่มคะแนน ทั้งหมดที่ปรากฏในใบระเบียนหรือข้อความที่ผู้ใช้กรอก
และแปลงเป็นรูปแบบสระระเบียบเทียบโอนของหลักสูตร สกร. 2567 ที่ทางเลือกมีดังนี้:
[ประเภทตารางเทียบโอนดั้งเดิม: ${originCurriculum}]

นี่คือตารางรายวิชาเป้าหมายระดับนี้ใน สกร. 2567 ที่สามารถจับคู่ได้ (โปรดจับคู่ mappedTo2567Code ด้วยรหัสจากรายการนี้เท่านั้น!):
${JSON.stringify(standardList?.map((s: any) => ({ code: s.code, name: s.name, credits: s.credits })), null, 2)}

กฎเหล็ก:
1. การจับคู่ mappedTo2567Code ต้องเลือกเฉพาะตัวรหัสจากรายการด้านบนที่เกี่ยวข้องที่สุด ซึ่งรายวิชาเทคโนโลยีดิจิทัล (เช่น ทด110001, ทด210001, ทด310001) จะจัดประเภทเทียบโอนได้เฉพาะกรณีที่วิชาต้นทางเดิมเป็นวิชาเลือกหรือวิชาเพิ่มเติมเท่านั้น (originType คือ "เลือก/เพิ่มเติม") หากเป็นวิชาบังคับดั้งเดิม (originType คือ "บังคับ") จะห้ามเทียบโอนเข้าวิชาเทคโนโลยีดิจิทัลของสกร.เด็ดขาด ให้ปัดมาเทียบเข้ากลุ่มวิชาเลือกตามระดับชั้นแทน (เช่น ELECTIVE_PRI, ELECTIVE_JUN, ELECTIVE_SEN) ส่วนกลุ่มสาขาวิชาอื่นสามารถเทียบโอนได้ปกติ
1.1 เกรดต้องคัดลอกตามที่ปรากฏในใบระเบียนเท่านั้น ห้ามประมาณหรือปัดเอง หากเขียนเป็นรูปแบบ "3(1)" หรือ "2.5(1)" ให้ถือว่าเกรดคือตัวเลขหน้าวงเล็บ (3 หรือ 2.5) ส่วนตัวเลขในวงเล็บคือจำนวนครั้ง/ภาคเรียน ไม่ใช่เกรด ให้ตอบ grade เป็นตัวเลขหรือข้อความเกรดเท่านั้น เช่น "3"
1.2 หลักสูตรนอกระบบ 2551: รายวิชารหัส พท พต พค พว อช ทช สค ทร เป็นวิชาบังคับของหลักสูตรเดิม (originType "บังคับ") ไม่ใช่วิชาเลือก
2. ห้ามแต่งรายวิชาขึ้นมาเองนอกจากที่ตรวจพบจริง แต่ให้ถอดหรือแปลเนื้อหาของภาษาไทย/อังกฤษของวิชาให้สลวยเป็นภาษาไทยและเข้าใจง่ายสอดรับกับใบวิริยะสารจริง
3. ตรวจสอบให้ละเอียด และคืนคำตอบกลับมาเป็น JSON Array คลีนๆ เท่านั้น ห้ามเขียนอธิบายใดๆ ทั้งสิ้น และห้ามหุ้มด้วย \`\`\`json หรือมาร์กดาวน์ใดๆ ทั้งสิ้น

โครงสร้าง JSON ที่คุณต้องสกัดและตอบกลับขึ้นอยู่กับตารางประเภท:
- ถ้าตารางคือ "หลักสูตรแกนกลางฯ 2551" หรือ "หลักสูตรนอกระบบ/สกร.(กศน.) 2551" หรือ "หลักสูตร ปวช. 2562":
[
  {
    "code": "รหัสวิชาดั้งเดิม (เช่น ท31101)",
    "name": "ชื่อวิชาดั้งเดิม (เช่น ภาษาไทย 1)",
    "credits": 1.5,
    "grade": "เกรดดั้งเดิม เช่น 4, 3.5, 3, 2.5, 2, 1.5, 1, ผ่าน, 0, ร, มส",
    "mappedTo2567Code": "รหัสรายวิชา สกร. 2567 เป้าหมายด้านบนที่ตรงหรือเกี่ยวโยงที่สุด (เช่น พท310001 หรือ ${levelElectiveCode})",
    "originType": "ให้จัดกลุ่มว่าเป็น 'บังคับ' หรือ 'เลือก/เพิ่มเติม'"
  }
]

- ถ้าตารางคือ "การศึกษาต่อเนื่อง (หลักสูตรระยะสั้น)":
[
  {
    "courseName": "ชื่อหลักสูตรอบรมระยะสั้นที่ตรวจพบ",
    "hours": 40,
    "organizer": "ผู้เข้าบริหารหรือหน่วยงานจัดสรร (เช่น ศูนย์พัฒนาฝีมือแรงงาน)",
    "mappedTo2567Code": "รหัสรายวิชาเป้าหมาย 2567 ที่ตรงที่สุด หรือ ${levelElectiveCode}"
  }
]

- ถ้าตารางคือ "หลักสูตรต่างประเทศ (เช่น GED, IGCSE)":
[
  {
    "subjectName": "ชื่อวิชาต่างประเทศ (เช่น Mathematics, Science)",
    "foreignGrade": "เกรด เช่น A, B-, Passing",
    "credits": 3,
    "mappedTo2567Code": "รหัสรายวิชาเป้าหมาย 2567 ที่ตรงที่สุด หรือ ${levelElectiveCode}"
  }
]

- ถ้าตารางคือ "การประเมินความรู้และประสบการณ์":
[
  {
    "experienceDetail": "รายละเอียดทักษะความชำนาญที่ถอดรูปได้",
    "evidence": "หลักฐาน/แฟ้มผลงานที่เกี่ยวข้อง",
    "mappedTo2567Code": "รหัสรายวิชาเป้าหมาย 2567 ที่ตรงที่สุด หรือ ${levelElectiveCode}",
    "evaluationResult": "ผ่าน"
  }
]
`;

      let textResult = "";

      console.log("Parsing using real Typhoon 2.5 API.");
      
      let ocrExtractedText = "";
      if (!isFileEmpty) {
        console.log("Extracting text from uploaded image/PDF using Typhoon OCR API...");
        try {
          const base64Parts = fileBase64.split(";base64,");
          const mimeType = base64Parts[0].includes(":") ? base64Parts[0].split(":")[1] : "image/jpeg";
          const rawBase64 = base64Parts[1] || base64Parts[0];
          const buffer = Buffer.from(rawBase64, "base64");
          const blob = new Blob([buffer], { type: mimeType });

          let extension = "jpg";
          if (mimeType.includes("png")) {
            extension = "png";
          } else if (mimeType.includes("pdf")) {
            extension = "pdf";
          } else if (mimeType.includes("bmp")) {
            extension = "bmp";
          } else if (mimeType.includes("tiff")) {
            extension = "tiff";
          }

          const formData = new FormData();
          formData.append("file", blob, `transcript_file.${extension}`);
          formData.append("model", "typhoon-ocr");
          formData.append("task_type", "default");
          formData.append("max_tokens", "16384");
          formData.append("temperature", "0.1");
          formData.append("top_p", "0.6");
          formData.append("repetition_penalty", "1.2");

          const ocrResponse = await fetch("https://api.opentyphoon.ai/v1/ocr", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${typhoonApiKey}`
            },
            body: formData
          });

          if (!ocrResponse.ok) {
            const errBody = await ocrResponse.text();
            throw new Error(`OCR endpoint failed (${ocrResponse.status}): ${errBody}`);
          }

          const ocrData: any = await ocrResponse.json();
          const pageTexts: string[] = [];
          for (const pageResult of ocrData.results || []) {
            if (pageResult.success && pageResult.message) {
              let content = pageResult.message.choices[0].message.content;
              try {
                const parsed = JSON.parse(content);
                content = parsed.natural_text || content;
              } catch (e) {
                // Keep as string
              }
              pageTexts.push(content);
            } else if (!pageResult.success) {
              console.error(`OCR processing warning for page: ${pageResult.error || "Unknown error"}`);
            }
          }
          ocrExtractedText = pageTexts.join("\n");
          console.log("Successfully extracted text via Typhoon OCR:", ocrExtractedText.substring(0, 200) + "...");
        } catch (ocrError: any) {
          console.error("Typhoon OCR extraction error:", ocrError);
          throw new Error(`เกิดข้อผิดพลาดในการประมวลผล OCR ด้วย Typhoon: ${ocrError.message || "Unknown OCR error"}`);
        }
      }

      const combinedText = [text, ocrExtractedText].filter(Boolean).join("\n\n");
      if (!combinedText || combinedText.trim() === "") {
        throw new Error("ไม่มีข้อมูลข้อความหรือรูปภาพที่ประมวลผลได้");
      }

      const completion = await openai.chat.completions.create({
        model: "typhoon-v2.5-30b-a3b-instruct",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant named Typhoon created by SCB 10X."
          },
          {
            role: "user",
            content: `${systemPrompt}\n\nข้อมูลข้อความดิบจากหน้าผลการเรียนหรือใบเกรด:\n${combinedText}\n\nสกัดข้อมูลและตอบกลับด้วย JSON Array ที่ถูกต้องตามโครงสร้างที่ระบุ โดยห้ามมีอธิบายหรืออักขระส่วนรอบใดๆ`
          }
        ],
        temperature: 0.1,
        max_completion_tokens: 4096,
      });

      textResult = completion.choices?.[0]?.message?.content || "[]";

      const parsedSubjects = cleanAndParseJSON(textResult);

      const formattedSubjects = (Array.isArray(parsedSubjects) ? parsedSubjects : []).map((sub: any, idx: number) => ({
        id: `parsed-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        ...sub,
        ...(sub && "grade" in sub ? { grade: normalizeParsedGrade(sub.grade) } : {})
      }));

      return res.json({
        parsedSubjects: formattedSubjects,
        isSimulated: false,
        providerName: "Typhoon OCR + Typhoon 2.5 (SCB 10X)"
      });

    } catch (err: any) {
      console.error("Parse Transcript Endpoint Error:", err);
      res.status(500).json({ error: err.message || "เกิดข้อผิดพลาดในการประมวลผลสกัดข้อมูลรายวิชาอัตโนมัติ" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
