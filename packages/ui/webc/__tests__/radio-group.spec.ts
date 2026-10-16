/**
 * RadioGroup под Web Components: нативные радио и проводка наборов.
 *
 * Сценарии — те же, что у Angular (`radio-group.spec.ts`), React и Vue, без
 * сервера. Радио — `input[type=radio]` внутри корня-`label`. Группу для
 * браузера собирает общий `name`, который раздаёт плагин группы; отметку
 * сообщает нативный `checked`, выключенность — нативный `disabled`.
 * ARIA-дублей у поля нет, а состояние для темы лежит на корне
 * (`data-selected`, `data-disabled`).
 *
 * Своё у Web Components — разметка. Корень радио — элемент потребителя
 * (`<label is="so-radio-group-item">`), а атрибуты потребителя делятся, как у
 * поля: класс и стиль — корню, остальное — `<input>`. Выбор пользователя
 * приходит `change` поля: в jsdom клик по радио отмечает его и шлёт `change`,
 * как браузер. Отрисовка — микрозадачей после смены ядра.
 *
 * Клавиатуру группы (стрелки, пропуск выключенных, одну остановку Tab) jsdom
 * не выполняет — её проверяет `playground/vue/browser/webc-collections.spec.ts`.
 */

import { describe, it, expect, expectTypeOf, afterEach } from 'vitest'
import { TRadioGroup, createEngineRadioGroup, type TValuePayload } from '@soldy-ui/core'
import { RadioGroupDescriptor, RadioGroupItemDescriptor } from '@soldy-ui/setup'
import {
	TRadioGroupElement,
	TRadioGroupItemElement,
	type TRadioGroupElementProps,
	type TRadioGroupItemElementProps,
} from '@soldy-ui/webc'
import { radioGroupTemplate } from '../src/components/radio-group/radio-group.template'
import { radioGroupItemTemplate } from '../src/components/radio-group/item/radio-group-item.template'
import { bareContext } from './template-context'

/** Отрисовка коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

afterEach(() => {
	document.body.innerHTML = ''
})

function isGroup(node: Element | null): node is TRadioGroupElementProps {
	return node instanceof TRadioGroupElement
}

function isRadio(node: Element | null): node is TRadioGroupItemElementProps {
	return node instanceof TRadioGroupItemElement
}

/** Радио на странице по порядку. */
const radios = (): HTMLInputElement[] =>
	[...document.querySelectorAll('.so-radio-group-item__input')].filter(
		(element): element is HTMLInputElement => element instanceof HTMLInputElement,
	)

/** Радио по значению; нет его — тест падает здесь. */
function radioOf(value: string): HTMLInputElement {
	const radio = radios().find((candidate) => candidate.value === value)

	if (!radio) throw new Error(`радио «${value}» нет`)

	return radio
}

/** Корень радио — `label`, на нём состояние для темы. */
function rootOf(value: string): TRadioGroupItemElementProps {
	const root = radioOf(value).closest('.so-radio-group-item')

	if (!isRadio(root)) throw new Error(`корня радио «${value}» нет`)

	return root
}

/** Значения отмеченных радио — по нативному `checked`. */
const checked = () =>
	radios()
		.filter((radio) => radio.checked)
		.map((radio) => radio.value)

/** Выбор пользователя: браузер отмечает радио по клику и шлёт `change`. */
async function choose(value: string): Promise<void> {
	radioOf(value).click()
	await flush()
}

/** Разметка, подключённая к документу, и её отрисовка. */
async function mount(html: string): Promise<HTMLElement> {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)
	await flush()

	return host
}

/** Группа в разметке; нет её — тест падает здесь. */
function groupIn(host: ParentNode): TRadioGroupElementProps {
	const node = host.querySelector('[is="so-radio-group"]')

	if (!isGroup(node)) throw new Error('<div is="so-radio-group"> нет')

	return node
}

/** Значения `so:change:value` группы — в порядке прихода. */
function collectValues(group: Element): TValuePayload<unknown>[] {
	const seen: TValuePayload<unknown>[] = []

	group.addEventListener('so:change:value', (event) => {
		if (event instanceof CustomEvent && event.target === group) seen.push(event.detail)
	})

	return seen
}

/** Группа с тремя радио и подписями. */
const HARNESS = `<div is="so-radio-group">
	<label is="so-radio-group-item" value="a">Первый</label>
	<label is="so-radio-group-item" value="b">Второй</label>
	<label is="so-radio-group-item" value="c">Третий</label>
</div>`

/** Группа со значением `value`. */
async function mountWith(value?: string): Promise<TRadioGroupElementProps> {
	const group = groupIn(await mount(HARNESS))

	if (value !== undefined) {
		group.value = value
		await flush()
	}

	return group
}

describe('группа для браузера', () => {
	it('корень — role="radiogroup", радио — нативные input[type=radio]', async () => {
		await mount(HARNESS)

		expect(document.querySelector('.so-radio-group')?.getAttribute('role')).toBe('radiogroup')
		expect(radios().map((radio) => radio.type)).toEqual(['radio', 'radio', 'radio'])
	})

	/** Без общего `name` браузер не соберёт радио в группу. */
	it('у всех радио один непустой name', async () => {
		await mount(HARNESS)

		const names = new Set(radios().map((radio) => radio.name))

		expect(names.size).toBe(1)
		expect([...names][0]).not.toBe('')
	})

	it('две группы на странице получают разные name', async () => {
		await mount(`<div is="so-radio-group"><label is="so-radio-group-item" value="a"></label></div>
			<div is="so-radio-group"><label is="so-radio-group-item" value="a"></label></div>`)

		const [first, second] = radios()

		expect(first.name).not.toBe(second.name)
	})

	it('name группы уходит радио', async () => {
		await mount(`<div is="so-radio-group" name="delivery">
			<label is="so-radio-group-item" value="a"></label>
			<label is="so-radio-group-item" value="b"></label>
		</div>`)

		expect(radios().map((radio) => radio.name)).toEqual(['delivery', 'delivery'])
	})

	it('в форме — значение отмеченного радио под name группы', async () => {
		const host = await mount(`<form><div is="so-radio-group" name="delivery" value="b">
			<label is="so-radio-group-item" value="a"></label>
			<label is="so-radio-group-item" value="b"></label>
		</div></form>`)
		const form = host.querySelector('form')

		if (!(form instanceof HTMLFormElement)) throw new Error('формы нет')

		expect([...new FormData(form)]).toEqual([['delivery', 'b']])
	})
})

describe('value ↔ checked', () => {
	it('значение группы отмечает своё радио', async () => {
		await mountWith('b')

		expect(checked()).toEqual(['b'])
	})

	it('смена значения снаружи переносит отметку', async () => {
		const group = await mountWith('a')

		group.value = 'c'
		await flush()

		expect(checked()).toEqual(['c'])
	})

	it('выбор пользователя отдаёт so:change:value', async () => {
		const group = await mountWith('a')
		const values = collectValues(group)

		await choose('c')

		expect(values.at(-1)).toEqual({ newValue: 'c', oldValue: 'a' })
		expect(checked()).toEqual(['c'])
	})

	it('без значения не отмечено ничего', async () => {
		await mount(HARNESS)

		expect(checked()).toEqual([])
	})

	it('радио, с которого отметку сняло значение снаружи, выбирается снова', async () => {
		const group = await mountWith('c')
		const values = collectValues(group)

		group.value = 'a'
		await flush()
		await choose('c')

		expect(values.at(-1)).toEqual({ newValue: 'c', oldValue: 'a' })
		expect(checked()).toEqual(['c'])
		expect(rootOf('c').dataset['selected']).toBe('true')
	})

	/**
	 * Настоящее состояние у потребителя. Радио уходят из группы и при её
	 * снятии, и по одному — это не выбор «ничего», и значение переживает и то
	 * и другое.
	 */
	describe('значение переживает уход радио', () => {
		it('снятие группы не стирает значение её инстанса', async () => {
			const ctrl = new TRadioGroup({ value: 'b' })
			const group = document.createElement('div', { is: 'so-radio-group' })

			if (!isGroup(group)) throw new Error('группы нет')

			group.ctrl = ctrl
			group.innerHTML = `<label is="so-radio-group-item" value="a"></label>
				<label is="so-radio-group-item" value="b"></label>`
			document.body.appendChild(group)
			await flush()

			expect(checked()).toEqual(['b'])

			group.remove()

			expect(ctrl.value).toBe('b')
		})

		it('отмеченное радио ушло и вернулось — значение и отметка на месте', async () => {
			const group = await mountWith('b')
			const second = rootOf('b')
			const place = second.nextSibling

			second.remove()
			await flush()

			expect(group.value).toBe('b')
			expect(checked()).toEqual([])

			group.insertBefore(second, place)
			await flush()

			expect(checked()).toEqual(['b'])
		})
	})
})

/**
 * Приложение вправе отказать в выборе — подписчиком `item:activate:before`.
 * Браузер отмечает нажатое радио и снимает отметку с соседа ещё до `change`, а
 * модель запись не приняла и не сменилась: привязка шаблона пишет отметку
 * только на смену ядра и узел не тронет. Поля к модели возвращает плагин
 * группы.
 */
describe('отменённый выбор', () => {
	/** Группа над движком снаружи с отказом в выборе; отказ включается по ходу теста. */
	async function mountRefusing(on: boolean, value?: string) {
		const engine = createEngineRadioGroup()
		const refuse = { on }

		engine.extensions.activation.events.on('item:activate:before', (event) => {
			if (refuse.on) event.preventDefault()
		})

		const group = document.createElement('div', { is: 'so-radio-group' })

		if (!isGroup(group)) throw new Error('группы нет')

		group.engine = engine
		if (value !== undefined) group.value = value
		group.innerHTML = `<label is="so-radio-group-item" value="a"></label>
			<label is="so-radio-group-item" value="b"></label>`

		const values = collectValues(group)

		document.body.appendChild(group)
		// Слушатель плагина группы встаёт по `ready` — кадром позже
		await nextFrame()

		return { engine, refuse, values }
	}

	it('пустая группа — нажатое радио не остаётся отмеченным', async () => {
		const { engine, values } = await mountRefusing(true)

		await choose('a')

		expect(engine.extensions.activation.activeItem).toBeUndefined()
		expect(checked()).toEqual([])
		expect(values).toEqual([])
	})

	it('отметка возвращается выбранному соседу', async () => {
		const { engine, refuse, values } = await mountRefusing(false, 'b')

		refuse.on = true
		await choose('a')

		expect(engine.extensions.activation.activeItem?.value).toBe('b')
		expect(checked()).toEqual(['b'])
		expect(values).toEqual([])
	})

	it('отказ сняли — клик по тому же радио выбирает его', async () => {
		const { engine, refuse, values } = await mountRefusing(true)

		await choose('a')
		refuse.on = false
		await choose('a')

		expect(values.at(-1)).toEqual({ newValue: 'a', oldValue: undefined })
		expect(engine.extensions.activation.activeItem?.value).toBe('a')
		expect(checked()).toEqual(['a'])
	})
})

describe('выключенное радио', () => {
	it('нативный disabled без aria-disabled', async () => {
		await mount(HARNESS)

		rootOf('b').disabled = true
		await flush()

		expect(radioOf('b').disabled).toBe(true)
		expect(radioOf('b').hasAttribute('aria-disabled')).toBe(false)
		expect(radioOf('a').disabled).toBe(false)
	})

	it('выключенная группа выключает все радио', async () => {
		const group = groupIn(await mount(HARNESS))

		group.disabled = true
		await flush()

		expect(radios().map((radio) => radio.disabled)).toEqual([true, true, true])
		expect(radios().some((radio) => radio.hasAttribute('aria-disabled'))).toBe(false)
	})

	/** ARIA и роль нативного радио — дубли, их нет. */
	it('у радио нет ни role, ни aria-checked', async () => {
		await mountWith('a')

		for (const radio of radios()) {
			expect(radio.hasAttribute('role')).toBe(false)
			expect(radio.hasAttribute('aria-checked')).toBe(false)
		}
	})
})

describe('состояние для темы — на корне радио', () => {
	it('корень — label с data-selected и data-disabled', async () => {
		await mountWith('a')

		rootOf('b').disabled = true
		await flush()

		expect(rootOf('a').tagName).toBe('LABEL')
		expect(rootOf('a').dataset['selected']).toBe('true')
		expect(rootOf('b').dataset['selected']).toBe('false')
		expect(rootOf('b').dataset['disabled']).toBe('true')
		expect(rootOf('a').dataset['disabled']).toBe('false')
	})

	it('отметка переезжает вместе с выбором', async () => {
		await mountWith('a')

		await choose('c')

		expect(rootOf('a').dataset['selected']).toBe('false')
		expect(rootOf('c').dataset['selected']).toBe('true')
	})

	it('вид группы — модификатор корня каждого радио', async () => {
		await mount(`<div is="so-radio-group" view="halo" size="lg">
			<label is="so-radio-group-item" value="a"></label>
		</div>`)

		expect(rootOf('a').classList).toContain('so-radio-group-item--view-halo')
		expect(rootOf('a').classList).toContain('so-radio-group-item--size-lg')
	})

	/**
	 * Группа радио не раскладывает: они стоят где угодно, и номер в коллекции
	 * увёл бы радио по чужому флекс-ряду. У Vue привязки `order` у радио нет.
	 */
	it('места в коллекции на корне нет — радио стоит, где его поставили', async () => {
		await mount(HARNESS)

		expect(radios().map((radio) => rootOf(radio.value).style.order)).toEqual(['', '', ''])
	})

	/**
	 * Размер, вид и имя раздаёт группа, и в разметке радио их не задать: входов
	 * `name`, `size` и `view` у радио нет — ни свойства, ни атрибута.
	 */
	it('name, size и view — не входы радио', () => {
		expectTypeOf<TRadioGroupItemElementProps>().not.toHaveProperty('size')
		expectTypeOf<TRadioGroupItemElementProps>().not.toHaveProperty('view')
		expectTypeOf<TRadioGroupItemElementProps>().toHaveProperty('value')
		expect(TRadioGroupItemElement.observedAttributes).not.toContain('name')
		expect(TRadioGroupItemElement.observedAttributes).not.toContain('size')
		expect(TRadioGroupItemElement.observedAttributes).not.toContain('view')
		expect(TRadioGroupItemElement.observedAttributes).toContain('active')
	})
})

describe('подпись', () => {
	/** Подпись внутри `label` — клик по ней выбирает радио, текст становится именем. */
	it('текст подписи лежит внутри корня-label', async () => {
		await mount(HARNESS)

		expect(rootOf('a').querySelector('.so-radio-group-item__text')?.textContent).toBe('Первый')
	})

	it('клик по подписи выбирает радио', async () => {
		const group = groupIn(await mount(HARNESS))
		const values = collectValues(group)
		const text = rootOf('c').querySelector('.so-radio-group-item__text')

		if (!(text instanceof HTMLElement)) throw new Error('подписи радио «c» нет')

		text.click()
		await flush()

		expect(values.at(-1)).toEqual({ newValue: 'c', oldValue: undefined })
		expect(checked()).toEqual(['c'])
	})

	/**
	 * Пустую обёртку тема прячет по `:empty`: пробельный текст или элемент
	 * вокруг слота сделали бы её непустой.
	 */
	it('без подписи обёртка пуста — ни текста, ни элемента', async () => {
		await mount(`<div is="so-radio-group">
			<label is="so-radio-group-item" value="a" aria_label="Первый"></label>
		</div>`)

		const text = rootOf('a').querySelector('.so-radio-group-item__text')

		expect(text?.childNodes).toHaveLength(0)
		// Имя радио без подписи — на самом поле
		expect(radioOf('a').getAttribute('aria-label')).toBe('Первый')
	})

	/** Атрибуты разметки радио — полю: подпись снаружи ссылается на него через `for`. */
	it('id, aria-label и data-* разметки — на поле, класс и стиль — на корне', async () => {
		await mount(`<div is="so-radio-group">
			<label
				is="so-radio-group-item"
				id="pick-a"
				value="a"
				class="mine"
				style="color: red"
				aria-label="Первый"
				data-testid="radio-a"
			></label>
		</div>`)

		expect(radioOf('a').id).toBe('pick-a')
		expect(radioOf('a').getAttribute('aria-label')).toBe('Первый')
		expect(radioOf('a').dataset['testid']).toBe('radio-a')
		expect(rootOf('a').id).toBe('')
		expect(rootOf('a').classList.contains('mine')).toBe(true)
		expect(rootOf('a').style.color).toBe('red')
		expect(radioOf('a').classList.contains('mine')).toBe(false)
		expect(radioOf('a').hasAttribute('style')).toBe(false)
	})

	/** Слушатель `change` потребителя на радио слышит выбор после группы. */
	it('change потребителя — после выбора', async () => {
		const group = groupIn(
			await mount(
				`<div is="so-radio-group"><label is="so-radio-group-item" value="a"></label></div>`,
			),
		)
		const order: string[] = []

		group.addEventListener('so:change:value', () => order.push('группа'))
		rootOf('a').addEventListener('change', () => order.push('потребитель'))
		await choose('a')

		expect(order).toEqual(['группа', 'потребитель'])
	})

	/**
	 * Радио из данных подписывает образец `item` группы: scope у слотов Web
	 * Components нет, и копию одного образца получает каждое радио — в свою
	 * подпись. Данные копия берёт у радио (`el.ctrl`).
	 */
	it('радио из items подписывает копия образца item', async () => {
		const group = document.createElement('div', { is: 'so-radio-group' })

		if (!isGroup(group)) throw new Error('группы нет')

		group.items = [{ value: 'a' }, { value: 'b' }]
		group.value = 'b'
		group.innerHTML = '<template slot="item">Вариант</template>'
		document.body.appendChild(group)
		await flush()

		expect(
			[...document.querySelectorAll('.so-radio-group-item__text')].map((text) =>
				text.textContent?.trim(),
			),
		).toEqual(['Вариант', 'Вариант'])
		expect(checked()).toEqual(['b'])
		expect(group.querySelector('template')).toBeNull()
	})
})

describe('группа имени', () => {
	it('aria_label группы — на корне с ролью radiogroup', async () => {
		await mount(`<div is="so-radio-group" aria_label="Доставка">
			<label is="so-radio-group-item" value="a"></label>
		</div>`)

		expect(document.querySelector('[role="radiogroup"]')?.getAttribute('aria-label')).toBe(
			'Доставка',
		)
	})
})

describe('шаблоны объявляют ровно те слоты, что и дескрипторы', () => {
	it.each([
		['RadioGroup', radioGroupTemplate, RadioGroupDescriptor, 'div'],
		['RadioGroup.Item', radioGroupItemTemplate, RadioGroupItemDescriptor, 'label'],
	] as const)('%s', (_name, template, descriptor, tag) => {
		const root = document.createElement(tag)
		const targets = template.create(root, () => false, bareContext(root)).slots

		expect(Object.keys(targets).sort()).toEqual(
			descriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})
})
