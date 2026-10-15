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
 *
 * Элементы, которые уже стоят в документе, браузер оживляет внутри
 * `customElements.define` — синхронно, ещё при импорте пакета, раньше строк
 * точки входа, где приложение подключает тему, иконки и свои плагины. Поэтому
 * на время вызова регистрация держит признак (`isDefining`): по нему база
 * откладывает первую сборку такого элемента на микрозадачу (см. шапку
 * `SoldyElement`).
 */

/** Идёт ли регистрация — см. шапку. */
let defining = false

/**
 * Пришёл ли колбэк элемента из регистрации: элементы документа браузер
 * оживляет внутри `customElements.define`. Полифил в Safari оживляет их
 * микрозадачей позже, и признака тогда уже нет.
 */
export function isDefining(): boolean {
	return defining
}

/** Регистрация с защитой от повторной — одна на оба вида элементов адаптера. */
function register(
	name: string,
	ctor: CustomElementConstructor,
	options?: ElementDefinitionOptions,
): void {
	if (typeof customElements === 'undefined') return
	if (customElements.get(name)) return

	// Прежнее значение, а не `false`: регистрация, вложенная в колбэк элемента,
	// не снимет признак, пока внешняя ещё оживляет свои элементы
	const outer = defining

	defining = true

	try {
		customElements.define(name, ctor, options)
	} finally {
		defining = outer
	}
}

export function defineElement(name: string, ctor: CustomElementConstructor, tag: string): void {
	register(name, ctor, { extends: tag })
}

/**
 * Автономный элемент адаптера — механизм, а не компонент: провайдер локали
 * `<so-locale-provider>`. Нативного поведения, которое стоило бы сохранить, у
 * него нет, расширять нечего, и пишется он своим тегом, без `is`.
 *
 * В бочку адаптера не входит: компонентов так не регистрируют.
 */
export function defineAutonomousElement(name: string, ctor: CustomElementConstructor): void {
	register(name, ctor)
}
