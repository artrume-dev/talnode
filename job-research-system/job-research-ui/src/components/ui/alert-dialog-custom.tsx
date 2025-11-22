import * as React from "react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./alert-dialog"

interface CustomAlertProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
  variant?: 'default' | 'destructive' | 'success'
  showCancel?: boolean
}

export function CustomAlert({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "OK",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = 'default',
  showCancel = false,
}: CustomAlertProps) {
  const handleConfirm = () => {
    onConfirm?.()
    onOpenChange(false)
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {showCancel && (
            <AlertDialogCancel onClick={handleCancel}>
              {cancelText}
            </AlertDialogCancel>
          )}
          <AlertDialogAction 
            onClick={handleConfirm}
            className={
              variant === 'destructive' 
                ? 'bg-red-600 hover:bg-red-700' 
                : variant === 'success'
                ? 'bg-green-600 hover:bg-green-700'
                : ''
            }
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface AnalyzeJobsAlertProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filteredJobsCount: number
  totalJobsCount: number
  onAnalyzeFiltered: () => void
  onAnalyzeAll: () => void
}

export function AnalyzeJobsAlert({
  open,
  onOpenChange,
  filteredJobsCount,
  totalJobsCount,
  onAnalyzeFiltered,
  onAnalyzeAll,
}: AnalyzeJobsAlertProps) {
  const handleAnalyzeFiltered = () => {
    onAnalyzeFiltered()
    onOpenChange(false)
  }

  const handleAnalyzeAll = () => {
    onAnalyzeAll()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Analyze Jobs with New CV?</AlertDialogTitle>
          <AlertDialogDescription>
            Your CV has been uploaded successfully. Would you like to analyze jobs now?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            Skip for now
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleAnalyzeFiltered}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Analyze {filteredJobsCount} Matching Jobs
          </AlertDialogAction>
          <AlertDialogAction 
            onClick={handleAnalyzeAll}
            className="bg-green-600 hover:bg-green-700"
          >
            Analyze All {totalJobsCount} Jobs
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
