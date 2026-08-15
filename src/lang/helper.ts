import zh from "./locale/zh";

const locales: Record<string, Record<string, string>> = {
    zh,
};

let currentLocale = "zh";

export function t(key: string): string {
    return locales[currentLocale]?.[key] || key;
}

export function setLocale(lang: string) {
    if (locales[lang]) currentLocale = lang;
}