// ชุดคำถามสำหรับเรียกใช้ Decisions API (OpenRouter /api/alpha/decisions)
// โครงสร้างตรงตามสคีมา DecisionsRequest: noul (จริง/เท็จ), choice (เลือกหนึ่งข้อ), score (ให้คะแนนตามเกณฑ์เรียงลำดับ)

export interface DecisionNoulQuestion {
  type: "noul";
  instructions: string;
  criteria: { true: string; false: string };
}

export interface DecisionChoiceQuestion {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>;
}

export interface DecisionScoreQuestion {
  type: "score";
  instructions: string;
  criteria: string[];
}

export type DecisionQuestion = DecisionNoulQuestion | DecisionChoiceQuestion | DecisionScoreQuestion;

export interface DecisionQuestionSet {
  id: string;
  label: string;
  description: string;
  questions: Record<string, DecisionQuestion>;
}

// ชุดที่ 1: ใช้ตามตัวอย่างที่กำหนดไว้ (รับแจ้งปัญหา / คำขอจากผู้ใช้บริการ)
const publicServiceTriage: DecisionQuestionSet = {
  id: "public-service-triage",
  label: "ชุดคำถามรับแจ้งปัญหา (ตามที่ระบุ)",
  description: "ประเมินความเร่งด่วน กลุ่มงานผู้รับผิดชอบ และระดับความไม่พอใจของผู้ยื่นคำขอ",
  questions: {
    is_urgent: {
      type: "noul",
      instructions: "ข้อความนี้สื่อถึงความเร่งด่วนหรือไม่",
      criteria: {
        true: "ระบุเวลาชัดเจนว่าต้องดำเนินการโดยด่วน",
        false: "ไม่มีการระบุความเร่งด่วน",
      },
    },
    department: {
      type: "choice",
      instructions: "ควรให้กลุ่มงานใดรับเรื่องนี้",
      criteria: {
        billing: "การชำระเงิน ใบแจ้งหนี้ และการคืนเงิน",
        technical: "ข้อขัดข้องของระบบ การเชื่อมต่อ และการใช้งาน",
        sales: "ราคา การอัปเกรด และการเปิดบัญชีใหม่",
      },
    },
    frustration: {
      type: "score",
      instructions: "ผู้ยื่นคำขอมีความไม่พอใจมากน้อยเพียงใด",
      criteria: ["สงบ", "ไม่พอใจ", "ไม่พอใจมาก"],
    },
  },
};

// ชุดที่ 2: ปรับให้ตรงกับงานทะเบียนเทียบโอนของ สกร. 2567
const transferCaseReview: DecisionQuestionSet = {
  id: "transfer-case-review",
  label: "ชุดคำถามงานทะเบียนเทียบโอน",
  description: "ประเมินความครบถ้วนของหลักฐาน กลุ่มงานที่ต้องตรวจเพิ่ม และความซับซ้อนของเคสเทียบโอน",
  questions: {
    documents_complete: {
      type: "noul",
      instructions: "หลักฐานประกอบการเทียบโอนครบถ้วนตามเกณฑ์หรือไม่",
      criteria: {
        true: "มีใบระเบียนผลการเรียนและหนังสือรับรองครบถ้วน",
        false: "ยังขาดเอกสารรับรอง แฟ้มสะสมงาน หรือหลักฐานยืนยันผลการเรียน",
      },
    },
    review_owner: {
      type: "choice",
      instructions: "ควรให้กลุ่มงานใดตรวจสอบหลักฐานเพิ่มเติม",
      criteria: {
        registrar: "งานทะเบียนและวัดผล ตรวจความถูกต้องของระเบียนผลการเรียน",
        subject_expert: "คณะกรรมการกลุ่มสาระ ตรวจเนื้อหาวิชาและสมรรถนะ",
        legal: "ฝ่ายระเบียบและกฎหมาย ตรวจกรณีเทียบข้ามหลักสูตรหรือวุฒิต่างประเทศ",
      },
    },
    complexity: {
      type: "score",
      instructions: "เคสนี้มีความซับซ้อนในการเทียบโอนเพียงใด",
      criteria: ["เทียบตรงตามรหัสวิชา", "ต้องจับคู่เนื้อหาหลายวิชา", "ต้องเทียบข้ามหลักสูตรหรือวุฒิ"],
    },
  },
};

export const decisionQuestionSets: DecisionQuestionSet[] = [publicServiceTriage, transferCaseReview];

export const defaultDecisionQuestionSetId = publicServiceTriage.id;

export function findDecisionQuestionSet(id?: string): DecisionQuestionSet {
  return decisionQuestionSets.find((set) => set.id === id) || decisionQuestionSets[0];
}
