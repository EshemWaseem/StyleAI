// frontend/src/components/ui/modal.tsx
import { X } from "lucide-react";
import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  size?: ModalSize;
  lockScroll?: boolean;
  closeOnOverlay?: boolean;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  hideClose?: boolean;
}

const sizeMap: Record<ModalSize, string> = {
  sm: "ui-panel-sm",
  md: "ui-panel-md",
  lg: "ui-panel-lg",
  xl: "ui-panel-xl",
  "2xl": "ui-panel-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  lockScroll = true,
  closeOnOverlay = true,
  footer,
  className = "",
  bodyClassName = "",
  hideClose = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !lockScroll) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, lockScroll]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={closeOnOverlay ? onClose : undefined}
      className="ui-overlay"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`ui-panel ${sizeMap[size]} ${className}`}
      >
        {(title || description) && (
          <div className="ui-panel-header">
            <div className="min-w-0 flex-1">
              {title && (
                typeof title === "string"
                  ? <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                  : title
              )}
              {description && (
                typeof description === "string"
                  ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                  : description
              )}
            </div>
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        <div className={`modal-scroll ui-panel-body ${bodyClassName}`}>{children}</div>

        {footer && (
          <div className="ui-panel-footer">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}