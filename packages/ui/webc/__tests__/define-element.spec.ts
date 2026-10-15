/**
 * Первая сборка элемента разметки — после настройки приложения.
 *
 * Элемент, который уже стоит в документе, когда пакет его регистрирует,
 * браузер оживляет внутри `customElements.define` — синхронно, ещё в фазе
 * импорта модулей, раньше тела точки входа, где приложение подключает тему,
 * иконки и свои плагины (`useTheme`, `setIcons`, `usePlugins`). Реестр
 * действует на компоненты, собранные после регистрации, поэтому первое
 * подключение, пришедшее во время регистрации, база откладывает на
 * микрозадачу — тогда же такие элементы оживляет полифил в Safari. Элемент,
 * созданный кодом после регистрации, собирается сразу после вставки.
 *
 * Регистрирует здесь `defineElement`, как модуль компонента при импорте пакета.
 * Имена свои, у каждого теста новое: зарегистрированные модулем пакета уже
 * живые, а имя регистрируется в документе один раз.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TButton } from '@soldy-ui/core'
import { TBasePlugin, type IPluginContext } from '@soldy-ui/plugins'
import { usePlugins } from '@soldy-ui/setup'
import { TButtonElement, defineElement, type TButtonElementProps } from '@soldy-ui/webc'

/** Инстансы, на которые встал плагин приложения, — по одному на сборку. */
const installed: unknown[] = []

/** Плагин приложения: ставится реестром (`usePlugins`) и запоминает своего владельца. */
class TAppPlugin extends TBasePlugin<TButton> {
	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		installed.push(ctx.getInstance())
	}
}

/** Микрозадача — на неё база откладывает первое подключение во время регистрации. */
const microtask = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

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

function isSoldyButton(node: Element | null): node is TButtonElementProps {
	return node instanceof TButtonElement
}

/** Кнопка soldy в документе по селектору; другой узел — тест падает здесь. */
function button(selector: string): TButtonElementProps {
	const node = document.querySelector(selector)

	if (!isSoldyButton(node)) throw new Error(`${selector}: кнопки soldy нет`)

	return node
}

const text = (el: Element) => el.querySelector('.so-button__text')?.textContent

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

		if (!isSoldyButton(created)) throw new Error(`${name}: кнопки soldy нет`)

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
})
