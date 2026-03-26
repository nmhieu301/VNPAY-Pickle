// ═══════════════════════════════════════════
// VNPAY Pickle — Email Validation
// CHỈ cho phép @vnpay.vn — KHÔNG CÓ NGOẠI LỆ
// ═══════════════════════════════════════════

const ALLOWED_DOMAIN = 'vnpay.vn';

/**
 * Kiểm tra email có phải @vnpay.vn không
 * SỬ DỤNG Ở MỌI NƠI: Client, Server, Database
 */
export function isVnpayEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  const regex = /^[a-z0-9._%+-]+@vnpay\.vn$/;
  return regex.test(trimmed);
}

/**
 * Lấy message lỗi khi email không hợp lệ
 */
export function getEmailError(email: string): string | null {
  if (!email) return 'Vui lòng nhập email';
  if (!email.includes('@')) return 'Email không hợp lệ';
  if (!isVnpayEmail(email)) {
    return 'Chỉ chấp nhận email công ty VNPAY (@vnpay.vn)';
  }
  return null;
}

/**
 * Extract tên từ email vnpay
 * VD: "nguyen.minh@vnpay.vn" → "Nguyen Minh"
 */
export function nameFromEmail(email: string): string {
  if (!isVnpayEmail(email)) return '';
  const localPart = email.split('@')[0];
  return localPart
    .split(/[._-]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
