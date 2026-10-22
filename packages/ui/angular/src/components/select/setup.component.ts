import {
	SelectCollectionDescriptor,
	SelectDescriptor,
	TCollectionExtension,
	TFieldControlExtension,
	TVirtualCollectionExtension,
} from '@soldy-ui/setup'
import type { ISelect, ISelectProps, TSelectCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupSelect — setup-слой Select.
 *
 * Два контекста, как у Vue и ListBox: свой (`SelectDescriptor` — поле,
 * открытость панели, сторона, жест) и фасада коллекции
 * (`SelectCollectionDescriptor` — опции, режим и выбор, группы, теги поля) на
 * общем наборе. Оба собираются один раз, в `ngOnInit`, в контексте инъекции
 * Select, и база получает их одной связкой (`joinBindings`).
 *
 * Поле формы `Field` над Select связывается с ним, а не с его полем: поле —
 * деталь разметки (`embedded`), а набор `aria` Select шаблон кладёт на него, и
 * цепочка хостов доводит набор до `<input>`. Связку поля формы Select берёт
 * своим расширением (`TFieldControlExtension`) из слоя лифта над собой, а
 * своему содержимому опускает пустую — в свой слой (`provideElevator()` в его
 * `providers`): поле, теги и контролы в слотах — его содержимое.
 *
 * Расширения коллекции опускают движок и регистратор опций лифтом — в тот же
 * слой: опция, собранная внутри, — разметкой или из данных, в увезённой
 * панели тоже: DI идёт по дереву объявлений, а не по DOM, — прочтёт их при
 * своей сборке и войдёт в коллекцию Select. Окно обёртки `Virtual` над Select
 * фасад подхватывает тем же лифтом (`TVirtualCollectionExtension`): список
 * панели рисует только видимые опции.
 *
 * `engine` — готовая коллекция снаружи, вход Select. Дали — фасад работает на
 * ней и своей не создаёт, лишь доложит недостающие расширения в неё же. Не
 * дали — соберёт свою. Развилка в `completeEngine`.
 *
 * Логики здесь нет: связка «панель открыта ⇄ слушаем нажатия мимо» —
 * `TDismissPlugin`, координаты панели — `TAnchorPlugin` её Frame, клик по полю
 * — `TSelectPointerPlugin`, клавиатура — `TSelectKeyboardPlugin`, ввод —
 * `TEditablePlugin`, жест — `TSwipePlugin`, теги поля — `TSelectTagsExtension`.
 */
export function setupSelect(
	ctrl: ISelect | undefined,
	props: object,
	engine: ISelectProps['engine'],
): TBinding<ISelect, TSelectCollectionFacade> {
	const adapter = createAngularAdapterContext(SelectDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: AngularElevatorFactory },
	)
	const owner = useAdapter(adapter)

	const collectionAdapter = createAngularAdapterContext(
		SelectCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine } },
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator: AngularElevatorFactory })
		// Окно обёртки `Virtual` над Select: подхват при сборке, подписка на
		// обёртку — при приёме, снятие — с уничтожением
		.use(TVirtualCollectionExtension, { elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter))
}
