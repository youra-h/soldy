import { describe, it, expect, afterEach, vi } from 'vitest'
import { TButton } from '@soldy/core'
import { ButtonDescriptor } from '@soldy/setup'
import { buttonTemplate } from '../src/components/button/button.template'
import '@soldy/ui-webc'

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

function mount(html: string): HTMLElement {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)

	return host.firstElementChild as HTMLElement
}

/** `<soldy-button>` из разметки — с props дескриптора (тип из HTMLElementTagNameMap). */
function mountButton(html: string): HTMLElementTagNameMap['soldy-button'] {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)

	const el = host.querySelector('soldy-button')

	if (!el) throw new Error('<soldy-button> не смонтирован')

	return el
}

function root(el: HTMLElement): HTMLElement {
	return el.firstElementChild as HTMLElement
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('<soldy-button> · атрибуты', () => {
	it('по умолчанию рендерит внутренний <button> с базовыми классами', () => {
		const el = mount('<soldy-button></soldy-button>')

		expect(root(el).tagName.toLowerCase()).toBe('button')
		expect(root(el).className).toContain('s-button')
		expect(root(el).className).toContain('s-button--a-filled')
	})

	it('читает text и классы из атрибутов', () => {
		const el = mount(
			'<soldy-button text="Hello" variant="accent" size="xl" view="plain"></soldy-button>',
		)

		expect(root(el).querySelector('.s-button__text')?.textContent).toBe('Hello')
		expect(root(el).className).toContain('s-button--size-xl')
		expect(root(el).className).toContain('s-button--accent')
		expect(root(el).className).toContain('s-button--a-plain')
	})

	it('boolean-атрибут работает по HTML-семантике (важно наличие)', () => {
		const el = mount('<soldy-button disabled></soldy-button>')

		expect(root(el).hasAttribute('disabled')).toBe(true)
		expect(root(el).getAttribute('data-disabled')).toBe('true')
	})

	it('на не-button теге disabled уходит в aria-disabled', () => {
		const el = mount('<soldy-button tag="a" disabled></soldy-button>')

		expect(root(el).tagName.toLowerCase()).toBe('a')
		expect(root(el).getAttribute('aria-disabled')).toBe('true')
		expect(root(el).hasAttribute('disabled')).toBe(false)
		expect(root(el).getAttribute('data-disabled')).toBe('true')
	})

	it('fieldset тоже нативный тег — атрибут disabled, без aria-disabled', () => {
		const el = mount('<soldy-button tag="fieldset" disabled></soldy-button>')

		expect(root(el).tagName.toLowerCase()).toBe('fieldset')
		expect(root(el).hasAttribute('disabled')).toBe(true)
		expect(root(el).hasAttribute('aria-disabled')).toBe(false)
		expect(root(el).getAttribute('data-disabled')).toBe('true')
	})

	/** Тема смотрит `[data-disabled='true']`: «выключено» — строка, а не пропавший атрибут. */
	it('без disabled data-disabled="false"', () => {
		const el = mount('<soldy-button></soldy-button>')

		expect(root(el).getAttribute('data-disabled')).toBe('false')
	})

	it('содержимое тега переопределяет text', () => {
		const el = mount('<soldy-button text="ignored"><b>Custom</b></soldy-button>')

		expect(root(el).querySelector('.s-button__text')?.textContent).toBe('Custom')
	})

	it('direction ставит атрибут dir на корень', () => {
		const el = mount('<soldy-button direction="rtl"></soldy-button>')

		expect(root(el).getAttribute('dir')).toBe('rtl')
	})

	it('без direction атрибут dir не выставляется (наследуется)', () => {
		const el = mount('<soldy-button></soldy-button>')

		expect(root(el).hasAttribute('dir')).toBe(false)
	})
})

describe('<soldy-button> · свойства из JS', () => {
	it('смена свойства перерисовывает', async () => {
		const el = mountButton('<soldy-button text="A"></soldy-button>')

		el.text = 'B'
		await flush()

		expect(root(el).querySelector('.s-button__text')?.textContent).toBe('B')
	})

	it('смена tag пересоздаёт корневой элемент', async () => {
		const el = mountButton('<soldy-button></soldy-button>')

		expect(root(el).tagName.toLowerCase()).toBe('button')

		el.tag = 'span'
		await flush()

		expect(root(el).tagName.toLowerCase()).toBe('span')
	})

	it('rendered=false убирает корень, visible=false прячет', async () => {
		const el = mountButton('<soldy-button></soldy-button>')

		el.visible = false
		await flush()
		expect(root(el).style.display).toBe('none')

		el.rendered = false
		await flush()
		expect(el.firstElementChild).toBeNull()
	})

	it('смена direction обновляет и снимает атрибут dir', async () => {
		const el = mountButton('<soldy-button></soldy-button>')

		el.direction = 'rtl'
		await flush()
		expect(root(el).getAttribute('dir')).toBe('rtl')

		// возврат в 'inherit' снимает атрибут (в отличие от undefined это
		// конкретное значение, которое доходит до ядра)
		el.direction = 'inherit'
		await flush()
		expect(root(el).hasAttribute('dir')).toBe(false)
	})
})

describe('<soldy-button> · точечные обновления', () => {
	/**
	 * Проверка через побочный маркер: если база переписывает className, чужой
	 * класс исчезнет. Значит его выживание доказывает, что привязка className
	 * не применялась.
	 */
	it('смена text не переписывает className', async () => {
		const el = mountButton('<soldy-button text="A"></soldy-button>')

		root(el).classList.add('marker')

		el.text = 'B'
		await flush()

		expect(root(el).querySelector('.s-button__text')?.textContent).toBe('B')
		expect(root(el).classList.contains('marker')).toBe(true)
	})

	it('смена variant переписывает className', async () => {
		const el = mountButton('<soldy-button></soldy-button>')

		root(el).classList.add('marker')

		el.variant = 'accent'
		await flush()

		expect(root(el).className).toContain('s-button--accent')
		expect(root(el).classList.contains('marker')).toBe(false)
	})

	it('пересоздание корня применяет все привязки заново', async () => {
		const el = mountButton('<soldy-button text="Hi" disabled></soldy-button>')

		el.tag = 'a'
		await flush()

		// Новый корень пуст, поэтому текст и disabled должны примениться целиком
		expect(root(el).tagName.toLowerCase()).toBe('a')
		expect(root(el).querySelector('.s-button__text')?.textContent).toBe('Hi')
		expect(root(el).getAttribute('aria-disabled')).toBe('true')
		expect(root(el).getAttribute('data-disabled')).toBe('true')
	})
})

describe('<soldy-button> · внешний ctrl', () => {
	it('отражает состояние инстанса и реагирует на его мутации', async () => {
		const ctrl = new TButton({ text: 'FromCtrl', variant: 'accent' })
		const el = document.createElement('soldy-button')

		el.ctrl = ctrl
		document.body.appendChild(el)

		expect(root(el).querySelector('.s-button__text')?.textContent).toBe('FromCtrl')
		expect(root(el).className).toContain('s-button--accent')

		ctrl.text = 'Changed'
		await flush()

		expect(root(el).querySelector('.s-button__text')?.textContent).toBe('Changed')
	})
})

describe('<soldy-button> · события', () => {
	it('диспатчит CustomEvent с именем как в ядре', async () => {
		const ctrl = new TButton({ view: 'filled' })
		const el = document.createElement('soldy-button')
		const seen: unknown[] = []

		el.ctrl = ctrl
		el.addEventListener('change:view', (e: Event) => seen.push((e as CustomEvent).detail))
		document.body.appendChild(el)

		ctrl.view = 'plain'

		expect(seen).toEqual(['plain'])
	})

	it('change:visible не дублируется (дедупликация триггеров)', () => {
		const ctrl = new TButton()
		const el = document.createElement('soldy-button')
		const seen: unknown[] = []

		el.ctrl = ctrl
		el.addEventListener('change:visible', (e: Event) => seen.push((e as CustomEvent).detail))
		document.body.appendChild(el)

		ctrl.hide()

		expect(seen).toHaveLength(1)
	})

	it('событие всплывает наружу', () => {
		const ctrl = new TButton()
		const el = document.createElement('soldy-button')
		let heard = false

		el.ctrl = ctrl
		document.body.addEventListener('change:visible', () => (heard = true), { once: true })
		document.body.appendChild(el)

		ctrl.hide()

		expect(heard).toBe(true)
	})
})

describe('<soldy-button> · очистка', () => {
	it('снимает подписки с внешнего ctrl при удалении из DOM', () => {
		const ctrl = new TButton()
		// Подписки считаются по публичному API шины: подписались на change:text
		// минус отписались
		const on = vi.spyOn(ctrl.events, 'on')
		const off = vi.spyOn(ctrl.events, 'off')
		const count = () =>
			on.mock.calls.filter(([event]) => event === 'change:text').length -
			off.mock.calls.filter(([event]) => event === 'change:text').length

		const el = document.createElement('soldy-button')

		el.ctrl = ctrl
		document.body.appendChild(el)

		expect(count()).toBeGreaterThan(0)

		el.remove()

		expect(count()).toBe(0)
	})
})

describe('<soldy-button> · aria из ядра', () => {
	it('на нативной кнопке лишних атрибутов нет', () => {
		const el = mount('<soldy-button disabled></soldy-button>')

		expect(root(el).hasAttribute('disabled')).toBe(true)
		expect(root(el).hasAttribute('role')).toBe(false)
		expect(root(el).hasAttribute('tabindex')).toBe(false)
		expect(root(el).hasAttribute('aria-disabled')).toBe(false)
	})

	it('на не-нативном теге появляются role и aria-disabled', () => {
		const el = mount('<soldy-button tag="div" disabled></soldy-button>')

		expect(root(el).getAttribute('role')).toBe('button')
		expect(root(el).getAttribute('aria-disabled')).toBe('true')
		expect(root(el).hasAttribute('tabindex')).toBe(false)
	})

	it('снимает атрибуты, когда набор перестал их содержать', async () => {
		const el = mountButton('<soldy-button tag="div"></soldy-button>')

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

describe('<soldy-button> · слоты', () => {
	it('шаблон объявляет ровно те слоты, что и дескриптор', () => {
		const targets = buttonTemplate.create(document.createElement('button'))

		// Contract conformance: имена в шаблоне и в дескрипторе обязаны совпадать
		expect(Object.keys(targets).sort()).toEqual(
			ButtonDescriptor()
				.getSlots()
				.map((slot) => slot.name)
				.sort(),
		)
	})

	it('содержимое без атрибута slot попадает в слот по умолчанию', () => {
		const el = mount('<soldy-button text="ignored"><b>Custom</b></soldy-button>')

		expect(root(el).querySelector('.s-button__text')?.textContent).toBe('Custom')
	})

	it('slot="leading" ставится перед текстом, slot="trailing" — после', () => {
		const el = mount(
			'<soldy-button text="Mid"><i slot="leading">L</i><i slot="trailing">T</i></soldy-button>',
		)

		const children = Array.from(root(el).children).map((node) => node.textContent)

		// Порядок в DOM важнее наличия: иконка «до» обязана быть до текста
		expect(children).toEqual(['L', 'Mid', 'T'])
	})

	it('именованные слоты не подавляют текст из props', () => {
		const el = mount('<soldy-button text="Hello"><i slot="leading">L</i></soldy-button>')

		// Только содержимое слота default переопределяет text
		expect(root(el).querySelector('.s-button__text')?.textContent).toBe('Hello')
	})

	it('содержимое переживает пересоздание корня при смене tag', async () => {
		const el = mountButton('<soldy-button><i slot="leading">L</i>Text</soldy-button>')

		el.tag = 'a'
		await flush()

		expect(root(el).tagName.toLowerCase()).toBe('a')
		expect(Array.from(root(el).children).map((n) => n.textContent)).toEqual(['L', 'Text'])
	})
})
