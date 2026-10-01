import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props extends ButtonProps {
  /** Tooltip text shown on hover */
  label: string;
  /** Optional side (default: top) */
  side?: "top" | "right" | "bottom" | "left";
  children: React.ReactNode;
}

/**
 * Icon-only button with built-in tooltip.
 * Usage: <TooltipIconButton label="Delete" onClick={...}><Trash2 /></TooltipIconButton>
 */
export function TooltipIconButton({
  label,
  side = "top",
  children,
  ...buttonProps
}: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          {...buttonProps}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side={side}>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}