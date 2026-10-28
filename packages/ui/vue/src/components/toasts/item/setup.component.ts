import type { TToastsItemType } from '@soldy-ui/core'
import {
	TCollectionItemExtension,
	ToastsItemDescriptor,
	ToastsCollectionItemDescriptor,
} from '@soldy-ui/setup'
import {
	isToastRender,
	extendBinding,
	joinBindings,
	useCollectionAdapter,
	useAdapter,
	useExpose,
	roleIcon,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../../adapter'
import BaseToastsItem, { type ToastsItemProps } from './base.component'

/**
 * Логики здесь нет: имя крестика — `TToastsItemNamesPlugin`, жест —
 * `TSwipePlugin`, роль, `tabindex`, `data-*` и модификатор вида — ядро тоста,
 * а что ожидающий тост сам не закрывается — его длительность у коллекции.
 * Разметка раскладывает то, что отдали ядро и плагины.
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
		).use(TCollectionItemExtension, { adapter, elevator: VueElevatorFactory })

		const itemBinding = useCollectionAdapter(itemAdapter, props, emit)
		const ownerBinding = useAdapter(adapter, props, emit)

		return extendBinding(joinBindings(ownerBinding, itemBinding), {
			/**
			 * Инстанс — для крестика (`toast.close()`) и своего содержимого: тост
			 * приходит ему пропом `toast`, и кнопка внутри может его закрыть.
			 */
			toast: adapter.instance,
			closeIconTag: roleIcon('close'),
			/**
			 * Значок вида — по роли, своей у каждого вида: в режиме принудительных
			 * цветов вид различает только глиф. Роль выбирает разметка, как отметку
			 * CheckBox, тема значок только красит. Таблица закрыта по виду
			 * (`satisfies`): новый вид без своего значка не соберётся.
			 */
			typeIconTags: {
				info: roleIcon('info'),
				success: roleIcon('success'),
				warning: roleIcon('warning'),
				error: roleIcon('error'),
			} satisfies Record<TToastsItemType, unknown>,
			/** Значок обычного сообщения — тоста без вида */
			notificationIconTag: roleIcon('notification'),
			/** Своё содержимое рисуется, только когда это компонент Vue */
			isToastRender,
		})
	},
}
