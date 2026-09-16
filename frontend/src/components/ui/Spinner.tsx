interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: "white" | "green" | "gray";
}

export default function Spinner({ size = "md", color = "white" }: SpinnerProps) {
  const sizes: Record<string, string> = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-8 h-8" };
  const colors: Record<string, string> = {
    white: "border-white",
    green: "border-green-20000",
    gray: "border-gray-400",
  };
  return (
    <div
      className={`
      ${sizes[size]} rounded-full border-2 border-t-transparent animate-spin
      ${colors[color]}
    `}
    />
  );
}
