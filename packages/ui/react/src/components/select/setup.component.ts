/**
 * useSetupSelect — setup-слой Select (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой, как у ListBox: свой (`SelectDescriptor` — поле,
 * панель, режим ввода) и фасада коллекции (`SelectCollectionDescriptor` —
 * опции, выбор, группы, теги поля) на общем наборе: плагины Select видят его
 * коллекцию. Фасад собран на инстансе Select, поэтому пересобираются и
 * уничтожаются они вместе.
 *
 * Логики здесь нет, как у Vue. Связка «панель открыта ⇄ слушаем нажатия мимо»
 * живёт в `TDismissPlugin`, координаты панели — в `TAnchorPlugin`, клик — в
 * `TSelectPointerPlugin`, клавиатура — в `TSelectKeyboardPlugin`, жест — в
 * `TSwipePlugin`. Разметка раскладывает то, что отдали ядро и плагины.
 *
 * Лифт один на всю сборку, и в его слой пишут три расширения:
 *
 * - поле формы `Field` над Select связывается с ним, а не с его полем: поле —
 *   деталь его разметки (`embedded`), и `aria` Select разметка кладёт на
 *   него. Связку Select берёт своим расширением (`TFieldControlExtension`), а
 *   своему содержимому опускает пустую;
 * - расширение коллекции опускает движок и регистратор опций: опция,
 *   смонтированная в панели, прочтёт их при своей сборке и при коммите
 *   войдёт в коллекцию Select. Панель — портал Frame, а портал React контекст
 *   сохраняет;
 * - окно обёртки `Virtual` над Select фасад подхватывает тем же лифтом
 *   (`TVirtualCollectionExtension`), а своему поддереву опускает пустое
 *   подключение.
 *
 * Детям слой (`layer`) отдаёт `Elevate` в разметке. Отдаёт разметке ещё две
 * вещи. Якорь панели — корень значением рендера (`useRootElement`): `null` на
 * сервере и до коммита, узел после, как у Menu. Поле — `field`, экземпляр
 * `TInput`, которым владеет Select: не проп, и разметка отдаёт его
 * встроенному `Input` целиком (`ctrl={field}`). Экземпляр — сборки: Select без
 * `ctrl`, пересобранный React (StrictMode, `<Activity>`), — новый TSelect с
 * новым полем, и разметка ставит поле над ним заново (`key`).
 */

import {
	SelectCollectionDescriptor,
	SelectDescriptor,
	TCollectionExtension,
	TFieldControlExtension,
	TVirtualCollectionExtension,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter, useRootElement } from '../../adapter'
import type { SelectProps } from './base.component'

export function useSetupSelect(props: SelectProps) {
	const {
		contexts: [adapter, collectionAdapter],
		layer,
	} = useAdapterContext((create, elevator) => {
		const adapter = create(SelectDescriptor(), { ctrl: props.ctrl, props }).use(
			TFieldControlExtension,
			{ elevator },
		)

		const collectionAdapter = create(
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
			// видимые опции. Подхват при сборке, подписка на обёртку — при
			// коммите, снятие — с уничтожением
			.use(TVirtualCollectionExtension, { elevator })

		return [adapter, collectionAdapter] as const
	})

	// Выход `dismiss_ownerAttribute` разметка раскладывает на панель
	const owner = useAdapter(adapter, props)
	const collectionBinding = useCollectionAdapter(collectionAdapter, props, owner.forwardProps)

	return {
		...owner,
		forwardProps: collectionBinding.forwardProps,
		state: { ...owner.state, ...collectionBinding.state },
		rootElement: useRootElement(owner.root),
		field: adapter.instance.field,
		layer,
	}
}
