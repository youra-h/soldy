/**
 * `<button is="so-button">` — нативная `<button>`, расширенная классом soldy
 * (customized built-in). Классы, наборы ядра и скрытие лежат на самой кнопке,
 * рядом с тем, что написал потребитель, а атрибуты и классы потребителя
 * главнее — кроме атрибутов-входов пропов (`disabled`).
 *
 * Поведение кнопки в форме и с клавиатуры — браузерное, его проверяет
 * `playground/vue/browser/webc-button.spec.ts`: jsdom не отправляет форму и не
 * делает клика из Enter и пробела.
 */

import { describe, it, expect, expectTypeOf, afterEach, vi } from 'vitest'
import { TButton } from '@soldy-ui/core'
import { TElementPlugin, TPluginBundle } from '@soldy-ui/plugins'
import { ButtonDescriptor } from '@soldy-ui/setup'
import type { IButton } from '@soldy-ui/core'
import { TButtonElement, registerButtonTag, type TButtonElementProps } from '@soldy-ui/webc'
import { buttonTemplate } from '../src/components/button/button.template'
import { bareContext } from './template-context'

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Кнопка soldy — с props дескриптора; узел другой — тест падает здесь. */
function asButton(node: Element | null): TButtonElementProps {
	if (!isSoldyButton(node)) throw new Error('<button is="so-button"> нет')

	return node
}

function isSoldyButton(node: Element | null): node is TButtonElementProps {
	return node instanceof TButtonElement
}

/** Кнопка soldy из разметки. */
function mountButton(html: string): TButtonElementProps {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)

	return asButton(host.querySelector('button'))
}

/** Кнопка soldy из JS, ещё не подключённая. */
function createButton(): TButtonElementProps {
	return asButton(document.createElement('button', { is: 'so-button' }))
}

/** Кнопка soldy над готовым инстансом: `ctrl` выставлен до подключения. */
function mountCtrl(ctrl: TButton): TButtonElementProps {
	const el = createButton()

	el.ctrl = ctrl
	document.body.appendChild(el)

	return el
}

/** Инстанс элемента; его нет — тест падает здесь, а не на чтении свойства. */
function ctrlOf(el: Pick<TButtonElementProps, 'ctrl'>): IButton {
	const { ctrl } = el

	if (!ctrl) throw new Error('у кнопки нет инстанса')

	return ctrl
}

/** Перенос в другого родителя: отключение и подключение элемента. */
function move(el: Element): void {
	document.body.appendChild(document.createElement('section')).appendChild(el)
}

/** Значения `detail` событий с этим именем на элементе. */
function collect(el: Element, name: string): unknown[] {
	const seen: unknown[] = []

	el.addEventListener(name, (event) => {
		if (event instanceof CustomEvent) seen.push(event.detail)
	})

	return seen
}

const text = (el: Element) => el.querySelector('.so-button__text')?.textContent

/** Тексты детей кнопки — так видны слоты и их порядок. */
const children = (el: Element) => Array.from(el.children).map((node) => node.textContent)

afterEach(() => {
	document.body.innerHTML = ''
})

describe('<button is="so-button"> · нативная кнопка', () => {
	it('элемент — настоящая <button> с классами ядра, внутри один .so-button__text', () => {
		const el = mountButton('<button is="so-button"></button>')

		expect(el).toBeInstanceOf(HTMLButtonElement)
		expect(el.type).toBe('submit')
		expect(el.classList).toContain('so-button')
		// variant и view — значения темы: без них модификаторов нет вовсе
		expect(el.className).not.toMatch(/--(variant|view)-/)
		// Для ядра это нативная кнопка: роль и фокус у неё свои
		expect(el.hasAttribute('role')).toBe(false)
		expect(el.hasAttribute('tabindex')).toBe(false)
		expect(el.hasAttribute('aria-disabled')).toBe(false)
		/** Тема смотрит `[data-disabled='true']`: «выключено» — строка, а не пропавший атрибут */
		expect(el.getAttribute('data-disabled')).toBe('false')
		expect(el.querySelectorAll('.so-button__text')).toHaveLength(1)
		expect(el.children).toHaveLength(1)
	})

	it('атрибуты пропсов дают классы и текст', () => {
		const el = mountButton(
			'<button is="so-button" text="Hello" variant="brand" size="xl" view="ghost"></button>',
		)

		expect(text(el)).toBe('Hello')
		expect(Array.from(el.classList)).toEqual(
			expect.arrayContaining([
				'so-button',
				'so-button--size-xl',
				'so-button--variant-brand',
				'so-button--view-ghost',
			]),
		)
	})

	it('direction ставит атрибут dir на кнопку, без него dir нет (наследуется)', () => {
		expect(
			mountButton('<button is="so-button" direction="rtl"></button>').getAttribute('dir'),
		).toBe('rtl')
		expect(mountButton('<button is="so-button"></button>').hasAttribute('dir')).toBe(false)
	})

	it('содержимое тега переопределяет text', () => {
		const el = mountButton('<button is="so-button" text="ignored"><b>Custom</b></button>')

		expect(text(el)).toBe('Custom')
	})

	/** Тег задан разметкой: атрибута и свойства `tag` нет, ядро получает `button`. */
	it('tag="a" ни на что не влияет, тег у ядра и у внешнего ctrl — button', () => {
		const el = mountButton('<button is="so-button" tag="a"></button>')
		const ctrl = new TButton()

		mountCtrl(ctrl)

		expect(ctrlOf(el).tag).toBe('button')
		expect(ctrl.tag).toBe('button')
	})

	/**
	 * Свойство, которое у кнопки есть по тегу, остаётся нативным: `disabled`
	 * отражён в атрибут, и до ядра доходит через него. Свои свойства пропов —
	 * только у того, чего у кнопки нет.
	 */
	it('нативные свойства кнопки не перекрыты, свои — на прототипе', () => {
		const { prototype } = TButtonElement

		expect(Object.getOwnPropertyDescriptor(prototype, 'disabled')).toBeUndefined()
		expect(Object.getOwnPropertyDescriptor(prototype, 'hidden')).toBeUndefined()
		expect(Object.getOwnPropertyDescriptor(prototype, 'text')?.set).toBeTypeOf('function')
		expect(Object.getOwnPropertyDescriptor(prototype, 'tag')).toBeUndefined()
	})
})

describe('<button is="so-button"> · disabled', () => {
	/**
	 * `disabled` кнопки — нативный: ядро пишет атрибут в `attrs`, а атрибут
	 * потребителя доходит до ядра. Это один атрибут, и база ведёт его по ядру,
	 * даже если он пришёл из разметки. Обратная запись гаснет в сеттере —
	 * событие одно.
	 */
	it('атрибут из разметки следует за ядром, so:change:disabled — по одному разу', async () => {
		const el = mountButton('<button is="so-button" disabled></button>')
		const changes = collect(el, 'so:change:disabled')

		expect(el.disabled).toBe(true)
		expect(ctrlOf(el).disabled).toBe(true)
		expect(el.getAttribute('data-disabled')).toBe('true')

		ctrlOf(el).disabled = false
		await flush()

		expect(el.hasAttribute('disabled')).toBe(false)
		expect(el.disabled).toBe(false)
		expect(el.getAttribute('data-disabled')).toBe('false')
		expect(changes).toEqual([false])

		ctrlOf(el).disabled = true
		await flush()

		expect(el.disabled).toBe(true)
		expect(changes).toEqual([false, true])
	})

	it('нативное свойство disabled доходит до ядра сразу', async () => {
		const el = mountButton('<button is="so-button"></button>')
		const changes = collect(el, 'so:change:disabled')

		el.disabled = true

		expect(ctrlOf(el).disabled).toBe(true)
		expect(el.matches(':disabled')).toBe(true)

		el.disabled = false
		await flush()

		expect(ctrlOf(el).disabled).toBe(false)
		expect(el.getAttribute('data-disabled')).toBe('false')
		expect(changes).toEqual([true, false])
	})

	it('клик даёт so:action:press, у выключенной кнопки — нет', async () => {
		const el = mountButton('<button is="so-button"></button>')
		const presses = collect(el, 'so:action:press')

		await nextFrame()

		el.click()

		expect(presses).toHaveLength(1)

		el.disabled = true
		el.click()

		expect(presses).toHaveLength(1)
	})
})

describe('<button is="so-button"> · разметка потребителя', () => {
	it('class, style, title, id и data-* стоят рядом с классами и наборами ядра', () => {
		const el = mountButton(
			'<button is="so-button" class="own" style="margin-top: 4px" title="Сохранить" id="save" data-test="x" size="xl"></button>',
		)

		expect(Array.from(el.classList)).toEqual(
			expect.arrayContaining(['own', 'so-button', 'so-button--size-xl']),
		)
		expect(el.style.marginTop).toBe('4px')
		expect(el.getAttribute('title')).toBe('Сохранить')
		expect(el.id).toBe('save')
		expect(el.dataset.test).toBe('x')
		expect(el.getAttribute('data-disabled')).toBe('false')
	})

	/**
	 * Класс потребителя база не снимает: смена `variant` меняет только
	 * модификаторы ядра. Раньше классы корня переписывались целиком, и чужой
	 * класс пропадал.
	 */
	it('класс, добавленный после монтирования, переживает смену variant', async () => {
		const el = mountButton('<button is="so-button" variant="danger"></button>')

		el.classList.add('marker')

		el.variant = 'brand'
		await flush()

		expect(el.classList).toContain('so-button--variant-brand')
		expect(el.classList).not.toContain('so-button--variant-danger')
		expect(el.classList).toContain('marker')
	})

	it('класс потребителя с именем класса ядра ядро не снимает', async () => {
		const el = mountButton('<button is="so-button" class="so-button--size-normal"></button>')

		el.size = 'xl'
		await flush()

		expect(el.classList).toContain('so-button--size-xl')
		expect(el.classList).toContain('so-button--size-normal')
	})

	it('tabindex и aria-label потребителя переживают смену disabled', async () => {
		const el = mountButton(
			'<button is="so-button" tabindex="-1" aria-label="Сохранить"></button>',
		)

		el.disabled = true
		await flush()
		el.disabled = false
		await flush()

		expect(el.getAttribute('tabindex')).toBe('-1')
		expect(el.getAttribute('aria-label')).toBe('Сохранить')
	})

	/**
	 * Скрытие — `display: none` поверх инлайнового `display` потребителя, как
	 * `v-show`; при показе возвращается прежнее значение. Кнопку потребителя
	 * компонент убрать не может, поэтому `rendered` прячет, как `visible`:
	 * содержимое на месте, и `TElementPlugin` связан с кнопкой всё время.
	 */
	it('visible=false и rendered=false прячут кнопку, при показе display прежний', async () => {
		const el = createButton()
		let bundle: unknown

		el.addEventListener('so:bundle:create', (event) => {
			if (event instanceof CustomEvent) bundle = event.detail
		})
		el.setAttribute('text', 'Сохранить')
		el.setAttribute('style', 'display: inline-flex')
		document.body.appendChild(el)
		await flush()

		if (!(bundle instanceof TPluginBundle)) throw new Error('so:bundle:create не пришёл')

		const plugin = bundle.get(TElementPlugin)

		el.visible = false
		await flush()

		expect(el.style.display).toBe('none')
		expect(text(el)).toBe('Сохранить')

		el.visible = true
		await flush()

		expect(el.style.display).toBe('inline-flex')

		el.rendered = false
		await flush()

		expect(el.isConnected).toBe(true)
		expect(el.style.display).toBe('none')
		expect(text(el)).toBe('Сохранить')
		expect(plugin?.element).toBe(el)

		el.rendered = true
		await flush()

		expect(el.style.display).toBe('inline-flex')
	})

	/** `display`, поменянный потребителем у скрытой кнопки, база при показе не трогает. */
	it('display, сменённый потребителем у скрытой кнопки, при показе остаётся', async () => {
		const el = mountButton('<button is="so-button"></button>')

		el.visible = false
		await flush()

		el.style.display = 'block'

		el.visible = true
		await flush()

		expect(el.style.display).toBe('block')
	})
})

describe('<button is="so-button"> · свойства из JS', () => {
	it('смена свойства перерисовывает', async () => {
		const el = mountButton('<button is="so-button" text="A"></button>')

		el.text = 'B'
		await flush()

		expect(text(el)).toBe('B')
	})

	it('свойство, выставленное до подключения, доходит до ядра и читается', () => {
		const el = createButton()

		el.text = 'Before'

		expect(el.text).toBe('Before')

		document.body.appendChild(el)

		expect(text(el)).toBe('Before')
		expect(el.text).toBe('Before')
	})

	it('смена direction обновляет и снимает атрибут dir', async () => {
		const el = mountButton('<button is="so-button"></button>')

		el.direction = 'rtl'
		await flush()
		expect(el.getAttribute('dir')).toBe('rtl')

		// возврат в 'inherit' снимает атрибут: ядро переводит его в null
		el.direction = 'inherit'
		await flush()
		expect(el.hasAttribute('dir')).toBe(false)
	})

	/**
	 * Тип элемента — контракт дескриптора, как у пропсов React, Solid и Svelte:
	 * свойство пропа плагина (`aria_label`) в нём есть, как и на прототипе, а
	 * `tag` (`HOST_PROPS`) — нет. `ctrl` — пара элемента (`ISoldyElement`), а не
	 * проп связки. Типы проверяет шаг CI «Типы — Web Components»: в рантайме
	 * `expectTypeOf` ничего не делает.
	 */
	it('aria_label — свойство в типе элемента и имя кнопки, tag в типе нет', async () => {
		const el = mountButton('<button is="so-button"></button>')

		el.aria_label = 'Сохранить'
		await flush()

		expect(el.getAttribute('aria-label')).toBe('Сохранить')
		expect(el.aria_label).toBe('Сохранить')

		expectTypeOf<TButtonElementProps['aria_label']>().toEqualTypeOf<string | undefined>()
		expectTypeOf<TButtonElementProps['ctrl']>().toEqualTypeOf<IButton | undefined>()
		expectTypeOf<TButtonElementProps>().not.toHaveProperty('tag')
	})
})

/**
 * Атрибут сняли или свойство выставили в `undefined` — проп больше не задан, и
 * связка возвращает умолчание декларации. Раньше `undefined` до ядра не
 * доезжал, и элемент оставался с прежним значением.
 *
 * Элемент отдаёт связке не полный набор пропсов, а то, что поменялось: смена
 * одного атрибута остальные не трогает.
 */
describe('<button is="so-button"> · снятый проп', () => {
	it('снятый атрибут возвращает умолчание', async () => {
		const el = mountButton('<button is="so-button" text="A" variant="brand"></button>')

		el.removeAttribute('text')
		el.removeAttribute('variant')
		await flush()

		expect(text(el)).toBe('')
		// Умолчание variant — `undefined`: модификатора нет вовсе
		expect(el.className).not.toMatch(/--variant-/)
	})

	it('свойство, выставленное в undefined, возвращает умолчание', async () => {
		const el = mountButton('<button is="so-button" text="A"></button>')

		el.text = undefined
		await flush()

		expect(text(el)).toBe('')
	})

	it('смена одного атрибута не сбрасывает остальные', async () => {
		const el = mountButton('<button is="so-button" text="A" variant="brand"></button>')

		el.setAttribute('size', 'xl')
		await flush()

		expect(text(el)).toBe('A')
		expect(el.className).toContain('so-button--variant-brand')
		expect(el.className).toContain('so-button--size-xl')
	})
})

describe('<button is="so-button"> · точечные обновления', () => {
	/**
	 * Проверка через побочный маркер: модификатор ядра, снятый с кнопки руками,
	 * возвращается только раскладкой классов. Раз его нет, раскладка не шла.
	 */
	it('смена text не перекладывает классы', async () => {
		const el = mountButton('<button is="so-button" text="A"></button>')

		el.classList.remove('so-button--size-normal')

		el.text = 'B'
		await flush()

		expect(text(el)).toBe('B')
		expect(el.classList).not.toContain('so-button--size-normal')
	})
})

describe('<button is="so-button"> · внешний ctrl', () => {
	it('отражает состояние инстанса и реагирует на его мутации', async () => {
		const ctrl = new TButton({ text: 'FromCtrl', variant: 'brand' })
		const el = mountCtrl(ctrl)

		expect(text(el)).toBe('FromCtrl')
		expect(el.className).toContain('so-button--variant-brand')

		ctrl.text = 'Changed'
		await flush()

		expect(text(el)).toBe('Changed')
	})
})

describe('<button is="so-button"> · события', () => {
	it('диспатчит CustomEvent с именем so: и именем ядра', () => {
		const ctrl = new TButton({ view: 'solid' })
		const el = createButton()
		const seen = collect(el, 'so:change:view')

		el.ctrl = ctrl
		document.body.appendChild(el)

		ctrl.view = 'ghost'

		expect(seen).toEqual(['ghost'])
	})

	it('so:change:visible не дублируется (дедупликация триггеров)', () => {
		const ctrl = new TButton()
		const el = createButton()
		const seen = collect(el, 'so:change:visible')

		el.ctrl = ctrl
		document.body.appendChild(el)

		ctrl.hide()

		expect(seen).toHaveLength(1)
	})

	it('событие всплывает наружу', () => {
		const ctrl = new TButton()
		let heard = false

		document.body.addEventListener('so:change:visible', () => (heard = true), { once: true })
		mountCtrl(ctrl)

		ctrl.hide()

		expect(heard).toBe(true)
	})

	/**
	 * Атрибуты разметки — пропсы первой сборки, а не её изменения: событий
	 * `so:change:*` подключение не шлёт. С полифилом (Safari)
	 * `attributeChangedCallback` начальных атрибутов приходит после
	 * подключения, поэтому база читает атрибуты при подключении сама; колбэк
	 * потом приносит то же значение, и сеттер его гасит.
	 *
	 * Здесь — вторая половина: запоздавший колбэк. Порядок полифила jsdom не
	 * воспроизводит: колбэки он берёт из определения элемента, а встроенные
	 * элементы умеет сам, и полифил в нём не включается. Чтение атрибутов при
	 * подключении проверено в WebKit с полифилом.
	 */
	it('запоздавший колбэк начального атрибута не шлёт so:change:*', () => {
		const el = createButton()
		const changes = [collect(el, 'so:change:text'), collect(el, 'so:change:variant')]

		el.setAttribute('text', 'A')
		el.setAttribute('variant', 'brand')
		document.body.appendChild(el)

		expect(text(el)).toBe('A')
		expect(el.classList).toContain('so-button--variant-brand')

		el.attributeChangedCallback('text', null, 'A')
		el.attributeChangedCallback('variant', null, 'brand')

		expect(changes).toEqual([[], []])
	})
})

/**
 * Живые подписки шины внешнего `ctrl` по её публичному API: пары `on` без
 * своего `off` и слушатели `listen` без своей отписки. Обмен адаптера слушает
 * шину участника одним слушателем `listen`, подписок `on` на события и
 * триггеры у него нет.
 */
function watchBus(ctrl: TButton): () => number {
	const { events } = ctrl
	const on = vi.spyOn(events, 'on')
	const off = vi.spyOn(events, 'off')
	const listen = events.listen.bind(events)
	let listening = 0

	vi.spyOn(events, 'listen').mockImplementation((listener) => {
		const release = listen(listener)

		listening++

		return () => {
			listening--
			release()
		}
	})

	return () =>
		listening +
		on.mock.calls.filter(
			([event, handler]) => !off.mock.calls.some(([e, h]) => e === event && h === handler),
		).length
}

describe('<button is="so-button"> · очистка', () => {
	it('снимает подписки с внешнего ctrl при удалении из DOM', () => {
		const ctrl = new TButton()
		const live = watchBus(ctrl)

		const el = mountCtrl(ctrl)

		expect(live()).toBeGreaterThan(0)

		el.remove()

		expect(live()).toBe(0)
	})
})

/**
 * Перестановка в DOM — отключение и подключение: свет и структура остаются,
 * инстанс тот же, а связка новая. Раньше повторное подключение снимало
 * «свет» заново — вместе с собственной разметкой — и собирало новый инстанс.
 */
describe('<button is="so-button"> · перестановка в DOM', () => {
	it('структура одна, слоты на местах, el.ctrl тот же', async () => {
		const el = mountButton(
			'<button is="so-button" text="Mid"><i slot="leading">L</i><i slot="trailing">T</i></button>',
		)
		const ctrl = el.ctrl

		move(el)
		await flush()

		expect(el.querySelectorAll('.so-button__text')).toHaveLength(1)
		expect(children(el)).toEqual(['L', 'Mid', 'T'])
		expect(el.ctrl).toBe(ctrl)
		expect(el.classList).toContain('so-button')
	})

	it('смена внешнего ctrl доходит одним CustomEvent', () => {
		const ctrl = new TButton()
		const el = mountCtrl(ctrl)
		const seen = collect(el, 'so:change:view')

		move(el)

		ctrl.view = 'ghost'

		expect(seen).toEqual(['ghost'])
	})

	it('so:element:ready приходит снова', async () => {
		const el = createButton()
		const ready = collect(el, 'so:element:ready')

		document.body.appendChild(el)
		await nextFrame()

		expect(ready).toEqual([el])

		move(el)
		await nextFrame()

		expect(ready).toEqual([el, el])
	})

	it('подписок на шине ctrl столько же, после удаления — ноль', () => {
		const ctrl = new TButton()
		const live = watchBus(ctrl)
		const el = mountCtrl(ctrl)
		const mounted = live()

		move(el)

		expect(live()).toBe(mounted)

		el.remove()

		expect(live()).toBe(0)
	})

	it('атрибут, сменённый вне DOM, применяется, снятый — возвращает умолчание', async () => {
		const el = mountButton('<button is="so-button" text="A" variant="brand"></button>')

		el.remove()
		el.setAttribute('text', 'B')
		el.removeAttribute('variant')

		expect(el.text).toBe('B')

		document.body.appendChild(el)
		await flush()

		expect(text(el)).toBe('B')
		expect(el.className).not.toMatch(/--variant-/)
		expect(el.variant).toBeUndefined()
	})

	/** Пропсы сборки — последнее значение, которое видел элемент, а не то, что задавал атрибут. */
	it('перестановка не откатывает то, что с тех пор поменяло ядро', async () => {
		const el = mountButton('<button is="so-button" text="A"></button>')

		ctrlOf(el).text = 'B'
		await flush()

		move(el)
		await flush()

		expect(text(el)).toBe('B')
		expect(ctrlOf(el).text).toBe('B')
	})

	it('скрытая кнопка после перестановки остаётся скрытой и показывается с прежним display', async () => {
		const el = mountButton('<button is="so-button" style="display: inline-flex"></button>')

		el.visible = false
		await flush()

		move(el)
		await flush()

		expect(el.style.display).toBe('none')

		el.visible = true
		await flush()

		expect(el.style.display).toBe('inline-flex')
	})
})

describe('<button is="so-button"> · слоты', () => {
	it('шаблон объявляет ровно те слоты, что и дескриптор', () => {
		const root = document.createElement('button')
		const targets = buttonTemplate.create(root, () => false, bareContext(root)).slots

		// Contract conformance: имена в шаблоне и в дескрипторе обязаны совпадать
		expect(Object.keys(targets).sort()).toEqual(
			ButtonDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})

	it('содержимое без атрибута slot попадает в слот по умолчанию', () => {
		const el = mountButton('<button is="so-button" text="ignored"><b>Custom</b></button>')

		expect(text(el)).toBe('Custom')
		expect(el.querySelector('.so-button__text > b')?.textContent).toBe('Custom')
	})

	it('slot="leading" ставится перед текстом, slot="trailing" — после', () => {
		const el = mountButton(
			'<button is="so-button" text="Mid"><i slot="leading">L</i><i slot="trailing">T</i></button>',
		)

		// Порядок в DOM важнее наличия: иконка «до» обязана быть до текста
		expect(children(el)).toEqual(['L', 'Mid', 'T'])
	})

	it('именованные слоты не подавляют текст из props', () => {
		const el = mountButton(
			'<button is="so-button" text="Hello"><i slot="leading">L</i></button>',
		)

		// Только содержимое слота default переопределяет text
		expect(text(el)).toBe('Hello')
	})

	/**
	 * Слот, которого шаблон не объявил, места в разметке не имеет: его
	 * содержимое не выводится, как у остальных адаптеров и у теневого дерева.
	 * Раньше оно ложилось в корень, после всех слотов.
	 */
	it('содержимое необъявленного слота не выводится', () => {
		const el = mountButton(
			'<button is="so-button" text="Mid"><i slot="nowhere">N</i><i slot="trailing">T</i></button>',
		)

		expect(children(el)).toEqual(['Mid', 'T'])
		expect(el.textContent).toBe('MidT')
	})

	/**
	 * Пробелы и комментарии вокруг именованных слотов — не содержимое: так
	 * разметку пишут с переносами строк, а компилятор Vue их выбрасывает. Раньше
	 * они становились слотом по умолчанию, и вместо `text` кнопка рисовала пустую
	 * строку из пробелов.
	 */
	it('пробелы и комментарии вокруг слотов не подавляют текст из props', () => {
		const el = mountButton(`<button is="so-button" text="Сохранить">
			<!-- иконка -->
			<i slot="leading">L</i>
			<i slot="trailing">T</i>
		</button>`)

		expect(text(el)).toBe('Сохранить')
		expect(children(el)).toEqual(['L', 'Сохранить', 'T'])
	})

	it('пробелы внутри содержимого слота по умолчанию остаются', () => {
		const el = mountButton(`<button is="so-button" text="ignored">
			<b>Сохранить</b> <i>файл</i>
		</button>`)

		expect(text(el)?.trim()).toBe('Сохранить файл')
	})

	/**
	 * Скрипт в `<head>` определяет элемент до разбора разметки: парсер создаёт
	 * кнопку уже живой и подключает её раньше, чем дописал её детей. Первое
	 * подключение поэтому ждёт `DOMContentLoaded` — иначе свет был бы пуст, а
	 * `slot="leading"` парсер дописал бы после текста.
	 */
	it('пока документ разбирается, свет собирается после DOMContentLoaded', () => {
		const readyState = vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading')
		const el = createButton()

		el.setAttribute('text', 'Mid')
		document.body.appendChild(el)
		// Дети, которые парсер дописывает после подключения
		el.insertAdjacentHTML('beforeend', '<i slot="leading">L</i>')

		expect(el.ctrl).toBeUndefined()

		readyState.mockRestore()
		document.dispatchEvent(new Event('DOMContentLoaded'))

		expect(children(el)).toEqual(['L', 'Mid'])
		expect(el.ctrl).toBeDefined()
	})
})

/**
 * Button на другом теге — тот же Button под своим именем: одно имя элемента
 * расширяет один тег. Регистрирует его фабрика `registerButtonTag`: описание
 * элемента — дескриптор, шаблон, setup — у всех тегов одно, и тег ядро
 * получает от элемента. На `div` ядро пишет кнопке `role="button"`,
 * `tabindex` и `aria-disabled` вместо нативного `disabled`, а `disabled` —
 * свойство пропа: своего у `div` нет.
 */
describe('<div is="so-button-div"> · Button на div', () => {
	const TButtonDivElement = registerButtonTag('div')

	function isButtonDiv(node: Element | null): node is TButtonElementProps<HTMLDivElement> {
		return node instanceof TButtonDivElement
	}

	/** Кнопка на `div` из разметки. */
	function mountDiv(html: string): TButtonElementProps<HTMLDivElement> {
		const host = document.createElement('div')

		host.innerHTML = html
		document.body.appendChild(host)

		const node = host.firstElementChild

		if (!isButtonDiv(node)) throw new Error('<div is="so-button-div"> нет')

		return node
	}

	it('класс у тега один: повторный вызов отдаёт его же, имя — so-button-div', () => {
		expect(registerButtonTag('div')).toBe(TButtonDivElement)
		expect(customElements.get('so-button-div')).toBe(TButtonDivElement)
		expect(document.createElement('div', { is: 'so-button-div' })).toBeInstanceOf(
			TButtonDivElement,
		)
	})

	it('описание — то же, что у <button is="so-button">: атрибуты-входы одни', () => {
		expect(TButtonDivElement.observedAttributes).toEqual(TButtonElement.observedAttributes)
	})

	it('div с классами, текстом и слотами кнопки; роль и остановку Tab ядро пишет само', () => {
		const el = mountDiv(
			'<div is="so-button-div" text="Mid" size="xl"><i slot="leading">L</i><i slot="trailing">T</i></div>',
		)

		expect(el).toBeInstanceOf(HTMLDivElement)
		expect(el.classList).toContain('so-button')
		expect(el.classList).toContain('so-button--size-xl')
		expect(children(el)).toEqual(['L', 'Mid', 'T'])
		expect(ctrlOf(el).tag).toBe('div')
		expect(el.getAttribute('role')).toBe('button')
		expect(el.getAttribute('tabindex')).toBe('0')
	})

	it('disabled — свойство пропа: aria-disabled без disabled, остановки Tab нет', async () => {
		const el = mountDiv('<div is="so-button-div" text="A"></div>')

		expect(
			Object.getOwnPropertyDescriptor(TButtonDivElement.prototype, 'disabled')?.set,
		).toBeTypeOf('function')

		el.disabled = true
		await flush()

		expect(ctrlOf(el).disabled).toBe(true)
		expect(el.getAttribute('aria-disabled')).toBe('true')
		expect(el.hasAttribute('disabled')).toBe(false)
		expect(el.hasAttribute('tabindex')).toBe(false)
		expect(el.getAttribute('data-disabled')).toBe('true')
	})

	it('клик даёт so:action:press, у выключенной — нет', async () => {
		const el = mountDiv('<div is="so-button-div" text="A"></div>')
		const presses = collect(el, 'so:action:press')

		await nextFrame()

		el.click()

		expect(presses).toHaveLength(1)

		el.disabled = true
		await flush()
		el.click()

		expect(presses).toHaveLength(1)
	})
})
