import { Input } from "@repo/ui/components/input";
import { cn } from "@repo/ui/lib/utils";

type AuthOtpInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  "aria-invalid"?: boolean;
  className?: string;
};

export function AuthOtpInput({
  id,
  value,
  onChange,
  "aria-invalid": ariaInvalid,
  className,
}: AuthOtpInputProps) {
  return (
    <Input
      id={id}
      inputMode="numeric"
      autoComplete="one-time-code"
      placeholder="000000"
      maxLength={6}
      value={value}
      aria-invalid={ariaInvalid}
      className={cn(
        "text-center font-mono text-lg tracking-[0.35em]",
        className,
      )}
      onChange={(event) => {
        onChange(event.target.value.replace(/\D/g, "").slice(0, 6));
      }}
    />
  );
}
