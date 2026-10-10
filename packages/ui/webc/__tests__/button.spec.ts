import { describe, it, expect, afterEach, vi } from 'vitest'
import { TButton } from '@soldy-ui/core'
import { ButtonDescriptor } from '@soldy-ui/setup'
import { buttonTemplate } from '../src/components/button/button.template'
import '@soldy-ui/webc'

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

function mount(html: string): HTMLElement {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)

	return host.firstElementChild as HTMLElement
}

/** `<so-button>` из разметки — с props дескриптора (тип из HTMLElementTagNameMap). */
function mountButton(html: string): HTMLElementTagNameMap['so-button'] {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)

	const el = host.querySelector('so-button')

	if (!el) throw new Error('<so-button> не смонтирован')

	return el
}

function root(el: HTMLElement): HTMLElement {
	return el.firstElementChild as HTMLElement
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('<so-button> · атрибуты', () => {
	it('по умолчанию рендерит внутренний <button> с базовыми классами', () => {
		const el = mount('<so-button></so-button>')

		expect(root(el).tagName.toLowerCase()).toBe('button')
		expect(root(el).className).toContain('s-button')
		// variant и view — значения темы: без них модификаторов нет вовсе
		expect(root(el).className).not.toMatch(/--(variant|view)-/)
	})

	it('читает text и классы из атрибутов', () => {
		const el = mount(
			'<so-button text="Hello" variant="brand" size="xl" view="ghost"></so-button>',
		)

		expect(root(el).querySelector('.s-button__text')?.textContent).toBe('Hello')
		expect(root(el).className).toContain('s-button--size-xl')
		expect(root(el).className).toContain('s-button--variant-brand')
		expect(root(el).className).toContain('s-button--view-ghost')
	})

	it('boolean-атрибут работает по HTML-семантике (важно наличие)', () => {
		const el = mount('<so-button disabled></so-button>')

		expect(root(el).hasAttribute('disabled')).toBe(true)
		expect(root(el).getAttribute('data-disabled')).toBe('true')
	})

	it('на не-button теге disabled уходит в aria-disabled', () => {
		const el = mount('<so-button tag="a" disabled></so-button>')

		expect(root(el).tagName.toLowerCase()).toBe('a')
		expect(root(el).getAttribute('aria-disabled')).toBe('true')
		expect(root(el).hasAttribute('disabled')).toBe(false)
		expect(root(el).getAttribute('data-disabled')).toBe('true')
	})

	it('fieldset тоже нативный тег — атрибут disabled, без aria-disabled', () => {
		const el = mount('<so-button tag="fieldset" disabled></so-button>')

		expect(root(el).tagName.toLowerCase()).toBe('fieldset')
		expect(root(el).hasAttribute('disabled')).toBe(true)
		expect(root(el).hasAttribute('aria-disabled')).toBe(false)
		expect(root(el).getAttribute('data-disabled')).toBe('true')
	})

	/** Тема смотрит `[data-disabled='true']`: «выключено» — строка, а не пропавший атрибут. */
	it('без disabled data-disabled="false"', () => {
		const el = mount('<so-button></so-button>')

		expect(root(el).getAttribute('data-disabled')).toBe('false')
	})

	it('содержимое тега переопределяет text', () => {
		const el = mount('<so-button text="ignored"><b>Custom</b></so-button>')

		expect(root(el).querySelector('.s-button__text')?.textContent).toBe('Custom')
	})

	it('direction ставит атрибут dir на корень', () => {
		const el = mount('<so-button direction="rtl"></so-button>')

		expect(root(el).getAttribute('dir')).toBe('rtl')
	})

	it('без direction атрибут dir не выставляется (наследуется)', () => {
		const el = mount('<so-button></so-button>')

		expect(root(el).hasAttribute('dir')).toBe(false)
	})
})

describe('<so-button> · свойства из JS', () => {
	it('смена свойства перерисовывает', async () => {
		const el = mountButton('<so-button text="A"></so-button>')

		el.text = 'B'
		await flush()

		expect(root(el).querySelector('.s-button__text')?.textContent).toBe('B')
	})

	it('смена tag пересоздаёт корневой элемент', async () => {
		const el = mountButton('<so-button></so-button>')

		expect(root(el).tagName.toLowerCase()).toBe('button')

		el.tag = 'span'
		await flush()

		expect(root(el).tagName.toLowerCase()).toBe('span')
	})

	it('rendered=false убирает корень, visible=false прячет', async () => {
		const el = mountButton('<so-button></so-button>')

		el.visible = false
		await flush()
		expect(root(el).style.display).toBe('none')

		el.rendered = false
		await flush()
		expect(el.firstElementChild).toBeNull()
	})

	it('смена direction обновляет и снимает атрибут dir', async () => {
		const el = mountButton('<so-button></so-button>')

		el.direction = 'rtl'
		await flush()
		expect(root(el).getAttribute('dir')).toBe('rtl')

		// возврат в 'inherit' снимает атрибут: ядро переводит его в null
		el.direction = 'inherit'
		await flush()
		expect(root(el).hasAttribute('dir')).toBe(false)
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

		expect(root(el).querySelector('.s-button__text')?.textContent).toBe('')
		// Умолчание variant — `undefined`: модификатора нет вовсе
		expect(root(el).className).not.toMatch(/--variant-/)
	})

	it('свойство, выставленное в undefined, возвращает умолчание', async () => {
		const el = mountButton('<so-button text="A"></so-button>')

		el.text = undefined
		await flush()

		expect(root(el).querySelector('.s-button__text')?.textContent).toBe('')
	})

	it('смена одного атрибута не сбрасывает остальные', async () => {
		const el = mountButton('<so-button text="A" variant="brand"></so-button>')

		el.setAttribute('size', 'xl')
		await flush()

		expect(root(el).querySelector('.s-button__text')?.textContent).toBe('A')
		expect(root(el).className).toContain('s-button--variant-brand')
		expect(root(el).className).toContain('s-button--size-xl')
	})
})

describe('<so-button> · точечные обновления', () => {
	/**
	 * Проверка через побочный маркер: если база переписывает className, чужой
	 * класс исчезнет. Значит его выживание доказывает, что привязка className
	 * не применялась.
	 */
	it('смена text не переписывает className', async () => {
		const el = mountButton('<so-button text="A"></so-button>')

		root(el).classList.add('marker')

		el.text = 'B'
		await flush()

		expect(root(el).querySelector('.s-button__text')?.textContent).toBe('B')
		expect(root(el).classList.contains('marker')).toBe(true)
	})

	it('смена variant переписывает className', async () => {
		const el = mountButton('<so-button></so-button>')

		root(el).classList.add('marker')

		el.variant = 'brand'
		await flush()

		expect(root(el).className).toContain('s-button--variant-brand')
		expect(root(el).classList.contains('marker')).toBe(false)
	})

	it('пересоздание корня применяет все привязки заново', async () => {
		const el = mountButton('<so-button text="Hi" disabled></so-button>')

		el.tag = 'a'
		await flush()

		// Новый корень пуст, поэтому текст и disabled должны примениться целиком
		expect(root(el).tagName.toLowerCase()).toBe('a')
		expect(root(el).querySelector('.s-button__text')?.textContent).toBe('Hi')
		expect(root(el).getAttribute('aria-disabled')).toBe('true')
		expect(root(el).getAttribute('data-disabled')).toBe('true')
	})
})

describe('<so-button> · внешний ctrl', () => {
	it('отражает состояние инстанса и реагирует на его мутации', async () => {
		const ctrl = new TButton({ text: 'FromCtrl', variant: 'brand' })
		const el = document.createElement('so-button')

		el.ctrl = ctrl
		document.body.appendChild(el)

		expect(root(el).querySelector('.s-button__text')?.textContent).toBe('FromCtrl')
		expect(root(el).className).toContain('s-button--variant-brand')

		ctrl.text = 'Changed'
		await flush()

		expect(root(el).querySelector('.s-button__text')?.textContent).toBe('Changed')
	})
})

describe('<so-button> · события', () => {
	it('диспатчит CustomEvent с именем как в ядре', async () => {
		const ctrl = new TButton({ view: 'solid' })
		const el = document.createElement('so-button')
		const seen: unknown[] = []

		el.ctrl = ctrl
		el.addEventListener('change:view', (e: Event) => seen.push((e as CustomEvent).detail))
		document.body.appendChild(el)

		ctrl.view = 'ghost'

		expect(seen).toEqual(['ghost'])
	})

	it('change:visible не дублируется (дедупликация триггеров)', () => {
		const ctrl = new TButton()
		const el = document.createElement('so-button')
		const seen: unknown[] = []

		el.ctrl = ctrl
		el.addEventListener('change:visible', (e: Event) => seen.push((e as CustomEvent).detail))
		document.body.appendChild(el)

		ctrl.hide()

		expect(seen).toHaveLength(1)
	})

	it('событие всплывает наружу', () => {
		const ctrl = new TButton()
		const el = document.createElement('so-button')
		let heard = false

		el.ctrl = ctrl
		document.body.addEventListener('change:visible', () => (heard = true), { once: true })
		document.body.appendChild(el)

		ctrl.hide()

		expect(heard).toBe(true)
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

		const el = document.createElement('so-button')

		el.ctrl = ctrl
		document.body.appendChild(el)

		expect(live()).toBeGreaterThan(0)

		el.remove()

		expect(live()).toBe(0)
	})
})

describe('<so-button> · aria из ядра', () => {
	it('на нативной кнопке лишних атрибутов нет', () => {
		const el = mount('<so-button disabled></so-button>')

		expect(root(el).hasAttribute('disabled')).toBe(true)
		expect(root(el).hasAttribute('role')).toBe(false)
		expect(root(el).hasAttribute('tabindex')).toBe(false)
		expect(root(el).hasAttribute('aria-disabled')).toBe(false)
	})

	it('на не-нативном теге появляются role и aria-disabled', () => {
		const el = mount('<so-button tag="div" disabled></so-button>')

		expect(root(el).getAttribute('role')).toBe('button')
		expect(root(el).getAttribute('aria-disabled')).toBe('true')
		expect(root(el).hasAttribute('tabindex')).toBe(false)
	})

	it('снимает атрибуты, когда набор перестал их содержать', async () => {
		const el = mountButton('<so-button tag="div"></so-button>')

		expect(root(el).getAttribute('tabindex')).toBe('0')
		expect(root(el).getAttribute('data-disabled')).toBe('false')

		el.disabled = true
		await flush()

		// tabindex ушёл из набора — значит должен исчезнуть и из DOM
		expect(root(el).hasAttribute('tabindex')).toBe(false)
		expect(root(el).getAttribute('aria-disabled')).toBe('true')
		// dataset привязан к смене пропа, а не только к первой отрисовке
		expect(root(el).getAttribute('data-disabled')).toBe('true')
	})
})

describe('<so-button> · слоты', () => {
	it('шаблон объявляет ровно те слоты, что и дескриптор', () => {
		const targets = buttonTemplate.create(document.createElement('button'))

		// Contract conformance: имена в шаблоне и в дескрипторе обязаны совпадать
		expect(Object.keys(targets).sort()).toEqual(
			ButtonDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})

	it('содержимое без атрибута slot попадает в слот по умолчанию', () => {
		const el = mount('<so-button text="ignored"><b>Custom</b></so-button>')

		expect(root(el).querySelector('.s-button__text')?.textContent).toBe('Custom')
	})

	it('slot="leading" ставится перед текстом, slot="trailing" — после', () => {
		const el = mount(
			'<so-button text="Mid"><i slot="leading">L</i><i slot="trailing">T</i></so-button>',
		)

		const children = Array.from(root(el).children).map((node) => node.textContent)

		// Порядок в DOM важнее наличия: иконка «до» обязана быть до текста
		expect(children).toEqual(['L', 'Mid', 'T'])
	})

	it('именованные слоты не подавляют текст из props', () => {
		const el = mount('<so-button text="Hello"><i slot="leading">L</i></so-button>')

		// Только содержимое слота default переопределяет text
		expect(root(el).querySelector('.s-button__text')?.textContent).toBe('Hello')
	})

	it('содержимое переживает пересоздание корня при смене tag', async () => {
		const el = mountButton('<so-button><i slot="leading">L</i>Text</so-button>')

		el.tag = 'a'
		await flush()

		expect(root(el).tagName.toLowerCase()).toBe('a')
		expect(Array.from(root(el).children).map((n) => n.textContent)).toEqual(['L', 'Text'])
	})
})
