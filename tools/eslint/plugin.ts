import { noExplicitAny } from './rules/no-explicit-any'

/** Локальные правила eslint проекта. Подключаются в `eslint.config.ts` под именем `soldy`. */
export default {
	meta: { name: 'soldy' },
	rules: {
		'no-explicit-any': noExplicitAny,
	},
}
