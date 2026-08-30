export default function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const px = { sm: "h-4 w-4", md: "h-8 w-8", lg: "h-12 w-12" }[size];
  return (
    <div className="flex items-center justify-center p-4">
      <div className={`animate-spin rounded-full border-2 border-surface-container-high border-t-primary ${px}`} />
    </div>
  );
}