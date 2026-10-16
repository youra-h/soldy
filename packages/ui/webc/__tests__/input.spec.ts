/**
 * `<div is="so-input">` — текстовое поле, чьё значение ведёт ядро.
 *
 * Сценарии — те же, что у React (`input.spec.tsx`) и Angular, без сервера и
 * `act`: корень, `<input>` внутри, слоты по сторонам; наборы ядра — каждый на
 * своём элементе: `attrs` (`dir`) на корне, `aria` на поле; нативные атрибуты
 * поля без ARIA-дублей.
 *
 * Угол зрения здесь свой. Корень — элемент потребителя, и статические
 * атрибуты разметки на нём база переносит на `<input>`, кроме класса, стиля и
 * входов пропов. Текст в ядро несёт `TInputPlugin`, его слушатель встаёт по
 * `ready` узла — кадром позже, — а в узел текст пишет шаблон, только когда он
 * разошёлся с узлом. Кнопка очистки — деталь разметки поля: её события не
 * всплывают, а клик она гасит сама.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TInput } from '@soldy-ui/core'
import { TPluginBundle, ruRU, zhCN } from '@soldy-ui/plugins'
import { InputDescriptor } from '@soldy-ui/setup'
import {
	TButtonElement,
	TIconElement,
	TInputElement,
	TLocaleProviderElement,
	type TButtonElementProps,
	type TInputElementProps,
} from '@soldy-ui/webc'
import { inputTemplate } from '../src/components/input/input.template'

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

afterEach(() => {
	vi.restoreAllMocks()
	document.body.innerHTML = ''
})

function isInput(node: Element | null): node is TInputElementProps {
	return node instanceof TInputElement
}

function isButton(node: Element | null): node is TButtonElementProps {
	return node instanceof TButtonElement
}

/** Разметка в неподключённом узле: до вставки можно найти узлы и повесить слушатели. */
function markup(html: string): HTMLElement {
	const host = document.createElement('div')

	host.innerHTML = html

	return host
}

/** Поле soldy из разметки, подключённое к документу; узел другой — тест падает здесь. */
function mount(html: string): TInputElementProps {
	const host = markup(html)

	document.body.appendChild(host)

	return input(host)
}

/** Поле soldy в разметке. */
function input(root: ParentNode): TInputElementProps {
	const node = root.querySelector('[is="so-input"]')

	if (!isInput(node)) throw new Error('<div is="so-input"> нет')

	return node
}

/** Поле над готовым инстансом: `ctrl` выставлен до подключения. */
function mountCtrl(ctrl: TInput, attributes: Record<string, string> = {}): TInputElementProps {
	const node = document.createElement('div', { is: 'so-input' })

	if (!isInput(node)) throw new Error('<div is="so-input"> нет')

	node.ctrl = ctrl

	for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value)

	document.body.appendChild(node)

	return node
}

/** Узел по селектору; нет его или он не того вида — тест падает здесь. */
function find<T extends Element>(root: ParentNode, selector: string, type: new () => T): T {
	const node = root.querySelector(selector)

	if (!(node instanceof type)) throw new Error(`${selector}: узла нет`)

	return node
}

/** `<input>` внутри корня. */
const field = (root: Element) => find(root, 'input', HTMLInputElement)

/** Кнопка очистки внутри корня. */
function clearOf(root: Element): TButtonElementProps {
	const node = root.querySelector('.so-input__clear')

	if (!isButton(node)) throw new Error('кнопки очистки нет')

	return node
}

/** Значения `detail` событий с этим именем на элементе. */
function collect(el: Element, name: string): unknown[] {
	const seen: unknown[] = []

	el.addEventListener(name, (event) => {
		if (event instanceof CustomEvent) seen.push(event.detail)
	})

	return seen
}

/** Набор текста: браузер меняет значение узла и шлёт `input`. */
function type(node: HTMLInputElement, text: string): void {
	node.value = text
	node.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('Input · разметка', () => {
	it('корень — div потребителя, внутри текстовое поле', () => {
		const el = mount('<div is="so-input"></div>')

		expect(el).toBeInstanceOf(HTMLDivElement)
		expect(el.classList.contains('so-input')).toBe(true)
		expect(field(el).type).toBe('text')
		expect(el.ctrl?.tag).toBe('div')
	})

	it('слоты leading и trailing — по сторонам поля', () => {
		const el = mount(`<div is="so-input">
			<i slot="trailing">T</i>
			<i slot="leading">L</i>
		</div>`)

		expect([...el.children].map((part) => `${part.localName}.${part.className}`)).toEqual([
			'div.so-input__leading',
			'input.',
			'div.so-input__trailing',
		])
		expect(find(el, '.so-input__leading', HTMLElement).textContent).toBe('L')
		expect(find(el, '.so-input__trailing', HTMLElement).textContent).toBe('T')
	})

	it('слот не передан — обёртки нет, пробелы в разметке её не приносят', () => {
		const el = mount(`<div is="so-input">
		</div>`)

		expect(el.querySelector('.so-input__leading')).toBeNull()
		expect(el.querySelector('.so-input__trailing')).toBeNull()
		expect(el.childNodes).toHaveLength(1)
	})

	it('шаблон объявляет ровно те слоты, что и дескриптор', () => {
		const targets = inputTemplate.create(document.createElement('div'), () => false).slots

		expect(Object.keys(targets).sort()).toEqual(
			InputDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})
})

describe('Input · атрибуты', () => {
	it('disabled и required — нативные атрибуты <input>, без ARIA-дублей', () => {
		const node = field(mount('<div is="so-input" disabled required></div>'))

		expect(node.disabled).toBe(true)
		expect(node.required).toBe(true)
		expect(node.hasAttribute('aria-disabled')).toBe(false)
		expect(node.hasAttribute('aria-required')).toBe(false)
	})

	it('readonly — нативный атрибут <input>, без aria-readonly', () => {
		const node = field(mount('<div is="so-input" readonly></div>'))

		expect(node.readOnly).toBe(true)
		expect(node.hasAttribute('aria-readonly')).toBe(false)
	})

	it('required на readonly-поле дополняется aria-required: браузер его не валидирует', () => {
		const node = field(mount('<div is="so-input" required readonly></div>'))

		expect(node.required).toBe(true)
		expect(node.readOnly).toBe(true)
		expect(node.getAttribute('aria-required')).toBe('true')
		expect(node.hasAttribute('aria-readonly')).toBe(false)
	})

	/** У `div` своего `disabled` нет: ядро его на корень не пишет. */
	it('disabled из кода — на поле, на корне атрибута нет', async () => {
		const el = mount('<div is="so-input"></div>')

		el.disabled = true
		await flush()

		expect(field(el).disabled).toBe(true)
		expect(el.hasAttribute('disabled')).toBe(false)
	})

	it('direction: rtl — dir на корне, а не на <input>', () => {
		const el = mount('<div is="so-input" direction="rtl"></div>')

		expect(el.getAttribute('dir')).toBe('rtl')
		expect(field(el).hasAttribute('dir')).toBe(false)
	})

	it('id, name и placeholder — на поле', () => {
		const node = field(
			mount('<div is="so-input" id="email" name="email" placeholder="Почта"></div>'),
		)

		expect(node.id).toBe('email')
		expect(node.name).toBe('email')
		expect(node.placeholder).toBe('Почта')
	})

	it('без своего id атрибута нет: автоматического id у поля нет', () => {
		expect(field(mount('<div is="so-input"></div>')).hasAttribute('id')).toBe(false)
	})

	it('aria_label доходит до <input>', () => {
		const el = mount('<div is="so-input" aria_label="Поиск"></div>')

		expect(field(el).getAttribute('aria-label')).toBe('Поиск')
		expect(el.hasAttribute('aria-label')).toBe(false)
	})
})

/**
 * Атрибуты потребителя делятся, как у остальных адаптеров: класс и стиль —
 * корню, статические атрибуты разметки — полю, поверх его `aria`. Входы
 * пропов остаются на корне: через них потребитель задаёт пропы.
 */
describe('Input · атрибуты разметки', () => {
	it('класс и стиль — на корне, autocomplete, aria-label, tabindex и data-* — на поле', () => {
		const el = mount(
			'<div is="so-input" class="app-field" style="flex: 1" data-testid="field" autocomplete="email" aria-label="Почта" tabindex="3" name="email"></div>',
		)
		const node = field(el)

		expect(el.classList.contains('so-input')).toBe(true)
		expect(el.classList.contains('app-field')).toBe(true)
		expect(el.style.flex).not.toBe('')
		expect(
			['data-testid', 'autocomplete', 'aria-label', 'tabindex'].filter((name) =>
				el.hasAttribute(name),
			),
		).toEqual([])

		expect(node.hasAttribute('class')).toBe(false)
		expect(node.hasAttribute('style')).toBe(false)
		expect(node.getAttribute('data-testid')).toBe('field')
		expect(node.getAttribute('autocomplete')).toBe('email')
		expect(node.getAttribute('aria-label')).toBe('Почта')
		expect(node.getAttribute('tabindex')).toBe('3')
	})

	it('вход пропа остаётся на корне и доходит до ядра, а на поле — значение ядра', () => {
		const el = mount('<div is="so-input" name="email"></div>')

		expect(el.getAttribute('name')).toBe('email')
		expect(field(el).name).toBe('email')
	})

	it('aria-label разметки — поверх имени из набора', () => {
		const el = mount('<div is="so-input" aria-label="Своё" aria_label="Ядра"></div>')

		expect(field(el).getAttribute('aria-label')).toBe('Своё')
	})

	it('id — только у <input>, ctrl.id совпадает с ним', () => {
		const el = mount('<div is="so-input" id="email"></div>')

		expect(el.hasAttribute('id')).toBe(false)
		expect(field(el).id).toBe('email')
		expect(el.ctrl?.id).toBe('email')
		expect(document.querySelectorAll('#email')).toHaveLength(1)
	})

	it('записанное после построения остаётся на корне', async () => {
		const el = mount('<div is="so-input"></div>')

		el.setAttribute('autocomplete', 'email')
		await flush()

		expect(el.getAttribute('autocomplete')).toBe('email')
		expect(field(el).hasAttribute('autocomplete')).toBe(false)
	})

	/** Всплывающее событие поля доходит до слушателя на корне само. */
	it('слушатель на корне слышит keydown поля', () => {
		const el = mount('<div is="so-input"></div>')
		const keys: string[] = []

		el.addEventListener('keydown', (event) => keys.push(event.key))
		field(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))

		expect(keys).toEqual(['a'])
	})
})

describe('Input · значение', () => {
	it('из пропа — в поле', () => {
		expect(field(mount('<div is="so-input" value="abc"></div>')).value).toBe('abc')
	})

	it('без значения — пустое поле', () => {
		expect(field(mount('<div is="so-input"></div>')).value).toBe('')
	})

	it('ввод — в ctrl.value и одним so:change:value', async () => {
		const ctrl = new TInput()
		const el = mountCtrl(ctrl)
		const changes = collect(el, 'so:change:value')

		await nextFrame()
		type(field(el), 'abc')
		await flush()

		expect(ctrl.value).toBe('abc')
		expect(field(el).value).toBe('abc')
		expect(changes).toEqual([{ newValue: 'abc', oldValue: undefined }])
	})

	/**
	 * Узел уже держит набранное, и шаблон его не трогает: запись того же
	 * текста сбросила бы каретку в конец, а набор через IME — прервала бы.
	 */
	it('набор не переписывает поле', async () => {
		const el = mount('<div is="so-input"></div>')

		await nextFrame()

		const write = vi.spyOn(field(el), 'value', 'set')

		type(field(el), 'abc')
		await flush()

		// Одна запись — та, которой тест изобразил браузер
		expect(write).toHaveBeenCalledTimes(1)
	})

	/**
	 * Ввод в середину текста: браузер вставил символ и поставил каретку за
	 * ним, ядро приняло текст — каретка на месте, а не в конце поля.
	 */
	it('ввод в середину текста — каретка на месте, после того как ядро приняло значение', async () => {
		const ctrl = new TInput({ value: 'abcd' })
		const node = field(mountCtrl(ctrl))

		await nextFrame()

		node.value = 'abXcd'
		node.setSelectionRange(3, 3)
		node.dispatchEvent(new Event('input', { bubbles: true }))
		await flush()

		expect(ctrl.value).toBe('abXcd')
		expect(node.selectionStart).toBe(3)
		expect(node.selectionEnd).toBe(3)
	})

	it('ctrl.value из кода после ввода — в поле', async () => {
		const ctrl = new TInput()
		const el = mountCtrl(ctrl)

		await nextFrame()
		type(field(el), 'abc')

		ctrl.value = 'xyz'
		await flush()

		expect(field(el).value).toBe('xyz')
	})

	it('снятый атрибут value возвращает пустое поле', async () => {
		const el = mount('<div is="so-input" value="abc"></div>')

		el.removeAttribute('value')
		await flush()

		expect(field(el).value).toBe('')
	})
})

/**
 * Форма видит поле сама: `<input>` лежит в обычном DOM страницы, и связанного
 * с формой элемента не нужно.
 */
describe('поле в форме', () => {
	it('FormData получает и текст поля, и флажок', async () => {
		const host = markup(`<form>
			<div is="so-input" name="q" value="abc"></div>
			<span is="so-check-box" name="agree" value></span>
		</form>`)

		document.body.appendChild(host)

		const form = find(host, 'form', HTMLFormElement)

		expect([...new FormData(form)]).toEqual([
			['q', 'abc'],
			['agree', 'on'],
		])

		await nextFrame()
		type(field(input(host)), 'xyz')

		expect([...new FormData(form)]).toEqual([
			['q', 'xyz'],
			['agree', 'on'],
		])
	})
})

/**
 * Кнопка очистки — часть поля, как у Vue (`input-clear.spec.ts`): по
 * `clearable`, первой в обёртке у конца поля, перед `trailing`, с именем от
 * ядра. Клик очищает поле командой ядра и до корня не всплывает; своя кнопка —
 * слот `clear`.
 */
describe('Input · кнопка очистки', () => {
	it('без clearable кнопки нет, и обёртки у конца поля тоже', () => {
		const el = mount('<div is="so-input" value="текст"></div>')

		expect(el.querySelector('.so-input__clear')).toBeNull()
		expect(el.querySelector('.so-input__trailing')).toBeNull()
	})

	it('по clearable — первой в обёртке у конца, перед trailing, при любом порядке в разметке', () => {
		const el = mount(
			'<div is="so-input" clearable name="Город"><i slot="trailing" class="probe"></i></div>',
		)
		const parts = ['.so-input__clear', '.probe']

		expect(
			[...find(el, '.so-input__trailing', HTMLElement).children].map((node) =>
				parts.find((part) => node.matches(part)),
			),
		).toEqual(parts)
		expect(el.classList.contains('so-input--clearable')).toBe(true)
		expect(clearOf(el).getAttribute('aria-label')).toBe('Clear Город')
	})

	/**
	 * Кнопка — деталь разметки поля: элемент soldy с именем места. Иконка в
	 * ней — тоже деталь, по роли `close`.
	 */
	it('кнопка и иконка — элементы soldy с именами места', () => {
		const el = mount('<div is="so-input" clearable></div>')
		const button = clearOf(el)
		const icon = button.querySelector('.so-icon')

		expect(button.getAttribute('embedded')).toBe('input.clear')
		expect(icon).toBeInstanceOf(TIconElement)
		expect(icon?.getAttribute('embedded')).toBe('input.clear-icon')
		expect(icon?.getAttribute('icon')).toBe('close')
		expect(icon?.querySelector('svg')?.getAttribute('viewBox')).not.toBeNull()
	})

	/**
	 * Имя кнопке пишет не она сама: это набор поля `clearAria`, и его на
	 * кнопку кладёт шаблон поля — поверх того, что кнопка пишет себе сама.
	 * Своё у кнопки остаётся рядом: классы, `data-disabled`.
	 */
	it('набор поля на кнопке — рядом с её собственными наборами и классами', () => {
		const button = clearOf(mount('<div is="so-input" clearable name="Город"></div>'))

		expect(button.getAttribute('aria-label')).toBe('Clear Город')
		expect(button.getAttribute('data-disabled')).toBe('false')
		expect(button.classList.contains('so-button')).toBe(true)
		expect(button.classList.contains('so-input__clear')).toBe(true)
	})

	it('имя кнопки следует имени поля', async () => {
		const el = mount('<div is="so-input" clearable name="Город"></div>')

		el.name = 'Улица'
		await flush()

		expect(clearOf(el).getAttribute('aria-label')).toBe('Clear Улица')
	})

	it('размер — поля, выключена — вместе с полем, readonly её не гасит', async () => {
		const el = mount('<div is="so-input" clearable size="lg" readonly></div>')

		expect(clearOf(el).classList.contains('so-button--size-lg')).toBe(true)
		expect(clearOf(el).disabled).toBe(false)

		el.disabled = true
		await flush()

		expect(clearOf(el).disabled).toBe(true)

		el.size = 'sm'
		await flush()

		expect(clearOf(el).classList.contains('so-button--size-sm')).toBe(true)
		expect(clearOf(el).querySelector('.so-icon--size-sm')).not.toBeNull()
	})

	it('clearable снят и поставлен — кнопка уходит с обёрткой и возвращается тем же узлом', async () => {
		const el = mount('<div is="so-input" clearable></div>')
		const button = clearOf(el)

		el.clearable = false
		await flush()

		expect(el.querySelector('.so-input__trailing')).toBeNull()
		expect(button.isConnected).toBe(false)

		el.clearable = true
		await flush()

		expect(clearOf(el)).toBe(button)
		expect(find(el, '.so-input__trailing', HTMLElement).firstElementChild).toBe(button)
	})

	it('клик очищает поле и до корня не всплывает', async () => {
		const ctrl = new TInput({ value: 'текст' })
		const el = mountCtrl(ctrl, { clearable: '' })
		const changes = collect(el, 'so:change:value')
		const presses = collect(el, 'so:action:press')
		const outside = vi.fn()

		document.body.addEventListener('click', outside)

		// Кнопка очищает по клику своего TActionPlugin — он слушает узел с `ready`
		await nextFrame()

		clearOf(el).click()
		await flush()

		expect(ctrl.value).toBe('')
		expect(field(el).value).toBe('')
		expect(changes).toHaveLength(1)
		expect(presses).toEqual([])
		expect(outside).not.toHaveBeenCalled()

		document.body.removeEventListener('click', outside)
	})

	it('кнопка зовёт команду ядра — clear приходит и у пустого поля', async () => {
		const ctrl = new TInput({ value: '' })
		const clear = vi.fn()

		ctrl.events.on('clear', clear)

		const el = mountCtrl(ctrl, { clearable: '' })

		await nextFrame()
		clearOf(el).click()

		expect(clear).toHaveBeenCalledTimes(1)
	})

	/**
	 * Деталь — разметка поля: её события не всплывают, и слушатели поля и
	 * делегирование на предке слышат только события самого поля.
	 */
	it('события кнопки и иконки не доходят до слушателей поля', async () => {
		const host = markup('<section><div is="so-input" clearable></div></section>')
		const el = input(host)
		const foreign: string[] = []
		const names = [
			'so:action:press',
			'so:action:click',
			'so:change:focused',
			'so:element:ready',
			'so:ready',
			'so:bundle:create',
		]

		for (const target of [el, find(host, 'section', HTMLElement)]) {
			for (const name of names) {
				target.addEventListener(name, (event) => {
					if (event.target !== el) foreign.push(name)
				})
			}
		}

		document.body.appendChild(host)
		await nextFrame()
		await nextFrame()

		clearOf(el).focus()
		clearOf(el).click()

		expect(foreign).toEqual([])
	})

	/**
	 * Своя кнопка заменяет встроенную целиком и стоит, пока задана, — и без
	 * `clearable`, и при нём, — первой в обёртке, при любом порядке в разметке.
	 * Команды очистки в scope у неё нет: scope у слотов Web Components нет, и
	 * команду она берёт у элемента — `el.ctrl.clear()`.
	 */
	it('своя кнопка — слот clear вместо встроенной и первой в обёртке', async () => {
		const el = mount(`<div is="so-input" value="текст">
			<i slot="trailing" class="probe-trailing"></i>
			<button slot="clear" type="button" class="probe-clear"></button>
		</div>`)
		const trailing = find(el, '.so-input__trailing', HTMLElement)

		expect([...trailing.children].map((node) => node.className)).toEqual([
			'probe-clear',
			'probe-trailing',
		])

		el.clearable = true
		await flush()

		expect(el.querySelector('.so-input__clear')).toBeNull()

		find(el, '.probe-clear', HTMLButtonElement).addEventListener('click', () =>
			el.ctrl?.clear(),
		)
		find(el, '.probe-clear', HTMLButtonElement).click()
		await flush()

		expect(el.ctrl?.value).toBe('')
		expect(field(el).value).toBe('')
	})

	it('строку имени задаёт локаль поддерева, смена — без пересборки', async () => {
		const host = markup(
			'<so-locale-provider><div is="so-input" clearable name="Город"></div></so-locale-provider>',
		)
		const provider = host.firstElementChild
		const el = input(host)
		const bundles: unknown[] = []

		if (!(provider instanceof TLocaleProviderElement)) throw new Error('провайдера нет')

		el.addEventListener('so:bundle:create', (event) => {
			if (event instanceof CustomEvent && event.detail instanceof TPluginBundle) {
				bundles.push(event.detail)
			}
		})
		provider.locale = ruRU
		document.body.appendChild(host)
		await flush()

		const button = clearOf(el)

		expect(button.getAttribute('aria-label')).toBe('Очистить Город')

		provider.locale = zhCN
		await flush()

		expect(clearOf(el)).toBe(button)
		expect(button.getAttribute('aria-label')).not.toBe('Очистить Город')
		expect(button.getAttribute('aria-label')).toContain('Город')
		expect(bundles).toHaveLength(1)
	})

	/**
	 * Инстанс, присвоенный подключённому полю, достаётся следующей связке —
	 * после перестановки. Кнопка, построенная на прошлой, очищает уже его:
	 * контекст шаблона отдаёт инстанс текущей связки.
	 */
	it('после смены ctrl и перестановки кнопка очищает новый инстанс', async () => {
		const first = new TInput({ value: 'a' })
		const second = new TInput({ value: 'b' })
		const el = mountCtrl(first, { clearable: '' })
		const button = clearOf(el)

		el.ctrl = second
		document.body.appendChild(document.createElement('section')).appendChild(el)
		await nextFrame()

		clearOf(el).click()

		expect(clearOf(el)).toBe(button)
		expect(second.value).toBe('')
		expect(first.value).toBe('a')
	})
})
