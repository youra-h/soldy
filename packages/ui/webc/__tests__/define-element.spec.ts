/**
 * Первая сборка элемента разметки — после настройки приложения и по месту.
 *
 * Элемент, который уже стоит в документе, когда пакет его регистрирует,
 * браузер оживляет внутри `customElements.define` — синхронно, ещё в фазе
 * импорта модулей, раньше тела точки входа, где приложение подключает тему,
 * иконки и свои плагины (`useTheme`, `useIcons`, `usePlugins`). Реестр
 * действует на компоненты, собранные после регистрации, поэтому первую сборку
 * такого элемента база отдаёт очереди регистрации, а собирает очередь сама
 * регистрация, когда оживлять больше некого: сразу после синхронной части, а
 * с полифилом в Safari — после его микрозадач оживления. Элемент, созданный
 * кодом после регистрации, собирается сразу после вставки.
 *
 * Очередь собирает по месту: элемент — не раньше того, кто ждёт над ним,
 * соседи — в порядке документа, и порядок регистрации видов ничего не решает.
 * Элемент, который код вставил в ждущую разметку, встаёт в её очередь. Пока
 * документ разбирается, очередь — его, и собирается она на `DOMContentLoaded`.
 *
 * Регистрирует здесь `defineElement`, как модуль компонента при импорте пакета.
 * Имена свои, у каждого теста новое: зарегистрированные модулем пакета уже
 * живые, а имя регистрируется в документе один раз.
 *
 * Отложенная сборка контейнера застаёт внутри элементы, собранные раньше него.
 * Раскладка света — перенос силами базы: кнопка едет в точку шаблона, не
 * выходя из документа, и не пересобирается.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TButton } from '@soldy-ui/core'
import { TBasePlugin, type IPluginContext } from '@soldy-ui/plugins'
import { usePlugins } from '@soldy-ui/setup'
import {
	TButtonElement,
	TComponentViewElement,
	TRadioGroupElement,
	TRadioGroupItemElement,
	defineElement,
	type TButtonElementProps,
	type TRadioGroupElementProps,
	type TRadioGroupItemElementProps,
} from '@soldy-ui/webc'

/** Инстансы, на которые встал плагин приложения, — по одному на сборку. */
const installed: unknown[] = []

/** Плагин приложения: ставится реестром (`usePlugins`) и запоминает своего владельца. */
class TAppPlugin extends TBasePlugin<TButton> {
	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		installed.push(ctx.getInstance())
	}
}

/**
 * Микрозадача — после неё очередь регистрации собрана: в браузере её собирает
 * снимок фазы, первая микрозадача после регистрации.
 */
const microtask = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** Задача — все микрозадачи до неё прошли: и оживление полифила, и конец фазы. */
const task = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

let dispose: (() => void) | undefined
let defined = 0

afterEach(() => {
	dispose?.()
	dispose = undefined
	installed.length = 0
	document.body.innerHTML = ''
})

/** Новое имя кнопки soldy: имя регистрируется в документе один раз. */
function freshName(): string {
	defined += 1

	return `so-define-button-${defined}`
}

/** Регистрация кнопки soldy под именем — как у модуля компонента при импорте пакета. */
function register(name: string): void {
	defineElement(name, class extends TButtonElement {}, 'button')
}

/** Регистрация контейнера — `<div is>` над ComponentView — под именем. */
function registerView(name: string): void {
	defineElement(name, class extends TComponentViewElement {}, 'div')
}

function isButton(node: Element | null): node is TButtonElementProps {
	return node instanceof TButtonElement
}

/** Кнопка soldy в документе по селектору; другой узел — тест падает здесь. */
function button(selector: string): TButtonElementProps {
	const node = document.querySelector(selector)

	if (!isButton(node)) throw new Error(`${selector}: кнопки soldy нет`)

	return node
}

const text = (el: Element) => el.querySelector('.so-button__text')?.textContent

/** Имена группы радио и её радио — новые у каждого теста. */
type TGroupNames = {
	readonly group: string
	readonly radio: string
}

function freshGroup(): TGroupNames {
	defined += 1

	return { group: `so-define-group-${defined}`, radio: `so-define-radio-${defined}` }
}

/** Регистрация группы радио — части раньше владельца: порядок ничего не решает. */
function registerPartsFirst({ group, radio }: TGroupNames): void {
	defineElement(radio, class extends TRadioGroupItemElement {}, 'label')
	defineElement(group, class extends TRadioGroupElement {}, 'div')
}

/** Разметка группы с радио — значения в порядке документа. */
const groupMarkup = ({ group, radio }: TGroupNames, values: readonly string[]) =>
	`<div is="${group}">${values.map((value) => `<label is="${radio}" value="${value}"></label>`).join('')}</div>`

function isGroup(node: Element | null): node is TRadioGroupElementProps {
	return node instanceof TRadioGroupElement
}

function isRadio(node: Element | null): node is TRadioGroupItemElementProps {
	return node instanceof TRadioGroupItemElement
}

/** Группа радио в документе по имени; не ожила — тест падает здесь. */
function group({ group: name }: TGroupNames): TRadioGroupElementProps {
	const node = document.querySelector(`[is="${name}"]`)

	if (!isGroup(node)) throw new Error(`${name}: группы soldy нет`)

	return node
}

/** Значения радио в коллекции группы — по порядку. */
const valuesOf = (el: TRadioGroupElementProps) => (el.state.items ?? []).map((item) => item.value)

/**
 * Полифил в Safari оживляет встроенные элементы не внутри `define`, а своей
 * микрозадачей на каждое имя (`@ungap/custom-elements`). Шпион делает так же:
 * настоящую регистрацию встроенного элемента откладывает на микрозадачу, по
 * одной на имя. Отдаёт снятие шпиона.
 */
function deferBuiltIns(): () => void {
	const real = customElements.define.bind(customElements)
	const define = vi.spyOn(customElements, 'define').mockImplementation((name, ctor, options) => {
		if (options?.extends === undefined) {
			real(name, ctor, options)
		} else {
			queueMicrotask(() => real(name, ctor, options))
		}
	})

	return () => define.mockRestore()
}

describe('defineElement · первая сборка элемента разметки', () => {
	/**
	 * Точка входа: импорт пакета регистрирует элементы, и той же синхронной
	 * частью, следующей строкой, приложение ставит свои плагины. Элемент ожил
	 * при регистрации, но собирается микрозадачей позже — уже с ними.
	 */
	it('разметка до регистрации и usePlugins сразу после неё — плагин у элемента есть', async () => {
		const name = freshName()

		document.body.innerHTML = `<button is="${name}" text="Сохранить"></button>`

		register(name)
		dispose = usePlugins(TButton, [TAppPlugin])

		const el = button(`[is="${name}"]`)

		expect(el.ctrl).toBeUndefined()

		await microtask()

		expect(el.ctrl).toBeInstanceOf(TButton)
		expect(installed).toEqual([el.ctrl])
		expect(text(el)).toBe('Сохранить')
	})

	it('элемент, созданный после регистрации, собран сразу после вставки', () => {
		const name = freshName()

		register(name)
		dispose = usePlugins(TButton, [TAppPlugin])

		const created = document.createElement('button', { is: name })

		if (!isButton(created)) throw new Error(`${name}: кнопки soldy нет`)

		document.body.appendChild(created)
		document.body.insertAdjacentHTML(
			'beforeend',
			`<button is="${name}" class="parsed"></button>`,
		)

		const parsed = button('.parsed')

		expect(created.ctrl).toBeInstanceOf(TButton)
		expect(parsed.ctrl).toBeInstanceOf(TButton)
		expect(installed).toEqual([created.ctrl, parsed.ctrl])
	})

	/**
	 * К микрозадаче элемента в документе уже нет — собирать нечего. Вставка
	 * потом — обычное подключение: элемент собирается сразу.
	 */
	it('элемент, убранный из документа до микрозадачи, не собирается', async () => {
		const name = freshName()

		document.body.innerHTML = `<button is="${name}" text="Сохранить"></button>`

		register(name)
		dispose = usePlugins(TButton, [TAppPlugin])

		const el = button(`[is="${name}"]`)

		el.remove()
		await microtask()

		expect(el.ctrl).toBeUndefined()
		expect(installed).toEqual([])
		expect(text(el)).toBeUndefined()

		document.body.appendChild(el)

		expect(el.ctrl).toBeInstanceOf(TButton)
		expect(installed).toEqual([el.ctrl])
		expect(text(el)).toBe('Сохранить')
	})

	it('переставленный до микрозадачи собирается один раз, на новом месте', async () => {
		const name = freshName()

		document.body.innerHTML = `<button is="${name}"></button><section></section>`

		register(name)
		dispose = usePlugins(TButton, [TAppPlugin])

		const el = button(`[is="${name}"]`)

		document.querySelector('section')?.appendChild(el)

		expect(el.ctrl).toBeUndefined()

		await microtask()

		expect(el.parentElement?.localName).toBe('section')
		expect(el.ctrl).toBeInstanceOf(TButton)
		expect(installed).toEqual([el.ctrl])
	})

	/**
	 * Кнопка зарегистрирована раньше контейнера и собрана сразу, а сборку
	 * контейнера регистрация отложила. Его раскладка света застаёт кнопку
	 * собранной и переносит её в точку шаблона, не выходя из документа: связку
	 * кнопки перенос не трогает. Раньше свет вынимался и вставлялся заново, и
	 * кнопка собиралась второй раз.
	 */
	it('контейнер, чью сборку отложила регистрация, собранную кнопку внутри не пересобирает', async () => {
		defined += 1

		const name = `so-define-view-${defined}`

		dispose = usePlugins(TButton, [TAppPlugin])
		document.body.innerHTML = `<div is="${name}"><button is="so-button" text="Сохранить"></button></div>`

		const el = button('[is="so-button"]')

		expect(installed).toEqual([el.ctrl])

		registerView(name)
		await microtask()

		expect(el.parentElement?.getAttribute('is')).toBe(name)
		expect(el.parentElement?.classList.contains('so-component-view')).toBe(true)
		expect(installed).toEqual([el.ctrl])
		expect(text(el)).toBe('Сохранить')
	})
})

/**
 * Очередь собирает по месту: владелец — раньше своих элементов, соседи — в
 * порядке документа, в каком бы порядке ни регистрировались их виды. Браузер
 * оживляет разметку имя за именем, и раньше элементы, чьё имя
 * зарегистрировано раньше владельца, собирались раньше него — мимо коллекции.
 */
describe('defineElement · сборка по месту', () => {
	it('части зарегистрированы раньше владельца — элементы в его коллекции, в порядке документа', async () => {
		const names = freshGroup()

		document.body.innerHTML = groupMarkup(names, ['a', 'b', 'c'])

		registerPartsFirst(names)
		await microtask()

		expect(valuesOf(group(names))).toEqual(['a', 'b', 'c'])
	})

	/**
	 * Разметка ждёт очередь, а код той же синхронной части создаёт элементы.
	 * Вставленный мимо неё собирается сразу — на `el.ctrl` после вставки
	 * опираются приложения. Вставленный в неё встаёт в её очередь: собравшись
	 * сразу, он не нашёл бы движка группы и в её коллекцию не вошёл бы.
	 */
	it('пока разметка ждёт очередь, созданный кодом собран сразу, а вставленный в неё — после неё и в её коллекции', async () => {
		const names = freshGroup()

		document.body.innerHTML = groupMarkup(names, ['a', 'b'])
		registerPartsFirst(names)

		const created = document.createElement('button', { is: 'so-button' })
		const late = document.createElement('label', { is: names.radio })
		const el = group(names)

		if (!isButton(created) || !isRadio(late)) throw new Error('элементы soldy не созданы')

		document.body.appendChild(created)
		late.setAttribute('value', 'c')
		el.appendChild(late)

		expect(created.ctrl).toBeInstanceOf(TButton)
		expect(el.ctrl).toBeUndefined()
		expect(late.ctrl).toBeUndefined()

		await microtask()

		expect(valuesOf(el)).toEqual(['a', 'b', 'c'])
	})

	/**
	 * Классический скрипт в конце `body` регистрирует элементы, пока документ
	 * разбирается: ожившие и те, что парсер допишет после, ждут разбора одной
	 * очередью документа и собираются на `DOMContentLoaded` по месту.
	 */
	it('пока документ разбирается, ожившая при регистрации и дописанная после неё — одной очередью на DOMContentLoaded', async () => {
		const names = freshGroup()

		document.body.innerHTML = groupMarkup(names, ['a', 'b'])

		const pending = document.querySelector(`[is="${names.group}"]`)
		const readyState = vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading')

		try {
			registerPartsFirst(names)
			// Парсер дописывает разметку: имя уже зарегистрировано
			pending?.insertAdjacentHTML(
				'beforeend',
				`<label is="${names.radio}" value="c"></label>`,
			)
			await microtask()
		} finally {
			readyState.mockRestore()
		}

		const el = group(names)

		expect(el.ctrl).toBeUndefined()

		document.dispatchEvent(new Event('DOMContentLoaded'))

		expect(valuesOf(el)).toEqual(['a', 'b', 'c'])
	})

	/**
	 * Классический скрипт зарегистрировал владельца, пока документ разбирался, а
	 * модуль — элементы после разбора, но до `DOMContentLoaded`. Элементы ожили
	 * при регистрации, а над ними ждёт владелец в очереди документа: они встают
	 * к нему и его не обгоняют.
	 */
	it('ожившие при регистрации под владельцем, который ждёт разбора, ждут вместе с ним', async () => {
		const names = freshGroup()

		document.body.innerHTML = groupMarkup(names, ['a', 'b'])

		const readyState = vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading')

		try {
			defineElement(names.group, class extends TRadioGroupElement {}, 'div')
			readyState.mockReturnValue('interactive')
			defineElement(names.radio, class extends TRadioGroupItemElement {}, 'label')
			await microtask()
		} finally {
			readyState.mockRestore()
		}

		const el = group(names)

		expect(el.ctrl).toBeUndefined()

		document.dispatchEvent(new Event('DOMContentLoaded'))

		expect(valuesOf(el)).toEqual(['a', 'b'])
	})

	/**
	 * Полифил оживляет встроенные элементы своей микрозадачей на имя — после
	 * снимка фазы, — и очередь собирается после всех: порядок тот же, что в
	 * браузере. Элемент, которого снимок ждал, а полифил не нашёл — его сняли
	 * до оживления, — конец фазы забывает: вставленный потом, он собирается
	 * сразу при вставке.
	 */
	it('полифил: ожившие его микрозадачами — в коллекции по месту, снятый до оживления собирается при вставке', async () => {
		const names = freshGroup()
		const name = freshName()

		document.body.innerHTML = `${groupMarkup(names, ['a', 'b'])}<button is="${name}" text="Позже"></button>`

		const removed = document.querySelector(`[is="${name}"]`)

		if (!removed) throw new Error(`${name}: кнопки нет`)

		const restore = deferBuiltIns()

		try {
			registerPartsFirst(names)
			// После снимка фазы, но раньше, чем полифил оживит кнопку
			queueMicrotask(() => removed.remove())
			register(name)
		} finally {
			restore()
		}

		await task()

		expect(valuesOf(group(names))).toEqual(['a', 'b'])
		expect(isButton(removed)).toBe(false)

		document.body.appendChild(removed)

		expect(button(`[is="${name}"]`).ctrl).toBeInstanceOf(TButton)
		expect(text(removed)).toBe('Позже')
	})

	/**
	 * Теневые корни снимок не видит, а полифил оживляет их разметку той же
	 * микрозадачей, что и свет её имени. Радио зарегистрировано раньше группы:
	 * радио в теневом корне обёртки оживает, когда группу полифил ещё не оживил
	 * и в очереди её нет. Но снимок её ждёт — и радио встаёт в очередь
	 * регистрации и входит в коллекцию группы, на месте обёртки.
	 */
	it('полифил: радио в теневом корне под группой, которую он ещё не оживил, ждёт её', async () => {
		const names = freshGroup()

		document.body.innerHTML = groupMarkup(names, ['a', 'b'])

		const wrap = document.createElement('div')

		document.querySelector(`[is="${names.group}"]`)?.insertBefore(wrap, null)
		wrap.attachShadow({ mode: 'open' }).innerHTML =
			`<label is="${names.radio}" value="s"></label>`

		const restore = deferBuiltIns()

		try {
			registerPartsFirst(names)
		} finally {
			restore()
		}

		await task()

		expect(valuesOf(group(names))).toEqual(['a', 'b', 's'])
	})

	/**
	 * Сборка, упавшая с ошибкой, очередь не держит: остальные собираются, а
	 * первая ошибка уходит дальше — тому, кто очередь собирал, здесь слушателю
	 * `DOMContentLoaded`, и браузер сообщает о ней событием `error` окна.
	 */
	it('сборка, упавшая с ошибкой, остальных не держит, а ошибка уходит дальше', () => {
		const name = freshName()
		const failure = new Error('сборка упала')
		const errors: unknown[] = []
		const onError = (event: ErrorEvent) => {
			errors.push(event.error)
			event.preventDefault()
		}
		let failed = false

		/** Плагин приложения, который роняет первую сборку. */
		class TFailingPlugin extends TBasePlugin<TButton> {
			override install(ctx: IPluginContext, options?: unknown): void {
				if (!failed) {
					failed = true

					throw failure
				}

				super.install(ctx, options)
			}
		}

		dispose = usePlugins(TButton, [TFailingPlugin])
		document.body.innerHTML = `<button is="${name}" class="first"></button><button is="${name}" class="second"></button>`

		const readyState = vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading')

		try {
			register(name)
		} finally {
			readyState.mockRestore()
		}

		window.addEventListener('error', onError)

		try {
			document.dispatchEvent(new Event('DOMContentLoaded'))
		} finally {
			window.removeEventListener('error', onError)
		}

		expect(errors).toEqual([failure])
		expect(button('.second').ctrl).toBeInstanceOf(TButton)
	})
})
