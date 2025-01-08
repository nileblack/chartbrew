import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectItem } from "@nextui-org/react";

const languages = [
  { key: 'en', label: 'EN' },
  { key: 'zh', label: '中' }
];

function LanguageSelector() {
  const { i18n } = useTranslation();

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('_cb_language', lang);
  };

  return (
    <Select
      selectedKeys={[i18n.language]}
      onChange={(e) => handleLanguageChange(e.target.value)}
      className="w-[80px] min-w-[80px]"
      size="sm"
      variant="bordered"
      aria-label="Select language"
    >
      {languages.map((lang) => (
        <SelectItem key={lang.key} value={lang.key}>
          {lang.label}
        </SelectItem>
      ))}
    </Select>
  );
}

export default LanguageSelector; 