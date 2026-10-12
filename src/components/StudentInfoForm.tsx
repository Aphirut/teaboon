import React from "react";
import { EducationLevel, OriginCurriculum, StudentInfo } from "../types";
import { foreignGradeOptions, vetSemesterCaps } from "../data/curriculumData";
import { User, ShieldAlert, GraduationCap, FileSpreadsheet, Calendar, MapPin, Hash, Plus, Trash2 } from "lucide-react";

interface StudentInfoFormProps {
  info: StudentInfo;
  onChange: (updated: StudentInfo) => void;
  onAutoPreset: () => void;
  hasPresetAvailable: boolean;
}

export default function StudentInfoForm({
  info,
  onChange,
  onAutoPreset,
  hasPresetAvailable
}: StudentInfoFormProps) {
  const [semesterOptions, setSemesterOptions] = React.useState<string[]>(() => {
    const saved = localStorage.getItem("transfer_semester_options_v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        // Fallback
      }
    }
    return ["1", "2"];
  });

  const [isManagingSemesters, setIsManagingSemesters] = React.useState(false);
  const [newSemesterInput, setNewSemesterInput] = React.useState("");

  // Ensure current info.semester is in the options list using primitive dependency to prevent re-render loop
  const currentSemester = info.semester;
  React.useEffect(() => {
    if (currentSemester) {
      setSemesterOptions(prev => {
        if (!prev.includes(currentSemester)) {
          const updated = [...prev, currentSemester];
          localStorage.setItem("transfer_semester_options_v2", JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    }
  }, [currentSemester]);

  const handleAddSemester = () => {
    const trimmed = newSemesterInput.trim();
    if (!trimmed) return;
    if (semesterOptions.includes(trimmed)) {
      alert("มีชื่อภาคเรียนนี้อยู่แล้วในระบบ");
      return;
    }
    const updated = [...semesterOptions, trimmed];
    setSemesterOptions(updated);
    localStorage.setItem("transfer_semester_options_v2", JSON.stringify(updated));
    setNewSemesterInput("");
    // Automatically select the newly created semester
    onChange({
      ...info,
      semester: trimmed
    });
  };

  const handleDeleteSemester = (opt: string) => {
    if (semesterOptions.length <= 1) {
      alert("ไม่สามารถลบได้ ต้องเหลือภาคเรียนอย่างน้อย 1 ตัวเลือก");
      return;
    }
    const filtered = semesterOptions.filter(x => x !== opt);
    setSemesterOptions(filtered);
    localStorage.setItem("transfer_semester_options_v2", JSON.stringify(filtered));
    
    // If the deleted one was currently selected, select another one
    if (info.semester === opt) {
      onChange({
        ...info,
        semester: filtered[0]
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChange({
      ...info,
      [name]: value
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm space-y-8">
      {/* Header section with level details */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-5 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-950 flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-600" />
            ข้อมูลผู้ขอเทียบโอนผลการเรียน
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            ระบุรายละเอียดส่วนบุคคล และเลือกเป้าหมายระดับการศึกษาที่ต้องการเทียบโอน
          </p>
        </div>
        
        {/* Quick template load alert if available */}
        {hasPresetAvailable && (
          <button
            type="button"
            onClick={onAutoPreset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 rounded-xl text-xs font-semibold border border-emerald-200 transition-all cursor-pointer self-start md:self-auto"
            id="btn-auto-preset"
          >
            <FileSpreadsheet className="w-4 h-4" />
            โหลดวิชาเทียบโอนแนะนำ (Template)
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Target Level */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5" htmlFor="field-level">
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            ระดับการศึกษาสกร.ที่รับเข้าเรียน <span className="text-rose-500">*</span>
          </label>
          <select
            id="field-level"
            name="level"
            value={info.level}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50/50 hover:bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm text-gray-900 transition-all outline-none"
          >
            {Object.values(EducationLevel).map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </div>

        {/* Origin Curriculum */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5" htmlFor="field-originCurriculum">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            หลักสูตรเดิมที่นำมาเทียบโอน <span className="text-rose-500">*</span>
          </label>
          <select
            id="field-originCurriculum"
            name="originCurriculum"
            value={info.originCurriculum}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-gray-50/50 hover:bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm text-gray-900 transition-all outline-none"
          >
            {Object.values(OriginCurriculum).map((cur) => (
              <option key={cur} value={cur}>
                {cur}
              </option>
            ))}
          </select>
        </div>

        {/* Center / Registrar Name */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5" htmlFor="field-centerName">
            <MapPin className="w-4 h-4 text-emerald-600" />
            สถานศึกษา สกร. ที่ดำเนินการเทียบ <span className="text-rose-500">*</span>
          </label>
          <input
            id="field-centerName"
            type="text"
            name="centerName"
            value={info.centerName}
            onChange={handleChange}
            placeholder="เช่น ศูนย์ส่งเสริมการเรียนรู้อำเภอเมืองสระบุรี"
            className="w-full px-4 py-3 bg-gray-50/50 hover:bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm text-gray-900 transition-all outline-none"
          />
        </div>
      </div>

      <div className="border-t border-gray-50 pt-6">
        <h3 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Hash className="w-4 h-4" />
          ประวัติและข้อมูลส่วนตัวของผู้ยื่นความจำนง
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Student Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600" htmlFor="field-name">ชื่อ - นามสกุล <span className="text-rose-500">*</span></label>
            <input
              id="field-name"
              type="text"
              name="name"
              value={info.name}
              onChange={handleChange}
              placeholder="เช่น นายชูเกียรติ สันติธรรม"
              className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 rounded-lg text-sm outline-none"
            />
          </div>

          {/* Student ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600" htmlFor="field-studentId">รหัสประจำตัวผู้เรียน</label>
            <input
              id="field-studentId"
              type="text"
              name="studentId"
              value={info.studentId}
              onChange={handleChange}
              placeholder="ระบุรหัสผู้เรียน (ถ้ามี)"
              className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 rounded-lg text-sm outline-none"
            />
          </div>

          {/* Citizen ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600" htmlFor="field-citizenId">เลขประจำตัวประชาชน <span className="text-rose-500">*</span></label>
            <input
              id="field-citizenId"
              type="text"
              name="citizenId"
              value={info.citizenId}
              onChange={handleChange}
              placeholder="เลขบัตรประจำตัวประชาชน 13 หลัก"
              className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 rounded-lg text-sm outline-none"
            />
          </div>

          {/* Birth Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600" htmlFor="field-birthDate">วัน/เดือน/ปีเกิด <span className="text-rose-500">*</span></label>
            <input
              id="field-birthDate"
              type="text"
              name="birthDate"
              value={info.birthDate}
              onChange={handleChange}
              placeholder="เช่น 15 ตุลาคม 2542"
              className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 rounded-lg text-sm outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          {/* Occupation */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600" htmlFor="field-occupation">อาชีพปัจจุบัน</label>
            <input
              id="field-occupation"
              type="text"
              name="occupation"
              value={info.occupation}
              onChange={handleChange}
              placeholder="เช่น พนักงานบริษัทค้าปลีก / ฝ่ายช่าง"
              className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 rounded-lg text-sm outline-none"
            />
          </div>

          {/* Previous School */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600" htmlFor="field-previousSchool">สถานศึกษาเดิมที่เคยเรียนมา</label>
            <input
              id="field-previousSchool"
              type="text"
              name="previousSchool"
              value={info.previousSchool}
              onChange={handleChange}
              placeholder="เช่น โรงเรียนมัธยมวิทยาสรรค์"
              className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 rounded-lg text-sm outline-none"
            />
          </div>

          {/* Previous District */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600" htmlFor="field-previousDistrict">อำเภอของสถานศึกษาเดิม</label>
            <input
              id="field-previousDistrict"
              type="text"
              name="previousDistrict"
              value={info.previousDistrict}
              onChange={handleChange}
              placeholder="เช่น เมืองสี่แคว"
              className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 rounded-lg text-sm outline-none"
            />
          </div>

          {/* Previous Province */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600" htmlFor="field-previousProvince">จังหวัดของสถานศึกษาเดิม</label>
            <input
              id="field-previousProvince"
              type="text"
              name="previousProvince"
              value={info.previousProvince}
              onChange={handleChange}
              placeholder="เช่น นครสวรรค์"
              className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 rounded-lg text-sm outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Semester & Year */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 relative">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-650" htmlFor="field-semester">ภาคเรียนที่</label>
                <button
                  type="button"
                  onClick={() => setIsManagingSemesters(!isManagingSemesters)}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-0.5 cursor-pointer transition-colors"
                >
                  {isManagingSemesters ? "✕ ปิดแผงจัด" : "+ สร้างภาคเรียนใหม่"}
                </button>
              </div>

              {!isManagingSemesters ? (
                <select
                  id="field-semester"
                  name="semester"
                  value={info.semester}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-205 focus:border-emerald-500 hover:border-gray-300 rounded-lg text-sm outline-none bg-white font-semibold text-gray-850"
                >
                  {semesterOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 animate-fadeIn">
                  <div className="flex gap-1.5 focus-within:z-10">
                    <input
                      type="text"
                      placeholder="เช่น พิเศษ, ภาคฤดูร้อน"
                      value={newSemesterInput}
                      onChange={(e) => setNewSemesterInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSemester();
                        }
                      }}
                      className="flex-1 min-w-0 px-2.5 py-1.5 border border-gray-200 focus:border-emerald-500 rounded-lg text-xs bg-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddSemester}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      เพิ่ม
                    </button>
                  </div>
                  
                  {/* List of current semesters with deletion control */}
                  <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                    {semesterOptions.map((opt) => (
                      <div key={opt} className="flex items-center justify-between text-[11px] py-1 px-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                        <span className="font-semibold text-gray-700">{opt}</span>
                        <div className="flex items-center gap-2">
                          {info.semester === opt && (
                            <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded font-bold">เลือกอยู่</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteSemester(opt)}
                            className="text-gray-400 hover:text-rose-500 p-0.5 transition-colors"
                            title="ลบตัวเลือกนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-605" htmlFor="field-academicYear">ปีการศึกษา</label>
              <input
                id="field-academicYear"
                type="text"
                name="academicYear"
                value={info.academicYear}
                onChange={handleChange}
                placeholder="2567"
                className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 hover:border-gray-300 rounded-lg text-sm outline-none bg-white font-medium text-gray-850"
              />
            </div>
          </div>

          {/* Vet Track (Conditional if vocational origin) */}
          {info.originCurriculum === OriginCurriculum.VET_2562 && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="text-xs font-medium text-emerald-800" htmlFor="field-vetTrack">แผนงาน/ประเภทวิชา ปวช. ที่เรียนผ่านมา</label>
              <input
                id="field-vetTrack"
                type="text"
                name="vetTrack"
                value={info.vetTrack || ""}
                onChange={handleChange}
                placeholder="เช่น บัญชี / ช่างยนต์ / คอมพิวเตอร์ธุรกิจ"
                className="w-full px-3 py-2 border border-emerald-300 focus:border-emerald-600 rounded-lg text-sm outline-none bg-emerald-50/10 placeholder-emerald-800/40"
              />
            </div>
          )}

          {/* ปวช.: เพดานหน่วยกิตตามภาคเรียนที่เรียนจบ (ตารางที่ 6 บทที่ 2) */}
          {info.originCurriculum === OriginCurriculum.VET_2562 && info.level === EducationLevel.SENIOR_HIGH && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="text-xs font-medium text-emerald-800" htmlFor="field-vetSemestersCompleted">เรียนจบ ปวช. ถึงภาคเรียนที่</label>
              <select
                id="field-vetSemestersCompleted"
                value={info.vetSemestersCompleted ?? 5}
                onChange={(e) => onChange({ ...info, vetSemestersCompleted: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 border border-emerald-300 focus:border-emerald-600 rounded-lg text-sm outline-none bg-emerald-50/10"
              >
                {Object.entries(vetSemesterCaps).map(([sem, cap]) => (
                  <option key={sem} value={sem}>
                    ภาคเรียนที่ {sem} (เทียบโอนได้ไม่เกิน {cap} นก.)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* หลักสูตรต่างประเทศ: เพดานหน่วยกิตตามชั้นปี/เกรดที่จบ (ตารางที่ 1 บทที่ 4) */}
          {info.originCurriculum === OriginCurriculum.FOREIGN_CURRICULUM && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="text-xs font-medium text-emerald-800" htmlFor="field-foreignGradeCompleted">ชั้นปี/เกรดที่จบจากต่างประเทศ</label>
              <select
                id="field-foreignGradeCompleted"
                value={info.foreignGradeCompleted ?? foreignGradeOptions[info.level].slice(-1)[0].grade}
                onChange={(e) => onChange({ ...info, foreignGradeCompleted: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 border border-emerald-300 focus:border-emerald-600 rounded-lg text-sm outline-none bg-emerald-50/10"
              >
                {foreignGradeOptions[info.level].map((opt) => (
                  <option key={opt.grade} value={opt.grade}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-500">ชั้นปี/เกรด 1-3 ไม่รับเทียบโอน และรายวิชาภาษาไทย รวมถึงสังคมศึกษาฯ เทียบโอนจากหลักสูตรต่างประเทศไม่ได้</p>
            </div>
          )}

          {/* ผู้เรียนลาออกแล้วสมัครใหม่ ผลการเรียน สกร. 2567 เดิมนำไปใช้ได้โดยตรง */}
          {(info.originCurriculum === OriginCurriculum.CORE_2551 ||
            info.originCurriculum === OriginCurriculum.NFE_2551 ||
            info.originCurriculum === OriginCurriculum.VET_2562) && (
            <label className="flex items-start gap-2 text-xs text-sky-900 bg-sky-50 border border-sky-200 rounded-lg p-3 cursor-pointer md:col-span-2" htmlFor="field-carryOver2567">
              <input
                id="field-carryOver2567"
                type="checkbox"
                checked={!!info.carryOver2567}
                onChange={(e) => onChange({ ...info, carryOver2567: e.target.checked })}
                className="mt-0.5"
              />
              <span>
                <strong>ลาออกแล้วสมัครใหม่ — ผลการเรียน สกร. 2567 ที่เทียบโอนไว้แล้ว นำไปเทียบได้เลย</strong>
                <span className="block text-[11px] text-sky-800">
                  ระบบจะไม่คำนวณเกณฑ์เทียบโอนซ้ำ (หน่วยกิตต้นทาง/ประเภทวิชา/โควตา) ให้กรอกเป็นรายวิชา สกร. 2567 ที่ได้ผลแล้ว โดยจับคู่วิชาและเกรดตามระเบียนเดิม
                  วิชาที่ได้ 0, ร, มส จะไม่ถูกนำมาใช้
                </span>
              </span>
            </label>
          )}

          {/* ผู้จบ ป.4 ก่อน พ.ศ. 2507 (แนวทางฯ บทที่ 2 หน้า 8) */}
          {info.level === EducationLevel.PRIMARY && (
            <label className="flex items-start gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3 cursor-pointer md:col-span-2" htmlFor="field-legacyPrathom4">
              <input
                id="field-legacyPrathom4"
                type="checkbox"
                checked={!!info.legacyPrathom4}
                onChange={(e) => onChange({ ...info, legacyPrathom4: e.target.checked })}
                className="mt-0.5"
              />
              <span>
                <strong>ผู้จบประถมศึกษาปีที่ 4 ก่อน พ.ศ. 2507 และได้ใบสุทธิที่มีผลการเรียนรวม</strong>
                <span className="block text-[11px] text-amber-800">ระบบเทียบโอนให้อัตโนมัติ 24 นก. ผล "ผ่าน" (คณิตศาสตร์ 3, ภาษาไทย 3, การงานอาชีพ 3, สุขภาวะและศิลปะ 3, สังคมศึกษาฯ 4, วิชาเลือก 8) โดยไม่ใช้รายการวิชาในขั้นตอนที่ 2</span>
              </span>
            </label>
          )}
        </div>
      </div>

      {info.originCurriculum === OriginCurriculum.KNOWLEDGE_EXPERIENCE && (
        <div className="p-4 bg-sky-50 rounded-xl border border-sky-100 flex gap-3 text-sky-800 text-xs">
          <ShieldAlert className="w-4 h-4 shrink-0 text-sky-600" />
          <p>
            <strong>คำแนะนำรูปแบบการประเมินความรู้และประสบการณ์:</strong> เป็นการวัดผลผ่านเกณฑ์และมีคณะกรรมการสัมภาษณ์ตรวจพอร์ต โดยรายวิชาที่ผ่านเกณฑ์ประเมินเชิงประจักษ์ จะเทียบเคียงผลการเรียนลงในระบบ 2567 โดยใช้ค่าระดับผลการเรียนเป็นตัวอักษร "ผ่าน" หรือคำนวนย้อนหลังตามระเบียบ
          </p>
        </div>
      )}
    </div>
  );
}
