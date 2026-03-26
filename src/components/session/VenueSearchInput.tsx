'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, PlusCircle, ChevronDown, X } from 'lucide-react';
import type { Venue } from '@/types';

interface VenueSearchInputProps {
  venues: Venue[];
  selectedVenueId: string;
  onSelect: (venueId: string) => void;
  onAddNew: () => void;
}

export default function VenueSearchInput({ venues, selectedVenueId, onSelect, onAddNew }: VenueSearchInputProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedVenue = venues.find(v => v.id === selectedVenueId);

  // Filter venues based on search query
  const filtered = useMemo(() => {
    if (!query.trim()) return venues;
    const q = query.toLowerCase().trim();
    return venues.filter(v =>
      v.name.toLowerCase().includes(q) ||
      (v.address && v.address.toLowerCase().includes(q)) ||
      (v.district && v.district.toLowerCase().includes(q))
    );
  }, [venues, query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (venueId: string) => {
    onSelect(venueId);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect('');
    setQuery('');
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (!isOpen) setIsOpen(true);
  };

  const formatVenue = (v: Venue) => {
    let label = v.name;
    if (v.district) label += ` (${v.district})`;
    if (v.num_courts) label += ` — ${v.num_courts} sân`;
    return label;
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Input area */}
      <div
        className={`input flex items-center gap-2 cursor-text transition-all ${
          isOpen ? 'ring-2 ring-[var(--primary)] border-[var(--primary)]' : ''
        }`}
        onClick={() => { inputRef.current?.focus(); setIsOpen(true); }}
      >
        <Search className="w-3.5 h-3.5 text-[var(--muted-fg)] shrink-0" />

        {/* Show selected venue name OR search input */}
        {selectedVenue && !isOpen ? (
          <div className="flex-1 flex items-center justify-between min-w-0">
            <span className="truncate text-sm">{formatVenue(selectedVenue)}</span>
            <button
              type="button"
              onClick={handleClear}
              className="ml-1 p-0.5 rounded hover:bg-[var(--hover)] transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5 text-[var(--muted-fg)]" />
            </button>
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleInputChange(e.target.value)}
            onFocus={handleInputFocus}
            placeholder="Chọn sân"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-[var(--muted-fg)]"
          />
        )}

        <ChevronDown className={`w-3.5 h-3.5 text-[var(--muted-fg)] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border-color)] rounded-xl shadow-xl overflow-hidden"
          >
            <div className="max-h-[240px] overflow-y-auto overscroll-contain">
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-sm text-[var(--muted-fg)] text-center">
                  Không tìm thấy sân phù hợp
                </div>
              ) : (
                filtered.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSelect(v.id)}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-start gap-2.5 transition-colors
                      ${v.id === selectedVenueId
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-medium'
                        : 'hover:bg-[var(--hover)]'
                      }`}
                  >
                    <MapPin className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${v.id === selectedVenueId ? 'text-[var(--primary)]' : 'text-[var(--muted-fg)]'}`} />
                    <div className="min-w-0">
                      <p className="truncate">{v.name}</p>
                      {(v.district || v.address) && (
                        <p className="text-xs text-[var(--muted-fg)] truncate mt-0.5">
                          {v.district && <span>{v.district}</span>}
                          {v.district && v.address && <span> · </span>}
                          {v.address && <span>{v.address}</span>}
                        </p>
                      )}
                    </div>
                    {v.num_courts && (
                      <span className="ml-auto text-xs text-[var(--muted-fg)] shrink-0 bg-[var(--hover)] px-1.5 py-0.5 rounded">
                        {v.num_courts} sân
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Add new venue button */}
            <div className="border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => { setIsOpen(false); setQuery(''); onAddNew(); }}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors font-medium"
              >
                <PlusCircle className="w-4 h-4" />
                Thêm sân mới...
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
