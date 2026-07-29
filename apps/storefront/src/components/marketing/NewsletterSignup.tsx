"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewsletterSignupProps {
  title?: string;
  description?: string;
  placeholder?: string;
  buttonLabel?: string;
  variant?: "inline" | "banner";
  onSubmit?: (email: string) => void;
}

export function NewsletterSignup({
  title = "Suscríbete a nuestras ofertas",
  description,
  placeholder = "Tu email aquí",
  buttonLabel = "Suscribirse",
  variant = "inline",
  onSubmit,
}: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success">("idle");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Por favor ingresa un email válido");
      return;
    }

    onSubmit?.(email);
    setStatus("success");
    setEmail("");

    // Reset success message after 5 seconds
    setTimeout(() => {
      setStatus("idle");
    }, 5000);
  };

  const Content = (
    <div className={cn(variant === "banner" ? "text-center" : "")}>
      <h3 className="text-xl md:text-2xl font-bold mb-2">{title}</h3>
      {description && (
        <p className="text-sm md:text-base text-muted-foreground mb-4">
          {description}
        </p>
      )}

      {status === "success" ? (
        <div className="flex items-center justify-center gap-2 text-green-600 font-medium py-3">
          <CheckCircle2 className="w-5 h-5" />
          <span>¡Gracias por suscribirte!</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <Input
            type="email"
            placeholder={placeholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1"
          />
          <Button
            type="submit"
            className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white"
          >
            {buttonLabel}
          </Button>
        </form>
      )}

      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}
    </div>
  );

  if (variant === "banner") {
    return (
      <section className="w-full py-12 md:py-16 bg-[hsl(var(--brand-primary))] text-white">
        <div className="mx-auto max-w-screen-md px-4 sm:px-6 lg:px-8">
          {Content}
        </div>
      </section>
    );
  }

  return (
    <section className="w-full py-12 md:py-16">
      <div className="mx-auto max-w-screen-md px-4 sm:px-6 lg:px-8">
        {Content}
      </div>
    </section>
  );
}
