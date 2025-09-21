export type Theme = "light";

export function useTheme() {
  const theme: Theme = "light";

  const setTheme = (_theme: Theme) => {
    // No-op since we only support light mode
  };

  const toggleTheme = () => {
    // No-op since we only support light mode
  };

  return { theme, setTheme, toggleTheme };
}
