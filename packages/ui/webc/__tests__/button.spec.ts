/**
 * `<so-button>` — корень компонента сам хост: обёртки и внутреннего
 * `<button>` нет. Классы, наборы ядра и скрытие лежат на самом элементе, рядом
 * с тем, что написал потребитель, а атрибуты и классы потребителя главнее.
 *
 * Поведение формы (отправка, сброс, `disabled` без кликов) — в браузере,
 * `playground/vue/browser/webc-button.spec.ts`: в jsdom у `ElementInternals`
 * нет `form`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TButton } from '@soldy-ui/core'
import { TElementPlugin, TPluginBundle } from '@soldy-ui/plugins'
import { ButtonDescriptor } from '@soldy-ui/setup'
import type { IButton } from '@soldy-ui/core'
import { buttonTemplate } from '../src/components/button/button.template'
import '@soldy-ui/webc'

type TButtonElement = HTMLElementTagNameMap['so-button']

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** `<so-button>` из разметки — с props дескриптора (тип из HTMLElementTagNameMap). */
function mountButton(html: string): TButtonElement {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)

	const el = host.querySelector('so-button')

	if (!el) throw new Error('<so-button> не смонтирован')

	return el
}

/** `<so-button>` над готовым инстансом: `ctrl` выставлен до подключения. */
function mountCtrl(ctrl: TButton): TButtonElement {
	const el = document.createElement('so-button')

	el.ctrl = ctrl
	document.body.appendChild(el)

	return el
}

/** Инстанс элемента; его нет — тест падает здесь, а не на чтении свойства. */
function ctrlOf(el: TButtonElement): IButton {
	const { ctrl } = el

	if (!ctrl) throw new Error('у <so-button> нет инстанса')

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

const text = (el: Element) => el.querySelector('.s-button__text')?.textContent

/** Тексты детей хоста — так видны слоты и их порядок. */
const children = (el: Element) => Array.from(el.children).map((node) => node.textContent)

afterEach(() => {
	document.body.innerHTML = ''
})

describe('<so-button> · корень — сам хост', () => {
	it('классы и наборы ядра на хосте, внутри один .s-button__text', () => {
		const el = mountButton('<so-button></so-button>')

		expect(el.classList).toContain('s-button')
		// variant и view — значения темы: без них модификаторов нет вовсе
		expect(el.className).not.toMatch(/--(variant|view)-/)
		// Для ядра so-button — не нативная кнопка: роль и фокус из `aria`
		expect(el.getAttribute('role')).toBe('button')
		expect(el.getAttribute('tabindex')).toBe('0')
		expect(el.hasAttribute('aria-disabled')).toBe(false)
		/** Тема смотрит `[data-disabled='true']`: «выключено» — строка, а не пропавший атрибут */
		expect(el.getAttribute('data-disabled')).toBe('false')
		expect(el.querySelectorAll('.s-button__text')).toHaveLength(1)
		expect(el.children).toHaveLength(1)
	})

	it('атрибуты пропсов дают классы и текст', () => {
		const el = mountButton(
			'<so-button text="Hello" variant="brand" size="xl" view="ghost"></so-button>',
		)

		expect(text(el)).toBe('Hello')
		expect(Array.from(el.classList)).toEqual(
			expect.arrayContaining([
				's-button',
				's-button--size-xl',
				's-button--variant-brand',
				's-button--view-ghost',
			]),
		)
	})

	it('direction ставит атрибут dir на хост, без него dir нет (наследуется)', () => {
		expect(mountButton('<so-button direction="rtl"></so-button>').getAttribute('dir')).toBe(
			'rtl',
		)
		expect(mountButton('<so-button></so-button>').hasAttribute('dir')).toBe(false)
	})

	it('содержимое тега переопределяет text', () => {
		const el = mountButton('<so-button text="ignored"><b>Custom</b></so-button>')

		expect(text(el)).toBe('Custom')
	})

	/**
	 * Тег — у элемента: атрибута и свойства `tag` нет, и записать его нечем.
	 * Ядро получает `so-button` — не нативный тег.
	 */
	it('tag="a" ни на что не влияет, тег у ядра и у внешнего ctrl — so-button', () => {
		const el = mountButton('<so-button tag="a"></so-button>')
		const ctrl = new TButton()

		mountCtrl(ctrl)

		expect('tag' in el).toBe(false)
		expect(ctrlOf(el).tag).toBe('so-button')
		expect(el.getAttribute('role')).toBe('button')
		expect(ctrl.tag).toBe('so-button')
	})
})

describe('<so-button> · disabled', () => {
	/**
	 * `so-button` связан с формой, и выключает его только нативный атрибут:
	 * ядро для такого тега пишет `aria-disabled`, а атрибут ведёт база по
	 * `disabled` ядра. Обратная запись атрибута гаснет в сеттере — событие одно.
	 */
	it('атрибут disabled следует за ядром, change:disabled — по одному разу', async () => {
		const el = mountButton('<so-button disabled></so-button>')
		const changes = collect(el, 'change:disabled')

		expect(el.hasAttribute('disabled')).toBe(true)
		expect(el.getAttribute('aria-disabled')).toBe('true')
		expect(el.hasAttribute('tabindex')).toBe(false)
		expect(el.getAttribute('data-disabled')).toBe('true')

		el.disabled = false
		await flush()

		expect(el.hasAttribute('disabled')).toBe(false)
		expect(el.hasAttribute('aria-disabled')).toBe(false)
		expect(el.getAttribute('tabindex')).toBe('0')
		expect(el.getAttribute('data-disabled')).toBe('false')
		expect(changes).toEqual([false])

		ctrlOf(el).disabled = true
		await flush()

		expect(el.hasAttribute('disabled')).toBe(true)
		expect(el.disabled).toBe(true)
		expect(changes).toEqual([false, true])
	})
})

describe('<so-button> · разметка потребителя на хосте', () => {
	it('class, style, title, id и data-* стоят рядом с классами и наборами ядра', () => {
		const el = mountButton(
			'<so-button class="own" style="margin-top: 4px" title="Сохранить" id="save" data-test="x" size="xl"></so-button>',
		)

		expect(Array.from(el.classList)).toEqual(
			expect.arrayContaining(['own', 's-button', 's-button--size-xl']),
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
		const el = mountButton('<so-button variant="danger"></so-button>')

		el.classList.add('marker')

		el.variant = 'brand'
		await flush()

		expect(el.classList).toContain('s-button--variant-brand')
		expect(el.classList).not.toContain('s-button--variant-danger')
		expect(el.classList).toContain('marker')
	})

	it('класс потребителя с именем класса ядра ядро не снимает', async () => {
		const el = mountButton('<so-button class="s-button--size-normal"></so-button>')

		el.size = 'xl'
		await flush()

		expect(el.classList).toContain('s-button--size-xl')
		expect(el.classList).toContain('s-button--size-normal')
	})

	/**
	 * Атрибут потребителя главнее набора ядра: ядро пишет кнопке
	 * `tabindex="0"`, снимает его с выключенной и возвращает включённой — и ни
	 * разу не трогает чужое значение. Роль — так же.
	 */
	it('tabindex="-1" переживает смену disabled, role="link" остаётся', async () => {
		const el = mountButton('<so-button tabindex="-1" role="link"></so-button>')

		expect(el.getAttribute('tabindex')).toBe('-1')
		expect(el.getAttribute('role')).toBe('link')

		el.disabled = true
		await flush()

		expect(el.getAttribute('tabindex')).toBe('-1')
		expect(el.getAttribute('role')).toBe('link')
		expect(el.getAttribute('aria-disabled')).toBe('true')

		el.disabled = false
		await flush()

		expect(el.getAttribute('tabindex')).toBe('-1')
		expect(el.getAttribute('role')).toBe('link')
		expect(el.hasAttribute('aria-disabled')).toBe(false)
	})

	/**
	 * Скрытие — `display: none` поверх инлайнового `display` потребителя, как
	 * `v-show`; при показе возвращается прежнее значение. Хост потребителя
	 * компонент убрать не может, поэтому `rendered` прячет, как `visible`:
	 * содержимое на месте, и `TElementPlugin` связан с хостом всё время.
	 */
	it('visible=false и rendered=false прячут хост, при показе display прежний', async () => {
		const el = document.createElement('so-button')
		let bundle: unknown

		el.addEventListener('bundle:create', (event) => {
			if (event instanceof CustomEvent) bundle = event.detail
		})
		el.setAttribute('text', 'Сохранить')
		el.setAttribute('style', 'display: inline-flex')
		document.body.appendChild(el)
		await flush()

		if (!(bundle instanceof TPluginBundle)) throw new Error('bundle:create не пришёл')

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

	/** `display`, поменянный потребителем у скрытого хоста, база при показе не трогает. */
	it('display, сменённый потребителем у скрытого хоста, при показе остаётся', async () => {
		const el = mountButton('<so-button></so-button>')

		el.visible = false
		await flush()

		el.style.display = 'block'

		el.visible = true
		await flush()

		expect(el.style.display).toBe('block')
	})
})

describe('<so-button> · свойства из JS', () => {
	it('смена свойства перерисовывает', async () => {
		const el = mountButton('<so-button text="A"></so-button>')

		el.text = 'B'
		await flush()

		expect(text(el)).toBe('B')
	})

	it('свойство, выставленное до подключения, доходит до ядра и читается', () => {
		const el = document.createElement('so-button')

		el.text = 'Before'

		expect(el.text).toBe('Before')

		document.body.appendChild(el)

		expect(text(el)).toBe('Before')
		expect(el.text).toBe('Before')
	})

	it('смена direction обновляет и снимает атрибут dir', async () => {
		const el = mountButton('<so-button></so-button>')

		el.direction = 'rtl'
		await flush()
		expect(el.getAttribute('dir')).toBe('rtl')

		// возврат в 'inherit' снимает атрибут: ядро переводит его в null
		el.direction = 'inherit'
		await flush()
		expect(el.hasAttribute('dir')).toBe(false)
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
describe('<so-button> · снятый проп', () => {
	it('снятый атрибут возвращает умолчание', async () => {
		const el = mountButton('<so-button text="A" variant="brand"></so-button>')

		el.removeAttribute('text')
		el.removeAttribute('variant')
		await flush()

		expect(text(el)).toBe('')
		// Умолчание variant — `undefined`: модификатора нет вовсе
		expect(el.className).not.toMatch(/--variant-/)
	})

	it('свойство, выставленное в undefined, возвращает умолчание', async () => {
		const el = mountButton('<so-button text="A"></so-button>')

		el.text = undefined
		await flush()

		expect(text(el)).toBe('')
	})

	it('смена одного атрибута не сбрасывает остальные', async () => {
		const el = mountButton('<so-button text="A" variant="brand"></so-button>')

		el.setAttribute('size', 'xl')
		await flush()

		expect(text(el)).toBe('A')
		expect(el.className).toContain('s-button--variant-brand')
		expect(el.className).toContain('s-button--size-xl')
	})
})

describe('<so-button> · точечные обновления', () => {
	/**
	 * Проверка через побочный маркер: модификатор ядра, снятый с хоста руками,
	 * возвращается только раскладкой классов. Раз его нет, раскладка не шла.
	 */
	it('смена text не перекладывает классы', async () => {
		const el = mountButton('<so-button text="A"></so-button>')

		el.classList.remove('s-button--size-normal')

		el.text = 'B'
		await flush()

		expect(text(el)).toBe('B')
		expect(el.classList).not.toContain('s-button--size-normal')
	})
})

describe('<so-button> · внешний ctrl', () => {
	it('отражает состояние инстанса и реагирует на его мутации', async () => {
		const ctrl = new TButton({ text: 'FromCtrl', variant: 'brand' })
		const el = mountCtrl(ctrl)

		expect(text(el)).toBe('FromCtrl')
		expect(el.className).toContain('s-button--variant-brand')

		ctrl.text = 'Changed'
		await flush()

		expect(text(el)).toBe('Changed')
	})
})

describe('<so-button> · события', () => {
	it('диспатчит CustomEvent с именем как в ядре', () => {
		const ctrl = new TButton({ view: 'solid' })
		const el = document.createElement('so-button')
		const seen = collect(el, 'change:view')

		el.ctrl = ctrl
		document.body.appendChild(el)

		ctrl.view = 'ghost'

		expect(seen).toEqual(['ghost'])
	})

	it('change:visible не дублируется (дедупликация триггеров)', () => {
		const ctrl = new TButton()
		const el = document.createElement('so-button')
		const seen = collect(el, 'change:visible')

		el.ctrl = ctrl
		document.body.appendChild(el)

		ctrl.hide()

		expect(seen).toHaveLength(1)
	})

	it('событие всплывает наружу', () => {
		const ctrl = new TButton()
		let heard = false

		document.body.addEventListener('change:visible', () => (heard = true), { once: true })
		mountCtrl(ctrl)

		ctrl.hide()

		expect(heard).toBe(true)
	})
})

/**
 * Enter и пробел на самом хосте — `press` от `TActionPlugin`: для ядра
 * `so-button` не нативный тег, и клика из клавиши браузер не делает. Слушатели
 * плагин вешает по `ready` узла — через кадр после подключения.
 */
describe('<so-button> · клавиатура', () => {
	const keydown = (el: Element, key: string) =>
		el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))

	it('Enter и пробел на хосте дают action:press', async () => {
		const el = mountButton('<so-button></so-button>')
		const presses = collect(el, 'action:press')

		await nextFrame()

		keydown(el, 'Enter')
		keydown(el, ' ')

		expect(presses).toHaveLength(2)
	})

	it('у выключенной кнопки press нет', async () => {
		const el = mountButton('<so-button disabled></so-button>')
		const presses = collect(el, 'action:press')

		await nextFrame()

		keydown(el, 'Enter')
		keydown(el, ' ')
		el.click()

		expect(presses).toHaveLength(0)
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

describe('<so-button> · очистка', () => {
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
describe('<so-button> · перестановка в DOM', () => {
	it('структура одна, слоты на местах, el.ctrl тот же', async () => {
		const el = mountButton(
			'<so-button text="Mid"><i slot="leading">L</i><i slot="trailing">T</i></so-button>',
		)
		const ctrl = el.ctrl

		move(el)
		await flush()

		expect(el.querySelectorAll('.s-button__text')).toHaveLength(1)
		expect(children(el)).toEqual(['L', 'Mid', 'T'])
		expect(el.ctrl).toBe(ctrl)
		expect(el.classList).toContain('s-button')
		expect(el.getAttribute('role')).toBe('button')
	})

	it('смена внешнего ctrl доходит одним CustomEvent', () => {
		const ctrl = new TButton()
		const el = mountCtrl(ctrl)
		const seen = collect(el, 'change:view')

		move(el)

		ctrl.view = 'ghost'

		expect(seen).toEqual(['ghost'])
	})

	it('element:ready приходит снова', async () => {
		const el = document.createElement('so-button')
		const ready = collect(el, 'element:ready')

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
		const el = mountButton('<so-button text="A" variant="brand"></so-button>')

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
		const el = mountButton('<so-button text="A"></so-button>')

		ctrlOf(el).text = 'B'
		await flush()

		move(el)
		await flush()

		expect(text(el)).toBe('B')
		expect(ctrlOf(el).text).toBe('B')
	})

	it('скрытый хост после перестановки остаётся скрытым и показывается с прежним display', async () => {
		const el = mountButton('<so-button style="display: inline-flex"></so-button>')

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

describe('<so-button> · слоты', () => {
	it('шаблон объявляет ровно те слоты, что и дескриптор', () => {
		const targets = buttonTemplate.create(document.createElement('so-button'))

		// Contract conformance: имена в шаблоне и в дескрипторе обязаны совпадать
		expect(Object.keys(targets).sort()).toEqual(
			ButtonDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})

	it('содержимое без атрибута slot попадает в слот по умолчанию', () => {
		const el = mountButton('<so-button text="ignored"><b>Custom</b></so-button>')

		expect(text(el)).toBe('Custom')
		expect(el.querySelector('.s-button__text > b')?.textContent).toBe('Custom')
	})

	it('slot="leading" ставится перед текстом, slot="trailing" — после', () => {
		const el = mountButton(
			'<so-button text="Mid"><i slot="leading">L</i><i slot="trailing">T</i></so-button>',
		)

		// Порядок в DOM важнее наличия: иконка «до» обязана быть до текста
		expect(children(el)).toEqual(['L', 'Mid', 'T'])
	})

	it('именованные слоты не подавляют текст из props', () => {
		const el = mountButton('<so-button text="Hello"><i slot="leading">L</i></so-button>')

		// Только содержимое слота default переопределяет text
		expect(text(el)).toBe('Hello')
	})
})
