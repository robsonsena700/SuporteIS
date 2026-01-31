export const theme = {
  dark: {
    background: '#111827', // gray-900
    card: '#1f2937',       // gray-800
    text: '#f9fafb',       // gray-50
    subtext: '#d1d5db',    // gray-300 (Lightened for better contrast)
    border: '#374151',     // gray-700
    primary: '#3b82f6',    // blue-500
    secondary: '#10b981',  // emerald-500 (success)
    danger: '#ef4444',     // red-500
    warning: '#f59e0b',    // amber-500
    info: '#0ea5e9',       // sky-500
    inputBg: '#111827',    // gray-900
    inputBorder: '#9ca3af',// gray-400 (Lightened for visibility)
    placeholder: '#9ca3af',// gray-400 (Lightened for visibility)
    statusBar: 'light',
  },
  light: {
    background: '#f3f4f6', // gray-100
    card: '#ffffff',       // white
    text: '#111827',       // gray-900
    subtext: '#4b5563',    // gray-600 (Darkened for better contrast)
    border: '#e5e7eb',     // gray-200
    primary: '#2563eb',    // blue-600
    secondary: '#059669',  // emerald-600
    danger: '#dc2626',     // red-600
    warning: '#d97706',    // amber-600
    info: '#0284c7',       // sky-600
    inputBg: '#ffffff',    // white
    inputBorder: '#6b7280',// gray-500 (Darkened for WCAG AA)
    placeholder: '#6b7280',// gray-500 (Darkened for visibility)
    statusBar: 'dark',
  }
};

export type ThemeType = 'light' | 'dark';
export type ThemeMode = 'light' | 'dark';
