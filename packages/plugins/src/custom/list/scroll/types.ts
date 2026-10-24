import type { IPluginConstructor, TPluginEvents } from '../../../base'
import type { TListNavigationPlugin } from '../navigation'

export type TListScrollPluginEvents = TPluginEvents & {
	'change:scroll': () => void
}

export interface IListScrollPluginOptions {
	/**
	 * Навигация списка — класс плагина, за чьей видимой подсветкой
	 * (`change:highlight`) идёт прокрутка: `TListKeyboardPlugin` у ListBox,
	 * `TSelectKeyboardPlugin` у Select, `TMenuKeyboardPlugin` у меню,
	 * `TMenuSubmenuKeyboardPlugin` у подменю. Стоит в наборе раньше прокрутки.
	 *
	 * Опцией, а не поиском в наборе: набор находит плагин по точному классу
	 * (`ctx.get`), а наследников у базы навигации четыре. Не задана —
	 * прокрутка идёт только за значением.
	 *
	 * `any` — карта событий наследника инвариантна и бывает шире базовой (у
	 * Select — `escape`), а событие подсветки у всех наследников одно.
	 */
	navigation?: IPluginConstructor<any, any, TListNavigationPlugin<any, any>>
}
