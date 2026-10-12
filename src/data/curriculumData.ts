import { EducationLevel, OriginCurriculum, StandardSubject2567 } from "../types";

// โครงสร้างหลักสูตร สกร. 2567 แยกตามระดับชั้น
export const standardSubjects2567: Record<EducationLevel, StandardSubject2567[]> = {
  [EducationLevel.PRIMARY]: [
    { code: "พท110001", name: "ภาษาไทย", credits: 3, type: "บังคับ" },
    { code: "พต110001", name: "ภาษาต่างประเทศ (ภาษาอังกฤษ)", credits: 3, type: "บังคับ" },
    { code: "พค110001", name: "คณิตศาสตร์", credits: 3, type: "บังคับ" },
    { code: "พว110001", name: "วิทยาศาสตร์", credits: 3, type: "บังคับ" },
    { code: "กอ110001", name: "การงานอาชีพ", credits: 3, type: "บังคับ" },
    { code: "สศ110001", name: "สุขภาวะและศิลปะ", credits: 3, type: "บังคับ" },
    { code: "สค110001", name: "สังคมศึกษา ประวัติศาสตร์ และหน้าที่พลเมือง", credits: 4, type: "บังคับ" },
    { code: "ทด110001", name: "เทคโนโลยีดิจิทัล", credits: 3, type: "บังคับ" },
    // โครงสร้างรวม 48 นก. = บังคับ 25 + เลือก 23 (แนวทางฯ ตารางที่ 3)
    { code: "ELECTIVE_PRI", name: "วิชาเลือก/วิชาเลือกเสรี", credits: 23, type: "เลือก" }
  ],
  [EducationLevel.JUNIOR_HIGH]: [
    { code: "พท210001", name: "ภาษาไทย", credits: 4, type: "บังคับ" },
    { code: "พต210001", name: "ภาษาต่างประเทศ (ภาษาอังกฤษ)", credits: 4, type: "บังคับ" },
    { code: "พค210001", name: "คณิตศาสตร์", credits: 4, type: "บังคับ" },
    { code: "พว210001", name: "วิทยาศาสตร์", credits: 4, type: "บังคับ" },
    { code: "กอ210001", name: "การงานอาชีพ", credits: 4, type: "บังคับ" },
    { code: "สศ210001", name: "สุขภาวะและศิลปะ", credits: 4, type: "บังคับ" },
    { code: "สค210001", name: "สังคมศึกษา ประวัติศาสตร์ และหน้าที่พลเมือง", credits: 5, type: "บังคับ" },
    { code: "ทด210001", name: "เทคโนโลยีดิจิทัล", credits: 4, type: "บังคับ" },
    // โครงสร้างรวม 56 นก. = บังคับ 33 + เลือก 23 (แนวทางฯ ตารางที่ 4)
    { code: "ELECTIVE_JUN", name: "วิชาเลือก/วิชาเลือกเสรี", credits: 23, type: "เลือก" }
  ],
  [EducationLevel.SENIOR_HIGH]: [
    { code: "พท310001", name: "ภาษาไทย", credits: 5, type: "บังคับ" },
    { code: "พต310001", name: "ภาษาต่างประเทศ (ภาษาอังกฤษ)", credits: 5, type: "บังคับ" },
    { code: "พค310001", name: "คณิตศาสตร์", credits: 5, type: "บังคับ" },
    { code: "พว310001", name: "วิทยาศาสตร์", credits: 5, type: "บังคับ" },
    { code: "กอ310001", name: "การงานอาชีพ", credits: 5, type: "บังคับ" },
    { code: "สศ310001", name: "สุขภาวะและศิลปะ", credits: 5, type: "บังคับ" },
    { code: "สค310001", name: "สังคมศึกษา ประวัติศาสตร์ และหน้าที่พลเมือง", credits: 6, type: "บังคับ" },
    { code: "ทด310001", name: "เทคโนโลยีดิจิทัล", credits: 5, type: "บังคับ" },
    // โครงสร้างรวม 76 นก. = บังคับ 41 + เลือก 35 (แนวทางฯ ตารางที่ 5)
    { code: "ELECTIVE_SEN", name: "วิชาเลือก/วิชาเลือกเสรี", credits: 35, type: "เลือก" }
  ]
};

// เกณฑ์หน่วยกิตสูงสุดที่สามารถเทียบโอนได้แยกตามระดับชั้น
export const maxTransferCredits: Record<EducationLevel, number> = {
  [EducationLevel.PRIMARY]: 36,
  [EducationLevel.JUNIOR_HIGH]: 42,
  [EducationLevel.SENIOR_HIGH]: 57
};

// ตารางที่ 1 บทที่ 4: เพดานหน่วยกิตเทียบโอนจากหลักสูตรต่างประเทศ ตามชั้นปี/เกรดที่จบ
// เกรด 6 เทียบเท่าจบเกรด 5, เกรด 9 เทียบเท่าจบเกรด 8 (กรณีเทียบวุฒิไม่ได้), เกรด 1-3 ไม่รับเทียบโอน
export interface ForeignGradeOption {
  grade: number;
  maxCredits: number;
  label: string;
}

export const foreignGradeOptions: Record<EducationLevel, ForeignGradeOption[]> = {
  [EducationLevel.PRIMARY]: [
    { grade: 4, maxCredits: 14, label: "จบเกรด 4 (เทียบโอนได้ไม่เกิน 14 นก.)" },
    { grade: 5, maxCredits: 24, label: "จบเกรด 5 (เทียบโอนได้ไม่เกิน 24 นก.)" },
    { grade: 6, maxCredits: 24, label: "จบเกรด 6 (เทียบเท่าจบเกรด 5 ไม่เกิน 24 นก.)" }
  ],
  [EducationLevel.JUNIOR_HIGH]: [
    { grade: 7, maxCredits: 14, label: "จบเกรด 7 (เทียบโอนได้ไม่เกิน 14 นก.)" },
    { grade: 8, maxCredits: 32, label: "จบเกรด 8 (เทียบโอนได้ไม่เกิน 32 นก.)" },
    { grade: 9, maxCredits: 32, label: "จบเกรด 9 (เทียบเท่าจบเกรด 8 ไม่เกิน 32 นก.)" }
  ],
  [EducationLevel.SENIOR_HIGH]: [
    { grade: 10, maxCredits: 19, label: "จบเกรด 10 (เทียบโอนได้ไม่เกิน 19 นก.)" },
    { grade: 11, maxCredits: 38, label: "จบเกรด 11 ขึ้นไป / สอบวุฒิ IGCSE, GED (ไม่เกิน 38 นก.)" }
  ]
};

// ตัวอย่างการเทียบโอน ปวช. 2562 (ฉบับปรับปรุง พ.ศ. 2565): หน่วยกิตขั้นต่ำของแต่ละกลุ่มสมรรถนะแกนกลาง
// ที่ใช้พิจารณาเทียบเข้าหลักสูตร 2567 (category ตรงกับ detectSubjectCategory ในตัวคำนวณ)
export const vetCoreCompetencyMinimums: Array<{ category: string; label: string; minCredits: number }> = [
  { category: "THAI", label: "ภาษาไทย", minCredits: 3 },
  { category: "ENGLISH", label: "ภาษาต่างประเทศ (อังกฤษ)", minCredits: 6 },
  { category: "SCIENCE", label: "วิทยาศาสตร์", minCredits: 4 },
  { category: "MATH", label: "คณิตศาสตร์", minCredits: 4 },
  { category: "SOCIAL", label: "สังคมศึกษา", minCredits: 3 },
  { category: "HEALTH", label: "สุขศึกษาและพลศึกษา", minCredits: 2 }
];

// ผู้จบประถมศึกษาปีที่ 4 (ก่อน พ.ศ. 2507) ที่ได้ใบสุทธิซึ่งมีผลการเรียนรวม
// เทียบโอนระดับประถมศึกษา 24 นก. ให้ผลการเรียนเป็น "ผ่าน" (แนวทางฯ บทที่ 2 หน้า 8)
export const legacyPrathom4Credits: Array<{ code: string; credits: number }> = [
  { code: "พค110001", credits: 3 }, // คณิตศาสตร์
  { code: "พท110001", credits: 3 }, // ภาษาไทย
  { code: "กอ110001", credits: 3 }, // การงานอาชีพ
  { code: "สศ110001", credits: 3 }, // สุขภาวะและศิลปะ
  { code: "สค110001", credits: 4 }, // สังคมศึกษา ประวัติศาสตร์ และหน้าที่พลเมือง
  { code: "ELECTIVE_PRI", credits: 8 } // วิชาเลือก
];

// ตารางที่ 6 บทที่ 2: เพดานหน่วยกิตเทียบโอนจาก ปวช. 2562 ตามภาคเรียนที่เรียนจบ
export const vetSemesterCaps: Record<number, number> = {
  1: 15,
  2: 25,
  3: 40,
  4: 54,
  5: 57
};

// ข้อมูลจำลองพรีเซ็ตเทมเพลต (Template Presets) สำหรับอำนวยความสะดวกครูหรือผู้ใช้ป้อนคะแนน
export interface SubjectPreset {
  code: string;
  name: string;
  credits: number;
  grade: string;
  mappedTo2567Code: string;
  originType?: "บังคับ" | "เลือก/เพิ่มเติม"; // ถ้าไม่ระบุ ให้ถือว่าจับคู่เข้าวิชาเลือกเป็นวิชาเลือก ที่เหลือเป็นวิชาบังคับ
}

export const curriculumPresets: Record<
  EducationLevel,
  Partial<Record<OriginCurriculum, SubjectPreset[]>>
> = {
  [EducationLevel.PRIMARY]: {
    [OriginCurriculum.NFE_2551]: [
      // ตารางที่ 3 (แนวทางฯ): หลักสูตรนอกระบบ 2551 ระดับประถมศึกษา → สกร. 2567
      // (ไม่ใส่ ทร11001 ทักษะการเรียนรู้ เพราะไม่มีรายวิชา 2567 รับเทียบโอน)
      { code: "พท11001", name: "ภาษาไทย", credits: 3, grade: "4", mappedTo2567Code: "พท110001" },
      { code: "พต11001", name: "ภาษาอังกฤษพื้นฐาน", credits: 3, grade: "2.5", mappedTo2567Code: "พต110001" },
      { code: "พค11001", name: "คณิตศาสตร์", credits: 3, grade: "3.5", mappedTo2567Code: "พค110001" },
      { code: "พว11001", name: "วิทยาศาสตร์", credits: 3, grade: "2", mappedTo2567Code: "พว110001" },
      { code: "อช11002", name: "ทักษะการประกอบอาชีพ", credits: 4, grade: "4", mappedTo2567Code: "กอ110001" },
      { code: "อช11001", name: "ช่องทางการเข้าสู่อาชีพ", credits: 2, grade: "3", mappedTo2567Code: "ELECTIVE_PRI" },
      { code: "อช11003", name: "การพัฒนาอาชีพให้มีอยู่มีกิน", credits: 2, grade: "3", mappedTo2567Code: "ELECTIVE_PRI" },
      { code: "ทช11002", name: "สุขศึกษา พลศึกษา", credits: 2, grade: "3", mappedTo2567Code: "สศ110001" },
      { code: "ทช11003", name: "ศิลปศึกษา", credits: 2, grade: "3", mappedTo2567Code: "สศ110001" },
      { code: "ทช11001", name: "เศรษฐกิจพอเพียง", credits: 1, grade: "3", mappedTo2567Code: "ELECTIVE_PRI" },
      { code: "สค11001", name: "สังคมศึกษา", credits: 3, grade: "2.5", mappedTo2567Code: "สค110001" },
      { code: "สค11002", name: "ศาสนาและหน้าที่พลเมือง", credits: 2, grade: "3", mappedTo2567Code: "สค110001" },
      { code: "สค11003", name: "การพัฒนาตนเอง ชุมชน สังคม", credits: 1, grade: "3", mappedTo2567Code: "ELECTIVE_PRI" }
    ]
  },
  [EducationLevel.JUNIOR_HIGH]: {
    [OriginCurriculum.CORE_2551]: [
      // ตารางที่ 1 (แนวทางฯ): แกนกลาง 2551 ม.ต้น (เรียนจบ ม.2 ภาคเรียนที่ 1) → สกร. 2567
      // หน่วยกิตต้นทางเป็นยอดรวมของแต่ละสาระ และต้องไม่น้อยกว่าวิชา 2567 ที่รับเทียบ
      { code: "ท22101", name: "ภาษาไทย", credits: 4, grade: "3.5", mappedTo2567Code: "พท210001", originType: "บังคับ" },
      { code: "อ22101", name: "ภาษาอังกฤษ", credits: 4, grade: "2.5", mappedTo2567Code: "พต210001", originType: "บังคับ" },
      { code: "ค22101", name: "คณิตศาสตร์", credits: 4, grade: "3", mappedTo2567Code: "พค210001", originType: "บังคับ" },
      { code: "ว22101", name: "วิทยาศาสตร์", credits: 4, grade: "4", mappedTo2567Code: "พว210001", originType: "บังคับ" },
      { code: "ง22101", name: "การงานอาชีพและเทคโนโลยี", credits: 4, grade: "3.5", mappedTo2567Code: "กอ210001", originType: "บังคับ" },
      // สุขภาวะและศิลปะ (4) = สุขศึกษาและพลศึกษา 2 + ศิลปะ 2
      { code: "พ22101", name: "สุขศึกษาและพลศึกษา", credits: 2, grade: "3", mappedTo2567Code: "สศ210001", originType: "บังคับ" },
      { code: "ศ22101", name: "ศิลปะ", credits: 2, grade: "3", mappedTo2567Code: "สศ210001", originType: "บังคับ" },
      // สังคมศึกษา ประวัติศาสตร์ และหน้าที่พลเมือง (5) = สังคมศึกษา 4 + ประวัติศาสตร์ 1 (+ ศาสนา หน้าที่พลเมือง 1)
      { code: "ส22101", name: "สังคมศึกษา", credits: 4, grade: "2.5", mappedTo2567Code: "สค210001", originType: "บังคับ" },
      { code: "ส22102", name: "ประวัติศาสตร์", credits: 1, grade: "3", mappedTo2567Code: "สค210001", originType: "บังคับ" },
      { code: "ส22103", name: "ศาสนา และหน้าที่พลเมือง", credits: 1, grade: "3", mappedTo2567Code: "สค210001", originType: "บังคับ" },
      // วิชาเพิ่มเติม/เลือก: รวมกลุ่มละ 3 นก. จึงเทียบเป็นวิชาเลือกได้
      { code: "ส1234", name: "ประวัติศาสตร์อยุทธยา", credits: 1.0, grade: "4.0", mappedTo2567Code: "ELECTIVE_JUN", originType: "เลือก/เพิ่มเติม" },
      { code: "ส1235", name: "ประวัติศาสตร์กรุงธนบุรี", credits: 1.0, grade: "3.5", mappedTo2567Code: "ELECTIVE_JUN", originType: "เลือก/เพิ่มเติม" },
      { code: "ส1236", name: "ประวัติศาสตร์รัตนโกสินทร์", credits: 1.0, grade: "3.0", mappedTo2567Code: "ELECTIVE_JUN", originType: "เลือก/เพิ่มเติม" },
      { code: "ว22201", name: "วิทยาศาสตร์เพิ่มเติม 1", credits: 1.5, grade: "3.5", mappedTo2567Code: "ELECTIVE_JUN", originType: "เลือก/เพิ่มเติม" },
      { code: "ว22202", name: "วิทยาศาสตร์เพิ่มเติม 2", credits: 1.5, grade: "3.5", mappedTo2567Code: "ELECTIVE_JUN", originType: "เลือก/เพิ่มเติม" }
    ],
    [OriginCurriculum.NFE_2551]: [
      { code: "พท21001", name: "ภาษาไทย", credits: 4, grade: "3.5", mappedTo2567Code: "พท210001" },
      { code: "พต21001", name: "ภาษาอังกฤษในชีวิตประจำวัน", credits: 4, grade: "2.5", mappedTo2567Code: "พต210001" },
      { code: "พค21001", name: "คณิตศาสตร์", credits: 4, grade: "4", mappedTo2567Code: "พค210001" },
      { code: "พว21001", name: "วิทยาศาสตร์", credits: 4, grade: "3", mappedTo2567Code: "พว210001" },
      // ตารางที่ 4 (แนวทางฯ): หลักสูตรนอกระบบ 2551 ระดับ ม.ต้น → สกร. 2567
      { code: "อช21002", name: "ทักษะการพัฒนาอาชีพ", credits: 4, grade: "4", mappedTo2567Code: "กอ210001" },
      { code: "อช21001", name: "ช่องทางการพัฒนาอาชีพ", credits: 2, grade: "3", mappedTo2567Code: "ELECTIVE_JUN" },
      { code: "อช21003", name: "การพัฒนาอาชีพให้มีความเข้มแข็ง", credits: 2, grade: "3", mappedTo2567Code: "ELECTIVE_JUN" },
      { code: "ทช21002", name: "สุขศึกษา พลศึกษา", credits: 2, grade: "3.5", mappedTo2567Code: "สศ210001" },
      { code: "ทช21003", name: "ศิลปศึกษา", credits: 2, grade: "3.5", mappedTo2567Code: "สศ210001" },
      { code: "ทช21001", name: "เศรษฐกิจพอเพียง", credits: 1, grade: "3", mappedTo2567Code: "ELECTIVE_JUN" },
      { code: "สค21001", name: "สังคมศึกษา", credits: 3, grade: "3", mappedTo2567Code: "สค210001" },
      { code: "สค21002", name: "ศาสนาและหน้าที่พลเมือง", credits: 2, grade: "3", mappedTo2567Code: "สค210001" },
      { code: "สค21003", name: "การพัฒนาตนเอง ชุมชน สังคม", credits: 1, grade: "3", mappedTo2567Code: "ELECTIVE_JUN" },
      { code: "ส1234", name: "ประวัติศาสตร์อยุทธยา", credits: 1.0, grade: "4.0", mappedTo2567Code: "ELECTIVE_JUN" },
      { code: "ส1235", name: "ประวัติศาสตร์กรุงธนบุรี", credits: 1.0, grade: "3.5", mappedTo2567Code: "ELECTIVE_JUN" },
      { code: "ส1236", name: "ประวัติศาสตร์รัตนโกสินทร์", credits: 1.0, grade: "3.0", mappedTo2567Code: "ELECTIVE_JUN" }
    ]
  },
  [EducationLevel.SENIOR_HIGH]: {
    [OriginCurriculum.CORE_2551]: [
      // ตารางที่ 2 (แนวทางฯ): แกนกลาง 2551 ม.ปลาย (เรียนจบ ม.6 ภาคเรียนที่ 1) → สกร. 2567
      // หน่วยกิตต้นทางเป็นยอดรวมของแต่ละสาระ และต้องไม่น้อยกว่าวิชา 2567 ที่รับเทียบ
      { code: "ท33101", name: "ภาษาไทยพื้นฐาน", credits: 5, grade: "4", mappedTo2567Code: "พท310001", originType: "บังคับ" },
      { code: "อ33101", name: "ภาษาอังกฤษพื้นฐาน", credits: 5, grade: "2.5", mappedTo2567Code: "พต310001", originType: "บังคับ" },
      { code: "ค33101", name: "คณิตศาสตร์พื้นฐาน", credits: 5, grade: "3.5", mappedTo2567Code: "พค310001", originType: "บังคับ" },
      { code: "ว33101", name: "วิทยาศาสตร์", credits: 5, grade: "3.5", mappedTo2567Code: "พว310001", originType: "บังคับ" },
      { code: "ง33101", name: "การงานอาชีพและเทคโนโลยี", credits: 5, grade: "3", mappedTo2567Code: "กอ310001", originType: "บังคับ" },
      // สุขภาวะและศิลปะ (5) = สุขศึกษาและพลศึกษา 3 + ศิลปะ 2
      { code: "พ33101", name: "สุขศึกษาและพลศึกษา", credits: 3, grade: "4", mappedTo2567Code: "สศ310001", originType: "บังคับ" },
      { code: "ศ33101", name: "ศิลปะ", credits: 2, grade: "3", mappedTo2567Code: "สศ310001", originType: "บังคับ" },
      // สังคมศึกษา ประวัติศาสตร์ และหน้าที่พลเมือง (6)
      { code: "ส33101", name: "สังคมศึกษา ศาสนา และวัฒนธรรม", credits: 6, grade: "3", mappedTo2567Code: "สค310001", originType: "บังคับ" },
      // วิชาเพิ่มเติม/เลือก: กลุ่มละ 3 นก. เทียบเป็นวิชาเลือกได้
      { code: "ค33201", name: "คณิตศาสตร์เพิ่มเติม", credits: 3, grade: "3.5", mappedTo2567Code: "ELECTIVE_SEN", originType: "เลือก/เพิ่มเติม" },
      { code: "ว33201", name: "ฟิสิกส์เพิ่มเติม", credits: 3, grade: "3", mappedTo2567Code: "ELECTIVE_SEN", originType: "เลือก/เพิ่มเติม" },
      { code: "ส33201", name: "ประวัติศาสตร์สากล", credits: 3, grade: "3.5", mappedTo2567Code: "ELECTIVE_SEN", originType: "เลือก/เพิ่มเติม" }
    ],
    [OriginCurriculum.NFE_2551]: [
      { code: "พท31001", name: "ภาษาไทย", credits: 5, grade: "4", mappedTo2567Code: "พท310001" },
      { code: "พต31001", name: "ภาษาอังกฤษเพื่อชีวิตและสังคม", credits: 5, grade: "2.5", mappedTo2567Code: "พต310001" },
      { code: "พค31001", name: "คณิตศาสตร์", credits: 5, grade: "3", mappedTo2567Code: "พค310001" },
      { code: "พว31001", name: "วิทยาศาสตร์", credits: 5, grade: "3.5", mappedTo2567Code: "พว310001" },
      // ตารางที่ 5 (แนวทางฯ): หลักสูตรนอกระบบ 2551 ระดับ ม.ปลาย → สกร. 2567
      // การงานอาชีพ (5) = ทักษะการขยายอาชีพ 4 + ช่องทางการขยายอาชีพ 2
      { code: "อช31002", name: "ทักษะการขยายอาชีพ", credits: 4, grade: "4", mappedTo2567Code: "กอ310001" },
      { code: "อช31001", name: "ช่องทางการขยายอาชีพ", credits: 2, grade: "4", mappedTo2567Code: "กอ310001" },
      { code: "อช31003", name: "การพัฒนาอาชีพให้มีความมั่นคง", credits: 2, grade: "3", mappedTo2567Code: "ELECTIVE_SEN" },
      // สุขภาวะและศิลปะ (5) = สุขศึกษา พลศึกษา 2 + ศิลปศึกษา 2 + เศรษฐกิจพอเพียง 1
      { code: "ทช31002", name: "สุขศึกษา พลศึกษา", credits: 2, grade: "3", mappedTo2567Code: "สศ310001" },
      { code: "ทช31003", name: "ศิลปศึกษา", credits: 2, grade: "3.5", mappedTo2567Code: "สศ310001" },
      { code: "ทช31001", name: "เศรษฐกิจพอเพียง", credits: 1, grade: "3", mappedTo2567Code: "สศ310001" },
      // สังคมศึกษา ประวัติศาสตร์ และหน้าที่พลเมือง (6) = 3 + 2 + 1
      { code: "สค31001", name: "สังคมศึกษา", credits: 3, grade: "2.5", mappedTo2567Code: "สค310001" },
      { code: "สค31002", name: "ศาสนาและหน้าที่พลเมือง", credits: 2, grade: "3", mappedTo2567Code: "สค310001" },
      { code: "สค31003", name: "การพัฒนาตนเอง ชุมชน สังคม", credits: 1, grade: "3", mappedTo2567Code: "สค310001" }
    ],
    [OriginCurriculum.VET_2562]: [
      { code: "20000-1101", name: "ภาษาไทยพื้นฐาน", credits: 2, grade: "3", mappedTo2567Code: "พท310001" },
      { code: "20000-1201", name: "ภาษาอังกฤษในชีวิตจริง", credits: 2, grade: "2.5", mappedTo2567Code: "พต310001" },
      { code: "20000-1301", name: "วิทยาศาสตร์เพื่อพัฒนาทักษะชีวิต", credits: 2, grade: "3.5", mappedTo2567Code: "พว310001" },
      { code: "20000-1401", name: "คณิตศาสตร์พื้นฐานอาชีพ", credits: 2, grade: "3.5", mappedTo2567Code: "พค310001" },
      { code: "20000-1501", name: "หน้าที่พลเมืองและศีลธรรม", credits: 2, grade: "3", mappedTo2567Code: "สค310001" },
      { code: "20000-1601", name: "พลศึกษาเพื่อพัฒนาบุคลิกภาพ", credits: 1, grade: "4", mappedTo2567Code: "สศ310001" }
    ]
  }
};

// คู่เกณฑ์วุฒิต่างประเทศ (Foreign equivalence rules)
export const foreignEquivalents = [
  { exam: "GED (General Educational Development)", country: "USA", criteria: "ต้องสอบผ่านวิชาบังคับ ได้คะแนนเฉลี่ยเป็นเกณฑ์เทียบเท่า ม.ปลาย" },
  { exam: "IGCSE / GCE O-Level", country: "UK", criteria: "ต้องมีผลการสอบอย่างน้อย 5 วิชา (เกรด C ขึ้นไป) เทียบเท่า ม.ต้น หรือ ม.ปลาย ตามระดับ" },
  { exam: "Sixth Form / NZQA Standards", country: "New Zealand", criteria: "ต้องสอบได้ Level 2 หรือสูงกว่า ได้รับ Credit สะสมตามเกณฑ์ของนิวซีแลนด์" },
  { exam: "Grade 10/11/12 High School", country: "นานาชาติ", criteria: "ใช้วิพากษ์หลักฐานแสดงผลการเรียน (Transcript) รายปีและจำนวนภาคเรียนประกอบ" }
];
