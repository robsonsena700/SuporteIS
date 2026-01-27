import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { Ticket, TicketPriority, TicketStatus } from '../types';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Flag, User, Monitor, AlertCircle, MessageSquare, Timer } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

interface TicketCardProps {
  ticket: Ticket;
  hasUnreadMessages?: boolean;
  onPress: (ticket: Ticket) => void;
  showRating?: boolean;
}

export const TicketCard: React.FC<TicketCardProps> = ({ 
  ticket, 
  hasUnreadMessages = false, 
  onPress,
  showRating = false 
}) => {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN: return '#3b82f6'; // Blue
      case TicketStatus.IN_ANALYSIS: return '#f59e0b'; // Amber
      case TicketStatus.IN_PROGRESS: return '#8b5cf6'; // Purple
      case TicketStatus.FORWARDED_ACQUISITION: return '#6366f1'; // Indigo
      case TicketStatus.IN_ROUTE: return '#06b6d4'; // Cyan
      case TicketStatus.RESOLVED: return '#10b981'; // Emerald
      default: return '#9ca3af';
    }
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.CRITICAL: return '#ef4444'; // Red
      case TicketPriority.HIGH: return '#f97316'; // Orange
      case TicketPriority.MEDIUM: return '#eab308'; // Yellow
      case TicketPriority.LOW: return '#3b82f6'; // Blue
      default: return '#9ca3af';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const getRatingColor = (rating?: number) => {
    if (!rating) return '#4b5563';
    if (rating >= 4) return '#facc15'; // Yellow-400
    if (rating <= 2) return '#f87171'; // Red-400
    return '#fcd34d'; // Yellow-300
  };

  const calculateTMR = (createdAt: string | undefined, resolvedAt: string | undefined, status: string) => {
    if (!createdAt) return '-';
    const start = new Date(createdAt);
    const isResolved = status === 'Resolvido' || status === 'Concluído';
    const end = (isResolved && resolvedAt) ? new Date(resolvedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();

    if (diffMs < 0) return '0m';

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
        const remainingHours = diffHours % 24;
        return `${diffDays}d ${remainingHours}h`;
    }
    if (diffHours > 0) {
        const remainingMinutes = diffMinutes % 60;
        return `${diffHours}h ${remainingMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => onPress(ticket)}
      activeOpacity={0.7}
    >
      {/* Header: Code, Unread, Date, Status, Priority */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.codeContainer, { backgroundColor: theme.background }]}>
            <Text style={[styles.codeText, { color: theme.subtext }]}>
              {ticket.code || `CH-${ticket.id.slice(0, 4).toUpperCase()}`}
            </Text>
          </View>
          
          {hasUnreadMessages && (
            <View style={styles.unreadBadge}>
              <View style={styles.unreadDot} />
              <Text style={styles.unreadText}>Nova mensagem</Text>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
            <View style={styles.statusRow}>
                <View style={[styles.badge, { borderColor: getStatusColor(ticket.status) + '40', backgroundColor: getStatusColor(ticket.status) + '10' }]}>
                    <Text style={[styles.badgeText, { color: getStatusColor(ticket.status) }]}>{ticket.status}</Text>
                </View>
                <View style={[styles.badge, { borderColor: getPriorityColor(ticket.priority) + '40', backgroundColor: getPriorityColor(ticket.priority) + '10' }]}>
                    <Flag size={10} color={getPriorityColor(ticket.priority)} style={{ marginRight: 2 }} />
                    <Text style={[styles.badgeText, { color: getPriorityColor(ticket.priority) }]}>{ticket.priority}</Text>
                </View>
            </View>
             <Text style={styles.dateText}>
                <Clock size={10} color="#6b7280" /> {formatDate(ticket.createdAtIso || ticket.createdAt)}
            </Text>
            <Text style={styles.dateText}>
                <Timer size={10} color="#6b7280" /> {ticket.status === 'Resolvido' ? 'TMR: ' : 'Aberto: '}
                {calculateTMR(ticket.createdAtIso || ticket.createdAt, ticket.resolvedAt, ticket.status)}
            </Text>
        </View>
      </View>

      {/* Subject */}
      <View style={styles.content}>
        <Text 
            style={[styles.subject, { color: theme.text }]} 
            numberOfLines={expanded ? undefined : 2}
        >
            {ticket.subject}
        </Text>
        {ticket.subject && ticket.subject.length > 80 && (
            <TouchableOpacity onPress={() => setExpanded(!expanded)} hitSlop={{ top: 10, bottom: 10 }}>
                <Text style={[styles.expandText, { color: theme.primary }]}>{expanded ? 'Ver menos' : 'Ver mais'}</Text>
            </TouchableOpacity>
        )}
      </View>

      {/* Footer: People & Rating */}
      <View style={styles.footer}>
        {/* Creator */}
        <View style={styles.personRow}>
            <User size={14} color={theme.subtext} />
            <Text style={[styles.personName, { color: theme.subtext }]} numberOfLines={1}>
                {ticket.creatorName || 'Sistema'}
                {ticket.municipality && <Text style={styles.personDetail}> • {ticket.municipality}</Text>}
            </Text>
        </View>

        {/* Technician */}
        <View style={styles.personRow}>
            <View style={styles.avatarContainer}>
                {ticket.technicianAvatar ? (
                    <Image source={{ uri: ticket.technicianAvatar }} style={styles.avatar} />
                ) : (
                    <Monitor size={14} color={theme.subtext} />
                )}
            </View>
            <View>
                <Text style={[styles.personName, { color: theme.subtext }]} numberOfLines={1}>
                    {ticket.technician || 'Sem responsável'}
                </Text>
                <Text style={[styles.roleText, { color: theme.subtext }]}>Suporte Técnico</Text>
            </View>
        </View>

        {/* Rating */}
        {showRating && (
             <View style={styles.ratingContainer}>
                <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Text key={star} style={{ color: ticket.rating && ticket.rating >= star ? getRatingColor(ticket.rating) : theme.border, fontSize: 14 }}>★</Text>
                    ))}
                </View>
                <Text style={[styles.ratingText, { color: theme.subtext }]}>
                    {ticket.rating ? `${ticket.rating.toFixed(1)} / 5` : 'Não avaliado'}
                </Text>
             </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)', // bg-background-surface/80
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151', // border-border-dark
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  codeContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)', // bg-primary/10
    borderColor: 'rgba(59, 130, 246, 0.3)', // border-primary/30
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  codeText: {
    color: '#3b82f6', // text-primary
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  unreadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)', // bg-red-500/10
    borderColor: 'rgba(239, 68, 68, 0.4)', // border-red-500/40
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444', // red-500
  },
  unreadText: {
    color: '#f87171', // red-400
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusRow: {
      flexDirection: 'row',
      gap: 4,
      marginBottom: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 10,
    color: '#6b7280', // text-muted
  },
  content: {
    marginBottom: 12,
  },
  subject: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  expandText: {
    color: '#3b82f6', // text-primary
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  footer: {
    gap: 8,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  personName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  personDetail: {
    color: '#6b7280', // text-muted
    fontSize: 11,
  },
  avatarContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#374151', // bg-background-input
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  roleText: {
    color: '#6b7280', // text-muted
    fontSize: 10,
  },
  ratingContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: '#374151',
  },
  starsRow: {
      flexDirection: 'row',
      gap: 2,
  },
  ratingText: {
      fontSize: 11,
      color: '#6b7280',
  }
});
