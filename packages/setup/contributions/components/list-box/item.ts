import type { IContribution } from '@soldy/accessor'
import { defineType } from '../../defineType'
import type { TListItemContentFit } from '@soldy/core'
import type { TEmptySlotScope } from '../../types'

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
/**
 * Слоты элемента ListBox.
 *
 * `indicator-icon` — подмена отметки выбранного в одном месте; глобально она
 * меняется пакетом иконок (`setIcons`). Обёртка вокруг слота остаётся за
 * компонентом: она резервирует место и уносит отметку из дерева доступности.
 */
export type TListBoxItemSlots = {
	leading: TEmptySlotScope
	default: { text: string; selected: boolean }
	trailing: TEmptySlotScope
	'indicator-icon': { selected: boolean }
}

export const ListBoxItemContribution = (): IContribution => ({
	slots: {
		leading: { description: 'Перед текстом элемента' },
		default: {
			scope: {
				text: defineType<string>(String),
				selected: defineType<boolean>(Boolean),
			},
			description: 'Содержимое элемента. Задано — переопределяет проп text',
		},
		trailing: { description: 'После текста элемента' },
		'indicator-icon': {
			scope: { selected: defineType<boolean>(Boolean) },
			description: 'Отметка выбранного элемента',
		},
	},
	props: {
		text: { type: String, triggers: ['change:text'] },
		contentFit: {
			type: defineType<TListItemContentFit>(String),
			triggers: ['change:contentFit'],
		},
	},
})
