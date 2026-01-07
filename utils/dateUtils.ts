import { format, formatDistanceToNow, isValid, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatNotificationTime = (dateString: string | undefined | null): string => {
  if (!dateString) return 'Data desconhecida';

  const date = new Date(dateString);
  if (!isValid(date)) return 'Data inválida';

  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  // If less than 24 hours
  if (diffInHours < 24) {
      // Check specifically for "Yesterday" to match user preference
      if (isYesterday(date)) {
          return `Ontem às ${format(date, 'HH:mm', { locale: ptBR })}`;
      }
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  }

  // Otherwise show full date
  return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
};

export const canReopenTicket = (resolvedAt: string | undefined | null): boolean => {
    // If not resolved or no date, assume cannot reopen
    if (!resolvedAt) return false;
    
    const date = new Date(resolvedAt);
    if (!isValid(date)) return false;
    
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    return diffInHours <= 24;
};
