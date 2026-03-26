// ═══════════════════════════════════════════
// VNPAY Pickle — Department Constants
// ═══════════════════════════════════════════

export const DEPARTMENTS = [
  { code: 'TECH', name: 'Kỹ thuật' },
  { code: 'PRODUCT', name: 'Sản phẩm' },
  { code: 'BIZ', name: 'Kinh doanh' },
  { code: 'MKT', name: 'Marketing' },
  { code: 'HR', name: 'Nhân sự' },
  { code: 'ACCT', name: 'Kế toán' },
  { code: 'BOD', name: 'Ban giám đốc' },
  { code: 'OPS', name: 'Vận hành' },
  { code: 'QA', name: 'QA' },
  { code: 'DESIGN', name: 'Design' },
  { code: 'DATA', name: 'Data' },
  { code: 'LEGAL', name: 'Pháp chế' },
  { code: 'CS', name: 'Chăm sóc khách hàng' },
  { code: 'RISK', name: 'Quản lý rủi ro' },
  { code: 'INFRA', name: 'Hạ tầng' },
] as const;

export type DepartmentCode = typeof DEPARTMENTS[number]['code'];
