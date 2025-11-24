import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUserStore } from '../store/userStore';
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
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { AlertCircle, Linkedin, CheckCircle2} from 'lucide-react';
import api from '../services/api';

const linkedInSchema = z.object({
  linkedin_url: z.string().url('Please enter a valid LinkedIn URL').optional().or(z.literal('')),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  headline: z.string().optional(),
  summary: z.string().optional(),
  current_position: z.string().optional(),
  years_of_experience: z.number().min(0).optional(),
  skills: z.string().optional(), // Comma-separated
  experience: z.string().optional(), // JSON formatted or multiline
  education: z.string().optional(), // JSON formatted or multiline
});

type LinkedInFormData = z.infer<typeof linkedInSchema>;

export function LinkedInImport() {
  const { isLinkedInImportOpen, closeLinkedInImport } = useUIStore();
  const { setProfile, setOnboarded } = useUserStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LinkedInFormData>({
    resolver: zodResolver(linkedInSchema),
    defaultValues: {
      years_of_experience: 0,
    },
  });

  const onSubmit = async (data: LinkedInFormData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      // Parse skills from comma-separated string
      const skillsArray = data.skills
        ? data.skills.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      // Prepare profile data
      const profileData = {
        linkedin_url: data.linkedin_url || null,
        full_name: data.full_name,
        headline: data.headline || null,
        summary: data.summary || null,
        current_position: data.current_position || null,
        years_of_experience: data.years_of_experience || 0,
        skills: JSON.stringify(skillsArray),
        experience: data.experience || null,
        education: data.education || null,
      };

      // Save to backend
      const response = await api.post('/profile', profileData);
      const result = response.data;

      // Update local store
      setProfile({
        id: result.profile.id,
        linkedin_url: result.profile.linkedin_url,
        full_name: result.profile.full_name,
        headline: result.profile.headline,
        summary: result.profile.summary,
        current_position: result.profile.current_position,
        years_of_experience: result.profile.years_of_experience,
        skills: result.profile.skills,
        experience: result.profile.experience,
        education: result.profile.education,
        raw_data: result.profile.raw_data,
        created_at: result.profile.created_at,
        updated_at: result.profile.updated_at,
      });

      setOnboarded(true);
      setSuccess(true);

      // Close modal after short delay
      setTimeout(() => {
        closeLinkedInImport();
        reset();
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      closeLinkedInImport();
      reset();
      setError(null);
      setSuccess(false);
    }
  };

  return (
    <Dialog open={isLinkedInImportOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5" />
            LinkedIn Profile Import
          </DialogTitle>
          <DialogDescription>
            Enter your LinkedIn profile information to help match you with relevant jobs
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* LinkedIn URL */}
          <div className="space-y-2">
            <Label htmlFor="linkedin_url">LinkedIn Profile URL (Optional)</Label>
            <Input
              id="linkedin_url"
              type="url"
              placeholder="https://linkedin.com/in/your-profile"
              {...register('linkedin_url')}
              disabled={isSubmitting}
            />
            {errors.linkedin_url && (
              <p className="text-sm text-red-500">{errors.linkedin_url.message}</p>
            )}
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="full_name"
              placeholder="John Doe"
              {...register('full_name')}
              disabled={isSubmitting}
            />
            {errors.full_name && (
              <p className="text-sm text-red-500">{errors.full_name.message}</p>
            )}
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <Label htmlFor="headline">Professional Headline</Label>
            <Input
              id="headline"
              placeholder="Software Engineer | AI/ML Specialist"
              {...register('headline')}
              disabled={isSubmitting}
            />
          </div>

          {/* Current Position */}
          <div className="space-y-2">
            <Label htmlFor="current_position">Current Position</Label>
            <Input
              id="current_position"
              placeholder="Senior Software Engineer at Company"
              {...register('current_position')}
              disabled={isSubmitting}
            />
          </div>

          {/* Years of Experience */}
          <div className="space-y-2">
            <Label htmlFor="years_of_experience">Years of Experience</Label>
            <Input
              id="years_of_experience"
              type="number"
              min="0"
              {...register('years_of_experience', { valueAsNumber: true })}
              disabled={isSubmitting}
            />
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <Label htmlFor="skills">Skills (comma-separated)</Label>
            <Textarea
              id="skills"
              placeholder="Python, TypeScript, React, Machine Learning, AWS"
              {...register('skills')}
              disabled={isSubmitting}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Enter your skills separated by commas
            </p>
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">Professional Summary</Label>
            <Textarea
              id="summary"
              placeholder="Brief overview of your professional background..."
              {...register('summary')}
              disabled={isSubmitting}
              className="min-h-[100px]"
            />
          </div>

          {/* Experience */}
          <div className="space-y-2">
            <Label htmlFor="experience">Work Experience</Label>
            <Textarea
              id="experience"
              placeholder="List your work experience (one per line)&#10;Company Name - Role - Duration&#10;Key achievements and responsibilities"
              {...register('experience')}
              disabled={isSubmitting}
              className="min-h-[120px]"
            />
          </div>

          {/* Education */}
          <div className="space-y-2">
            <Label htmlFor="education">Education</Label>
            <Textarea
              id="education"
              placeholder="List your education (one per line)&#10;Degree - Institution - Year"
              {...register('education')}
              disabled={isSubmitting}
              className="min-h-[80px]"
            />
          </div>

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
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-sm">Profile saved successfully!</p>
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
              {isSubmitting ? 'Saving...' : 'Save Profile'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
