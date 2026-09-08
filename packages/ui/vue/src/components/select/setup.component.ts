import { toRaw, ref } from 'vue'
import {
	createAdapterContext,
	TCollectionExtension,
	SelectDescriptor,
	SelectCollectionDescriptor,
} from '@soldy/setup'
import type { ISelectComponentProps, ISelect, TSelectCollectionFacade } from '@soldy/core'
import type { TDismissPluginProps } from '@soldy/setup'
import { useAdapter, VueElevatorFactory, useIconImport, useSplitAttrs } from '../../adapter'
import BaseSelect, { type SelectProps } from './base.component'

/**
 * Два адаптерных контекста, как у ListBox: собственный (пропсы поля) и
 * коллекционный (опции и выбор). Второй получает `owner` и общий `bundle`,
 * чтобы плагины видели коллекцию.
 *
 * Логики здесь нет намеренно. Связка «панель открыта ⇄ слушаем нажатия мимо»
 * живёт в `TDismissPlugin`, координаты панели — в `TAnchorPlugin`, клавиатура
 * — в `TSelectKeyboardPlugin`. Иначе всё это пришлось бы повторить в шести
 * адаптерах и не забыть менять во всех сразу.
 *
 * Остаётся одна проводка: ссылка на поле, которую панель берёт как якорь.
 * Это то же самое, что `rootElement` — способ отдать DOM-узел, а не поведение.
 */
export default {
	name: '_Select',
	inheritAttrs: false,
	extends: BaseSelect,
	setup(props: SelectProps, { emit }: any) {
		const adapter = createAdapterContext(SelectDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		const refs = useAdapter<ISelectComponentProps & TDismissPluginProps, ISelect>(
			adapter,
			props,
			emit,
		)

		const collectionAdapter = createAdapterContext(
			SelectCollectionDescriptor(),
			{ props, options: { owner: adapter.instance } },
			{ bundle: adapter.bundle, defaultExtensions: [] },
		).use(TCollectionExtension, { elevator: VueElevatorFactory })

		const refsCollection = useAdapter<Record<string, any>, TSelectCollectionFacade>(
			collectionAdapter,
			props,
			emit,
		)

		return {
			// Собственные — последними: иначе `ctrl` окажется фасадом коллекции,
			// а шаблону нужен сам TSelect (его `uid` и `toggleOpen`)
			...refsCollection,
			...refs,
			/** Методы коллекции рефами не пробрасываются — отдаём инстанс. */
			collection: collectionAdapter.instance,
			fieldElement: ref<HTMLElement | null>(null),
			clearIconTag: useIconImport('close'),
			arrowIconTag: useIconImport('arrowDown'),
			...useSplitAttrs(),
		}
	},
}
