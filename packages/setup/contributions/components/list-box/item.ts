import type { IContribution } from '@soldy/accessor'

/**
 * Собственные пропсы элемента списка.
 *
 * `wordWrap` здесь трёхзначен: `undefined` означает «взять у списка», и это не
 * то же самое, что `false`. Списочное значение лежит в `TListLayoutPlugin`, он
 * же и разрешает пару.
 */
export const ListBoxItemContribution = (): IContribution => ({
	props: {
		text: { type: String, triggers: ['change:text'] },
		wordWrap: { type: Boolean, triggers: ['change:wordWrap'] },
	},
})
