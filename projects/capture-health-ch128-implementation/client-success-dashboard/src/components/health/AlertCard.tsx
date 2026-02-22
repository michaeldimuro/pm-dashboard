'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, Info, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ChurnAlert, AlertPriority, AlertStatus } from '@/types';

interface AlertCardProps {
  alert: ChurnAlert & { client?: { company_name: string } };
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onDismiss: (id: string) => void;
}

const priorityConfig: Record<AlertPriority, { border: string; icon: React.ReactNode; label: string }> = {
  critical: {
    border: 'border-l-red-500',
    icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
    label: 'Critical',
  },
  medium: {
    border: 'border-l-amber-500',
    icon: <AlertCircle className="h-4 w-4 text-amber-500" />,
    label: 'Medium',
  },
  low: {
    border: 'border-l-gray-400',
    icon: <Info className="h-4 w-4 text-gray-400" />,
    label: 'Low',
  },
};

const statusBadgeStyles: Record<AlertStatus, string> = {
  open: 'bg-red-100 text-red-800',
  acknowledged: 'bg-blue-100 text-blue-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  dismissed: 'bg-gray-100 text-gray-600',
};

export function AlertCard({ alert, onAcknowledge, onResolve, onDismiss }: AlertCardProps) {
  const config = priorityConfig[alert.priority];
  const timeAgo = formatDistanceToNow(new Date(alert.created_at), { addSuffix: true });

  return (
    <Card className={cn('border-l-4', config.border)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {config.icon}
            <CardTitle className="text-sm font-semibold">{alert.title}</CardTitle>
          </div>
          <Badge
            variant="secondary"
            className={cn('text-xs border-0', statusBadgeStyles[alert.status])}
          >
            {alert.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alert.client?.company_name && (
          <p className="text-sm font-medium text-gray-700">{alert.client.company_name}</p>
        )}

        {alert.description && (
          <p className="text-sm text-gray-600">{alert.description}</p>
        )}

        {alert.metric_name && (
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>
              <span className="font-medium">{alert.metric_name}:</span>{' '}
              {alert.metric_value}
              {alert.threshold_value != null && (
                <span> (threshold: {alert.threshold_value})</span>
              )}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            <span>{timeAgo}</span>
          </div>

          <div className="flex items-center gap-2">
            {alert.status === 'open' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAcknowledge(alert.id)}
                  className="text-xs h-7"
                >
                  Acknowledge
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismiss(alert.id)}
                  className="text-xs h-7 text-gray-500"
                >
                  Dismiss
                </Button>
              </>
            )}

            {alert.status === 'acknowledged' && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onResolve(alert.id)}
                  className="text-xs h-7"
                >
                  Resolve
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismiss(alert.id)}
                  className="text-xs h-7 text-gray-500"
                >
                  Dismiss
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
