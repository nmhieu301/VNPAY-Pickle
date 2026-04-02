'use client';

// ═══════════════════════════════════════════
// VNPAY Pickle — GuestPlayerForm Component
// Form tạo VĐV tạm (chưa có tài khoản)
// ═══════════════════════════════════════════

import { useState } from 'react';
import { User, Phone, Mail, Building, Star, AlertTriangle } from 'lucide-react';
import { createGuestPlayer } from '@/lib/supabase/committeeApi';
import { fuzzySearchPlayers } from '@/lib/utils/fuzzyPlayerSearch';
import type { Player, GuestTier } from '@/types';

const TIERS: GuestTier[] = ['Beginner', 'Bronze', 'Silver', 'Gold', 'Platinum'];
const TIER_COLORS: Record<GuestTier, string> = {
  Beginner: '#74b9ff', Bronze: '#cd853f', Silver: '#b2bec3',
  Gold: '#f9ca24', Platinum: '#00cec9',
};

interface GuestPlayerFormProps {
  tournamentId: string;
  createdBy: string;
  allPlayers: Player[];
  onCreated: () => void;
  onCancel: () => void;
}

export function GuestPlayerForm({
  tournamentId, createdBy, allPlayers, onCreated, onCancel,
}: GuestPlayerFormProps) {
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    company: 'VNPAY',
    estimatedTier: 'Silver' as GuestTier,
  });
  const [loading, setLoading] = useState(false);
  const [duplicate, setDuplicate] = useState<Player[]>([]);

  const handleNameChange = (name: string) => {
    setForm(f => ({ ...f, fullName: name }));
    if (name.length >= 2) {
      const matches = fuzzySearchPlayers(name, allPlayers, 3);
      setDuplicate(matches.map(m => m.player));
    } else {
      setDuplicate([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) return;
    setLoading(true);
    const guest = await createGuestPlayer({
      tournamentId,
      fullName: form.fullName.trim(),
      phone: form.phone || undefined,
      email: form.email || undefined,
      company: form.company,
      estimatedTier: form.estimatedTier,
      createdBy,
    });
    setLoading(false);
    if (guest) onCreated();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <User className="w-5 h-5 text-[var(--primary)]" />
        <h3 className="font-bold">Thêm VĐV tạm (Guest)</h3>
      </div>

      {/* Name */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted-fg)]">Họ và tên *</label>
        <input
          className="input w-full"
          placeholder="Nguyễn Văn A"
          value={form.fullName}
          onChange={e => handleNameChange(e.target.value)}
          required
        />
        {/* Duplicate warning */}
        {duplicate.length > 0 && (
          <div className="flex items-start gap-1.5 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-amber-400 font-medium">Có thể là cùng người:</p>
              {duplicate.map(p => (
                <p key={p.id} className="text-xs text-[var(--muted-fg)]">
                  {p.full_name} ({p.department?.name ?? p.email})
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Phone & Email */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted-fg)]">Số điện thoại</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
            <input
              className="input w-full pl-9"
              placeholder="0901..."
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--muted-fg)]">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
            <input
              className="input w-full pl-9"
              placeholder="abc@company.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Company */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted-fg)]">Phòng ban / Công ty</label>
        <div className="relative">
          <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
          <input
            className="input w-full pl-9"
            placeholder="VNPAY / Công ty X"
            value={form.company}
            onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
          />
        </div>
      </div>

      {/* Tier estimate */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-[var(--muted-fg)]">Trình độ ước lượng</label>
        <div className="flex gap-2 flex-wrap">
          {TIERS.map(tier => (
            <button
              key={tier}
              type="button"
              onClick={() => setForm(f => ({ ...f, estimatedTier: tier }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                form.estimatedTier === tier
                  ? 'border-transparent text-white scale-105'
                  : 'border-[var(--border-color)] text-[var(--muted-fg)]'
              }`}
              style={form.estimatedTier === tier ? { background: TIER_COLORS[tier] } : {}}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-[var(--muted-fg)] bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-3">
        <Star className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
        VĐV tạm không có ELO chính thức và được xếp seed cuối cùng.
        Sau khi đăng ký tài khoản, kết quả sẽ được tính vào ELO.
      </div>

      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn btn-ghost flex-1">Huỷ</button>
        <button type="submit" disabled={loading || !form.fullName.trim()} className="btn btn-gradient flex-1">
          {loading ? 'Đang tạo...' : 'Tạo VĐV tạm'}
        </button>
      </div>
    </form>
  );
}
