import Snackbar from "@mui/material/Snackbar";
import React from "react";

export interface ToastProps {
  open: boolean;
  message: string;
  onClose: (event?: React.SyntheticEvent | Event, reason?: string) => void;
  autoHideDuration?: number;
  anchorOrigin?: {
    vertical: "top" | "bottom";
    horizontal: "left" | "center" | "right";
  };
}

export default function Toast({
  open,
  message,
  onClose,
  autoHideDuration = 3000,
  anchorOrigin = { vertical: "top", horizontal: "right" },
}: ToastProps) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      message={message}
      anchorOrigin={anchorOrigin}
    />
  );
}
