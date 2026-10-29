import typescript from '@tada5hi/eslint-config-typescript';

export default [
    { ignores: ['**/dist/**', '**/*.d.ts'] },
    ...await typescript({ project: './tsconfig.eslint.json' }),
    {
        languageOptions: { globals: { NodeJS: 'readonly' } },
        rules: {
            // maintainer: declined 2026-10-28
            'unicorn/prefer-optional-catch-binding': 'off',
            'class-methods-use-this': 'off',
            'no-shadow': 'off',
            'no-use-before-define': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-use-before-define': 'off',
        },
    },
];
