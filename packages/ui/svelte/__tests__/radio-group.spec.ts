/**
 * RadioGroup в Svelte: нативные радио и проводка наборов.
 *
 * Сценарии — те же, что у React (`radio-group.spec.tsx`) и Vue
 * (`radio-group.spec.ts`). Радио — `input[type=radio]` внутри корня-`label`.
 * Группу для браузера собирает общий `name`, который раздаёт плагин группы;
 * отметку сообщает нативный `checked`, выключенность — нативный `disabled`.
 * ARIA-дублей у поля нет, а состояние для темы лежит на корне
 * (`data-selected`, `data-disabled`).
 *
 * Своё у Svelte — выбор пользователя. Он приходит `change` поля, и Svelte
 * отдаёт его обработчику, делегированному корню приложения, — уже после того,
 * как `change` прошёл корень группы, где плагин группы возвращает поля к
 * модели. Модель решает следом, и поле, чья отметка сменилась, Svelte пишет
 * свойством узла. Сервер проверяет `collections.server.spec.ts`.
 *
 * Клавиатуру группы (стрелки, пропуск выключенных, одну остановку Tab) jsdom
 * не выполняет — её проверяет `playground/vue/browser/radio-group.spec.ts`.
 */

import { describe, it, expect, expectTypeOf, vi, afterEach } from 'vitest'
import { flushSync, type ComponentProps } from 'svelte'
import { TRadioGroup, createEngineRadioGroup, type TRadioGroupValue } from '@soldy-ui/core'
import {
	RadioGroup,
	RadioGroupItem,
	type RadioGroupItemProps,
	type RadioGroupProps,
} from '@soldy-ui/svelte'
import type { IRadioGroupItem } from '@soldy-ui/core'
import Harness from './RadioGroup.test.svelte'
import Model from './RadioGroupModel.test.svelte'
import { contentOf, mount, nextFrame } from './mount'
import { reactiveProps } from './reactive-props.svelte'
import { scopeText } from './snippets.svelte'

afterEach(() => {
	vi.restoreAllMocks()
})

/** Радио на странице по порядку. */
const radios = (): HTMLInputElement[] =>
	[...document.querySelectorAll('.s-radio-group-item__input')].filter(
		(element): element is HTMLInputElement => element instanceof HTMLInputElement,
	)

/** Радио по значению; нет его — тест падает здесь. */
function radioOf(value: string): HTMLInputElement {
	const radio = radios().find((candidate) => candidate.value === value)

	if (!radio) throw new Error(`радио «${value}» нет`)

	return radio
}

/** Корень радио — `label`, на нём состояние для темы. */
function rootOf(value: string): HTMLElement {
	const root = radioOf(value).closest('.s-radio-group-item')

	if (!(root instanceof HTMLElement)) throw new Error(`корня радио «${value}» нет`)

	return root
}

/** Значения отмеченных радио — по нативному `checked`. */
const checked = () =>
	radios()
		.filter((radio) => radio.checked)
		.map((radio) => radio.value)

/** Выбор пользователя: браузер отмечает радио по клику и шлёт `change`. */
function choose(value: string): void {
	radioOf(value).click()
	flushSync()
}

/** Подписи радио по порядку. */
const labels = () =>
	[...document.querySelectorAll('.s-radio-group-item__text')].map((text) => text.textContent)

type THarnessProps = ComponentProps<typeof Harness>

/** Scope подписи радио и её проброса. */
type TLabelScope = { active: boolean }
type TItemLabelScope = TLabelScope & { item: IRadioGroupItem }

/**
 * Группа с тремя радио и подписями. `value` — пропом, как значение
 * потребителя; «b» выключается `itemOff`, вся группа — `groupOff`. `engine` —
 * движок снаружи, не дали — группа соберёт свой.
 */
function harness({
	itemOff,
	groupOff,
	...group
}: RadioGroupProps & { itemOff?: boolean; groupOff?: boolean } = {}): THarnessProps {
	return {
		group: { ...group, disabled: groupOff },
		items: [{ value: 'a' }, { value: 'b', disabled: itemOff }, { value: 'c' }],
		labels: { a: 'Первый', b: 'Второй', c: 'Третий' },
	}
}

describe('группа для браузера', () => {
	it('корень — role="radiogroup", радио — нативные input[type=radio]', () => {
		mount(Harness, harness())

		expect(document.querySelector('.s-radio-group')?.getAttribute('role')).toBe('radiogroup')
		expect(radios().map((radio) => radio.type)).toEqual(['radio', 'radio', 'radio'])
	})

	/** Без общего `name` браузер не соберёт радио в группу. */
	it('у всех радио один непустой name', () => {
		mount(Harness, harness())

		const names = new Set(radios().map((radio) => radio.name))

		expect(names.size).toBe(1)
		expect([...names][0]).not.toBe('')
	})

	it('две группы на странице получают разные name', () => {
		mount(Harness, { items: [{ value: 'a' }] })
		mount(Harness, { items: [{ value: 'a' }] })

		const [first, second] = radios()

		expect(first.name).not.toBe(second.name)
	})

	it('name группы уходит радио', () => {
		mount(Harness, { group: { name: 'delivery' }, items: [{ value: 'a' }, { value: 'b' }] })

		expect(radios().map((radio) => radio.name)).toEqual(['delivery', 'delivery'])
	})
})

describe('value ↔ checked', () => {
	it('значение группы отмечает своё радио', () => {
		mount(Harness, harness({ value: 'b' }))

		expect(checked()).toEqual(['b'])
	})

	it('смена значения снаружи переносит отметку', () => {
		const props = reactiveProps(harness({ value: 'a' }))

		mount(Harness, props)

		props.group = harness({ value: 'c' }).group
		flushSync()

		expect(checked()).toEqual(['c'])
	})

	it('выбор пользователя отдаёт onChangeValue', () => {
		const onChangeValue = vi.fn()

		mount(Harness, harness({ value: 'a', onChangeValue }))

		choose('c')

		expect(onChangeValue).toHaveBeenLastCalledWith({ newValue: 'c', oldValue: 'a' })
		expect(checked()).toEqual(['c'])
	})

	it('без значения не отмечено ничего', () => {
		mount(Harness, harness())

		expect(checked()).toEqual([])
	})

	/**
	 * Отметку с радио браузер снимает и сам — когда отмечают соседа. Значение
	 * снаружи переносит отметку на радио, стоящее раньше, — и прежнее радио
	 * обязано выбираться снова.
	 */
	it('радио, с которого отметку сняло значение снаружи, выбирается снова', () => {
		const onChangeValue = vi.fn()
		const props = reactiveProps(harness({ value: 'c', onChangeValue }))

		mount(Harness, props)

		props.group = harness({ value: 'a', onChangeValue }).group
		flushSync()
		choose('c')

		expect(onChangeValue).toHaveBeenLastCalledWith({ newValue: 'c', oldValue: 'a' })
		expect(checked()).toEqual(['c'])
		expect(rootOf('c').dataset.selected).toBe('true')
	})

	/**
	 * Настоящее состояние у потребителя. Радио уходят из группы и при её
	 * снятии, и по условию по одному — это не выбор «ничего», и значение
	 * потребителя переживает и то и другое.
	 */
	describe('значение потребителя переживает уход радио', () => {
		/** Значения потребителя по порядку: последнее — текущее. */
		let picked: TRadioGroupValue[] = []

		const onPick = (value: TRadioGroupValue) => {
			picked.push(value)
		}

		afterEach(() => {
			picked = []
		})

		it('выбор пишет значение потребителя', () => {
			mount(Model, { onPick })

			choose('a')

			expect(picked.at(-1)).toBe('a')
		})

		it('снятие группы не стирает значение', () => {
			const props = reactiveProps<ComponentProps<typeof Model>>({ onPick })

			mount(Model, props)

			props.group = false
			flushSync()

			expect(picked.at(-1)).toBe('b')
		})

		/**
		 * Значение, стёртое при уничтожении, до колбэка потребителя могло и не
		 * дойти. Инстанс снаружи переживает монтирование — по нему видно само
		 * значение.
		 */
		it('снятие группы не стирает значение её инстанса', () => {
			const group = new TRadioGroup({ value: 'b' })
			const props = reactiveProps<THarnessProps>({
				group: { ctrl: group },
				items: [{ value: 'a' }, { value: 'b' }],
			})

			mount(Harness, props)

			expect(checked()).toEqual(['b'])

			props.shown = false
			flushSync()

			expect(group.value).toBe('b')
		})

		it('отмеченное радио ушло и вернулось — значение и отметка на месте', () => {
			const props = reactiveProps<ComponentProps<typeof Model>>({ onPick })

			mount(Model, props)

			props.second = false
			flushSync()

			expect(picked.at(-1)).toBe('b')
			expect(checked()).toEqual([])

			props.second = true
			flushSync()

			expect(checked()).toEqual(['b'])
		})
	})
})

/**
 * Приложение вправе отказать в выборе — подписчиком `item:activate:before`.
 * Браузер отмечает нажатое радио и снимает отметку с соседа ещё до `change`, а
 * модель запись не приняла и не сменилась: Svelte пишет отметку только на
 * смену состояния и узел не тронет. Поля к модели возвращает плагин группы.
 */
describe('отменённый выбор', () => {
	/**
	 * Движок снаружи с отказом в выборе. Отказ включается и снимается по ходу
	 * теста (`refuse.on`): радио, которое при монтировании отмечает значение,
	 * тоже проходит `item:activate:before`.
	 */
	function refusing(on: boolean) {
		const engine = createEngineRadioGroup()
		const refuse = { on }

		engine.extensions.activation.events.on('item:activate:before', (event) => {
			if (refuse.on) event.preventDefault()
		})

		return { engine, refuse }
	}

	it('пустая группа — нажатое радио не остаётся отмеченным', async () => {
		const { engine } = refusing(true)
		const onChangeValue = vi.fn()

		mount(Harness, harness({ engine, onChangeValue }))
		await nextFrame()

		choose('a')

		expect(engine.extensions.activation.activeItem).toBeUndefined()
		expect(checked()).toEqual([])
		expect(onChangeValue).not.toHaveBeenCalled()
	})

	it('отметка возвращается выбранному соседу', async () => {
		const { engine, refuse } = refusing(false)
		const onChangeValue = vi.fn()

		mount(Harness, harness({ engine, value: 'b', onChangeValue }))
		await nextFrame()

		refuse.on = true
		choose('a')

		expect(engine.extensions.activation.activeItem?.value).toBe('b')
		expect(checked()).toEqual(['b'])
		expect(onChangeValue).not.toHaveBeenCalled()
	})

	/**
	 * Отмеченному радио браузер `change` не шлёт. Останься нажатое радио
	 * отмеченным после отказа, повторный клик по нему не дал бы `change`, и
	 * радио не выбралось бы.
	 */
	it('отказ сняли — клик по тому же радио выбирает его', async () => {
		const { engine, refuse } = refusing(true)
		const onChangeValue = vi.fn()

		mount(Harness, harness({ engine, onChangeValue }))
		await nextFrame()

		choose('a')
		refuse.on = false
		choose('a')

		expect(onChangeValue).toHaveBeenLastCalledWith({ newValue: 'a', oldValue: undefined })
		expect(engine.extensions.activation.activeItem?.value).toBe('a')
		expect(checked()).toEqual(['a'])
	})

	it('отказ при выбранном соседе сняли — клик выбирает нажатое радио', async () => {
		const { engine, refuse } = refusing(false)
		const onChangeValue = vi.fn()

		mount(Harness, harness({ engine, value: 'a', onChangeValue }))
		await nextFrame()

		refuse.on = true
		choose('b')
		refuse.on = false
		choose('b')

		expect(onChangeValue).toHaveBeenLastCalledWith({ newValue: 'b', oldValue: 'a' })
		expect(engine.extensions.activation.activeItem?.value).toBe('b')
		expect(checked()).toEqual(['b'])
	})
})

describe('выключенное радио', () => {
	it('нативный disabled без aria-disabled', () => {
		mount(Harness, harness({ itemOff: true }))

		expect(radioOf('b').disabled).toBe(true)
		expect(radioOf('b').hasAttribute('aria-disabled')).toBe(false)
		expect(radioOf('a').disabled).toBe(false)
	})

	it('выключенная группа выключает все радио', () => {
		mount(Harness, harness({ groupOff: true }))

		expect(radios().map((radio) => radio.disabled)).toEqual([true, true, true])
		expect(radios().some((radio) => radio.hasAttribute('aria-disabled'))).toBe(false)
	})

	/** ARIA и роль нативного радио — дубли, их нет. */
	it('у радио нет ни role, ни aria-checked', () => {
		mount(Harness, harness({ value: 'a' }))

		for (const radio of radios()) {
			expect(radio.hasAttribute('role')).toBe(false)
			expect(radio.hasAttribute('aria-checked')).toBe(false)
		}
	})
})

describe('состояние для темы — на корне радио', () => {
	it('корень — label с data-selected и data-disabled', () => {
		mount(Harness, harness({ value: 'a', itemOff: true }))

		expect(rootOf('a').tagName).toBe('LABEL')
		expect(rootOf('a').dataset.selected).toBe('true')
		expect(rootOf('b').dataset.selected).toBe('false')
		expect(rootOf('b').dataset.disabled).toBe('true')
		expect(rootOf('a').dataset.disabled).toBe('false')
	})

	it('отметка переезжает вместе с выбором', () => {
		mount(Harness, harness({ value: 'a' }))

		choose('c')

		expect(rootOf('a').dataset.selected).toBe('false')
		expect(rootOf('c').dataset.selected).toBe('true')
	})

	it('вид группы — модификатор корня каждого радио', () => {
		mount(Harness, { group: { view: 'halo', size: 'lg' }, items: [{ value: 'a' }] })

		expect(rootOf('a').classList).toContain('s-radio-group-item--view-halo')
		expect(rootOf('a').classList).toContain('s-radio-group-item--size-lg')
	})

	/**
	 * Группа радио не раскладывает: они стоят где угодно, и номер в коллекции
	 * увёл бы радио по чужому флекс-ряду. У Vue привязки `order` у радио нет.
	 */
	it('места в коллекции на корне нет — радио стоит, где его поставили', () => {
		mount(Harness, harness())

		expect(radios().map((radio) => rootOf(radio.value).style.order)).toEqual(['', '', ''])
	})

	/**
	 * Размер, вид и имя раздаёт группа, и в разметке радио их не задать: ни
	 * входом, ни атрибутом поля — `name` и `size` у `<input>` тоже есть.
	 *
	 * Тип проверяет не vitest, а шаг CI «Типы — Svelte».
	 */
	it('name, size и view — не входы радио', () => {
		expectTypeOf<RadioGroupItemProps>().not.toHaveProperty('name')
		expectTypeOf<RadioGroupItemProps>().not.toHaveProperty('size')
		expectTypeOf<RadioGroupItemProps>().not.toHaveProperty('view')
		expectTypeOf<RadioGroupItemProps>().toHaveProperty('value')
	})
})

describe('подпись', () => {
	/** Подпись внутри `label` — клик по ней выбирает радио, текст становится именем. */
	it('текст слота лежит внутри корня-label', () => {
		mount(Harness, harness())

		const text = rootOf('a').querySelector('.s-radio-group-item__text')

		expect(text?.textContent).toBe('Первый')
	})

	it('клик по подписи выбирает радио', () => {
		const onChangeValue = vi.fn()

		mount(Harness, harness({ onChangeValue }))

		const text = rootOf('c').querySelector('.s-radio-group-item__text')

		if (!(text instanceof HTMLElement)) throw new Error('подписи радио «c» нет')

		text.click()
		flushSync()

		expect(onChangeValue).toHaveBeenLastCalledWith({ newValue: 'c', oldValue: undefined })
		expect(checked()).toEqual(['c'])
	})

	/**
	 * Пустую обёртку тема прячет по `:empty`. Пробельный текст или узел вокруг
	 * слота сделали бы её непустой, и рядом с одиноким кольцом остался бы зазор.
	 * Метки блоков Svelte — комментарии — `:empty` не видит.
	 */
	it('без подписи обёртка пуста — ни текста, ни узла', () => {
		mount(Harness, { items: [{ value: 'a', aria_label: 'Первый' }] })

		const text = rootOf('a').querySelector('.s-radio-group-item__text')

		if (!text) throw new Error('обёртки подписи нет')

		expect(contentOf(text)).toEqual([])
		// Имя радио без подписи — на самом поле
		expect(radioOf('a').getAttribute('aria-label')).toBe('Первый')
	})

	/** Подпись в соседнем элементе ссылается на поле через `for`. */
	it('сквозной id уходит на поле, а не на корень', () => {
		mount(Harness, { items: [{ value: 'a', id: 'pick-a' }] })

		expect(radioOf('a').id).toBe('pick-a')
		expect(rootOf('a').id).toBe('')
	})

	/** `change` потребителя приходит после выбора, а не вместо него. */
	it('onchange потребителя — на поле, после выбора', () => {
		const order: string[] = []

		mount(Harness, {
			group: { onChangeValue: () => order.push('группа') },
			items: [{ value: 'a', onchange: () => order.push('потребитель') }],
		})

		choose('a')

		expect(order).toEqual(['группа', 'потребитель'])
	})

	it('радио из пропа items подписывает слот item со scope', () => {
		mount(RadioGroup, {
			value: 'b',
			items: [{ value: 'a' }, { value: 'b' }],
			item: scopeText<TItemLabelScope>(({ item }) => `Вариант ${String(item.value)}`),
		})

		expect(labels()).toEqual(['Вариант a', 'Вариант b'])
		expect(checked()).toEqual(['b'])
	})

	/** Подпись получает отметку радио (`active`), как содержимое таба. */
	it('подпись получает active радио', () => {
		const label = scopeText<TLabelScope>(({ active }) => String(active))

		mount(Harness, {
			group: { value: 'b' },
			items: [
				{ value: 'a', children: label },
				{ value: 'b', children: label },
			],
		})

		expect(labels()).toEqual(['false', 'true'])
	})

	/**
	 * Слот `item` группы — проброс подписи: scope подписи плюс само радио.
	 * Подпись, нарисованная группой без проброса, отметку радио теряла бы.
	 */
	it('item получает радио и его active, active следует за значением', () => {
		const props = reactiveProps<RadioGroupProps>({
			value: 'b',
			items: [{ value: 'a' }, { value: 'b' }],
			item: scopeText<TItemLabelScope>(
				({ item, active }) => `${String(item.value)}:${String(active)}`,
			),
		})

		mount(RadioGroup, props)

		expect(labels()).toEqual(['a:false', 'b:true'])

		props.value = 'a'
		flushSync()

		expect(labels()).toEqual(['a:true', 'b:false'])
	})

	it('плоский RadioGroupItem — то же, что RadioGroup.Item', () => {
		mount(Harness, { group: { value: 'a' }, items: [{ value: 'a' }] })

		expect(RadioGroup.Item).toBe(RadioGroupItem)
		expect(checked()).toEqual(['a'])
	})
})

describe('группа имени', () => {
	it('aria_label группы — на корне с ролью radiogroup', () => {
		mount(Harness, { group: { aria_label: 'Доставка' }, items: [{ value: 'a' }] })

		const root = document.querySelector('[role="radiogroup"]')

		expect(root?.getAttribute('aria-label')).toBe('Доставка')
	})
})
