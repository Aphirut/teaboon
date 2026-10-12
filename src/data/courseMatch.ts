// การเปรียบเทียบคำอธิบายรายวิชา (วิชาเดิม ↔ รายวิชาเลือก สกร. 2567) ด้วยตัวช่วยตัดสินใจ
import type { DecisionQuestion } from "./decisionQuestions";

// เกณฑ์ขั้นต่ำ (ร้อยละ) ที่ถือว่าเทียบโอนได้ ปรับค่าได้ที่นี่ที่เดียว
export const COURSE_MATCH_THRESHOLD = 70;

// เปลี่ยนเลขนี้เมื่อแก้คำถาม/เกณฑ์ เพื่อให้ผลที่แคชไว้ถูกเทียบใหม่
export const COURSE_MATCH_VERSION = 1;

// ระดับ 0-10 แทนร้อยละ 0-100 (ผลคะแนนจาก decider อยู่ในช่วง 0 ถึงจำนวนเกณฑ์-1)
const LEVELS = ["0%", "10%", "20%", "30%", "40%", "50%", "60%", "70%", "80%", "90%", "100%"];

export const courseMatchQuestions: Record<string, DecisionQuestion> = {
  similarity: {
    type: "score",
    instructions:
      "เปรียบเทียบรายวิชาเดิมกับรายวิชาเป้าหมาย (สกร. 2567) ว่ามีเนื้อหา สาระการเรียนรู้ และสมรรถนะสอดคล้องกันกี่เปอร์เซ็นต์ " +
      "ให้พิจารณาจากเนื้อหาและสมรรถนะเป็นหลัก ไม่ใช่เพียงชื่อวิชา ถ้าวิชาเดิมไม่มีคำอธิบายให้ประเมินจากชื่อวิชาอย่างระมัดระวัง และให้คะแนนต่ำเมื่อข้อมูลไม่พอ",
    criteria: LEVELS,
  },
};

export interface CourseMatchRequest {
  originName: string;
  originCode?: string;
  originDescription?: string;
  originCredits?: number;
  originCurriculum?: string; // ใช้ประกอบการค้นคำอธิบายรายวิชาเดิมจากภายนอก
  lookupExternal?: boolean;  // false = ไม่ค้นภายนอก (ค่าเริ่มต้น: ค้นเมื่อวิชาเดิมไม่มีคำอธิบาย)
  targetCode: string;
  force?: boolean;
}

// ผลการค้นคำอธิบายรายวิชาเดิมจากภายนอก (ยังไม่ผ่านการตรวจสอบโดยเจ้าหน้าที่เสมอ)
export interface OriginSourceInfo {
  found: boolean;
  officialName: string;
  sources: string[];
  unverified: true;
  lookupError?: string;
}

export interface CourseMatchResult {
  percent: number; // 0-100
  cached: boolean;
  targetCode: string;
  targetName: string;
  originSource?: OriginSourceInfo | null;
}

export const courseMatchKey = (originName: string, targetCode: string) =>
  `${(originName || "").replace(/\s+/g, "").toLowerCase()}|${targetCode}`;

export const scoreToPercent = (score: number) =>
  Math.round(Math.min(LEVELS.length - 1, Math.max(0, score)) * 10);
