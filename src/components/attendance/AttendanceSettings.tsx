'use client';
// ─── AttendanceSettings — Form cài đặt điểm danh (Owner/Admin) ───

import { useState } from 'react';
import { Settings2, Save, Loader2 } from 'lucide-react';
import { upsertAttendanceSettings } from '@/lib/supabase/attendanceApi';
import type { AttendanceSettings } from '@/types';

interface Props {
  groupId: string;
  scheduleId?: string;
  initial?: Partial<AttendanceSettings>;
  onSaved?: () => void;
}

export function AttendanceSettingsPanel({ groupId, scheduleId, initial, onSaved }: Props) {
  const [settings, setSettings] = useState<Omit<AttendanceSettings, 'id' | 'group_id' | 'schedule_id'>>({
    require_rsvp: initial?.require_rsvp ?? true,
    rsvp_deadline_hours: initial?.rsvp_deadline_hours ?? 2,
    checkin_open_before_minutes: initial?.checkin_open_before_minutes ?? 30,
    checkin_close_after_minutes: initial?.checkin_close_after_minutes ?? 15,
    qr_checkin_enabled: initial?.qr_checkin_enabled ?? false,
    inactive_reminder_enabled: initial?.inactive_reminder_enabled ?? true,
    inactive_threshold_sessions: initial?.inactive_threshold_sessions ?? 3,
    monthly_digest_enabled: initial?.monthly_digest_enabled ?? true,
    show_streak: initial?.show_streak ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof typeof settings>(k: K, v: (typeof settings)[K]) =>
    setSettings(s => ({ ...s, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await upsertAttendanceSettings(groupId, scheduleId ?? null, settings);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved?.();
  };

  const Toggle = ({ label, desc, field }: { label: string; desc?: string; field: keyof typeof settings }) => (
    <label className="flex items-start justify-between gap-4 cursor-pointer group">
      <div>
        <p className="text-sm font-semibold group-hover:text-[var(--primary)] transition-colors">{label}</p>
        {desc && <p className="text-xs text-[var(--muted-fg)] mt-0.5">{desc}</p>}
      </div>
      <button
        type="button"
        onClick={() => set(field, !settings[field] as (typeof settings)[typeof field])}
        className={`relative w-11 h-6 rounded-full transition-all shrink-0 ${
          settings[field] ? 'bg-[var(--primary)]' : 'bg-[var(--border-color)]'
        }`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
          settings[field] ? 'left-6' : 'left-1'
        }`} />
      </button>
    </label>
  );

  const NumberInput = ({ label, field, min, max, suffix }: {
    label: string; field: keyof typeof settings; min?: number; max?: number; suffix?: string;
  }) => (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={settings[field] as number}
          onChange={e => set(field, parseInt(e.target.value) as (typeof settings)[typeof field])}
          min={min}
          max={max}
          className="w-20 input text-sm text-right"
        />
        {suffix && <span className="text-xs text-[var(--muted-fg)] whitespace-nowrap">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Settings2 className="w-5 h-5 text-[var(--primary)]" />
        <h3 className="font-bold text-base">Cài đặt điểm danh</h3>
      </div>

      {/* RSVP */}
      <div className="card p-4 space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted-fg)]">RSVP</p>
        <Toggle
          label="Yêu cầu RSVP trước buổi chơi"
          desc="Nhắc thành viên xác nhận tham gia"
          field="require_rsvp"
        />
        {settings.require_rsvp && (
          <NumberInput label="Thời hạn RSVP" field="rsvp_deadline_hours" min={1} max={48} suffix="giờ trước buổi chơi" />
        )}
      </div>

      {/* Check-in */}
      <div className="card p-4 space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted-fg)]">CHECK-IN</p>
        <NumberInput label="Mở check-in trước" field="checkin_open_before_minutes" min={5} max={120} suffix="phút" />
        <NumberInput label="Đóng check-in sau giờ bắt đầu" field="checkin_close_after_minutes" min={5} max={60} suffix="phút" />
        <Toggle
          label="QR Check-in"
          desc="Cho phép quét mã QR để check-in (Phase 2)"
          field="qr_checkin_enabled"
        />
      </div>

      {/* Notification */}
      <div className="card p-4 space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted-fg)]">NHẮC NHỞ & THỐNG KÊ</p>
        <Toggle
          label="Nhắc thành viên ít hoạt động"
          desc="Gửi thông báo khi vắng liên tục"
          field="inactive_reminder_enabled"
        />
        {settings.inactive_reminder_enabled && (
          <NumberInput label="Ngưỡng vắng" field="inactive_threshold_sessions" min={2} max={10} suffix="buổi liên tục" />
        )}
        <Toggle
          label="Tổng kết tháng (Monthly Digest)"
          desc="Thống kê cuối tháng gửi cho cả nhóm"
          field="monthly_digest_enabled"
        />
        <Toggle
          label="Hiển thị streak trên profile"
          field="show_streak"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full btn btn-gradient flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? '✅ Đã lưu!' : 'Lưu cài đặt'}
      </button>
    </div>
  );
}
