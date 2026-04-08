import { useUserContext } from '../context/UserContext';

export function useTheme() {
    const { appearance: theme, updateAppearance } = useUserContext();

    // Toggle Function with View Transition
    const toggleTheme = () => {
        const nextTheme = theme === 'light' ? 'dark' : 'light';

        // Fallback for browsers without View Transition API
        if (!document.startViewTransition) {
            updateAppearance(nextTheme);
            return;
        }

        document.startViewTransition(() => {
            updateAppearance(nextTheme);
        });
    };

    return { theme, toggleTheme };
}
