// Persistent author credit / branding.
export function Credit({ className = '' }: { className?: string }) {
  return (
    <a
      className={`credit ${className}`}
      href="https://linkedin.com/in/yoshiparlevliet"
      target="_blank"
      rel="noopener noreferrer"
    >
      Made by <strong>Yoshi Parlevliet</strong>
    </a>
  );
}
