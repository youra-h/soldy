import { createSchema } from '../schema'

/**
 * Базовая Entity-схема.
 * Только framework-свойства ctrl и plugins.
 * Все остальные схемы расширяют её.
 */
export const entitySchema = createSchema({
	props: {
		ctrl: {},

		plugins: {},
	},
})
