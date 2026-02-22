'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { InterventionType, InterventionOutcome } from '@/types';

interface InterventionFormData {
  intervention_type: InterventionType;
  title: string;
  description: string;
  conducted_by: string;
  outcome: InterventionOutcome;
  follow_up_date: string;
}

interface InterventionFormProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InterventionFormData) => void;
}

const interventionTypes: { value: InterventionType; label: string }[] = [
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'qbr', label: 'QBR' },
  { value: 'training', label: 'Training' },
  { value: 'onboarding_session', label: 'Onboarding Session' },
  { value: 'executive_outreach', label: 'Executive Outreach' },
  { value: 'product_demo', label: 'Product Demo' },
  { value: 'escalation_response', label: 'Escalation Response' },
  { value: 'check_in', label: 'Check-in' },
  { value: 'other', label: 'Other' },
];

const outcomeOptions: { value: InterventionOutcome; label: string }[] = [
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' },
  { value: 'pending', label: 'Pending' },
  { value: 'no_response', label: 'No Response' },
];

const initialFormState: InterventionFormData = {
  intervention_type: 'phone_call',
  title: '',
  description: '',
  conducted_by: '',
  outcome: 'pending',
  follow_up_date: '',
};

export function InterventionForm({
  clientId,
  open,
  onOpenChange,
  onSubmit,
}: InterventionFormProps) {
  const [formData, setFormData] = useState<InterventionFormData>(initialFormState);

  function handleFieldChange(field: keyof InterventionFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(formData);
    setFormData(initialFormState);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log Intervention</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="intervention_type">Type</Label>
            <Select
              value={formData.intervention_type}
              onValueChange={(value) =>
                handleFieldChange('intervention_type', value)
              }
            >
              <SelectTrigger id="intervention_type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {interventionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="Intervention title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Describe the intervention..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="conducted_by">Conducted By</Label>
            <Input
              id="conducted_by"
              value={formData.conducted_by}
              onChange={(e) => handleFieldChange('conducted_by', e.target.value)}
              placeholder="Name of CSM"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="outcome">Outcome</Label>
            <Select
              value={formData.outcome}
              onValueChange={(value) => handleFieldChange('outcome', value)}
            >
              <SelectTrigger id="outcome">
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                {outcomeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="follow_up_date">Follow-up Date</Label>
            <Input
              id="follow_up_date"
              type="date"
              value={formData.follow_up_date}
              onChange={(e) => handleFieldChange('follow_up_date', e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Log Intervention</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
