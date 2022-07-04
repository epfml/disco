/**
 * Convenient wrapper functions for Vue Toaster https://github.com/MeForma/vue-toaster
 */

const TIMEOUT = 30000 // ms

function notification (type: string, toast: any, message: string) {
  toast.show(message, { type: type })
  setTimeout(toast.clear, TIMEOUT)
}

/**
 * Display an error toast with the given message
 * @param toast the toast object
 * @param message the message to be displayed
 */
export function error (toast: any, message: string): void {
  notification('error', toast, message)
}

/**
 * Display a success toast with the given message
 * @param toast the toast object
 * @param message the message to be displayed
 */
export function success (toast: any, message: string): void {
  notification('success', toast, message)
}

/**
 * Display a warning toast with the given message
 * @param toast the toast object
 * @param message the message to be displayed
 */
export function warning (toast: any, message: string): void {
  notification('warning', toast, message)
}
