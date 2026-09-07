import type { IPlugin } from '../../base'

/**
 * События взаимодействия с пользователем.
 *
 * Разделены намеренно: `click` — то, что реально произошло в DOM, `press` —
 * намерение активировать контрол. Они не совпадают. У нативной `<button
 * disabled>` клик не приходит вообще, а у `<div aria-disabled="true">` —
 * приходит; Enter/Space на `<div>` кликом не становятся. `press` сглаживает
 * это, `click` оставляет как есть — иначе с инстанса не добраться до правды.
 */
export type TActionPluginEvents = {
	/** Плагин доступен снаружи (PLUGIN_EVENTS). */
	create: (plugin: IPlugin<any, any>) => void

	/** Активация контрола: клик мышью либо Enter/Space. Не приходит на disabled. */
	press: (event: MouseEvent | KeyboardEvent) => void

	/** Сырой DOM-клик, без фильтра по disabled. */
	click: (event: MouseEvent) => void

	/** Фокус внутри корневого элемента. */
	focus: (event: FocusEvent) => void

	/** Фокус ушёл из корневого элемента. */
	blur: (event: FocusEvent) => void
}

export interface IActionPluginOptions {
	/**
	 * Клавиши, активирующие контрол на не-нативных тегах.
	 * По умолчанию Enter и Space — как требует WAI-ARIA для role="button".
	 */
	keys?: readonly string[]
}
