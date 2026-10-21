/**
 * setupSelect — setup-слой Select.
 *
 * Два контекста, как у ListBox: свой (`SelectDescriptor` — поле, панель,
 * режим ввода) и фасада коллекции (`SelectCollectionDescriptor` — опции, выбор,
 * группы, теги поля) на общем наборе. Оба собираются один раз, при выполнении
 * тела компонента; фасад делит набор Select, и id монтирования у него Select.
 *
 * Логики здесь нет, как у Vue. Связка «панель открыта ⇄ слушаем нажатия мимо»
 * живёт в `TDismissPlugin`, координаты панели — в `TAnchorPlugin`, клик — в
 * `TSelectPointerPlugin`, клавиатура — в `TSelectKeyboardPlugin`, жест — в
 * `TSwipePlugin`. Разметка раскладывает то, что отдали ядро и плагины.
 *
 * Лифт один на всю сборку (`useElevator`), и в его слой пишут три расширения:
 *
 * - поле формы `Field` над Select связывается с ним, а не с его полем: поле —
 *   деталь его разметки (`embedded`), и `aria` Select разметка кладёт на
 *   него. Связку Select берёт своим расширением (`TFieldControlExtension`), а
 *   своему содержимому опускает пустую;
 * - расширение коллекции опускает движок и регистратор опций: опция,
 *   смонтированная в панели, прочтёт их при своей сборке и войдёт в коллекцию
 *   Select. Панель телепортирована, но мемо содержимого `Teleport` собирается
 *   под владельцем места, где тот стоит, — внутри `Elevate` Select;
 * - окно обёртки `Virtual` над Select фасад подхватывает тем же лифтом
 *   (`TVirtualCollectionExtension`), а своему поддереву опускает пустое
 *   подключение.
 *
 * Детям слой отдаёт `Elevate` в разметке. Отдаёт разметке ещё две вещи.
 * Якорь панели — `rootElement`, аксессор привязанного корня: разметка отдаёт
 * узел, а не поведение, и своей реактивности ей не нужно. Поле — `field`,
 * экземпляр `TInput`, которым владеет Select: не проп, за время жизни
 * компонента не меняется, и разметка отдаёт его встроенному `Input` целиком
 * (`ctrl={field}`).
 */

import {
	SelectCollectionDescriptor,
	SelectDescriptor,
	TCollectionExtension,
	TFieldControlExtension,
	TVirtualCollectionExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { SelectProps } from './base.component'

export function setupSelect(props: SelectProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(SelectDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldControlExtension, { elevator })

	// Выход `dismiss_ownerAttribute` разметка кладёт спредом на панель
	const owner = useAdapter(adapter, props)

	const collectionAdapter = createSolidAdapterContext(
		SelectCollectionDescriptor(),
		{
			props,
			// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
			// не создаёт, лишь доложит недостающие расширения в неё же.
			// Не дали — соберёт свою. Развилка в `completeEngine`
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		// Окно обёртки `Virtual` над Select: список панели рисует только
		// видимые опции. Подхват при сборке, подписка на обёртку — при приёме,
		// снятие — с уничтожением
		.use(TVirtualCollectionExtension, { elevator })

	const collectionBinding = useCollectionAdapter(collectionAdapter, props, owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		ref: owner.ref,
		rootElement: owner.rootElement,
		state: joinState(owner.state, collectionBinding.state),
		forwardProps: collectionBinding.forwardProps,
		field: adapter.instance.field,
		layer,
	}
}
