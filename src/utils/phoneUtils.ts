/**
 * Normalizes phone numbers to standard 11-digit Bangladeshi format (01XXXXXXXXX)
 * - Converts Bangla digits (০-৯) to English (0-9)
 * - Strips country code (+88 or 88)
 * - Removes non-digit characters
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  const bnToEn: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  
  let str = String(phone).trim().replace(/[০-৯]/g, (m) => bnToEn[m] || m);
  str = str.replace(/\D/g, '');

  if (str.startsWith('8801')) {
    str = str.substring(2);
  } else if (str.startsWith('88') && str.length > 11) {
    str = str.substring(2);
  }

  if (str.length === 10 && str.startsWith('1')) {
    str = '0' + str;
  }

  return str;
}
