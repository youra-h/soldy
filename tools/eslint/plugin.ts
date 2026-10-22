import { noExplicitAny } from './rules/no-explicit-any'
import { solidPartProps } from './rules/solid-part-props'

/** Локальные правила eslint проекта. Подключаются в `eslint.config.ts` под именем `soldy`. */
export default {
	meta: { name: 'soldy' },
	rules: {
		'no-explicit-any': noExplicitAny,
		'solid-part-props': solidPartProps,
	},
}
