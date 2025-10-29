"use client";

import { useRouter, usePathname } from "@/i18n/routing";
import { useState, useRef, useEffect } from "react";

type Locale = "en" | "de" | "fr" | "it";

const languages: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
};

export default function LanguageSwitcher({
  currentLocale,
}: {
  currentLocale: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    router.push(pathname, { locale: newLocale });
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-600 hover:text-gray-800 cursor-pointer px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
      >
        {languages[currentLocale as Locale] || languages.en}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          {(Object.keys(languages) as Locale[]).map((locale) => (
            <button
              key={locale}
              onClick={() => handleLocaleChange(locale)}
              className={`block w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors ${
                locale === currentLocale
                  ? "bg-blue-50 text-blue-600 font-medium"
                  : "text-gray-700"
              }`}
            >
              {languages[locale]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
