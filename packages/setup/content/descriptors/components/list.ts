/**
 * Общие фрагменты списочных дескрипторов.
 *
 * `LIST_PROPS` — списочные props, общие для ListBox и Select. Объявлены один
 * раз и подмешиваются в contribution обоих компонентов. Это зеркало контракта
 * `IList` из ядра: там типы, здесь декларация для обмена. Общего предка у
 * компонентов нет и быть не может (`TValueControl` против `TInputControl`),
 * поэтому наследовать нечего — но повторять четыре декларации в двух файлах
 * тоже незачем. Что копии не разойдутся с ядром, проверяет
 * `core/__tests__/list-contract.spec.ts`.
 *
 * `GROUP_PROPS` — группировка коллекции, общая для коллекционных дескрипторов
 * Menu, ListBox и Select: ключ группы элемента и группы с подписями. Фасады
 * всех троих наследуют одну базу (`TGroupCollectionFacade`), а дескрипторы
 * фасадов — `CollectionDescriptor`, у которого группировки нет, поэтому
 * фрагмент. Что разметка рисует по секциям, объявляет каждый сам: меню —
 * секции показанного (`sections`), списки — секции нарисованного
 * (`drawnSections`).
 *
 * `satisfies`, а не аннотация словарём: с аннотацией `Record<string, …>` спред
 * в `props` терял свои ключи в типах, и `defineComponent` не видел триггеров
 * фрагмента — события `change:maxRows` и соседей выпали бы из событий ListBox
 * и Select. Триггеры сверяются с общими картами `TListEvents` и
 * `TGroupEvents`: карты компонентов их содержат.
 */

import type { TGroupEvents, TListEvents } from '@soldy-ui/core'
import type { IComponentPropDefinition } from '../../../protected/define'

export const LIST_PROPS = {
	maxRows: {
		type: Number,
		triggers: ['change:maxRows'],
	},
	contentFit: {
		type: String,
		triggers: ['change:contentFit'],
	},
	scrollBehavior: {
		type: String,
		triggers: ['change:scrollBehavior'],
	},
	indicator: {
		type: String,
		triggers: ['change:indicator'],
	},
} satisfies Record<string, IComponentPropDefinition<keyof TListEvents>>

export const GROUP_PROPS = {
	/** Ключ группы элемента. Не задан — метка `_.group` из данных */
	groupBy: { type: Function, triggers: ['change:groupBy'] },
	/** Порядок групп и их подписи. Сверка по содержимому */
	groups: { type: Array, triggers: ['change:groups'] },
} satisfies Record<string, IComponentPropDefinition<keyof TGroupEvents<object>>>
