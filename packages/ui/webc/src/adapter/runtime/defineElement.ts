/**
 * defineElement — регистрация кастомного элемента с защитой от повторной.
 *
 * Импорт пакета регистрирует элементы: `<soldy-button>` должен работать сразу,
 * это ожидаемое поведение библиотеки Web Components. Guard нужен, потому что
 * повторный customElements.define бросает исключение — а такое случается при
 * HMR и в тестах, где модуль подгружается несколько раз.
 */

export function defineElement(tag: string, ctor: CustomElementConstructor): void {
	if (typeof customElements === 'undefined') return
	if (customElements.get(tag)) return

	customElements.define(tag, ctor)
}
