import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  index: string;
  kicker: string;
  title: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  light?: boolean;
};

export function SectionHeading({
  index,
  kicker,
  title,
  description,
  action,
  className,
  light = false,
}: SectionHeadingProps) {
  return (
    <div className={cn("section-heading", light && "section-heading--light", className)}>
      <div className="section-heading__index">
        <span>{index}</span>
        <span className="section-heading__line" />
      </div>
      <div className="section-heading__main">
        <p className="eyebrow">
          <span className="dot" />
          {kicker}
        </p>
        <h2>{title}</h2>
      </div>
      <div className="section-heading__aside">
        {description && <p>{description}</p>}
        {action}
      </div>
    </div>
  );
}
