import type { TPluginEvents } from '../../base'

/**
 * События взаимодействия с пользователем.
 *
 * Разделены намеренно: `click` — то, что реально произошло в DOM, `press` —
 * намерение активировать контрол. Они не совпадают. У нативной `<button
 * disabled>` клик не приходит вообще, а у `<div aria-disabled="true">` —
 * приходит. `press` сглаживает это, `click` оставляет как есть — иначе с
 * инстанса не добраться до правды. Enter и пробел на корне-`<div>` плагин
 * превращает в клик сам, как браузер у `<button>`, поэтому `press` всегда
 * приходит из клика.
 */
export type TActionPluginEvents = TPluginEvents & {
	/**
	 * Активация контрола: клик — мышью или из Enter/Space с фокусом на корне.
	 * Не приходит на disabled.
	 */
	press: (event: MouseEvent) => void

	/** Сырой DOM-клик, без фильтра по disabled. */
	click: (event: MouseEvent) => void

	/** Фокус внутри корневого элемента. */
	focus: (event: FocusEvent) => void

	/** Фокус ушёл из корневого элемента. */
	blur: (event: FocusEvent) => void
}

export interface IActionPluginOptions {
	/**
	 * Клавиши, активирующие контрол с фокусом на корне не-нативного тега.
	 * По умолчанию Enter и Space — как требует WAI-ARIA для role="button".
	 */
	keys?: readonly string[]
}
