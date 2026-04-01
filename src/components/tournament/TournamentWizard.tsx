'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { useTournamentStore } from '@/lib/tournamentStore';
import { ChevronLeft, ChevronRight, Check, Trophy, Calendar, MapPin, Gavel, Settings2 } from 'lucide-react';

type Step = 1 | 2 | 3 | 4;
type TournamentType2 = 'company' | 'group' | 'custom';
type ScoringType = 'side_out' | 'rally';
type SetsType = 'bo1' | 'bo3' | 'bo5';

interface EventConfig {
  category: string;
  division: string;
  format: string;
  max_teams: number;
}

interface WizardData {
  name: string;
  description: string;
  type: TournamentType2;
  events: EventConfig[];
  scoring_system: ScoringType;
  points_target: number;
  sets_format: SetsType;
  has_third_place: boolean;
  entry_fee: number;
  prizes: string;
  special_rules: string;
  registration_open_date: string;
  registration_deadline: string;
  start_date: string;
  end_date: string;
  venue_id: string;
  num_courts: number;
  rest_minutes: number;
}

const CATEGORIES = [
  { value: 'mens_doubles', label: '👨‍👨 Đôi Nam' },
  { value: 'womens_doubles', label: '👩‍👩 Đôi Nữ' },
  { value: 'mixed_doubles', label: '👫 Đôi Hỗn hợp' },
  { value: 'mens_singles', label: '👨 Đơn Nam' },
  { value: 'womens_singles', label: '👩 Đơn Nữ' },
  { value: 'open_doubles', label: '🤝 Open Doubles' },
];

const DIVISIONS = [
  { value: 'open', label: 'Open (Tất cả)' },
  { value: 'advanced', label: 'Advanced (ELO ≥ 1500)' },
  { value: 'intermediate', label: 'Intermediate (1100-1499)' },
  { value: 'beginner', label: 'Beginner (< 1100)' },
];

const FORMATS = [
  { value: 'pool_playoff', label: '⭐ Vòng bảng + Playoff (Khuyên)' },
  { value: 'round_robin', label: '🔄 Vòng tròn' },
  { value: 'single_elim', label: '⚡ Loại trực tiếp đơn' },
  { value: 'double_elim', label: '🔀 Loại trực tiếp kép' },
  { value: 'swiss', label: '🔢 Hệ Thụy Sĩ' },
  { value: 'king_of_court', label: '👑 Vua Sân' },
];

const STEPS = ['Thông tin', 'Nội dung', 'Luật thi đấu', 'Thời gian'];

const DEFAULT: WizardData = {
  name: '', description: '', type: 'custom', events: [],
  scoring_system: 'side_out', points_target: 11, sets_format: 'bo3', has_third_place: true,
  entry_fee: 0, prizes: '', special_rules: '',
  registration_open_date: '', registration_deadline: '', start_date: '', end_date: '',
  venue_id: '', num_courts: 2, rest_minutes: 10,
};

export function TournamentWizard() {
  const router = useRouter();
  const currentUser = useAppStore(s => s.currentUser);
  const venues = useAppStore(s => s.venues);
  const createTournament = useTournamentStore(s => s.createTournament);
  const createTournamentEvent = useTournamentStore(s => s.createTournamentEvent);

  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<WizardData>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (patch: Partial<WizardData>) => { setData(prev => ({ ...prev, ...patch })); setErrors({}); };

  const toggleCategory = (cat: string) => {
    const exists = data.events.find(e => e.category === cat);
    if (exists) {
      update({ events: data.events.filter(e => e.category !== cat) });
    } else {
      update({ events: [...data.events, { category: cat, division: 'open', format: 'pool_playoff', max_teams: 16 }] });
    }
  };

  const updateEvent = (cat: string, patch: Partial<EventConfig>) => {
    update({ events: data.events.map(e => e.category === cat ? { ...e, ...patch } : e) });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (step === 1 && !data.name.trim()) errs.name = 'Tên giải là bắt buộc';
    if (step === 2 && data.events.length === 0) errs.events = 'Chọn ít nhất 1 nội dung thi đấu';
    if (step === 4) {
      if (!data.registration_deadline) errs.deadline = 'Vui lòng chọn hạn đăng ký';
      if (!data.start_date) errs.start = 'Vui lòng chọn ngày thi đấu';
      if (!data.end_date) errs.end = 'Vui lòng chọn ngày kết thúc';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => { if (validate()) setStep(s => Math.min(s + 1, 4) as Step); };
  const prev = () => setStep(s => Math.max(s - 1, 1) as Step);

  const handleSubmit = async () => {
    if (!validate() || !currentUser) return;
    setSaving(true);
    const tournament = await createTournament({
      name: data.name,
      description: data.description || null,
      organizer_id: currentUser.id,
      type: data.type,
      format: 'round_robin',
      category: data.events.map(e => e.category).join(','),
      max_teams: Math.max(...data.events.map(e => e.max_teams), 16),
      registration_open_date: data.registration_open_date || null,
      registration_deadline: data.registration_deadline,
      start_date: data.start_date,
      end_date: data.end_date,
      venue_id: data.venue_id || null,
      scoring_system: data.scoring_system,
      points_target: data.points_target,
      sets_format: data.sets_format,
      rest_minutes: data.rest_minutes,
      has_third_place: data.has_third_place,
      entry_fee: data.entry_fee,
      num_courts: data.num_courts,
      rules: null,
      prizes: data.prizes || null,
      special_rules: data.special_rules || null,
      status: 'registration',
    });
    if (tournament) {
      for (const ev of data.events) {
        await createTournamentEvent({ tournament_id: tournament.id, category: ev.category, division: ev.division, format: ev.format, max_teams: ev.max_teams, teams_advance_per_pool: 2 });
      }
      router.push(`/tournaments/${tournament.id}`);
    } else {
      setErrors({ submit: 'Tạo giải thất bại, vui lòng thử lại' });
    }
    setSaving(false);
  };

  const btnStyle = (active: boolean) => `flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${active ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-[var(--border-color)] hover:border-[var(--primary)]'}`;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center mb-8">
        {STEPS.map((label, idx) => {
          const n = idx + 1;
          const active = step === n;
          const done = step > n;
          return (
            <div key={idx} className="flex-1 flex items-center">
              <div className={`flex items-center gap-2 ${active ? 'text-[var(--primary)]' : done ? 'text-green-500' : 'text-[var(--muted-fg)]'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${active ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : done ? 'border-green-500 bg-green-500 text-white' : 'border-[var(--border-color)]'}`}>
                  {done ? <Check className="w-4 h-4" /> : n}
                </div>
                <span className="text-xs font-medium hidden sm:block">{label}</span>
              </div>
              {idx < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${done ? 'bg-green-400' : 'bg-[var(--border-color)]'}`} />}
            </div>
          );
        })}
      </div>

      <div className="card p-6 space-y-5 animate-in">

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <h2 className="text-lg font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-[var(--primary)]" /> Thông tin giải</h2>
            <div>
              <label className="block text-sm font-medium mb-1.5">Tên giải <span className="text-red-500">*</span></label>
              <input className={`input ${errors.name ? 'error' : ''}`} value={data.name} onChange={e => update({ name: e.target.value })} placeholder="VD: VNPAY Pickle Championship Q2/2026" />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Mô tả</label>
              <textarea className="input min-h-[80px] resize-none" value={data.description} onChange={e => update({ description: e.target.value })} placeholder="Mô tả về giải đấu..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Loại giải</label>
              <div className="grid grid-cols-3 gap-2">
                {[['company', '🏢 Công ty'], ['group', '👥 Nhóm'], ['custom', '🎯 Tự do']].map(([val, label]) => (
                  <button key={val} onClick={() => update({ type: val as TournamentType2 })} className={btnStyle(data.type === val)}>{label}</button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <h2 className="text-lg font-bold flex items-center gap-2"><Settings2 className="w-5 h-5 text-[var(--primary)]" /> Nội dung thi đấu</h2>
            {errors.events && <p className="text-xs text-red-500 p-2 bg-red-50 rounded-lg">{errors.events}</p>}
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => {
                const selected = !!data.events.find(e => e.category === cat.value);
                return (
                  <button key={cat.value} onClick={() => toggleCategory(cat.value)} className={`p-3 rounded-xl border text-left text-sm transition-all ${selected ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/20' : 'border-[var(--border-color)] hover:border-[var(--primary)]'}`}>
                    <span className="font-medium">{cat.label}</span>
                    {selected && <Check className="w-3.5 h-3.5 inline ml-1 text-[var(--primary)]" />}
                  </button>
                );
              })}
            </div>
            {data.events.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Cấu hình từng nội dung:</p>
                {data.events.map(ev => (
                  <div key={ev.category} className="p-3 rounded-xl bg-[var(--muted)] space-y-2">
                    <p className="text-sm font-semibold">{CATEGORIES.find(c => c.value === ev.category)?.label}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-[var(--muted-fg)] block mb-1">Hạng trình độ</label>
                        <select className="input text-sm py-1.5" value={ev.division} onChange={e => updateEvent(ev.category, { division: e.target.value })}>
                          {DIVISIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-[var(--muted-fg)] block mb-1">Số đội tối đa</label>
                        <select className="input text-sm py-1.5" value={ev.max_teams} onChange={e => updateEvent(ev.category, { max_teams: Number(e.target.value) })}>
                          {[8, 16, 32, 64].map(n => <option key={n} value={n}>{n} đội</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-[var(--muted-fg)] block mb-1">Thể thức</label>
                      <select className="input text-sm py-1.5" value={ev.format} onChange={e => updateEvent(ev.category, { format: e.target.value })}>
                        {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <>
            <h2 className="text-lg font-bold flex items-center gap-2"><Gavel className="w-5 h-5 text-[var(--primary)]" /> Luật thi đấu</h2>
            <div>
              <label className="text-sm font-medium block mb-2">Hệ thống tính điểm</label>
              <div className="space-y-2">
                {[['side_out', 'Side-out Scoring (mặc định)'], ['rally', 'Rally Scoring']].map(([val, label]) => (
                  <label key={val} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer ${data.scoring_system === val ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-900/20' : 'border-[var(--border-color)]'}`}>
                    <input type="radio" name="scoring" value={val} checked={data.scoring_system === val} onChange={() => update({ scoring_system: val as ScoringType })} />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Điểm tới</label>
              <div className="flex gap-2">
                {[11, 15, 21].map(p => (
                  <button key={p} onClick={() => update({ points_target: p })} className={btnStyle(data.points_target === p)}>{p}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Số set</label>
              <div className="flex gap-2">
                {[['bo1', 'Best of 1'], ['bo3', 'Best of 3 ★'], ['bo5', 'Best of 5']].map(([val, label]) => (
                  <button key={val} onClick={() => update({ sets_format: val as SetsType })} className={btnStyle(data.sets_format === val)}>{label}</button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={data.has_third_place} onChange={e => update({ has_third_place: e.target.checked })} className="w-4 h-4 accent-[var(--primary)]" />
              <span className="text-sm">Có trận tranh hạng 3</span>
            </label>
            <div>
              <label className="text-sm font-medium block mb-1.5">Phí tham dự (đồng, 0 = miễn phí)</label>
              <input type="number" min="0" className="input" value={data.entry_fee} onChange={e => update({ entry_fee: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Giải thưởng</label>
              <textarea className="input min-h-[60px] resize-none text-sm" value={data.prizes} onChange={e => update({ prizes: e.target.value })} placeholder="VD: Vô địch: 5 triệu, Á quân: 3 triệu..." />
            </div>
          </>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <>
            <h2 className="text-lg font-bold flex items-center gap-2"><Calendar className="w-5 h-5 text-[var(--primary)]" /> Thời gian & Địa điểm</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Bắt đầu đăng ký</label>
                <input type="date" className="input" value={data.registration_open_date} onChange={e => update({ registration_open_date: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Hạn đăng ký <span className="text-red-500">*</span></label>
                <input type="date" className={`input ${errors.deadline ? 'error' : ''}`} value={data.registration_deadline} onChange={e => update({ registration_deadline: e.target.value })} />
                {errors.deadline && <p className="text-xs text-red-500 mt-1">{errors.deadline}</p>}
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Ngày thi đấu <span className="text-red-500">*</span></label>
                <input type="date" className={`input ${errors.start ? 'error' : ''}`} value={data.start_date} onChange={e => update({ start_date: e.target.value })} />
                {errors.start && <p className="text-xs text-red-500 mt-1">{errors.start}</p>}
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Ngày kết thúc <span className="text-red-500">*</span></label>
                <input type="date" className={`input ${errors.end ? 'error' : ''}`} value={data.end_date} onChange={e => update({ end_date: e.target.value })} />
                {errors.end && <p className="text-xs text-red-500 mt-1">{errors.end}</p>}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5"><MapPin className="w-3.5 h-3.5 inline mr-1" />Địa điểm</label>
              <select className="input" value={data.venue_id} onChange={e => update({ venue_id: e.target.value })}>
                <option value="">-- Chọn sân --</option>
                {venues.map(v => <option key={v.id} value={v.id}>{v.name}{v.district ? ` — ${v.district}` : ''}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Số sân sử dụng</label>
                <input type="number" min="1" max="20" className="input" value={data.num_courts} onChange={e => update({ num_courts: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Nghỉ giữa trận</label>
                <select className="input" value={data.rest_minutes} onChange={e => update({ rest_minutes: Number(e.target.value) })}>
                  {[5, 10, 15, 20].map(m => <option key={m} value={m}>{m} phút</option>)}
                </select>
              </div>
            </div>
            {errors.submit && <p className="text-sm text-red-500 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">{errors.submit}</p>}
          </>
        )}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between mt-6">
        <button onClick={prev} disabled={step === 1} className="btn btn-ghost flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Quay lại
        </button>
        <span className="text-sm text-[var(--muted-fg)]">Bước {step}/4</span>
        {step < 4 ? (
          <button onClick={next} className="btn btn-gradient flex items-center gap-1">
            Tiếp theo <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={saving} className="btn btn-gradient flex items-center gap-1">
            {saving ? 'Đang tạo...' : '🚀 Tạo giải đấu'}
          </button>
        )}
      </div>
    </div>
  );
}
