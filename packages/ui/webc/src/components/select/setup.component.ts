/**
 * setupSelect — setup-слой Select.
 *
 * Два контекста, как у Vue: свой (`SelectDescriptor` — поле, панель,
 * клавиатура, жест) и фасада коллекции (`SelectCollectionDescriptor` — опции,
 * выбор, группы, теги поля и что рисует список панели) на общем наборе, одной
 * связкой.
 *
 * Поле формы `Field` над Select связывается с ним, а не с его полем: поле —
 * деталь его разметки (`embedded`), его связку не берёт, а `aria` Select
 * шаблон кладёт на неё — и уходит он на `<input>`. Связку берёт расширение
 * Select (`TFieldControlExtension`) вверх по документу, а своему содержимому
 * опускает пустую своим хостом.
 *
 * Расширения коллекции опускают движок и регистратор опций лифтом — хосту
 * Select: опции в панели находят их вверх по документу — от увезённой панели
 * поиск идёт к её якорю, в корень Select, — и входят в его коллекцию. Окно
 * обёртки `<so-virtual>` над Select фасад подхватывает тем же лифтом
 * (`TVirtualCollectionExtension`): список панели рисует только видимые опции.
 *
 * `engine` — готовая коллекция снаружи, свойство элемента (`el.engine`): фасад
 * работает на ней, а без неё собирает свою (`completeEngine`).
 *
 * Логики здесь нет: клик — `TSelectPointerPlugin`, клавиши —
 * `TSelectKeyboardPlugin`, ввод — `TEditablePlugin`, нажатие мимо —
 * `TDismissPlugin`, координаты панели — `TAnchorPlugin` её Frame, жест —
 * `TSwipePlugin`. Шаблон раскладывает то, что отдали ядро и плагины: выход
 * `dismiss_ownerAttribute` — пометкой на панель.
 */

import {
	SelectCollectionDescriptor,
	SelectDescriptor,
	TCollectionExtension,
	TFieldControlExtension,
	TVirtualCollectionExtension,
	type DescriptorPluginOutputs,
} from '@soldy-ui/setup'
import type { ISelect, TSelectCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

/** Выходы плагинов Select — их читает шаблон: пометку панели владельцем. */
export type TSelectOutputs = DescriptorPluginOutputs<typeof SelectDescriptor>

export function setupSelect(
	host: HTMLElement,
	ctrl: ISelect | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ISelect, TSelectCollectionFacade, TSelectOutputs> {
	const elevator = createWebcElevator(host)
	const adapter = createWebcAdapterContext(host, SelectDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator },
	)
	const owner = useAdapter(adapter, host, onUpdate)

	const collectionAdapter = createWebcAdapterContext(
		host,
		SelectCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine: props['engine'] } },
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		// Окно обёртки `<so-virtual>` над Select: подхват при сборке, подписка на
		// обёртку — при приёме, снятие — с уничтожением
		.use(TVirtualCollectionExtension, { elevator })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter, host, onUpdate))
}
