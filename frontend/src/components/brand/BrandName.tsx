type BrandNameProps = {
  className?: string;
  /** Larger, glowing treatment for login / marketing surfaces. */
  hero?: boolean;
};

/** All-caps split wordmark: YORA (bold) + PET (muted), Yoradm-style weight split. */
export function BrandName({ className = "", hero = false }: BrandNameProps) {
  return (
    <div
      className={`app-brand-name${hero ? " app-brand-name--hero" : ""} ${className}`.trim()}
      aria-label="YORA PET"
    >
      <span className="app-brand-name__primary">YORA</span>
      <span className="app-brand-name__secondary">PET</span>
    </div>
  );
}
