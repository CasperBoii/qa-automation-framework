# Lint, Format & Pre-commit Templates

## `.eslintrc.cjs`

```js
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: { project: './tsconfig.json' },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:playwright/recommended',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
    'playwright/no-wait-for-timeout': 'error',
    'playwright/no-conditional-in-test': 'error',
    'playwright/expect-expect': 'error',
  },
};
```

## Husky pre-commit (`.husky/pre-commit`)

```bash
#!/usr/bin/env sh
npx tsc --noEmit && npx lint-staged
```

> Husky's `prepare` script needs a git repo. If `npm install` warns
> `husky: .git can't be found`, run `git init` first, or temporarily drop
> `husky` from the `prepare` script until the repo is initialized.
