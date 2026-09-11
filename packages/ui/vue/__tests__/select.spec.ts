/**
 * Select в разметке — проверка проводки целиком.
 *
 * Юнит-тесты ядра и плагинов проверяют механизмы по отдельности; здесь важно,
 * что они сходятся: опции регистрируются через элеватор, панель телепортируется
 * и остаётся связанной с полем, ARIA собирается в один набор.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

/**
 * `TElementPlugin` отдаёт элемент через `requestAnimationFrame`, поэтому
 * плагины, которым нужен DOM-узел, включаются кадром позже. Ждём кадр.
 */
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))
import { Select, SelectItem, propsSelect } from '@soldy/ui-vue'
import Harness from './Select.test.vue'

/**
 * Панель телепортируется в body, поэтому размонтировать обёртку обязательно:
 * иначе панели предыдущих тестов остаются в документе и следующий видит
 * чужие опции.
 */
let wrapper: ReturnType<typeof mount> | null = null

const render = (props: Record<string, unknown> = {}) => {
	wrapper = mount(Harness, { props, attachTo: document.body })

	return wrapper
}

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Панель телепортируется в body, поэтому ищем её по документу. */
const panel = () => document.querySelector('[role="listbox"]')

/** Открыта ли панель. Она всегда в DOM — скрывается через display: none. */
const isOpen = () => {
	const frame = document.querySelector('.s-select__panel') as HTMLElement | null

	return !!frame && frame.style.display !== 'none'
}
const options = () => [...document.querySelectorAll('[role="option"]')]

describe('составной компонент', () => {
	it('Select.Item === SelectItem', () => {
		expect(Select.Item).toBe(SelectItem)
	})
})

describe('поле', () => {
	it('объявлено как combobox и свёрнуто', () => {
		const field = render().find('input')

		expect(field.attributes('role')).toBe('combobox')
		expect(field.attributes('aria-expanded')).toBe('false')
		expect(field.attributes('aria-haspopup')).toBe('listbox')
	})

	it('required пробрасывается в aria-required на combobox', () => {
		const field = render({ required: true }).find('input')

		expect(field.attributes('aria-required')).toBe('true')
	})

	it('без required атрибута нет', () => {
		const field = render().find('input')

		expect(field.attributes('aria-required')).toBeUndefined()
	})

	it('пока закрыто, панель скрыта — но остаётся в документе', () => {
		// Убери её через v-if — и закрытие вычистило бы опции из коллекции,
		// а вместе с ними значение поля
		render()

		expect(panel()).not.toBeNull()
		expect(isOpen()).toBe(false)
	})

	it('клик открывает панель', async () => {
		const wrapper = render()

		await wrapper.find('input').trigger('click')
		await nextTick()
		await nextTick()

		expect(wrapper.find('input').attributes('aria-expanded')).toBe('true')
		expect(isOpen()).toBe(true)
	})

	it('ссылается на список — и список этот id носит', async () => {
		const wrapper = render()

		await wrapper.find('input').trigger('click')
		await nextTick()

		expect(wrapper.find('input').attributes('aria-controls')).toBe(panel()!.id)
	})
})

describe('опции', () => {
	it('попадают в коллекцию через элеватор и получают роль', async () => {
		const wrapper = render()

		await wrapper.find('input').trigger('click')
		await nextTick()

		expect(options()).toHaveLength(3)
	})

	it('aria-selected стоит на всех, а не только на выбранной', async () => {
		const wrapper = render()

		await wrapper.find('input').trigger('click')
		await nextTick()

		expect(options().every((o) => o.hasAttribute('aria-selected'))).toBe(true)
	})

	it('клик по опции выбирает её и закрывает панель', async () => {
		const wrapper = render()

		await wrapper.find('input').trigger('click')
		await nextTick()
		;(options()[1] as HTMLElement).click()
		await nextTick()

		expect(wrapper.find('input').element.value).toBe('Тверь')
		expect(wrapper.find('input').attributes('aria-expanded')).toBe('false')
	})

	it('состояние для темы идёт через data-*, а не через aria', async () => {
		const wrapper = render()

		await wrapper.find('input').trigger('click')
		await nextTick()
		;(options()[0] as HTMLElement).click()
		await wrapper.find('input').trigger('click')
		await nextTick()

		expect(options()[0].getAttribute('data-selected')).toBe('true')
		expect(options()[1].getAttribute('data-selected')).toBe('false')
	})

	/**
	 * Фон hover/подсветки рисует `.s-button` через общий `button-state-bg`
	 * темы, а не опция сама: миксин читает `data-highlighted`/`data-selected`
	 * с самой кнопки, поэтому набор обязан доехать и туда, не только на
	 * обёртку опции. Тот же приём, что у `ListBoxItem`.
	 */
	it('data-selected и вид кнопки доезжают до .s-button опции', async () => {
		const wrapper = render()

		await wrapper.find('input').trigger('click')
		await nextTick()
		;(options()[0] as HTMLElement).click()
		await wrapper.find('input').trigger('click')
		await nextTick()

		const button = options()[0].querySelector('.s-button') as HTMLElement

		expect(button.getAttribute('data-selected')).toBe('true')
		expect(button.className).toContain('s-button--a-plain')
	})
})

describe('кнопка очистки', () => {
	it('без clearable её нет', () => {
		expect(render().find('.s-select__clear').exists()).toBe(false)
	})

	it('имя собрано с именем поля', () => {
		const clear = render({ clearable: true }).find('.s-select__clear')

		expect(clear.attributes('aria-label')).toBe('Clear Город')
	})
})

describe('множественный выбор', () => {
	it('список помечен как multiselectable', async () => {
		const wrapper = render({ mode: 'multiple' })

		await wrapper.find('input').trigger('click')
		await nextTick()

		expect(panel()!.getAttribute('aria-multiselectable')).toBe('true')
	})

	it('в одиночном режиме пометки нет', async () => {
		const wrapper = render()

		await wrapper.find('input').trigger('click')
		await nextTick()

		expect(panel()!.hasAttribute('aria-multiselectable')).toBe(false)
	})

	/**
	 * Теги — второй компонент внутри поля (`TSelectTagsExtension`), а не
	 * разметка: связка «опция ⇄ тег» иначе повторилась бы в шести адаптерах.
	 */
	it('выбор рисует тег в поле, а не текст', async () => {
		const wrapper = render({ mode: 'multiple' })

		await wrapper.find('input').trigger('click')
		await nextTick()
		;(options()[0] as HTMLElement).click()
		await nextTick()

		expect(wrapper.find('input').element.value).toBe('')

		const tags = document.querySelectorAll('.s-tags-item')

		expect(tags).toHaveLength(1)
		expect(tags[0].textContent).toContain('Москва')
	})

	it('закрытие тега снимает выбор с опции', async () => {
		const wrapper = render({ mode: 'multiple' })

		await wrapper.find('input').trigger('click')
		await nextTick()
		;(options()[0] as HTMLElement).click()
		await nextTick()
		;(document.querySelector('.s-tags-item__close') as HTMLElement).click()
		await nextTick()

		expect(document.querySelectorAll('.s-tags-item')).toHaveLength(0)

		await wrapper.find('input').trigger('click')
		await nextTick()

		expect(options()[0].getAttribute('aria-selected')).toBe('false')
	})

	it('в single тегов в поле нет', () => {
		render()

		expect(document.querySelectorAll('.s-tags-item')).toHaveLength(0)
	})
})

describe('панель как телепортированный Frame', () => {
	it('класс и data-* доезжают до узла, а не теряются в телепорте', async () => {
		// Корень шаблона Frame — <teleport>, и Vue считает корневым узлом его.
		// Без ручного переноса атрибутов сюда не доходили ни класс, ни метка
		// владельца, по которой dismiss отличает нажатие внутрь панели
		const wrapper = render()

		await wrapper.find('input').trigger('click')
		await nextTick()

		const frame = document.querySelector('.s-select__panel')

		expect(frame).not.toBeNull()
		expect(frame!.hasAttribute('data-owner')).toBe(true)
	})

	it('нажатие внутрь панели её не закрывает', async () => {
		// Панель вне поддерева владельца, поэтому одного contains() мало —
		// её метка владельца и есть вторая граница
		const wrapper = render()

		await wrapper.find('.s-select').trigger('click')
		await nextTick()
		await nextTick()

		await nextFrame()

		const option = document.querySelector('[role="option"]')!

		option.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
		await nextTick()

		expect(isOpen()).toBe(true)
	})

	it('нажатие мимо закрывает', async () => {
		const wrapper = render()

		await wrapper.find('.s-select').trigger('click')
		await nextTick()
		await nextTick()

		await nextFrame()

		document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
		await nextTick()
		await nextTick()

		expect(isOpen()).toBe(false)
	})
})

describe('id поля', () => {
	it('по умолчанию непустой — ядро берёт uid', () => {
		expect(render().find('input').attributes('id')).toBeTruthy()
	})

	it('заданный снаружи доходит до внутреннего input', async () => {
		// Он нужен потребителю для <label for> и aria-labelledby, поэтому
		// должен быть предсказуемым, а не производным от внутреннего uid
		const wrapper = mount(Harness, { props: { id: 'city' }, attachTo: document.body })

		expect(wrapper.find('input').attributes('id')).toBe('city')

		wrapper.unmount()
	})
})

describe('слоты поля', () => {
	const withSlots = (slots: Record<string, string>) =>
		mount(Select, { props: { name: 'Город' }, slots, attachTo: document.body })

	it('leading и trailing пробрасываются в Input', () => {
		// Свои слоты Select не заводит: у Input они уже есть, и второй способ
		// делать то же самое разошёлся бы с первым
		const wrapper = withSlots({
			leading: '<i class="probe-leading" />',
			trailing: '<i class="probe-trailing" />',
		})

		expect(wrapper.find('.s-input__leading .probe-leading').exists()).toBe(true)
		expect(wrapper.find('.s-input__trailing .probe-trailing').exists()).toBe(true)

		wrapper.unmount()
	})

	it('стрелка заменяется через arrow-icon', () => {
		const wrapper = withSlots({ 'arrow-icon': '<i class="probe-arrow" />' })

		expect(wrapper.find('.probe-arrow').exists()).toBe(true)

		wrapper.unmount()
	})

	it('подменённая стрелка остаётся внутри носителя состояния', () => {
		// Класс на обёртке, а не на иконке: иначе поворот при открытии
		// молча перестал бы работать для пользовательской иконки
		const wrapper = withSlots({ 'arrow-icon': '<i class="probe-arrow" />' })

		expect(wrapper.find('.s-select__arrow .probe-arrow').exists()).toBe(true)

		wrapper.unmount()
	})

	it('trailing дополняет кнопку очистки и стрелку, а не заменяет их', () => {
		const wrapper = mount(Select, {
			props: { name: 'Город', clearable: true },
			slots: { trailing: '<i class="probe-trailing" />' },
			attachTo: document.body,
		})

		expect(wrapper.find('.s-select__clear').exists()).toBe(true)
		expect(wrapper.find('.s-select__arrow').exists()).toBe(true)
		expect(wrapper.find('.probe-trailing').exists()).toBe(true)

		wrapper.unmount()
	})
})

/**
 * Списочные свойства Select — та же тройка, что у ListBox.
 *
 * Общего предка у них нет и быть не может: `TInputControl` в предках уже занят.
 * Общий только контракт `IList`, реализация у каждого своя. Проверяется здесь
 * проводка целиком: проп в разметке доезжает до DOM панели и опций.
 */
describe('списочные свойства', () => {
	it('объявлены как собственные пропы компонента', () => {
		const declared = Object.keys(propsSelect)

		for (const prop of ['maxRows', 'contentFit', 'scrollBehavior']) {
			expect(declared).toContain(prop)
		}
	})

	/**
	 * `contentFit` приезжает атрибутом на каждую опцию — шаблон этого правила
	 * не знает и потому не повторяет его в шести адаптерах.
	 */
	it('contentFit доезжает до data-content-fit каждой опции', async () => {
		render({ contentFit: 'wrap' })
		await nextTick()
		await nextFrame()

		expect(options().map((el) => el.getAttribute('data-content-fit'))).toEqual([
			'wrap',
			'wrap',
			'wrap',
		])
	})

	it('по умолчанию опции обрезают текст', async () => {
		render()
		await nextTick()
		await nextFrame()

		expect(options()[0].getAttribute('data-content-fit')).toBe('truncate')
	})

	/**
	 * `expand` снимает подгонку панели под ширину поля: ширину держит плагин
	 * якоря, а не CSS, и выражение `contentFit !== 'expand'` вычисляет ядро.
	 */
	it('expand отвязывает ширину панели от поля', () => {
		const autoFit = (contentFit?: string) =>
			render(contentFit ? { contentFit } : {}).findComponent(Select).vm.autoFitWidth

		expect(autoFit('expand')).toBe(false)

		wrapper?.unmount()
		document.body.innerHTML = ''

		expect(autoFit()).toBe(true)
	})

	/**
	 * `maxRows = 0` (по умолчанию) — предела нет, и плагин обязан ничего не
	 * писать: потолок панели задаёт тема (`.s-select__list { max-h-64 }`), а
	 * инлайновый стиль класс перебивает.
	 */
	it('без maxRows высота панели остаётся за темой', async () => {
		render()
		await nextTick()
		await nextFrame()
		await nextFrame()

		const list = document.querySelector('.s-select__list') as HTMLElement

		expect(list.style.maxHeight).toBe('')
	})

	/**
	 * Frame по умолчанию не навязывает панели пиксельную высоту — иначе список
	 * с одной опцией открывался бы на высоту нескольких.
	 */
	it('панель не получает инлайновый height в пикселях', async () => {
		render()
		await nextTick()
		await nextFrame()

		const panelEl = document.querySelector('.s-select__panel') as HTMLElement

		expect(panelEl.style.height).toBe('auto')
	})
})

describe('отступ панели от поля', () => {
	it('панель получает offset якоря — координата ниже нижнего края поля', async () => {
		const wrapper = render()

		await wrapper.find('input').trigger('click')
		await nextTick()
		await nextFrame()

		const field = wrapper.find('.s-select').element as HTMLElement
		const panelEl = document.querySelector('.s-select__panel') as HTMLElement

		const fieldBottom = field.getBoundingClientRect().bottom
		const panelTop = parseFloat(panelEl.style.top || '0')

		expect(panelTop).toBeGreaterThanOrEqual(fieldBottom)
	})
})
