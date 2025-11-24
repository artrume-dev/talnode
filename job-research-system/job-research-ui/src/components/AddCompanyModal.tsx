import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUIStore } from '../store/uiStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { AlertCircle, Building2 } from 'lucide-react';
import api from '../services/api';

const companySchema = z.object({
  company_name: z.string().min(2, 'Company name must be at least 2 characters'),
  careers_url: z.string().url('Please enter a valid URL'),
  ats_type: z.enum(['greenhouse', 'lever', 'workday', 'custom']),
  greenhouse_id: z.string().optional(),
  lever_id: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface AddCompanyModalProps {
  onCompanyAdded?: () => void;
}

export function AddCompanyModal({ onCompanyAdded }: AddCompanyModalProps) {
  const { isAddCompanyModalOpen, closeAddCompanyModal } = useUIStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      ats_type: 'custom',
    },
  });

  const selectedATSType = watch('ats_type');

  const onSubmit = async (data: CompanyFormData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await api.post('/companies', data);

      setSuccess(true);
      reset();

      // Call callback to refresh company list
      if (onCompanyAdded) {
        onCompanyAdded();
      }

      // Close modal after short delay
      setTimeout(() => {
        closeAddCompanyModal();
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add company');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      closeAddCompanyModal();
      reset();
      setError(null);
      setSuccess(false);
    }
  };

  return (
    <Dialog open={isAddCompanyModalOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Add Custom Company
          </DialogTitle>
          <DialogDescription>
            Add a company to search for job opportunities. Provide the company's careers page URL.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="company_name">
              Company Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="company_name"
              placeholder="e.g., Anthropic"
              {...register('company_name')}
              disabled={isSubmitting}
            />
            {errors.company_name && (
              <p className="text-sm text-red-500">{errors.company_name.message}</p>
            )}
          </div>

          {/* Careers URL */}
          <div className="space-y-2">
            <Label htmlFor="careers_url">
              Careers Page URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id="careers_url"
              type="url"
              placeholder="https://company.com/careers"
              {...register('careers_url')}
              disabled={isSubmitting}
            />
            {errors.careers_url && (
              <p className="text-sm text-red-500">{errors.careers_url.message}</p>
            )}
          </div>

          {/* ATS Type */}
          <div className="space-y-2">
            <Label htmlFor="ats_type">
              ATS System <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedATSType}
              onValueChange={(value) =>
                setValue('ats_type', value as CompanyFormData['ats_type'])
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="ats_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="greenhouse">Greenhouse</SelectItem>
                <SelectItem value="lever">Lever</SelectItem>
                <SelectItem value="workday">Workday</SelectItem>
                <SelectItem value="custom">Custom / Unknown</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select the Applicant Tracking System (ATS) used by this company
            </p>
          </div>

          {/* Greenhouse ID (conditional) */}
          {selectedATSType === 'greenhouse' && (
            <div className="space-y-2">
              <Label htmlFor="greenhouse_id">Greenhouse ID (Optional)</Label>
              <Input
                id="greenhouse_id"
                placeholder="e.g., anthropic"
                {...register('greenhouse_id')}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Found in the careers URL: boards.greenhouse.io/[id]
              </p>
            </div>
          )}

          {/* Lever ID (conditional) */}
          {selectedATSType === 'lever' && (
            <div className="space-y-2">
              <Label htmlFor="lever_id">Lever ID (Optional)</Label>
              <Input
                id="lever_id"
                placeholder="e.g., company-name"
                {...register('lever_id')}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Found in the careers URL: jobs.lever.co/[id]
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-sm">Company added successfully!</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Company'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
