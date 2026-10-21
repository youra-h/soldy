/**
 * RadioGroup в Solid: нативные радио и проводка наборов.
 *
 * Сценарии — те же, что у React (`radio-group.spec.tsx`) и Svelte
 * (`radio-group.spec.ts`). Радио — `input[type=radio]` внутри корня-`label`.
 * Группу для браузера собирает общий `name`, который раздаёт плагин группы;
 * отметку сообщает нативный `checked`, выключенность — нативный `disabled`.
 * ARIA-дублей у поля нет, а состояние для темы лежит на корне
 * (`data-selected`, `data-disabled`).
 *
 * Своё у Solid — выбор пользователя. Он приходит `change` поля, и Solid его
 * не делегирует: слушатель стоит на самом поле, модель решает раньше, чем
 * `change` дойдёт до корня группы, где плагин группы возвращает поля к модели.
 * Сервер проверяет `collections.server.spec.tsx`.
 *
 * Клавиатуру группы (стрелки, пропуск выключенных, одну остановку Tab) jsdom
 * не выполняет — её проверяет `playground/vue/browser/radio-group.spec.ts`.
 */

import { describe, it, expect, expectTypeOf, vi, afterEach } from 'vitest'
import { createRenderEffect, createSignal, Show, splitProps, type JSX } from 'solid-js'
import { TRadioGroup, createEngineRadioGroup, type TRadioGroupValue } from '@soldy-ui/core'
import {
	RadioGroup,
	RadioGroupItem,
	type RadioGroupItemProps,
	type RadioGroupProps,
} from '@soldy-ui/solid'
import { mount, nextFrame } from './mount'

afterEach(() => {
	vi.restoreAllMocks()
})

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
function rootOf(value: string): HTMLElement {
	const root = radioOf(value).closest('.so-radio-group-item')

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
}

/** Подписи радио по порядку. */
const labels = () =>
	[...document.querySelectorAll('.so-radio-group-item__text')].map((text) => text.textContent)

type THarnessProps = RadioGroupProps & {
	/** Выключить радио «b». */
	itemOff?: boolean
	/** Выключить всю группу. */
	groupOff?: boolean
}

/**
 * Группа с тремя радио и подписями. `value` — пропом, как значение
 * потребителя; «b» выключается `itemOff`, вся группа — `groupOff`. `engine` —
 * движок снаружи, не дали — группа соберёт свой.
 */
function Harness(props: THarnessProps): JSX.Element {
	const [own, group] = splitProps(props, ['itemOff', 'groupOff'])

	return (
		<RadioGroup {...group} disabled={own.groupOff}>
			<RadioGroup.Item value="a">Первый</RadioGroup.Item>
			<RadioGroup.Item value="b" disabled={own.itemOff}>
				Второй
			</RadioGroup.Item>
			<RadioGroup.Item value="c">Третий</RadioGroup.Item>
		</RadioGroup>
	)
}

describe('группа для браузера', () => {
	it('корень — role="radiogroup", радио — нативные input[type=radio]', () => {
		mount(() => <Harness />)

		expect(document.querySelector('.so-radio-group')?.getAttribute('role')).toBe('radiogroup')
		expect(radios().map((radio) => radio.type)).toEqual(['radio', 'radio', 'radio'])
	})

	/** Без общего `name` браузер не соберёт радио в группу. */
	it('у всех радио один непустой name', () => {
		mount(() => <Harness />)

		const names = new Set(radios().map((radio) => radio.name))

		expect(names.size).toBe(1)
		expect([...names][0]).not.toBe('')
	})

	it('две группы на странице получают разные name', () => {
		mount(() => (
			<div>
				<RadioGroup>
					<RadioGroup.Item value="a" />
				</RadioGroup>
				<RadioGroup>
					<RadioGroup.Item value="a" />
				</RadioGroup>
			</div>
		))

		const [first, second] = radios()

		expect(first.name).not.toBe(second.name)
	})

	it('name группы уходит радио', () => {
		mount(() => (
			<RadioGroup name="delivery">
				<RadioGroup.Item value="a" />
				<RadioGroup.Item value="b" />
			</RadioGroup>
		))

		expect(radios().map((radio) => radio.name)).toEqual(['delivery', 'delivery'])
	})
})

describe('value ↔ checked', () => {
	it('значение группы отмечает своё радио', () => {
		mount(() => <Harness value="b" />)

		expect(checked()).toEqual(['b'])
	})

	it('смена значения снаружи переносит отметку', () => {
		const [value, setValue] = createSignal('a')

		mount(() => <Harness value={value()} />)

		setValue('c')

		expect(checked()).toEqual(['c'])
	})

	it('выбор пользователя отдаёт onChangeValue', () => {
		const onChangeValue = vi.fn()

		mount(() => <Harness value="a" onChangeValue={onChangeValue} />)

		choose('c')

		expect(onChangeValue).toHaveBeenLastCalledWith({ newValue: 'c', oldValue: 'a' })
		expect(checked()).toEqual(['c'])
	})

	it('без значения не отмечено ничего', () => {
		mount(() => <Harness />)

		expect(checked()).toEqual([])
	})

	/**
	 * Отметку с радио браузер снимает и сам — когда отмечают соседа. Значение
	 * снаружи переносит отметку на радио, стоящее раньше, — и прежнее радио
	 * обязано выбираться снова.
	 */
	it('радио, с которого отметку сняло значение снаружи, выбирается снова', () => {
		const onChangeValue = vi.fn()
		const [value, setValue] = createSignal('c')

		mount(() => <Harness value={value()} onChangeValue={onChangeValue} />)

		setValue('a')
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
		type TModelProps = { group: () => boolean; second: () => boolean }

		/** Значения потребителя по порядку: последнее — текущее. */
		let picked: TRadioGroupValue[] = []

		/** Значение — свой сигнал потребителя, группа пишет в него выбор. */
		function Model(props: TModelProps): JSX.Element {
			const [value, setValue] = createSignal<TRadioGroupValue>('b')

			createRenderEffect(() => {
				picked.push(value())
			})

			return (
				<Show when={props.group()}>
					<RadioGroup
						value={value()}
						onChangeValue={({ newValue }) => setValue(newValue)}
					>
						<RadioGroup.Item value="a" />
						<Show when={props.second()}>
							<RadioGroup.Item value="b" />
						</Show>
					</RadioGroup>
				</Show>
			)
		}

		/** Модель, у которой группа и радио «b» снимаются сигналами. */
		function mountModel() {
			const [group, setGroup] = createSignal(true)
			const [second, setSecond] = createSignal(true)

			mount(() => <Model group={group} second={second} />)

			return { setGroup, setSecond }
		}

		afterEach(() => {
			picked = []
		})

		it('выбор пишет значение потребителя', () => {
			mountModel()

			choose('a')

			expect(picked.at(-1)).toBe('a')
		})

		it('снятие группы не стирает значение', () => {
			const { setGroup } = mountModel()

			setGroup(false)

			expect(picked.at(-1)).toBe('b')
		})

		/**
		 * Значение, стёртое при уничтожении, до колбэка потребителя могло и не
		 * дойти. Инстанс снаружи переживает монтирование — по нему видно само
		 * значение.
		 */
		it('снятие группы не стирает значение её инстанса', () => {
			const group = new TRadioGroup({ value: 'b' })
			const [shown, setShown] = createSignal(true)

			mount(() => (
				<Show when={shown()}>
					<RadioGroup ctrl={group}>
						<RadioGroup.Item value="a" />
						<RadioGroup.Item value="b" />
					</RadioGroup>
				</Show>
			))

			expect(checked()).toEqual(['b'])

			setShown(false)

			expect(group.value).toBe('b')
		})

		it('отмеченное радио ушло и вернулось — значение и отметка на месте', () => {
			const { setSecond } = mountModel()

			setSecond(false)

			expect(picked.at(-1)).toBe('b')
			expect(checked()).toEqual([])

			setSecond(true)

			expect(checked()).toEqual(['b'])
		})
	})
})

/**
 * Отметка радио — в обе стороны, парой «проп + колбэк», без `ctrl`: `active`
 * пропом пишет её, а `onChangeActive` приходит только радио, чья отметка
 * сменилась, и несёт новую. Состояние приложения держит отметку само.
 */
describe('отметка радио: active и onChangeActive', () => {
	/** Группа из трёх, отметки — в сигналах приложения; колбэки — в журнал. */
	function app(log: string[]) {
		const marks = ['a', 'b', 'c'].map((value, index) => {
			const [active, setActive] = createSignal(index === 0)

			return { value, active, setActive }
		})

		mount(() => (
			<RadioGroup>
				{marks.map(({ value, active, setActive }) => (
					<RadioGroup.Item
						value={value}
						active={active()}
						onChangeActive={(next) => {
							log.push(`${value}: ${next}`)
							setActive(next)
						}}
					/>
				))}
			</RadioGroup>
		))

		return () => marks.map(({ active }) => String(active())).join(' ')
	}

	it('выбор B: A получает false, B — true, C молчит; состояние сходится с отметкой', () => {
		const log: string[] = []
		const state = app(log)

		expect(checked()).toEqual(['a'])

		log.length = 0
		choose('b')

		expect(log).toEqual(['a: false', 'b: true'])
		expect(state()).toBe('false true false')
		expect(checked()).toEqual(['b'])
	})

	it('колбэк получает отметку: boolean', () => {
		expectTypeOf<NonNullable<RadioGroupItemProps['onChangeActive']>>()
			.parameter(0)
			.toEqualTypeOf<boolean>()
	})
})

/**
 * Приложение вправе отказать в выборе — подписчиком `item:activate:before`.
 * Браузер отмечает нажатое радио и снимает отметку с соседа ещё до `change`, а
 * модель запись не приняла и не сменилась: Solid пишет отметку только на
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

		mount(() => <Harness engine={engine} onChangeValue={onChangeValue} />)
		await nextFrame()

		choose('a')

		expect(engine.extensions.activation.activeItem).toBeUndefined()
		expect(checked()).toEqual([])
		expect(onChangeValue).not.toHaveBeenCalled()
	})

	it('отметка возвращается выбранному соседу', async () => {
		const { engine, refuse } = refusing(false)
		const onChangeValue = vi.fn()

		mount(() => <Harness engine={engine} value="b" onChangeValue={onChangeValue} />)
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

		mount(() => <Harness engine={engine} onChangeValue={onChangeValue} />)
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

		mount(() => <Harness engine={engine} value="a" onChangeValue={onChangeValue} />)
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
		mount(() => <Harness itemOff />)

		expect(radioOf('b').disabled).toBe(true)
		expect(radioOf('b').hasAttribute('aria-disabled')).toBe(false)
		expect(radioOf('a').disabled).toBe(false)
	})

	it('выключенная группа выключает все радио', () => {
		mount(() => <Harness groupOff />)

		expect(radios().map((radio) => radio.disabled)).toEqual([true, true, true])
		expect(radios().some((radio) => radio.hasAttribute('aria-disabled'))).toBe(false)
	})

	/** ARIA и роль нативного радио — дубли, их нет. */
	it('у радио нет ни role, ни aria-checked', () => {
		mount(() => <Harness value="a" />)

		for (const radio of radios()) {
			expect(radio.hasAttribute('role')).toBe(false)
			expect(radio.hasAttribute('aria-checked')).toBe(false)
		}
	})
})

describe('состояние для темы — на корне радио', () => {
	it('корень — label с data-selected и data-disabled', () => {
		mount(() => <Harness value="a" itemOff />)

		expect(rootOf('a').tagName).toBe('LABEL')
		expect(rootOf('a').dataset.selected).toBe('true')
		expect(rootOf('b').dataset.selected).toBe('false')
		expect(rootOf('b').dataset.disabled).toBe('true')
		expect(rootOf('a').dataset.disabled).toBe('false')
	})

	it('отметка переезжает вместе с выбором', () => {
		mount(() => <Harness value="a" />)

		choose('c')

		expect(rootOf('a').dataset.selected).toBe('false')
		expect(rootOf('c').dataset.selected).toBe('true')
	})

	it('вид группы — модификатор корня каждого радио', () => {
		mount(() => (
			<RadioGroup view="halo" size="lg">
				<RadioGroup.Item value="a" />
			</RadioGroup>
		))

		expect(rootOf('a').classList).toContain('so-radio-group-item--view-halo')
		expect(rootOf('a').classList).toContain('so-radio-group-item--size-lg')
	})

	/**
	 * Группа радио не раскладывает: они стоят где угодно, и номер в коллекции
	 * увёл бы радио по чужому флекс-ряду. У Vue привязки `order` у радио нет.
	 */
	it('места в коллекции на корне нет — радио стоит, где его поставили', () => {
		mount(() => <Harness />)

		expect(radios().map((radio) => rootOf(radio.value).style.order)).toEqual(['', '', ''])
	})

	/**
	 * Размер, вид и имя раздаёт группа, и в разметке радио их не задать: ни
	 * входом, ни атрибутом поля — `name` и `size` у `<input>` тоже есть.
	 *
	 * Тип проверяет не vitest, а шаг CI «Типы — Solid».
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
		mount(() => <Harness />)

		const text = rootOf('a').querySelector('.so-radio-group-item__text')

		expect(text?.textContent).toBe('Первый')
	})

	it('клик по подписи выбирает радио', () => {
		const onChangeValue = vi.fn()

		mount(() => <Harness onChangeValue={onChangeValue} />)

		const text = rootOf('c').querySelector('.so-radio-group-item__text')

		if (!(text instanceof HTMLElement)) throw new Error('подписи радио «c» нет')

		text.click()

		expect(onChangeValue).toHaveBeenLastCalledWith({ newValue: 'c', oldValue: undefined })
		expect(checked()).toEqual(['c'])
	})

	/**
	 * Пустую обёртку тема прячет по `:empty`. Пробельный текст или узел вокруг
	 * слота сделали бы её непустой, и рядом с одиноким кольцом остался бы зазор.
	 */
	it('без подписи обёртка пуста — ни текста, ни узла', () => {
		mount(() => (
			<RadioGroup>
				<RadioGroup.Item value="a" aria_label="Первый" />
			</RadioGroup>
		))

		const text = rootOf('a').querySelector('.so-radio-group-item__text')

		expect(text?.childNodes).toHaveLength(0)
		// Имя радио без подписи — на самом поле
		expect(radioOf('a').getAttribute('aria-label')).toBe('Первый')
	})

	/** Подпись в соседнем элементе ссылается на поле через `for`. */
	it('сквозной id уходит на поле, а не на корень', () => {
		mount(() => (
			<RadioGroup>
				<RadioGroup.Item id="pick-a" value="a" />
			</RadioGroup>
		))

		expect(radioOf('a').id).toBe('pick-a')
		expect(rootOf('a').id).toBe('')
	})

	/** `onChange` потребителя приходит после выбора, а не вместо него. */
	it('onChange потребителя — на поле, после выбора', () => {
		const order: string[] = []

		mount(() => (
			<RadioGroup onChangeValue={() => order.push('группа')}>
				<RadioGroup.Item value="a" onChange={() => order.push('потребитель')} />
			</RadioGroup>
		))

		choose('a')

		expect(order).toEqual(['группа', 'потребитель'])
	})

	it('радио из пропа items подписывает слот item со scope', () => {
		mount(() => (
			<RadioGroup
				value="b"
				items={[{ value: 'a' }, { value: 'b' }]}
				item={({ item }) => `Вариант ${String(item.value)}`}
			/>
		))

		expect(labels()).toEqual(['Вариант a', 'Вариант b'])
		expect(checked()).toEqual(['b'])
	})

	/** Подпись получает отметку радио (`active`), как содержимое таба. */
	it('подпись получает active радио', () => {
		mount(() => (
			<RadioGroup value="b">
				<RadioGroup.Item value="a">{({ active }) => String(active)}</RadioGroup.Item>
				<RadioGroup.Item value="b">{({ active }) => String(active)}</RadioGroup.Item>
			</RadioGroup>
		))

		expect(labels()).toEqual(['false', 'true'])
	})

	/**
	 * Слот `item` группы — проброс подписи: scope подписи плюс само радио.
	 * Узлы, которые нарисовала бы группа, отметку радио теряли бы.
	 */
	it('item получает радио и его active, active следует за значением', () => {
		const [value, setValue] = createSignal('b')

		mount(() => (
			<RadioGroup
				value={value()}
				items={[{ value: 'a' }, { value: 'b' }]}
				item={({ item, active }) => `${String(item.value)}:${String(active)}`}
			/>
		))

		expect(labels()).toEqual(['a:false', 'b:true'])

		setValue('a')

		expect(labels()).toEqual(['a:true', 'b:false'])
	})

	/** Смена отметки готовые узлы подписи не пересоздаёт: слот развёрнут один раз. */
	it('подпись разметкой — тот же узел после смены отметки', () => {
		mount(() => (
			<RadioGroup>
				<RadioGroup.Item value="a">
					<b class="label">Первый</b>
				</RadioGroup.Item>
			</RadioGroup>
		))

		const label = rootOf('a').querySelector('.label')

		choose('a')

		expect(rootOf('a').dataset.selected).toBe('true')
		expect(rootOf('a').querySelector('.label')).toBe(label)
	})

	it('плоский RadioGroupItem — то же, что RadioGroup.Item', () => {
		mount(() => (
			<RadioGroup value="a">
				<RadioGroupItem value="a">Первый</RadioGroupItem>
			</RadioGroup>
		))

		expect(RadioGroup.Item).toBe(RadioGroupItem)
		expect(checked()).toEqual(['a'])
	})
})

describe('группа имени', () => {
	it('aria_label группы — на корне с ролью radiogroup', () => {
		mount(() => (
			<RadioGroup aria_label="Доставка">
				<RadioGroup.Item value="a" />
			</RadioGroup>
		))

		const root = document.querySelector('[role="radiogroup"]')

		expect(root?.getAttribute('aria-label')).toBe('Доставка')
	})
})
