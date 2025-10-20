export default function BoardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-36 animate-pulse rounded-2xl bg-muted/30" />
      <div className="flex gap-6 overflow-hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex h-[420px] w-[320px] flex-col gap-4 rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="h-12 rounded-md bg-muted/40" />
            <div className="flex-1 rounded-lg bg-muted/30" />
            <div className="h-10 rounded-md bg-muted/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
