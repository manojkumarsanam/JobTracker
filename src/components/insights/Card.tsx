import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}

export default function Card({ title, subtitle, actions, children, wide }: Props) {
  return (
    <section className={`insight-card ${wide ? "wide" : ""}`}>
      <header className="insight-card-header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p className="insight-card-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="insight-card-actions">{actions}</div>}
      </header>
      <div className="insight-card-body">{children}</div>
    </section>
  );
}
