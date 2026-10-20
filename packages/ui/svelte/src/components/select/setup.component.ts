/**
 * setupSelect — setup-слой Select.
 *
 * Два контекста, как у ListBox: свой (`SelectDescriptor` — поле, панель,
 * режим ввода) и фасада коллекции (`SelectCollectionDescriptor` — опции, выбор,
 * группы, теги поля) на общем наборе, с тем же id монтирования.
 *
 * Логики здесь нет, как у Vue. Связка «панель открыта ⇄ слушаем нажатия мимо»
 * живёт в `TDismissPlugin`, координаты панели — в `TAnchorPlugin`, клик — в
 * `TSelectPointerPlugin`, клавиатура — в `TSelectKeyboardPlugin`, жест — в
 * `TSwipePlugin`. Разметка раскладывает то, что отдали ядро и плагины.
 *
 * Поле формы `Field` над Select связывается с ним, а не с его полем: поле —
 * деталь его разметки (`embedded`), и `aria` Select разметка кладёт на него.
 * Связку Select берёт своим расширением (`TFieldControlExtension`), а своему
 * содержимому опускает пустую.
 *
 * Расширения коллекции опускают движок и регистратор опций лифтом
 * (`setContext`): опция, смонтированная в панели, прочтёт их при своей
 * инициализации — панель телепортирована, и контексты места ей отдаёт
 * `Teleport`. Окно обёртки `Virtual` над Select фасад подхватывает тем же
 * лифтом (`TVirtualCollectionExtension`).
 *
 * Отдаёт разметке ещё две вещи. Якорь панели — `rootElement` связки Select,
 * геттером над руной адаптера: разметка следит за ним, как за состоянием, и
 * своей реактивности ей не нужно. Поле — `field`, экземпляр `TInput`, которым
 * владеет Select: не проп, за время жизни компонента не меняется, и разметка
 * отдаёт его встроенному `Input` целиком (`ctrl={field}`).
 */

import {
	SelectCollectionDescriptor,
	SelectDescriptor,
	TCollectionExtension,
	TFieldControlExtension,
	TVirtualCollectionExtension,
} from '@soldy-ui/setup'
import {
	SvelteElevatorFactory,
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	type TRootReceiver,
} from '../../adapter'
import type { SelectProps } from './base.component'

export function setupSelect(getProps: () => SelectProps, mountId: string, receive: TRootReceiver) {
	const props = getProps()
	const adapter = createSvelteAdapterContext(SelectDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	}).use(TFieldControlExtension, { elevator: SvelteElevatorFactory })

	// Выход `dismiss_ownerAttribute` разметка кладёт спредом на панель
	const owner = useAdapter(adapter, getProps, receive)

	const collectionAdapter = createSvelteAdapterContext(
		SelectCollectionDescriptor(),
		{
			props,
			mountId,
			// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
			// не создаёт, лишь доложит недостающие расширения в неё же.
			// Не дали — соберёт свою. Развилка в `completeEngine`
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator: SvelteElevatorFactory })
		// Окно обёртки `Virtual` над Select: список панели рисует только
		// видимые опции. Подхват при сборке, подписка на обёртку — при приёме,
		// снятие — с уничтожением
		.use(TVirtualCollectionExtension, { elevator: SvelteElevatorFactory })

	const collectionBinding = useCollectionAdapter(
		collectionAdapter,
		getProps,
		() => owner.forwardProps,
	)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		attachElement: owner.attachElement,
		state: joinState(owner.state, collectionBinding.state),
		field: adapter.instance.field,

		get forwardProps() {
			return collectionBinding.forwardProps
		},

		get rootElement() {
			return owner.rootElement
		},
	}
}
