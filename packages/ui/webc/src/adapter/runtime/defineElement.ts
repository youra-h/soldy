/**
 * defineElement — регистрация элемента soldy с защитой от повторной.
 *
 * Элемент soldy расширяет встроенный элемент своего тега (customized built-in,
 * см. `SoldyElement`): имя регистрируется с `extends`, и в разметке элемент
 * пишется нативным тегом с атрибутом `is` — `<button is="so-button">`.
 *
 * Импорт пакета регистрирует элементы: `<button is="so-button">` должен
 * работать сразу, это ожидаемое поведение библиотеки Web Components. Guard
 * нужен, потому что повторный customElements.define бросает исключение — а
 * такое случается при HMR и в тестах, где модуль подгружается несколько раз.
 */

export function defineElement(name: string, ctor: CustomElementConstructor, tag: string): void {
	if (typeof customElements === 'undefined') return
	if (customElements.get(name)) return

	customElements.define(name, ctor, { extends: tag })
}
