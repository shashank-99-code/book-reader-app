import type React from "react"
import { forwardRef } from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const inputVariants = cva(
  "flex w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:border-pink-300 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
  {
    variants: {
      variant: {
        default: "",
        error: "border-red-300 focus-visible:ring-red-500 focus-visible:border-red-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>, VariantProps<typeof inputVariants> {
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, variant, error, type, ...props }, ref) => {
  return (
    <div className="relative">
      <input
        type={type}
        className={cn(inputVariants({ variant: error ? "error" : variant, className }))}
        ref={ref}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${props.id}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${props.id}-error`} className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
})

Input.displayName = "Input"

export { Input, inputVariants }
