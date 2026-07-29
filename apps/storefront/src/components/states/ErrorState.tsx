import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Algo salió mal",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-destructive/10 p-6 mb-6">
        <AlertCircle className="w-12 h-12 text-destructive" />
      </div>
      
      <h3 className="text-2xl font-semibold mb-2">{title}</h3>
      
      {message && (
        <p className="text-muted-foreground mb-6 max-w-md">
          {message}
        </p>
      )}
      
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="default"
          className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90"
        >
          Reintentar
        </Button>
      )}
    </div>
  );
}
