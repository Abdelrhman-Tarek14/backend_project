export const formatAgentName = (email: string | null | undefined): string => {
    if (!email) return 'Unknown';

    // 1. If it has '@', extract local part before @
    let name = email.includes('@')
        ? email.split('@')[0]
        : email;

    // 2. Remove .ext suffix if present (e.g. food.queue.ext)
    if (name.toLowerCase().endsWith('.ext')) {
        name = name.slice(0, -4);
    }

    // 3. Split by '_' and take first part (removes suffixes like co14_bseg)
    if (name.includes('_')) {
        name = name.split('_')[0];
    }

    // 4. Replace dots with spaces, capitalize each word
    return name
        .replace(/\./g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export const normalizeArabic = (text: string | null | undefined): string => {
    if (!text) return "";
    let normalized = text;
    // Normalize Alef
    normalized = normalized.replace(/[أإآ]/g, 'ا');
    // Normalize Teh Marbuta
    normalized = normalized.replace(/ة/g, 'ه');
    // Normalize Yeh
    normalized = normalized.replace(/ى/g, 'ي');
    return normalized;
};