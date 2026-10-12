export enum EducationLevel {
  PRIMARY = "ประถมศึกษา",
  JUNIOR_HIGH = "มัธยมศึกษาตอนต้น",
  SENIOR_HIGH = "มัธยมศึกษาตอนปลาย"
}

export enum OriginCurriculum {
  CORE_2551 = "หลักสูตรแกนกลางฯ 2551",
  NFE_2551 = "หลักสูตรนอกระบบ/สกร.(กศน.) 2551",
  VET_2562 = "หลักสูตร ปวช. 2562",
  CONTINUING_ED = "การศึกษาต่อเนื่อง (หลักสูตรระยะสั้น)",
  FOREIGN_CURRICULUM = "หลักสูตรต่างประเทศ (เช่น GED, IGCSE)",
  KNOWLEDGE_EXPERIENCE = "การประเมินความรู้และประสบการณ์"
}

export interface StudentInfo {
  name: string;
  studentId: string;
  citizenId: string;
  birthDate: string;
  occupation: string;
  previousSchool: string;
  previousDistrict: string;
  previousProvince: string;
  centerName: string; // ศูนย์ส่งเสริมการเรียนรู้อำเภอ/เขต
  academicYear: string;
  semester: string;
  level: EducationLevel;
  originCurriculum: OriginCurriculum;
  vetTrack?: string; // ศิลป์-คำนวณ, วิทย์, ฯลฯ (ถ้ามี)
  foreignGradeCompleted?: number; // หลักสูตรต่างประเทศ: จบชั้นปี/เกรดที่เท่าไร (ใช้กำหนดเพดานตามตารางที่ 1 บทที่ 4)
  carryOver2567?: boolean; // ผู้เรียนลาออกแล้วสมัครใหม่: ผลการเรียน สกร. 2567 ที่เทียบโอน/เรียนไว้เดิม นำไปใช้ได้โดยตรง ไม่คำนวณเกณฑ์ใหม่
  legacyPrathom4?: boolean; // ผู้จบ ป.4 ก่อน พ.ศ. 2507 ที่มีใบสุทธิรวมผลการเรียน (เทียบโอนคงที่ 24 นก. ผล "ผ่าน")
  vetSemestersCompleted?: number; // ปวช.: เรียนจบภาคเรียนที่เท่าไร 1-5 (ใช้กำหนดเพดานตามตารางที่ 6 บทที่ 2)
}

export interface StandardSubject2567 {
  code: string;
  name: string;
  credits: number;
  type: "บังคับ" | "เลือก";
}

export interface OriginSubjectInput {
  id: string; // unique item identifier in list
  code: string;
  name: string;
  credits: number;
  grade: string; // 4, 3.5, 3, 2.5, 2, 1.5, 1, "ผ่าน", "ร", "มส", "0"
  mappedTo2567Code: string; // target 2567 subject code
  originType?: "บังคับ" | "เลือก/เพิ่มเติม";
}

export interface ContinuingEdInput {
  id: string;
  courseName: string;
  hours: number;
  organizer: string;
  mappedTo2567Code: string;
}

export interface ForeignCredentialInput {
  id: string;
  subjectName: string;
  foreignGrade: string;
  credits: number;
  mappedTo2567Code: string;
}

export interface ExperienceInput {
  id: string;
  experienceDetail: string;
  evidence: string;
  mappedTo2567Code: string;
  evaluationResult: "ผ่าน" | "ไม่ผ่าน" | string; // สามารถใส่เกรด 8 ระดับ (4, 3.5 ...) หรือ ผ่าน
}
