import { createTheme, type ThemeOptions } from '@mui/material/styles'

const shared: ThemeOptions = {
  typography: {
    fontFamily: '"Outfit", "Segoe UI", sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
    overline: { fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '0.12em' },
  },
  shape: { borderRadius: 12 },
}

export function createAppTheme(mode: 'light' | 'dark') {
  const isDark = mode === 'dark'
  return createTheme({
    ...shared,
    palette: {
      mode,
      primary: {
        main: isDark ? '#3dd6c6' : '#0d7377',
        contrastText: isDark ? '#04201c' : '#ffffff',
      },
      secondary: {
        main: isDark ? '#f4a261' : '#e76f51',
      },
      background: {
        default: isDark ? '#071018' : '#e8f1f2',
        paper: isDark ? '#0f1f2c' : '#ffffff',
      },
      success: { main: isDark ? '#5ce0a0' : '#2a9d8f' },
      warning: { main: isDark ? '#f4a261' : '#e9c46a' },
      error: { main: isDark ? '#ef476f' : '#e63946' },
      divider: isDark ? 'rgba(61,214,198,0.18)' : 'rgba(13,115,119,0.18)',
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage: isDark
              ? 'radial-gradient(ellipse at 20% 0%, #143047 0%, #071018 55%)'
              : 'radial-gradient(ellipse at 80% -10%, #b8e0e8 0%, #e8f1f2 50%)',
            minHeight: '100vh',
            transition: 'background 0.4s ease, color 0.3s ease',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            paddingInline: 20,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  })
}
