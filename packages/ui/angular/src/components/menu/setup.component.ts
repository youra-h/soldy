import { MenuCollectionDescriptor, MenuDescriptor, TCollectionExtension } from '@soldy-ui/setup'
import type { IMenu, IMenuProps, TMenuCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupMenu — setup-слой Menu.
 *
 * Два контекста, как у Vue и ListBox: свой (`MenuDescriptor` — открытость,
 * сторона, способ открытия, точка вызова, наборы связки) и фасада коллекции
 * (`MenuCollectionDescriptor` — пункты, группы, подменю из данных) на общем
 * наборе. Оба собираются один раз, в `ngOnInit`, в контексте инъекции меню, и
 * база получает их одной связкой (`joinBindings`).
 *
 * Расширение коллекции опускает движок и регистратор пунктов лифтом — в слой
 * меню (`provideElevator()` в его `providers`): пункт, собранный внутри, —
 * разметкой или из данных, в увезённой панели тоже: DI идёт по дереву
 * объявлений, а не по DOM, — прочтёт их при своей сборке и войдёт в коллекцию
 * меню, а пункт подменю — в коллекцию своего подменю, ближайшую.
 *
 * `engine` — готовая коллекция снаружи, вход меню. Дали — фасад работает на
 * ней и своей не создаёт, лишь доложит недостающие расширения в неё же. Не
 * дали — соберёт свою. Развилка в `completeEngine`.
 *
 * Логики здесь нет: открытие — клик по кнопке или контекстное меню у точки
 * вызова — и наведение — `TMenuPointerPlugin`, клавиши — `TMenuKeyboardPlugin`,
 * фокус, Escape и Tab — `TMenuFocusPlugin`, нажатие мимо — `TDismissPlugin`,
 * координаты панели у корня или у точки — `TAnchorPlugin` её Frame. Шаблон
 * раскладывает то, что отдали ядро и плагины: связку — триггеру и панели, а
 * выход `dismiss_ownerAttribute` — пометкой на панель.
 */
export function setupMenu(
	ctrl: IMenu | undefined,
	props: object,
	engine: IMenuProps['engine'],
): TBinding<IMenu, TMenuCollectionFacade> {
	const adapter = createAngularAdapterContext(MenuDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const collectionAdapter = createAngularAdapterContext(
		MenuCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter))
}
