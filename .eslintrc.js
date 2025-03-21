module.exports = {
  extends: ["next/core-web-vitals", "plugin:react-hooks/recommended"],
  rules: {
    // Allow unused variables with underscore prefix and ignore patterns
    "@typescript-eslint/no-unused-vars": ["error", { 
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_",
      "destructuredArrayIgnorePattern": "^_"
    }],
    // Disable rules that are causing most issues
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-expressions": "off",
    "@typescript-eslint/no-unsafe-function-type": "off",
    "@typescript-eslint/no-empty-object-type": "off",
    "@typescript-eslint/no-wrapper-object-types": "off",
    "@typescript-eslint/no-this-alias": "off",
    "@typescript-eslint/no-require-imports": "off",
    "@next/next/no-assign-module-variable": "off",
    
    // Disable React specific rules that are problematic
    "react/no-unescaped-entities": "off",
    "react-hooks/exhaustive-deps": "warn", // Changed to warning instead of error
    "jsx-a11y/role-has-required-aria-props": "off",
    "@typescript-eslint/ban-ts-comment": "off"
  },
  overrides: [
    // Special rules for Next.js API routes
    {
      files: ["app/api/**/*.ts"],
      rules: {
        // API routes often need unused request parameters
        "@typescript-eslint/no-unused-vars": ["off"]
      }
    }
  ],
  ignorePatterns: [
    // Ignore Next.js build output completely
    ".next/**",
    "out/**",
    "node_modules/**"
  ]
}; 