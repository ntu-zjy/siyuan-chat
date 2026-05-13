export function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const unlimited = limit === -1;
  const pct = unlimited
    ? 0
    : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const dangerous = pct >= 90;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className={dangerous ? "text-destructive" : ""}>
          {used.toLocaleString()} /{" "}
          {unlimited ? "无限" : limit.toLocaleString()}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={
              dangerous ? "h-full bg-destructive" : "h-full bg-primary"
            }
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
