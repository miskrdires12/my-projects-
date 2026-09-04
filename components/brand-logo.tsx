export function BrandLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="2.5" y="2.5" width="8.5" height="8.5" rx="2" fill="currentColor" />
      <rect x="13" y="2.5" width="8.5" height="8.5" rx="2" fill="currentColor" fillOpacity="0.3" />
      <rect x="2.5" y="13" width="8.5" height="8.5" rx="2" fill="currentColor" fillOpacity="0.3" />
      <rect x="13" y="13" width="8.5" height="8.5" rx="2" fill="currentColor" />
    </svg>
  );
}
