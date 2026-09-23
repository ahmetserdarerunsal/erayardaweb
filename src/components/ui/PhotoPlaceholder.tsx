export function PhotoPlaceholder({ label = "Fotoğraf eklenecek", className = "" }: { label?: string; className?: string }) {
  return <div className={`photo-placeholder ${className}`} aria-label={label}><span>{label}</span></div>;
}
