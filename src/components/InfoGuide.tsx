import React, { useState } from "react";
import { BookOpen, GraduationCap, Clock, Award, ShieldCheck, Landmark, ListTodo } from "lucide-react";

export default function InfoGuide() {
  const [activeTab, setActiveTab] = useState<number>(0);

  const guideChapters = [
    {
      title: "บทที่ 1: บทนำและหลักการทั่วไป",
      icon: BookOpen,
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p className="font-semibold text-gray-900 text-sm">หลักการและเจตนารมณ์</p>
          <p>
            หลักสูตรส่งเสริมการเรียนรู้เพื่อคุณวุฒิตามระดับการศึกษาขั้นพื้นฐาน พุทธศักราช 2567 มุ่งส่งเสริมให้บุคคลตระหนักและรับรู้ถึงคุณค่าของการสะสมความรู้ โดยผู้รับบริการสามารถเลือกที่จะเทียบโอนผลการเรียนเดิมที่เรียนค้างจากต่างสถาบัน เพื่ออำนวยประโยชน์ในการประหยัดเวลา ไม่ต้องเรียนซ้ำในสิ่งที่เคยผ่านเกณฑ์มาแล้ว
          </p>
          <p>
            การยื่นคำขอควรทำในภาคเรียนแรก เพื่อจัดทำ <strong>แผนการเรียนส่วนบุคคล</strong> และดำเนินงานตามความพร้อมของระบบทะเบียน สกร.
          </p>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 text-emerald-950 space-y-1">
            <p className="font-bold flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-700" /> คุณสมบัติพื้นฐานของผู้ขอเทียบโอน:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>ต้องไม่เป็นนักเรียนหรือนักศึกษาในระดับเดียวกันของสถานศึกษาอื่น</li>
              <li>ต้องขึ้นทะเบียนเป็นผู้เรียนตามหลักสูตรร่วมของ สกร. ปี 2567</li>
              <li>ผลการเรียนที่นำมาหักลบเทียบโอน ต้องมาจากสถาบันที่ได้รองรับเกณฑ์มาตรฐานทางกฎหมายศึกษา</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "บทที่ 2: วุฒิการศึกษาตามระดับชั้น",
      icon: GraduationCap,
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p className="font-semibold text-gray-900 text-sm">ขอบข่ายการเทียบในระดับประถมศึกษา ม.ต้น และ ม.ปลาย</p>
          <p>
            รับเทียบโอนวิชาทั้งจากแวดวง <strong>ในระบบ (กพฐ.), นอกระบบ (สกร./กศน. เดิม) และ ปวช.</strong> โดยแบ่งสิทธิได้ไม่เกินโควตาสูงสุด:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-semibold text-center text-gray-950">
            <div className="p-3 bg-amber-50 border border-amber-250/20 rounded-xl">
              <p className="text-amber-800">ระดับประถมศึกษา</p>
              <p className="text-xl font-bold">ไม่เกิน 36 หน่วยกิต</p>
            </div>
            <div className="p-3 bg-indigo-50 border border-indigo-250/20 rounded-xl">
              <p className="text-indigo-800">ระดับมัธยมต้น</p>
              <p className="text-xl font-bold">ไม่เกิน 42 หน่วยกิต</p>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-250/20 rounded-xl">
              <p className="text-purple-800">ระดับมัธยมปลาย</p>
              <p className="text-xl font-bold">ไม่เกิน 57 หน่วยกิต</p>
            </div>
          </div>
          <div className="bg-rose-50 rounded-xl p-4 border border-rose-100 text-rose-950 space-y-1">
            <p className="font-bold flex items-center gap-1.5"><AlertCircle className="w-4 h-4 text-rose-700" /> เงื่อนไขสำคัญห้ามพิจารณา:</p>
            <p>
              ไม่รับเทียบโอนผลการเรียนวิชาใด ๆ ที่สถาบันเดิมลงผลคะแนนเป็น <strong>0, ร, มส</strong> ในใบระเบียบ (Transcript) อย่างเด็ดขาด เนื่องจากถือว่าท่านไม่ผ่านเกณฑ์เบื้องต้นตามสาระสำคัญ
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-1">
            <p className="font-bold">หลักเกณฑ์การเทียบโอนจากหลักฐานการศึกษาเป็นระดับ (แนวทางฯ บทที่ 2):</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>รายวิชาต้นทางกับรายวิชาที่รับเทียบโอนต้องสอดคล้องกันไม่น้อยกว่า <strong>ร้อยละ 60</strong> (คณะกรรมการพิจารณาจากคำอธิบายรายวิชา/ตัวชี้วัด)</li>
              <li>หน่วยกิตต้นทางต้อง <strong>ไม่น้อยกว่า</strong> หน่วยกิตของรายวิชาที่รับเทียบโอน หากน้อยกว่าให้นำรายวิชาอื่นในสาระและมาตรฐานเดียวกันมานับรวมได้</li>
              <li>ใช้ค่าระดับผลการเรียนตามหลักฐานเดิม หากนำหลายรายวิชามาเทียบเป็น 1 รายวิชา ให้ <strong>เฉลี่ยถ่วงน้ำหนักหน่วยกิตแล้วปัดทศนิยมเป็นระดับผลการเรียน 8 ระดับ</strong> (ปัดครึ่งขึ้น เช่น 3.25 เป็น 3.5)</li>
              <li><strong>ผู้จบ ป.4 ก่อน พ.ศ. 2507</strong> ที่ได้ใบสุทธิรวมผลการเรียน: เทียบระดับประถมศึกษา 24 นก. ผล "ผ่าน" (คณิตศาสตร์ 3, ภาษาไทย 3, การงานอาชีพ 3, สุขภาวะและศิลปะ 3, สังคมศึกษาฯ 4, วิชาเลือก 8) — ติ๊กที่ขั้นตอนที่ 1</li>
              <li><strong>นอกระบบ 2551:</strong> หน่วยกิตต้นทางต้องไม่น้อยกว่าวิชา 2567 เช่น ม.ปลาย การงานอาชีพ (5) = ทักษะการขยายอาชีพ 4 + ช่องทางการขยายอาชีพ 2, สุขภาวะและศิลปะ (5) = สุขศึกษา 2 + ศิลปศึกษา 2 + เศรษฐกิจพอเพียง 1, สังคมศึกษาฯ (6) = 3 + 2 + 1</li>
              <li><strong>ปวช. 2562:</strong> เพดานหน่วยกิตขึ้นกับภาคเรียนที่เรียนจบ — ภาคเรียนที่ 1 = 15, 2 = 25, 3 = 40, 4 = 54, 5 = 57 หน่วยกิต</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "บทที่ 3: การศึกษาต่อเนื่องระยะสั้น",
      icon: Clock,
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p className="font-semibold text-gray-900 text-sm">เกณฑ์การศึกษาต่อเนื่องและวิชาชีพ</p>
          <p>
            การศึกษาต่อเนื่อง หมายถึง หลักสูตรวิชาชีพระยะสั้นที่มีมาตรฐาน ฝึกอบรมอาชีพ หรือค่ายวิทยาศาสตร์ที่จัดสกร. ท้องถิ่น หรือพัฒนาฝีมือของทางภาครัฐ
          </p>
          <div className="bg-sky-50 rounded-xl p-4 border border-sky-100 text-sky-950 flex gap-3">
            <Clock className="w-8 h-8 text-sky-600 shrink-0" />
            <div>
              <p className="font-bold">อัตราส่วนคำนวณหน่วยกิตเชิงเวลา:</p>
              <p className="text-sm font-bold text-sky-800 mt-1">อบรมสะสม 40 ชั่วโมง = 1 หน่วยกิตเทียบโอน</p>
              <p className="text-2xs text-gray-600 mt-1">เศษของชั่วโมงที่มีมูลค่าไม่ถึง 40 ชั่วโมง จะไม่ถูกนำมาเศษคิดปัดขึ้นเป็นหน่วยกิต</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="font-bold">ผลการเรียนระเบียบ:</p>
            <p>รายวิชาที่นำวุฒิบัตรประกอบการเทียบโอน จะได้รับระดับคะแนนผลการศึกษาเป็นตัวอักษร <strong>"ผ่าน" (Pass)</strong> โดยคุณมีเกณฑ์ประเมินเบื้องต้นประกอบ</p>
          </div>
        </div>
      )
    },
    {
      title: "บทที่ 4: การเทียบต่างประเทศ",
      icon: Award,
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p className="font-semibold text-gray-900 text-sm">เทียบเท่าหลักสูตรสากล (Foreign equivalence)</p>
          <p>
            ครอบคลุมหลักสูตรแลกเปลี่ยนเยาวชน หรือผู้ที่สำเร็จการศึกษาจากโรงเรียนนานาชาติ / วุฒิการสอบขององค์กรต่างประเทศ:
          </p>
          <ul className="list-decimal pl-4 space-y-1.5 font-medium">
            <li><strong>IGCSE / GCSE / GCE O-A level:</strong> สอบได้ครบตามเกณฑ์เทียบวุฒิ (จบปีที่ 10) ให้ไปเทียบวุฒิที่ สพฐ. หากไม่ครบเกณฑ์ ให้เทียบโอนเท่ากับจบชั้นปี/เกรด 11</li>
            <li><strong>GED (สหรัฐอเมริกา):</strong> หากเทียบวุฒิไม่ได้ตามเกณฑ์ ให้เทียบโอนเท่ากับจบชั้นปี/เกรด 11</li>
            <li><strong>Sixth Form / NZQA (นิวซีแลนด์):</strong> Sixth Form สอบได้อย่างน้อย 5 วิชา ไปเทียบวุฒิได้ มิฉะนั้นเทียบโอนเท่ากับเกรด 11 ส่วน NZQA ต้องมีผลสอบตั้งแต่ Level 2 ขึ้นไป</li>
          </ul>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
            <p className="font-bold">เพดานหน่วยกิตตามชั้นปี/เกรดที่จบ (ตารางที่ 1):</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center font-semibold">
              <div className="p-2 bg-white rounded-lg border border-gray-100">ประถมศึกษา<br />เกรด 4 = 14 นก. · เกรด 5/6 = 24 นก.</div>
              <div className="p-2 bg-white rounded-lg border border-gray-100">มัธยมศึกษาตอนต้น<br />เกรด 7 = 14 นก. · เกรด 8/9 = 32 นก.</div>
              <div className="p-2 bg-white rounded-lg border border-gray-100">มัธยมศึกษาตอนปลาย<br />เกรด 10 = 19 นก. · เกรด 11 = 38 นก.</div>
            </div>
            <p>เกรด 1-3 ไม่รับเทียบโอน · ผลการเรียนที่เทียบโอนได้ระดับ <strong>"ผ่าน"</strong> ทุกรายวิชา · ภาษาต่างประเทศเทียบโอนได้เฉพาะภาษาอังกฤษ</p>
          </div>
          <div className="p-3.5 bg-yellow-50 rounded-xl border border-yellow-250/30 text-yellow-950 flex items-start gap-2">
            <p className="font-bold shrink-0">⚠️ ข้อยกเว้นสำคัญ:</p>
            <p className="text-3xs text-gray-700 leading-normal">
              รายวิชา <strong>ภาษาไทย</strong> และ <strong>สังคมศึกษา ประวัติศาสตร์ และหน้าที่พลเมือง</strong> ไม่สามารถเทียบโอนจากหลักสูตรต่างประเทศได้ในทุกระดับการศึกษา (ผู้เรียนต้องลงทะเบียนเรียนตามหลักสูตร สกร. 2567) ระบบจึงไม่นับหน่วยกิตของสองรายวิชานี้ให้โดยอัตโนมัติ
            </p>
          </div>
        </div>
      )
    },
    {
      title: "บทที่ 5: ประเมินความรู้และประสบการณ์",
      icon: ShieldCheck,
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p className="font-semibold text-gray-900 text-sm">การจัดพอร์ตและสัมภาษณ์เชิงประจักษ์</p>
          <p>
            ใช้สำหรับบุคคลภายนอก วัยคนกรำงาน หรือผู้เรียนผู้ใหญ่ที่มีฝีมือเชิงอาชีพสูง ทักษะความสามารถเทียบเคียงเป้าหมาย สังเคราะห์ได้จากการประกอบอาชีพจริง โดยผ่านสัมภาษณ์ 3 ขั้นตอน:
          </p>
          <div className="space-y-2 pl-2">
            <p><strong>1) การประเมินส่วนบุคคลเบื้องต้น:</strong> ยื่นแสดงทะเบียนพาณิชย์ หลักการใบรับรองการค้า หรือใบผลงาน</p>
            <p><strong>2) สัมภาษณ์เชิงประจักษ์และแฟ้มสะสมงาน:</strong> คณะกรรมการระดับอำเภอร่วมวิเคราะห์เทียบเคียงเป้าหมายสกร. 2567</p>
            <p><strong>3) ตัดสินอนุมัติผล:</strong> ออกผลการวิเคราะห์ระดับคะแนนเป็น 8 ระดับ หรือสัญลักษณ์สอดคล้องตามประเมิน</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 text-amber-950">
            <p className="font-bold">รายวิชาที่เปิดประเมินได้:</p>
            <p>ประเมินได้เฉพาะรายวิชาบังคับของแต่ละสาระการเรียนรู้ ได้แก่ ภาษาไทย ภาษาต่างประเทศ (ภาษาอังกฤษ) คณิตศาสตร์ วิทยาศาสตร์ เทคโนโลยีดิจิทัล การงานอาชีพ สุขภาวะและศิลปะ และสังคมศึกษา ประวัติศาสตร์ และหน้าที่พลเมือง ไม่สามารถประเมินเข้ารายวิชาเลือกได้ และผู้ที่ไม่ผ่านการประเมินจะไม่ถูกนับหน่วยกิต</p>
          </div>
        </div>
      )
    },
    {
      title: "บทที่ 6: การดำเนินงานสถานศึกษา",
      icon: Landmark,
      content: (
        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
          <p className="font-semibold text-gray-900 text-sm">ขั้นตอนและปฏิทินปฏิบัติงาน</p>
          <p>
            งานทะเบียน สกร. จะต้องตั้งและประชุม <strong>คณะทำงานพิจารณาผลการเทียบโอน</strong> ซึ่งประกอบด้วยตัวคณะผู้อำนวยการ ครูชำนาญการ และเจ้าหน้าที่เพื่อจัดทำการบันทึกลงนามด้านหลังวุฒิบัตรรักษาการ
          </p>
          <div className="flex items-center gap-1.5 p-3.5 bg-gray-50 border border-gray-150 rounded-xl">
            <ListTodo className="w-5 h-5 text-emerald-800 shrink-0" />
            <p className="font-mono text-xs">หลังจากการประชุมพิจารณา คณะกรรมการจะสลักหลังหลักฐานฉบับจริง และลงชื่อร่วมลายเซ็น 3 ท่านเป็นที่สิ้นสุดในแบบสรุป สร.สกร.2/2567</p>
          </div>
        </div>
      )
    }
  ];

  const ActiveIcon = guideChapters[activeTab].icon;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-6">
        <BookOpen className="w-5 h-5 text-emerald-600" />
        <div>
          <h2 className="text-md font-semibold text-gray-950">
            คู่มือแนวทางและกฎเกณฑ์การเทียบโอน 2567
          </h2>
          <p className="text-xs text-gray-500">สรุปข้อมูลเชิงกฎหมายและคู่มือขอบข่ายการประเมินจากกระทรวงศึกษาธิการ</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Chapters Left Sidebar */}
        <div className="w-full md:w-1/3 space-y-1.5">
          {guideChapters.map((ch, idx) => {
            const ChIcon = ch.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                  activeTab === idx 
                    ? "bg-emerald-50 text-emerald-900 border-l-4 border-emerald-600" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <ChIcon className={`w-4 h-4 ${activeTab === idx ? "text-emerald-700" : "text-gray-400"}`} />
                {ch.title}
              </button>
            );
          })}
        </div>

        {/* Content Right Panel */}
        <div className="flex-1 border border-gray-100 rounded-2xl p-6 bg-gray-50/20">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
            <ActiveIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-bold text-gray-950 text-xs uppercase tracking-wider">
              {guideChapters[activeTab].title}
            </span>
          </div>

          <div className="animate-fadeIn">
            {guideChapters[activeTab].content}
          </div>
        </div>
      </div>
    </div>
  );
}

// Dummy helper subcomponent for icon inside chapter Content
function AlertCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2500/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
