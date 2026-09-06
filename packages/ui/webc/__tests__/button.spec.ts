import { describe, it, expect, afterEach } from 'vitest'
import { TButton } from '@soldy/core'
import '@soldy/ui-webc'

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

function mount(html: string): HTMLElement {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)

	return host.firstElementChild as HTMLElement
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
	})

	it('на не-button теге disabled уходит в aria-disabled', () => {
		const el = mount('<soldy-button tag="a" disabled></soldy-button>')

		expect(root(el).tagName.toLowerCase()).toBe('a')
		expect(root(el).getAttribute('aria-disabled')).toBe('true')
		expect(root(el).hasAttribute('disabled')).toBe(false)
	})

	it('содержимое тега переопределяет text', () => {
		const el = mount('<soldy-button text="ignored"><b>Custom</b></soldy-button>')

		expect(root(el).querySelector('.s-button__text')?.textContent).toBe('Custom')
	})
})

describe('<soldy-button> · свойства из JS', () => {
	it('смена свойства перерисовывает', async () => {
		const el = mount('<soldy-button text="A"></soldy-button>') as any

		el.text = 'B'
		await flush()

		expect(root(el).querySelector('.s-button__text')?.textContent).toBe('B')
	})

	it('смена tag пересоздаёт корневой элемент', async () => {
		const el = mount('<soldy-button></soldy-button>') as any

		expect(root(el).tagName.toLowerCase()).toBe('button')

		el.tag = 'span'
		await flush()

		expect(root(el).tagName.toLowerCase()).toBe('span')
	})

	it('rendered=false убирает корень, visible=false прячет', async () => {
		const el = mount('<soldy-button></soldy-button>') as any

		el.visible = false
		await flush()
		expect(root(el).style.display).toBe('none')

		el.rendered = false
		await flush()
		expect(el.firstElementChild).toBeNull()
	})
})

describe('<soldy-button> · внешний ctrl', () => {
	it('отражает состояние инстанса и реагирует на его мутации', async () => {
		const ctrl = new TButton({ text: 'FromCtrl', variant: 'accent' })
		const el = document.createElement('soldy-button') as any

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
		const el = document.createElement('soldy-button') as any
		const seen: unknown[] = []

		el.ctrl = ctrl
		el.addEventListener('change:view', (e: Event) => seen.push((e as CustomEvent).detail))
		document.body.appendChild(el)

		ctrl.view = 'plain'

		expect(seen).toEqual(['plain'])
	})

	it('change:visible не дублируется (дедупликация триггеров)', () => {
		const ctrl = new TButton()
		const el = document.createElement('soldy-button') as any
		const seen: unknown[] = []

		el.ctrl = ctrl
		el.addEventListener('change:visible', (e: Event) => seen.push((e as CustomEvent).detail))
		document.body.appendChild(el)

		ctrl.hide()

		expect(seen).toHaveLength(1)
	})

	it('событие всплывает наружу', () => {
		const ctrl = new TButton()
		const el = document.createElement('soldy-button') as any
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
		const count = () => (ctrl.events as any)._items._items.get('change:text')?.size ?? 0

		const el = document.createElement('soldy-button') as any

		el.ctrl = ctrl
		document.body.appendChild(el)

		expect(count()).toBeGreaterThan(0)

		el.remove()

		expect(count()).toBe(0)
	})
})
