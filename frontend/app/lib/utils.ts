import { type ClassValue, clsx } from "clsx";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function showSuccessToast(message: string, description?: string) {
  toast.success(message, {
    description: description,
    duration: 3000,
  });
}

export function showErrorToast(message: string, description?: string) {
  toast.error(message, {
    description: description,
    duration: 3000,
  });
}

export function showInfoToast(message: string, description?: string) {
  toast.message(message, {
    description: description,
    duration: 3000,
  });
}

/**
 * Extracts and formats error messages from API error responses
 * @param error The error response from the API
 * @returns A formatted error message string
 */
export function displayErrorMessage(error: any) {
  if (typeof error === "string") {
    showErrorToast(error);
  }

  // If it's an axios error with a response
  if (error?.response?.data) {
    error = error.response.data;
  }

  // Handle structured validation errors
  if (error?.error?.errors && Array.isArray(error.error.errors)) {
    const errorMessages = error.error.errors
      .map((err: any) => {
        if (err.message) {
          showErrorToast(err.message);
        }
        if (err.path && err.msg) {
          showErrorToast(`${err.path}: ${err.msg}`);
        }
        return null;
      })
      .filter(Boolean);

    if (errorMessages.length > 0) {
      showErrorToast(errorMessages.join(", "));
    }
  }

  if (error?.message) {
    showErrorToast(error.message);
  }

  if (error?.data?.message) {
    showErrorToast(error.data.message);
  }
}

export function formatDate(dateString: string | Date) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(dateString: string | Date) {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(dateString: string | Date) {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
