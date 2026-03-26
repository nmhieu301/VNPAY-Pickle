'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Building2, Phone, Hash, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface AddVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (venueId: string) => void;
}

export default function AddVenueModal({ isOpen, onClose, onCreated }: AddVenueModalProps) {
  const { addVenue } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    address: '',
    district: '',
    num_courts: '',
    phone: '',
    notes: '',
  });

  const isValid = form.name.trim().length > 0 && form.address.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    const venue = await addVenue({
      name: form.name.trim(),
      address: form.address.trim(),
      district: form.district.trim() || null,
      num_courts: form.num_courts ? parseInt(form.num_courts) : null,
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
    });

    setIsSubmitting(false);

    if (venue) {
      setForm({ name: '', address: '', district: '', num_courts: '', phone: '', notes: '' });
      onCreated(venue.id);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-[var(--surface)] rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Thêm sân mới</h3>
                  <p className="text-xs text-[var(--muted-fg)]">Thông tin địa điểm sân Pickleball</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--hover)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Tên sân */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                  Tên sân <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="VD: CLB Pickleball Thanh Xuân"
                  className="input"
                  required
                  autoFocus
                />
              </div>

              {/* Địa chỉ */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  Địa chỉ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="VD: 68 Nguyễn Du, Hai Bà Trưng, Hà Nội"
                  className="input"
                  required
                />
              </div>

              {/* Quận & Số sân */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Quận/Huyện</label>
                  <input
                    type="text"
                    value={form.district}
                    onChange={e => setForm({ ...form, district: e.target.value })}
                    placeholder="VD: Thanh Xuân"
                    className="input"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                    <Hash className="w-3.5 h-3.5" /> Số sân
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={form.num_courts}
                    onChange={e => setForm({ ...form, num_courts: e.target.value })}
                    placeholder="VD: 4"
                    className="input"
                  />
                </div>
              </div>

              {/* SĐT */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                  <Phone className="w-3.5 h-3.5" /> Số điện thoại liên hệ
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="VD: 0912 345 678"
                  className="input"
                />
              </div>

              {/* Ghi chú */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                  <FileText className="w-3.5 h-3.5" /> Ghi chú
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="VD: Sân outdoor, có đèn chiếu sáng buổi tối"
                  className="input min-h-[60px] resize-none"
                  rows={2}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={!isValid || isSubmitting}
                  className="btn btn-gradient flex-1"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Lưu sân mới
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
