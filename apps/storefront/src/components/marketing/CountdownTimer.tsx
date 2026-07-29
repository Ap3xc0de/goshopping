"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CountdownTimerProps {
  targetDate: Date | string;
  title?: string;
  onExpire?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer({
  targetDate,
  title,
  onExpire,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();

      if (difference <= 0) {
        setIsExpired(true);
        onExpire?.();
        return null;
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onExpire]);

  if (isExpired) {
    return (
      <div className="text-center py-8">
        <p className="text-2xl font-bold text-destructive">¡Oferta expirada!</p>
      </div>
    );
  }

  if (!timeLeft) return null;

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={value}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-[hsl(var(--brand-primary))] text-white rounded-lg p-4 min-w-[80px] shadow-lg"
        >
          <span className="text-3xl md:text-4xl font-bold block">
            {String(value).padStart(2, "0")}
          </span>
        </motion.div>
      </AnimatePresence>
      <span className="text-sm md:text-base text-muted-foreground mt-2 font-medium">
        {label}
      </span>
    </div>
  );

  return (
    <div className="py-8">
      {title && (
        <h3 className="text-2xl md:text-3xl font-bold text-center mb-6">
          {title}
        </h3>
      )}
      <div className="flex items-center justify-center gap-4">
        <TimeUnit value={timeLeft.days} label="Días" />
        <span className="text-3xl font-bold text-muted-foreground">:</span>
        <TimeUnit value={timeLeft.hours} label="Horas" />
        <span className="text-3xl font-bold text-muted-foreground">:</span>
        <TimeUnit value={timeLeft.minutes} label="Minutos" />
        <span className="text-3xl font-bold text-muted-foreground">:</span>
        <TimeUnit value={timeLeft.seconds} label="Segundos" />
      </div>
    </div>
  );
}
