export type Theme = "light";

export function useTheme() {
<<<<<<< HEAD
  const theme: Theme = "light";

  const setTheme = (_theme: Theme) => {
    // No-op since we only support light mode
  };
=======
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add('light');
  }, [theme]);
>>>>>>> main

  const toggleTheme = () => {
    // No-op since we only support light mode
  };

  return { theme, setTheme, toggleTheme };
}
