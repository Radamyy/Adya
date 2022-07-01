module.exports = {
	env: {
		node: true,
		browser: true,
		commonjs: true,
		es2021: true,
	},
	extends: ['eslint:recommended'],
	parserOptions: {
		ecmaVersion: 'latest',
	},
	rules: {
		'no-constant-condition': ['error'],
		'object-curly-spacing': ['error', 'always'],
		'prefer-const': ['error'],
		indent: ['error', 'tab'],
		quotes: ['error', 'single'],
		semi: ['error', 'always'],
	},
};
