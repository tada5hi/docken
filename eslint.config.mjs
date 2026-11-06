import config from '@tada5hi/eslint-config';

export default config(
    { typescript: true },
    { ignores: ['**/dist/**', '**/*.d.ts', '**/coverage/**'] },
    {
        rules: {
            'unicorn/prefer-optional-catch-binding': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
        },
    },
);
