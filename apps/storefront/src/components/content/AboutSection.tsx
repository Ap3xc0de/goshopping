import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Value {
  icon: string;
  title: string;
  description: string;
}

interface AboutSectionProps {
  title: string;
  description: string;
  image: string;
  imageAlt?: string;
  values?: Value[];
  imagePosition?: "left" | "right";
}

export function AboutSection({
  title,
  description,
  image,
  imageAlt = "",
  values,
  imagePosition = "right",
}: AboutSectionProps) {
  const textContent = (
    <div className="flex flex-col justify-center">
      <h2 className="text-3xl md:text-4xl font-bold mb-6">{title}</h2>
      <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
        {description}
      </p>
    </div>
  );

  const imageContent = (
    <div className="relative aspect-square md:aspect-auto md:h-[500px] rounded-lg overflow-hidden">
      <Image
        src={image}
        alt={imageAlt || title}
        fill
        className="object-cover"
      />
    </div>
  );

  return (
    <section className="w-full py-12 md:py-16 lg:py-24">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        {/* Main Content */}
        <div
          className={cn(
            "grid gap-8 lg:gap-12 items-center mb-16",
            "grid-cols-1 md:grid-cols-2"
          )}
        >
          {imagePosition === "left" ? (
            <>
              {imageContent}
              {textContent}
            </>
          ) : (
            <>
              {textContent}
              {imageContent}
            </>
          )}
        </div>

        {/* Values Grid */}
        {values && values.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <div className="rounded-full bg-[hsl(var(--brand-primary))]/10 p-4 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-[hsl(var(--brand-primary))]" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
