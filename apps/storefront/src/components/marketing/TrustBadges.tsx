import { Shield, Truck, RefreshCw, HeadphonesIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Badge {
  icon: string;
  label: string;
  sublabel?: string;
}

interface TrustBadgesProps {
  badges?: Badge[];
}

const defaultBadges: Badge[] = [
  {
    icon: "truck",
    label: "Envío gratis",
    sublabel: "En compras mayores a $50.000",
  },
  {
    icon: "shield",
    label: "Pago seguro",
    sublabel: "Transacciones protegidas",
  },
  {
    icon: "refresh",
    label: "Garantía 30 días",
    sublabel: "Devolución sin complicaciones",
  },
  {
    icon: "headphones",
    label: "Soporte 24/7",
    sublabel: "Siempre disponibles para ti",
  },
];

const iconMap = {
  truck: Truck,
  shield: Shield,
  refresh: RefreshCw,
  headphones: HeadphonesIcon,
};

export function TrustBadges({ badges = defaultBadges }: TrustBadgesProps) {
  return (
    <section className="w-full py-8 md:py-12 border-y bg-muted/30">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {badges.map((badge, index) => {
            const Icon = iconMap[badge.icon as keyof typeof iconMap] || Shield;

            return (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-3",
                  index !== badges.length - 1 &&
                    "md:border-r md:pr-12 border-border"
                )}
              >
                <div className="flex-shrink-0">
                  <div className="rounded-full bg-[hsl(var(--brand-primary))]/10 p-3">
                    <Icon className="w-6 h-6 text-[hsl(var(--brand-primary))]" />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-sm md:text-base">
                    {badge.label}
                  </p>
                  {badge.sublabel && (
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {badge.sublabel}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
