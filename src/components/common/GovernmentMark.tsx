type GovernmentMarkProps = {
  compact?: boolean;
  inverse?: boolean;
};

export function GovernmentMark({
  compact = false,
  inverse = false,
}: GovernmentMarkProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`grid shrink-0 place-items-center rounded-full border-2 font-bold ${
          compact ? "size-10 text-base" : "size-12 text-lg"
        } ${
          inverse
            ? "border-white/35 bg-white/10 text-white"
            : "border-brand/15 bg-brand text-white shadow-sm"
        }`}
        aria-hidden="true"
      >
        ভূ
      </div>
      <div className="leading-tight">
        <p
          className={`font-bold ${compact ? "text-[15px]" : "text-base"} ${
            inverse ? "text-white" : "text-foreground"
          }`}
        >
          ভূমিসেবা সহায়তা কেন্দ্র
        </p>
        <p
          className={`mt-1 text-[11px] font-medium tracking-wide ${
            inverse ? "text-white/65" : "text-muted"
          }`}
        >
          ব্যবস্থাপনা সিস্টেম
        </p>
      </div>
    </div>
  );
}
