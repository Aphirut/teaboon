import { EducationLevel } from "../types";

export interface ElectiveSubject2567 {
  code: string;
  name: string;
  credits: number;
  level: EducationLevel;
  category: string;
}

// รายวิชาเลือกตามหลักสูตรส่งเสริมการเรียนรู้เพื่อคุณวุฒิตามระดับการศึกษาขั้นพื้นฐาน พุทธศักราช 2567 (รายวิชาละ 3 หน่วยกิต)
// ที่มา: ไฟล์ "รายวิชาเทียบโอน 67_20260515.pdf" (เอกสารสแกน ถอดรหัสและชื่อวิชาจากภาพ)
// หมายเหตุการถอดข้อมูล: ชื่อวิชาที่ถูกตัดขอบตารางในต้นฉบับ (สค120008, พต120002, พต220004, สค220006, พว320011) เติมให้ครบจากรายวิชาชุดเดียวกันของระดับอื่น
// และ สค320005 ในต้นฉบับพิมพ์ว่า "ประวัติศาสตร์ชาติไทย 2" (อาจเป็น 3) ให้ตรวจกับต้นฉบับจริง
export const electiveSubjects2567: ElectiveSubject2567[] = [
  // === ระดับประถมศึกษา ===
  // ภาษาไทย
  { code: "พท120001", name: "ภาษาไทยกับทักษะการเรียนรู้ 1", credits: 3, level: EducationLevel.PRIMARY, category: "ภาษาไทย" },
  { code: "พท120003", name: "ภาษาเพื่อการสื่อสาร 1", credits: 3, level: EducationLevel.PRIMARY, category: "ภาษาไทย" },
  { code: "พท120004", name: "ภาษาเพื่อการสื่อสาร 2", credits: 3, level: EducationLevel.PRIMARY, category: "ภาษาไทย" },
  { code: "พท120005", name: "ภาษาเพื่อการสื่อสาร 3", credits: 3, level: EducationLevel.PRIMARY, category: "ภาษาไทย" },
  { code: "พท120006", name: "ภาษาเพื่อการสื่อสาร 4", credits: 3, level: EducationLevel.PRIMARY, category: "ภาษาไทย" },
  { code: "พท120007", name: "ภาษาเพื่อการสื่อสาร 5", credits: 3, level: EducationLevel.PRIMARY, category: "ภาษาไทย" },
  { code: "พท120008", name: "ภาษาเพื่อการสื่อสาร 6", credits: 3, level: EducationLevel.PRIMARY, category: "ภาษาไทย" },
  { code: "พท120009", name: "ภาษาเพื่อการสื่อสาร 7", credits: 3, level: EducationLevel.PRIMARY, category: "ภาษาไทย" },
  { code: "พท120010", name: "ภาษาเพื่อการสื่อสาร 8", credits: 3, level: EducationLevel.PRIMARY, category: "ภาษาไทย" },
  { code: "พท120011", name: "การสร้างคำ 1", credits: 3, level: EducationLevel.PRIMARY, category: "ภาษาไทย" },
  { code: "พท120012", name: "ทักษะการสื่อสารเพื่อการบริการลูกค้าและการสร้างเครือข่าย", credits: 3, level: EducationLevel.PRIMARY, category: "ภาษาไทย" },
  { code: "พท120013", name: "ภาษาไทยเพื่อการสื่อสารในงานอาชีพ", credits: 3, level: EducationLevel.PRIMARY, category: "ภาษาไทย" },
  { code: "พท120014", name: "เรียนรู้สนุกกับวรรณคดีไทย", credits: 3, level: EducationLevel.PRIMARY, category: "ภาษาไทย" },
  { code: "พท120015", name: "การเขียน 1", credits: 3, level: EducationLevel.PRIMARY, category: "ภาษาไทย" },
  { code: "พท120016", name: "การพูด 1", credits: 3, level: EducationLevel.PRIMARY, category: "ภาษาไทย" },
  { code: "พท120017", name: "อ่านดีมีประโยชน์", credits: 3, level: EducationLevel.PRIMARY, category: "ภาษาไทย" },
  // ภาษาต่างประเทศ
  { code: "พต120001", name: "ภาษาอังกฤษเพื่อการสื่อสารเบื้องต้น", credits: 3, level: EducationLevel.PRIMARY, category: "ภาษาต่างประเทศ" },
  { code: "พต120002", name: "ภาษาอังกฤษเพื่อการเอาชีวิตรอดจากภัยพิบัติทางธรรมชาติ", credits: 3, level: EducationLevel.PRIMARY, category: "ภาษาต่างประเทศ" },
  { code: "พต120003", name: "ภาษาจีนเพื่อการสื่อสาร 1", credits: 3, level: EducationLevel.PRIMARY, category: "ภาษาต่างประเทศ" },
  // คณิตศาสตร์
  { code: "พค120001", name: "การทำบัญชีเบื้องต้น", credits: 3, level: EducationLevel.PRIMARY, category: "คณิตศาสตร์" },
  { code: "พค120002", name: "การวัดเบื้องต้น", credits: 3, level: EducationLevel.PRIMARY, category: "คณิตศาสตร์" },
  { code: "พค120003", name: "คณิตศาสตร์กับโครงงานสร้างสรรค์", credits: 3, level: EducationLevel.PRIMARY, category: "คณิตศาสตร์" },
  { code: "พค120004", name: "รอบรู้คณิตศาสตร์ในชีวิตประจำวัน 1", credits: 3, level: EducationLevel.PRIMARY, category: "คณิตศาสตร์" },
  { code: "พค120005", name: "รูปเรขาคณิตกับการออกแบบผลิตภัณฑ์", credits: 3, level: EducationLevel.PRIMARY, category: "คณิตศาสตร์" },
  // วิทยาศาสตร์
  { code: "พว120001", name: "การใช้พลังงานไฟฟ้าในชีวิตประจำวัน 1", credits: 3, level: EducationLevel.PRIMARY, category: "วิทยาศาสตร์" },
  { code: "พว120002", name: "พัฒนาศักยภาพพื้นฐาน 1", credits: 3, level: EducationLevel.PRIMARY, category: "วิทยาศาสตร์" },
  { code: "พว120003", name: "พัฒนาศักยภาพพื้นฐาน 2", credits: 3, level: EducationLevel.PRIMARY, category: "วิทยาศาสตร์" },
  { code: "พว120004", name: "พัฒนาศักยภาพพื้นฐาน 3", credits: 3, level: EducationLevel.PRIMARY, category: "วิทยาศาสตร์" },
  { code: "พว120005", name: "พัฒนาศักยภาพพื้นฐาน 4", credits: 3, level: EducationLevel.PRIMARY, category: "วิทยาศาสตร์" },
  { code: "พว120006", name: "วัสดุศาสตร์ 1", credits: 3, level: EducationLevel.PRIMARY, category: "วิทยาศาสตร์" },
  { code: "พว120007", name: "การจัดการขยะมูลฝอยในชุมชน", credits: 3, level: EducationLevel.PRIMARY, category: "วิทยาศาสตร์" },
  { code: "พว120008", name: "วิทยาศาสตร์เพื่อสุขภาพ 1", credits: 3, level: EducationLevel.PRIMARY, category: "วิทยาศาสตร์" },
  { code: "พว120009", name: "เทคนิคปฏิบัติการด้านวิทยาศาสตร์ 1", credits: 3, level: EducationLevel.PRIMARY, category: "วิทยาศาสตร์" },
  // เทคโนโลยีดิจิทัล
  { code: "ทด120001", name: "รู้ทันข่าวและข่าวปลอม (Fake NEWS)", credits: 3, level: EducationLevel.PRIMARY, category: "เทคโนโลยีดิจิทัล" },
  { code: "ทด120002", name: "อาชญากรรมบนโลกออนไลน์", credits: 3, level: EducationLevel.PRIMARY, category: "เทคโนโลยีดิจิทัล" },
  { code: "ทด120003", name: "เอไอขั้นพื้นฐานสำหรับการเรียนรู้", credits: 3, level: EducationLevel.PRIMARY, category: "เทคโนโลยีดิจิทัล" },
  // การงานอาชีพ
  { code: "กอ120001", name: "พนักงานทำความสะอาด", credits: 3, level: EducationLevel.PRIMARY, category: "การงานอาชีพ" },
  { code: "กอ120002", name: "การทำปุ๋ยหมัก", credits: 3, level: EducationLevel.PRIMARY, category: "การงานอาชีพ" },
  { code: "กอ120003", name: "การถนอมอาหาร", credits: 3, level: EducationLevel.PRIMARY, category: "การงานอาชีพ" },
  { code: "กอ120004", name: "ช่องทางการเข้าสู่อาชีพให้มีอยู่มีกิน", credits: 3, level: EducationLevel.PRIMARY, category: "การงานอาชีพ" },
  { code: "กอ120005", name: "อาชีพแม่บ้าน", credits: 3, level: EducationLevel.PRIMARY, category: "การงานอาชีพ" },
  // สุขภาวะและศิลปะ
  { code: "สศ120001", name: "ศิลปะพื้นบ้าน", credits: 3, level: EducationLevel.PRIMARY, category: "สุขภาวะและศิลปะ" },
  { code: "สศ120002", name: "การขับร้องเบื้องต้น", credits: 3, level: EducationLevel.PRIMARY, category: "สุขภาวะและศิลปะ" },
  { code: "สศ120003", name: "การป้องกันและบรรเทาสาธารณภัย", credits: 3, level: EducationLevel.PRIMARY, category: "สุขภาวะและศิลปะ" },
  // สังคมศึกษา
  { code: "สค120004", name: "พัฒนาคุณภาพชีวิต 1", credits: 3, level: EducationLevel.PRIMARY, category: "สังคมศึกษา" },
  { code: "สค120005", name: "พัฒนาคุณภาพชีวิต 2", credits: 3, level: EducationLevel.PRIMARY, category: "สังคมศึกษา" },
  { code: "สค120006", name: "พัฒนาคุณภาพชีวิต 3", credits: 3, level: EducationLevel.PRIMARY, category: "สังคมศึกษา" },
  { code: "สค120007", name: "พัฒนาคุณภาพชีวิต 4", credits: 3, level: EducationLevel.PRIMARY, category: "สังคมศึกษา" },
  { code: "สค120008", name: "ด้านทุจริตศึกษา จิตพอเพียง สร้างสังคมใสสะอาด 1", credits: 3, level: EducationLevel.PRIMARY, category: "สังคมศึกษา" },
  { code: "สค120009", name: "ประวัติศาสตร์ชาติไทย 1", credits: 3, level: EducationLevel.PRIMARY, category: "สังคมศึกษา" },
  { code: "สค120010", name: "ภูมิศาสตร์ไทยกับภัยพิบัติที่ควรรู้", credits: 3, level: EducationLevel.PRIMARY, category: "สังคมศึกษา" },
  { code: "สค120011", name: "การเงินเพื่อชีวิต 1", credits: 3, level: EducationLevel.PRIMARY, category: "สังคมศึกษา" },
  { code: "สค120012", name: "ลูกเสือ สกร. 1", credits: 3, level: EducationLevel.PRIMARY, category: "สังคมศึกษา" },
  // === ระดับมัธยมศึกษาตอนต้น ===
  // ภาษาไทย
  { code: "พท220001", name: "ภาษาไทยกับทักษะการเรียนรู้ 2", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "ภาษาไทย" },
  { code: "พท220003", name: "การเขียนเพื่อการโฆษณาและประชาสัมพันธ์", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "ภาษาไทย" },
  { code: "พท220004", name: "การสร้างคำ 2", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "ภาษาไทย" },
  { code: "พท220005", name: "การสะกดคำและการใช้ภาษาในสาขาวิชาและอาชีพ", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "ภาษาไทย" },
  { code: "พท220006", name: "ประวัติวรรณคดีและวรรณกรรม", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "ภาษาไทย" },
  { code: "พท220007", name: "เรียนรู้การใช้ประโยคอย่างเข้าใจ", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "ภาษาไทย" },
  { code: "พท220008", name: "ศิลปะการพูด", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "ภาษาไทย" },
  { code: "พท220009", name: "อ่านเป็น รู้รอบ ต่อยอดปัญญา", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "ภาษาไทย" },
  // ภาษาต่างประเทศ
  { code: "พต220002", name: "ภาษาอังกฤษเพื่อการสื่อสารระดับกลาง", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "ภาษาต่างประเทศ" },
  { code: "พต220003", name: "ไวยากรณ์ภาษาอังกฤษ 1", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "ภาษาต่างประเทศ" },
  { code: "พต220004", name: "การอ่านภาษาอังกฤษเพื่อการเอาชีวิตรอดจากภัยพิบัติทางธรรมชาติ", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "ภาษาต่างประเทศ" },
  { code: "พต220005", name: "การเขียนภาษาอังกฤษเพื่ออาชีพและการสมัครงาน", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "ภาษาต่างประเทศ" },
  { code: "พต220006", name: "ภาษาจีนเพื่อการสื่อสาร 2", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "ภาษาต่างประเทศ" },
  // คณิตศาสตร์
  { code: "พค220001", name: "คณิตศาสตร์กับอาชีพก่อสร้าง", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "คณิตศาสตร์" },
  { code: "พค220002", name: "คณิตศาสตร์เพื่อการค้าขาย", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "คณิตศาสตร์" },
  { code: "พค220003", name: "โครงงานคณิตศาสตร์เพื่ออนาคต", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "คณิตศาสตร์" },
  { code: "พค220004", name: "อัตราส่วน สัดส่วน ร้อยละและบัญชีในชีวิตประจำวัน", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "คณิตศาสตร์" },
  { code: "พค220005", name: "การอ่านแบบเบื้องต้น", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "คณิตศาสตร์" },
  // วิทยาศาสตร์
  { code: "พว220001", name: "การใช้พลังงานไฟฟ้าในชีวิตประจำวัน 2", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "วิทยาศาสตร์" },
  { code: "พว220002", name: "วัสดุศาสตร์ 2", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "วิทยาศาสตร์" },
  { code: "พว220003", name: "วิทยาศาสตร์กับการท่องเที่ยว", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "วิทยาศาสตร์" },
  { code: "พว220004", name: "วิทยาศาสตร์เพื่อสุขภาพ 2", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "วิทยาศาสตร์" },
  { code: "พว220005", name: "เทคนิคปฏิบัติการด้านวิทยาศาสตร์ 2", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "วิทยาศาสตร์" },
  { code: "พว220006", name: "วิทยาศาสตร์กับผลิตภัณฑ์ออร์แกนิก", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "วิทยาศาสตร์" },
  // เทคโนโลยีดิจิทัล
  { code: "ทด220001", name: "การผลิตสื่อสร้างสรรค์ในงานอาชีพ", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "เทคโนโลยีดิจิทัล" },
  { code: "ทด220002", name: "เอไอเพื่อการสร้างสรรค์และพัฒนาการเรียนรู้", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "เทคโนโลยีดิจิทัล" },
  { code: "ทด220003", name: "การสร้างเว็บไซต์", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "เทคโนโลยีดิจิทัล" },
  // การงานอาชีพ
  { code: "กอ220001", name: "คุณธรรมและจริยธรรมอาชีพเกษตรกรรม", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "การงานอาชีพ" },
  { code: "กอ220002", name: "การขายสินค้าออนไลน์", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "การงานอาชีพ" },
  { code: "กอ220003", name: "การปลูกมะเขือเทศ", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "การงานอาชีพ" },
  { code: "กอ220004", name: "ช่องทางการพัฒนาอาชีพให้มีความเข้มแข็ง", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "การงานอาชีพ" },
  // สุขภาวะและศิลปะ
  { code: "สศ220001", name: "การปฐมพยาบาลเบื้องต้น", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "สุขภาวะและศิลปะ" },
  { code: "สศ220002", name: "การดูแลชีวิตในแต่ละช่วงวัย", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "สุขภาวะและศิลปะ" },
  { code: "สศ220003", name: "การขับร้องเพลงไทยสากลเบื้องต้น", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "สุขภาวะและศิลปะ" },
  // สังคมศึกษา
  { code: "สค220004", name: "ด้านทุจริตศึกษา จิตพอเพียง สร้างสังคมใสสะอาด 2", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "สังคมศึกษา" },
  { code: "สค220005", name: "ประวัติศาสตร์ชาติไทย 2", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "สังคมศึกษา" },
  { code: "สค220006", name: "ภูมิศาสตร์ไทยและทวีปเอเชีย กับภัยพิบัติทางธรรมชาติ", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "สังคมศึกษา" },
  { code: "สค220007", name: "การเงินเพื่อชีวิต 2", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "สังคมศึกษา" },
  { code: "สค220008", name: "ลูกเสือ สกร. 2", credits: 3, level: EducationLevel.JUNIOR_HIGH, category: "สังคมศึกษา" },
  // === ระดับมัธยมศึกษาตอนปลาย ===
  // ภาษาไทย
  { code: "พท320001", name: "ภาษาไทยกับทักษะการเรียนรู้ 3", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "ภาษาไทย" },
  { code: "พท320006", name: "การพูดเพื่อบุคลิกภาพที่ดี", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "ภาษาไทย" },
  { code: "พท320007", name: "การอ่านเพื่อการเรียนรู้ตลอดชีวิต", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "ภาษาไทย" },
  { code: "พท320008", name: "ภาษาไทยกับการสื่อสาร", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "ภาษาไทย" },
  { code: "พท320009", name: "ภาษาไทยกับโลกอาชีพ : นักเล่า นักขาย นักสร้างแบรนด์", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "ภาษาไทย" },
  { code: "พท320010", name: "นักเล่า นักขาย", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "ภาษาไทย" },
  { code: "พท320011", name: "นักสร้างแบรนด์", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "ภาษาไทย" },
  { code: "พท320012", name: "วรรณกรรมล้ำค่าสืบสานภาษาไทย", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "ภาษาไทย" },
  { code: "พท320013", name: "การเปลี่ยนแปลงทางภาษาไทย", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "ภาษาไทย" },
  { code: "พท320014", name: "การเขียนเพื่องานอาชีพ", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "ภาษาไทย" },
  // ภาษาต่างประเทศ
  { code: "พต320002", name: "ภาษาอังกฤษเพื่อการสื่อสารระดับสูง", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "ภาษาต่างประเทศ" },
  { code: "พต320003", name: "ไวยากรณ์ภาษาอังกฤษ 2", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "ภาษาต่างประเทศ" },
  { code: "พต320004", name: "การอ่านภาษาอังกฤษเพื่อการเอาชีวิตรอดจากภัยพิบัติทางธรรมชาติ", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "ภาษาต่างประเทศ" },
  { code: "พต320005", name: "การเขียนภาษาอังกฤษเพื่ออาชีพและการสมัครงาน", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "ภาษาต่างประเทศ" },
  { code: "พต320006", name: "ทักษะภาษาอังกฤษเพื่อการศึกษาต่อ", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "ภาษาต่างประเทศ" },
  { code: "พต320007", name: "ภาษาจีนเพื่อการสื่อสาร 3", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "ภาษาต่างประเทศ" },
  // คณิตศาสตร์
  { code: "พค320001", name: "คณิตศาสตร์เพื่อการค้าขาย", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "คณิตศาสตร์" },
  { code: "พค320002", name: "คณิตศาสตร์กับการเงิน", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "คณิตศาสตร์" },
  { code: "พค320003", name: "คณิตศาสตร์เพิ่มเติม 1", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "คณิตศาสตร์" },
  { code: "พค320004", name: "คณิตศาสตร์เพิ่มเติม 2", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "คณิตศาสตร์" },
  { code: "พค320005", name: "คณิตศาสตร์เพิ่มเติม 3", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "คณิตศาสตร์" },
  { code: "พค320006", name: "เทคโนโลยีกับการเรียนรู้คณิตศาสตร์", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "คณิตศาสตร์" },
  // วิทยาศาสตร์
  { code: "พว320001", name: "การใช้พลังงานไฟฟ้าในชีวิตประจำวัน 3", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "วิทยาศาสตร์" },
  { code: "พว320002", name: "วัสดุศาสตร์ 3", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "วิทยาศาสตร์" },
  { code: "พว320003", name: "วิทยาศาสตร์สิ่งแวดล้อม", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "วิทยาศาสตร์" },
  { code: "พว320004", name: "วิทยาศาสตร์กับการถนอมอาหาร", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "วิทยาศาสตร์" },
  { code: "พว320005", name: "พืชสมุนไพรกับการดูแลสุขภาพ", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "วิทยาศาสตร์" },
  { code: "พว320006", name: "พลังงานทดแทน", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "วิทยาศาสตร์" },
  { code: "พว320007", name: "ชีววิทยา 1", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "วิทยาศาสตร์" },
  { code: "พว320008", name: "ชีววิทยา 2", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "วิทยาศาสตร์" },
  { code: "พว320009", name: "ชีววิทยา 3", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "วิทยาศาสตร์" },
  { code: "พว320010", name: "เทคนิคปฏิบัติการด้านวิทยาศาสตร์ 3", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "วิทยาศาสตร์" },
  { code: "พว320011", name: "วิทยาศาสตร์กับผลิตภัณฑ์เพื่อ", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "วิทยาศาสตร์" },
  { code: "พว320012", name: "สุขภาพและความงาม", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "วิทยาศาสตร์" },
  { code: "พว320013", name: "วิทยาศาสตร์เพื่อสุขภาพ 3", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "วิทยาศาสตร์" },
  // เทคโนโลยีดิจิทัล
  { code: "ทด320001", name: "การใช้คอมพิวเตอร์ในงานบัญชี", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "เทคโนโลยีดิจิทัล" },
  { code: "ทด320002", name: "คอมพิวเตอร์ในงานธุรกิจ", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "เทคโนโลยีดิจิทัล" },
  { code: "ทด320003", name: "ดิจิทัลฟอร์อีคอมเมิร์ซ", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "เทคโนโลยีดิจิทัล" },
  { code: "ทด320004", name: "วิทยาการคอมพิวเตอร์", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "เทคโนโลยีดิจิทัล" },
  // การงานอาชีพ
  { code: "กอ320001", name: "เกษตรธรรมชาติ MOA", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "การงานอาชีพ" },
  { code: "กอ320002", name: "มัคคุเทศก์ท้องถิ่น", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "การงานอาชีพ" },
  { code: "กอ320003", name: "คุณธรรมและจริยธรรมในการประกอบอาชีพการบริการ", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "การงานอาชีพ" },
  { code: "กอ320004", name: "ช่องทางการขยายอาชีพให้มีความมั่นคง", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "การงานอาชีพ" },
  // สุขภาวะและศิลปะ
  { code: "สศ320001", name: "สุขภาพและความปลอดภัยในชีวิต", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "สุขภาวะและศิลปะ" },
  { code: "สศ320002", name: "โรคอุบัติใหม่", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "สุขภาวะและศิลปะ" },
  { code: "สศ320003", name: "ศิลปะสากล", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "สุขภาวะและศิลปะ" },
  { code: "สศ320004", name: "ดนตรีไทยในแผ่นดินสยาม", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "สุขภาวะและศิลปะ" },
  // สังคมศึกษา
  { code: "สค320004", name: "ด้านทุจริตศึกษา จิตพอเพียง สร้างสังคมใสสะอาด 3", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "สังคมศึกษา" },
  { code: "สค320005", name: "ประวัติศาสตร์ชาติไทย 2", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "สังคมศึกษา" },
  { code: "สค320006", name: "ภูมิศาสตร์ไทยและโลก กับภัยพิบัติทางธรรมชาติ", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "สังคมศึกษา" },
  { code: "สค320007", name: "การเงินเพื่อชีวิต 3", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "สังคมศึกษา" },
  { code: "สค320008", name: "ลูกเสือ สกร. 3", credits: 3, level: EducationLevel.SENIOR_HIGH, category: "สังคมศึกษา" }
];
