module.exports = {
  extends: ["next/core-web-vitals", "plugin:react-hooks/recommended"],
  rules: {
    // Allow unused variables with underscore prefix and ignore patterns
    "@typescript-eslint/no-unused-vars": ["error", { 
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_",
      "destructuredArrayIgnorePattern": "^_"
    }],
    "@typescript-eslint/no-explicit-any": "off",
    "react/no-unescaped-entities": "off",
    "react-hooks/exhaustive-deps": "off",
    "jsx-a11y/role-has-required-aria-props": "off",
    "@typescript-eslint/ban-ts-comment": "off"
  }
}; 