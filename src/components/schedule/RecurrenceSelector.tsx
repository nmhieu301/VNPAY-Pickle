'use client';

// ═══════════════════════════════════════════
// VNPAY Pickle — RecurrenceSelector Component
// UI chọn kiểu lặp + ngày thực hiện
// ═══════════════════════════════════════════

import { useState } from 'react';
import type { RecurrenceType } from '@/types';

// DB convention: 1=CN, 2=T2 ... 7=T7
const WEEK_DAYS = [
  { db: 2, label: 'T2' }, { db: 3, label: 'T3' }, { db: 4, label: 'T4' },
  { db: 5, label: 'T5' }, { db: 6, label: 'T6' }, { db: 7, label: 'T7' },
  { db: 1, label: 'CN' },
];

export interface RecurrenceValue {
  type: RecurrenceType;
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  monthlyWeek?: number;
  monthlyWeekday?: number;
  customIntervalDays?: number;
  endsOn?: string;
  maxOccurrences?: number;
  endMode: 'never' | 'date' | 'count';
}

interface Props {
  value: RecurrenceValue;
  onChange: (v: RecurrenceValue) => void;
}

export function RecurrenceSelector({ value, onChange }: Props) {
  const set = (patch: Partial<RecurrenceValue>) => onChange({ ...value, ...patch });

  const toggleDay = (db: number) => {
    const days = value.daysOfWeek ?? [];
    const next = days.includes(db) ? days.filter(d => d !== db) : [...days, db];
    set({ daysOfWeek: next.sort() });
  };

  const toggleMonthDay = (d: number) => {
    const days = value.daysOfMonth ?? [];
    const next = days.includes(d) ? days.filter(x => x !== d) : [...days, d];
    set({ daysOfMonth: next.sort((a, b) => a - b) });
  };

  return (
    <div className="space-y-4">
      {/* Kiểu lặp */}
      <div>
        <label className="text-sm font-medium mb-2 block">Kiểu lặp</label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { v: 'weekly', label: '📅 Hàng tuần' },
            { v: 'monthly_date', label: '🗓 Hàng tháng (ngày cố định)' },
            { v: 'monthly_weekday', label: '📆 Hàng tháng (thứ trong tuần)' },
            { v: 'custom_days', label: '⚙️ Tuỳ chỉnh (mỗi N ngày)' },
          ] as const).map(opt => (
            <button
              key={opt.v}
              type="button"
              onClick={() => set({ type: opt.v as RecurrenceType })}
              className={`p-3 rounded-xl text-sm text-left border transition-all ${
                value.type === opt.v
                  ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-950/30 text-[var(--primary)]'
                  : 'border-[var(--border-color)] hover:border-[var(--muted-fg)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Weekly: chọn ngày trong tuần */}
      {value.type === 'weekly' && (
        <div>
          <label className="text-sm font-medium mb-2 block">Các ngày trong tuần</label>
          <div className="flex gap-2 flex-wrap">
            {WEEK_DAYS.map(day => (
              <button
                key={day.db}
                type="button"
                onClick={() => toggleDay(day.db)}
                className={`w-11 h-11 rounded-full text-sm font-bold border transition-all ${
                  (value.daysOfWeek ?? []).includes(day.db)
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'border-[var(--border-color)] hover:border-[var(--primary)] text-[var(--muted-fg)]'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
          {(value.daysOfWeek ?? []).length === 0 && (
            <p className="text-xs text-red-500 mt-1">Chọn ít nhất 1 ngày</p>
          )}
        </div>
      )}

      {/* Monthly Date: chọn ngày trong tháng */}
      {value.type === 'monthly_date' && (
        <div>
          <label className="text-sm font-medium mb-2 block">Ngày trong tháng</label>
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => toggleMonthDay(d)}
                className={`w-9 h-9 rounded-lg text-xs font-medium border transition-all ${
                  (value.daysOfMonth ?? []).includes(d)
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'border-[var(--border-color)] hover:border-[var(--primary)] text-[var(--muted-fg)]'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Weekday: tuần thứ mấy + thứ mấy */}
      {value.type === 'monthly_weekday' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Tuần trong tháng</label>
            <select
              value={value.monthlyWeek ?? 1}
              onChange={e => set({ monthlyWeek: Number(e.target.value) })}
              className="input"
            >
              <option value={1}>Tuần đầu</option>
              <option value={2}>Tuần thứ 2</option>
              <option value={3}>Tuần thứ 3</option>
              <option value={4}>Tuần thứ 4</option>
              <option value={-1}>Tuần cuối</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Thứ</label>
            <select
              value={value.monthlyWeekday ?? 2}
              onChange={e => set({ monthlyWeekday: Number(e.target.value) })}
              className="input"
            >
              {WEEK_DAYS.map(d => <option key={d.db} value={d.db}>{d.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Custom: mỗi N ngày */}
      {value.type === 'custom_days' && (
        <div>
          <label className="text-sm font-medium mb-1.5 block">Lặp mỗi</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={60}
              value={value.customIntervalDays ?? 7}
              onChange={e => set({ customIntervalDays: Number(e.target.value) || 7 })}
              className="input w-24"
            />
            <span className="text-sm text-[var(--muted-fg)]">ngày</span>
          </div>
        </div>
      )}

      {/* Kết thúc lặp */}
      <div>
        <label className="text-sm font-medium mb-2 block">Kết thúc</label>
        <div className="space-y-2">
          {([
            { v: 'never', label: 'Không kết thúc' },
            { v: 'date', label: 'Đến ngày cụ thể' },
            { v: 'count', label: 'Sau N buổi' },
          ] as const).map(opt => (
            <label
              key={opt.v}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                value.endMode === opt.v
                  ? 'border-[var(--primary)] bg-blue-50 dark:bg-blue-950/30'
                  : 'border-[var(--border-color)]'
              }`}
            >
              <input
                type="radio"
                name="endMode"
                checked={value.endMode === opt.v}
                onChange={() => set({ endMode: opt.v })}
                className="accent-[var(--primary)]"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>

        {value.endMode === 'date' && (
          <input
            type="date"
            value={value.endsOn ?? ''}
            onChange={e => set({ endsOn: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            className="input mt-2"
          />
        )}
        {value.endMode === 'count' && (
          <div className="flex items-center gap-2 mt-2">
            <input
              type="number"
              min={1}
              max={200}
              value={value.maxOccurrences ?? 20}
              onChange={e => set({ maxOccurrences: Number(e.target.value) || 20 })}
              className="input w-24"
            />
            <span className="text-sm text-[var(--muted-fg)]">buổi</span>
          </div>
        )}
      </div>
    </div>
  );
}
