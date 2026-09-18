import { TCollectionExtension, SelectDescriptor, SelectCollectionDescriptor } from '@soldy/setup'
import type {
	ISelectComponentProps,
	ISelect,
	ISelectCollectionProps,
	TSelectCollectionFacade,
} from '@soldy/core'
import type { DescriptorPluginOutputs } from '@soldy/setup'
import {
	useAdapter,
	useCollectionAdapter,
	VueElevatorFactory,
	useIcon,
	useSplitAttrs,
	createVueAdapterContext,
	type SetupContext,
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
 * Якорь панели — `rootElement` из адаптера: разметка отдаёт DOM-узел,
 * а не поведение, и собственной реактивности компоненту не нужно.
 */
export default {
	name: '_Select',
	inheritAttrs: false,
	extends: BaseSelect,
	setup(props: SelectProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(SelectDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		// Выходы плагинов — третьим аргументом: шаблон раскладывает
		// `dismiss_ownerAttribute` спредом на телепортированную панель
		const refs = useAdapter<
			ISelectComponentProps,
			ISelect,
			DescriptorPluginOutputs<typeof SelectDescriptor>
		>(adapter, props, emit)

		const collectionAdapter = createVueAdapterContext(
			SelectCollectionDescriptor(),
			{
				props,
				// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
				// не создаёт, лишь доложит недостающие расширения в неё же.
				// Не дали — соберёт свою. Развилка в `resolveEngine`
				options: { owner: adapter.instance, engine: props.engine },
			},
			{ bundle: adapter.bundle },
		).use(TCollectionExtension, { elevator: VueElevatorFactory })

		const refsCollection = useCollectionAdapter<
			ISelectCollectionProps,
			TSelectCollectionFacade
		>(collectionAdapter, props, emit)

		return {
			...refs,
			...refsCollection,
			/** Методы коллекции рефами не пробрасываются — отдаём инстанс. */
			facade: collectionAdapter.instance,
			/**
			 * Экземпляр `TInput`, которым владеет Select. Не проп (не меняется
			 * за время жизни компонента), поэтому отдаём инстансом, как
			 * `facade` — `<Input :ctrl="field">` берёт его целиком.
			 */
			field: adapter.instance.field,
			clearIconTag: useIcon('close'),
			arrowIconTag: useIcon('arrowDown'),
			...useSplitAttrs(),
		}
	},
}
