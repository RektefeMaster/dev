import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export const formatDateValue = (value?: string | Date | null) => {
  if (!value) {
    return null;
  }

  try {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return null;
    }

    return format(date, 'dd MMM yyyy', { locale: tr });
  } catch {
    return null;
  }
};


