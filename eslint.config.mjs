import js from '@eslint/js'
import * as tseslint from 'typescript-eslint'

export default [
	{
		ignores: ['dist/**', '**/*.js'],
	},
	...tseslint.configs.recommended,
	js.configs.recommended,
	{
		files: ['**/*.ts'],
		languageOptions: {
			globals: {
				console: true,
				process: true,
				__dirname: true,
				require: true,
			},
		},
		rules: {
			semi: ['error', 'never'],
			indent: ['error', 'tab'],
			'object-curly-spacing': ['error', 'always'],
		},
	},
]
