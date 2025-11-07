import useCan from '../hooks/useCan';

export default function PermissionGate({
  need,
  children,
  fallback = null,
}: {
  need: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const ok = useCan(need);
  return ok ? <>{children}</> : <>{fallback}</>;
}
