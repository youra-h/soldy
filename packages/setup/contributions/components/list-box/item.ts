import type { IContribution } from '@soldy/accessor'
import { defineType } from '../../defineType'
import type { TListItemContentFit } from '@soldy/core'

/**
 * Собственные пропсы элемента списка.
 *
 * `contentFit` здесь трёхзначен: `undefined` означает «как у списка», и это не
 * то же самое, что `truncate`. Разрешение делает расширение коллекции, оно же
 * пишет элементу `data-content-fit`.
 *
 * `expand` элементу недоступен — ширина у списка одна на всех, см.
 * `TListItemContentFit`.
 */
export const ListBoxItemContribution = (): IContribution => ({
	props: {
		text: { type: String, triggers: ['change:text'] },
		contentFit: {
			type: defineType<TListItemContentFit>(String),
			triggers: ['change:contentFit'],
		},
	},
})
