import { toRaw, ref } from 'vue'
import {
	createAdapterContext,
	TCollectionExtension,
	SelectDescriptor,
	SelectCollectionDescriptor,
} from '@soldy/setup'
import type {
	ISelectComponentProps,
	ISelect,
	ISelectCollectionProps,
	TSelectCollectionFacade,
} from '@soldy/core'
import type { TDismissPluginProps } from '@soldy/setup'
import {
	useAdapter,
	useCollectionAdapter,
	VueElevatorFactory,
	useIcon,
	useSplitAttrs,
} from '../../adapter'
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
			{
				props,
				// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
				// не создаёт, лишь доложит недостающие расширения в неё же.
				// Не дали — соберёт свою. Развилка в `resolveEngine`
				options: { owner: adapter.instance, engine: toRaw(props.engine) },
			},
			{ bundle: adapter.bundle, defaultExtensions: [] },
		).use(TCollectionExtension, { elevator: VueElevatorFactory })

		const refsCollection = useCollectionAdapter<
			ISelectCollectionProps,
			TSelectCollectionFacade
		>(collectionAdapter, props, emit)

		return {
			...refs,
			...refsCollection,
			/** Методы коллекции рефами не пробрасываются — отдаём инстанс. */
			collection: collectionAdapter.instance,
			fieldElement: ref<HTMLElement | null>(null),
			clearIconTag: useIcon('close'),
			arrowIconTag: useIcon('arrowDown'),
			...useSplitAttrs(),
		}
	},
}
