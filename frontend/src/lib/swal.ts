// lib/swal.ts
import Swal from "sweetalert2";

const base = Swal.mixin({
  customClass: {
    popup: "rounded-xl",
    confirmButton: "swal2-confirm-custom",
    cancelButton: "swal2-cancel-custom",
  },
  buttonsStyling: true,
});

export const swalSuccess = (title: string, text?: string) =>
  base.fire({
    icon: "success",
    title,
    text,
    timer: 1800,
    showConfirmButton: false,
    timerProgressBar: true,
  });

export const swalError = (title: string, text?: string) =>
  base.fire({
    icon: "error",
    title: title || "Something went wrong",
    text,
  });

export const swalInfo = (title: string, text?: string) =>
  base.fire({ icon: "info", title, text });

export const swalConfirm = (
  title: string,
  text?: string,
  confirmText = "Yes, continue"
) =>
  base
    .fire({
      title,
      text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: "Cancel",
      reverseButtons: true,
    })
    .then((r) => r.isConfirmed);

export const swalToast = (title: string, icon: "success" | "error" | "info" = "success") =>
  base.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true,
  });