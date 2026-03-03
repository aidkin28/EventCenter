import * as React from "react"
import { useState, useEffect } from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const pillButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all rounded-full",
  {
    variants: {
      variant: {
        default: "bg-purple-50 border border-purple-200 text-purple-700",
        solid:
          "bg-gradient-to-r from-purple-500 to-purple-600 text-white border border-purple-400/30",
        outline: "bg-white border border-purple-200 text-purple-700",
      },
      size: {
        default: "px-4 py-2 text-xs",
        lg: "px-6 py-2.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface SubButton {
  label: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

interface PillButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof pillButtonVariants> {
  subButton?: SubButton
  primaryClassName?: string
  secondaryClassName?: string
}

function PillButton({
  className,
  variant,
  size,
  subButton,
  primaryClassName,
  secondaryClassName,
  children,
  ...props
}: PillButtonProps) {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (subButton) {
      const timer = setTimeout(() => setRevealed(true), 50)
      return () => clearTimeout(timer)
    }
  }, [subButton])

  if (!subButton) {
    return (
      <button
        data-slot="pill-button"
        className={cn(pillButtonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </button>
    )
  }

  return (
    <div
      data-slot="pill-button-container"
      className={cn(
        "group inline-flex flex-col border border-purple-200 overflow-hidden hover:border-purple-300 transition-all duration-300",
        revealed ? "rounded-t-[20px] rounded-b-[10px]" : "rounded-[20px]",
        secondaryClassName
      )}
    >
      <div className={cn("p-0 rounded-t-[20px]", primaryClassName, revealed && "px-[2.5px] pt-[1.5px]")}>
        <button
          data-slot="pill-button"
          className={cn(
            pillButtonVariants({ variant, size }),
            "border-0 w-full",
            className
          )}
          {...props}
        >
          {children}
        </button>
      </div>
      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          revealed ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <button
            data-slot="pill-sub-button"
            className="text-[11px] text-purple-500 hover:text-purple-700 transition-colors py-1.5 px-3 w-full cursor-pointer"
            onClick={subButton.onClick}
          >
            {subButton.label}
          </button>
        </div>
      </div>
    </div>
  )
}

export { PillButton, pillButtonVariants }
