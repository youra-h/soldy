import {
	TCollectionItemExtension,
	ToastsItemDescriptor,
	ToastsCollectionItemDescriptor,
} from '@soldy-ui/setup'
import {
	isToastRender,
	useAdapter,
	useExpose,
	useIcon,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../../adapter'
import BaseToastsItem, { type ToastsItemProps } from './base.component'

/**
 * Логики здесь нет: имя крестика — `TToastsItemNamesPlugin`, жест —
 * `TSwipePlugin`, роль, `tabindex` и `data-*` — ядро тоста. Разметка
 * раскладывает то, что отдали ядро и плагины.
 */
export default {
	name: '_ToastsItem',
	extends: BaseToastsItem,
	expose: useExpose(),
	setup(props: ToastsItemProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(ToastsItemDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const itemAdapter = createVueAdapterContext(
			ToastsCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, {
			item: adapter.instance,
			elevator: VueElevatorFactory,
		})

		const itemBinding = useAdapter(itemAdapter, props, emit)
		const ownerBinding = useAdapter(adapter, props, emit)

		return {
			...itemBinding,
			...ownerBinding,
			/**
			 * Инстанс — для крестика (`toast.close()`) и своего содержимого: тост
			 * приходит ему пропом `toast`, и кнопка внутри может его закрыть.
			 */
			toast: adapter.instance,
			closeIconTag: useIcon('close'),
			/** Своё содержимое рисуется, только когда это компонент Vue */
			isToastRender,
		}
	},
}
