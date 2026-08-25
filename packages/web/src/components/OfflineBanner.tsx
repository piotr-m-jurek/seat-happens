import { useConnectionStatus } from "../hooks/useConnectionStatus";

// Reflects actual connection state rather than being dismissible —
// hiding it would just hide real information.
export function OfflineBanner() {
  const online = useConnectionStatus();
  if (online) return null;
  return (
    <div className="bg-destructive px-4 py-1.5 text-center text-sm text-white">
      You're offline — changes may not sync until it reconnects.
    </div>
  );
}
