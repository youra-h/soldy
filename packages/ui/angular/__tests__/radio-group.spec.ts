/**
 * RadioGroup под Angular: нативные радио и проводка наборов.
 *
 * Сценарии — те же, что у React (`radio-group.spec.tsx`) и Vue. Радио —
 * `input[type=radio]` внутри корня-`label`. Группу для браузера собирает общий
 * `name`, который раздаёт плагин группы; отметку сообщает нативный `checked`,
 * выключенность — нативный `disabled`. ARIA-дублей у поля нет, а состояние для
 * темы лежит на корне (`data-selected`, `data-disabled`).
 *
 * Своё у Angular — разметка. Корень радио — элемент потребителя
 * (`<label so-radio-group-item>`), а атрибуты потребителя делятся, как у поля:
 * класс и стиль — корню, остальное — `<input>`. Выбор пользователя приходит
 * `change` поля: в jsdom клик по радио отмечает его и шлёт `change`, как
 * браузер.
 *
 * Клавиатуру группы (стрелки, пропуск выключенных, одну остановку Tab) jsdom
 * не выполняет — её проверяет `playground/vue/browser/radio-group.spec.ts`.
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import { Component, signal } from '@angular/core'
import type { ComponentFixture } from '@angular/core/testing'
import {
	TRadioGroup,
	createEngineRadioGroup,
	type TRadioGroupValue,
	type TValuePayload,
} from '@soldy-ui/core'
import { SlotDirective, TRadioGroupComponent, TRadioGroupItemComponent } from '@soldy-ui/angular'
import { mountHost, nextFrame } from './mount'

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
function choose(fixture: ComponentFixture<unknown>, value: string): void {
	radioOf(value).click()
	fixture.detectChanges()
}

/**
 * Группа с тремя радио и подписями. `value` — сигналом, как значение
 * потребителя; «b» выключается сигналом `itemOff`, вся группа — `groupOff`.
 */
@Component({
	standalone: true,
	imports: [TRadioGroupComponent, TRadioGroupItemComponent],
	template: `<div
		so-radio-group
		[value]="value()"
		[disabled]="groupOff()"
		(soChangeValue)="changes.push($event)"
	>
		<label so-radio-group-item value="a">Первый</label>
		<label so-radio-group-item value="b" [disabled]="itemOff()">Второй</label>
		<label so-radio-group-item value="c">Третий</label>
	</div>`,
})
class Harness {
	readonly value = signal<TRadioGroupValue>(undefined)
	readonly itemOff = signal(false)
	readonly groupOff = signal(false)
	readonly changes: TValuePayload<TRadioGroupValue>[] = []
}

/** Хост группы со значением `value`. */
function mountWith(value?: string): ComponentFixture<Harness> {
	const fixture = mountHost(Harness)

	if (value !== undefined) {
		fixture.componentInstance.value.set(value)
		fixture.detectChanges()
	}

	return fixture
}

describe('группа для браузера', () => {
	it('корень — role="radiogroup", радио — нативные input[type=radio]', () => {
		mountHost(Harness)

		expect(document.querySelector('.so-radio-group')?.getAttribute('role')).toBe('radiogroup')
		expect(radios().map((radio) => radio.type)).toEqual(['radio', 'radio', 'radio'])
	})

	/** Без общего `name` браузер не соберёт радио в группу. */
	it('у всех радио один непустой name', () => {
		mountHost(Harness)

		const names = new Set(radios().map((radio) => radio.name))

		expect(names.size).toBe(1)
		expect([...names][0]).not.toBe('')
	})

	it('две группы на странице получают разные name', () => {
		@Component({
			standalone: true,
			imports: [TRadioGroupComponent, TRadioGroupItemComponent],
			template: `<div so-radio-group><label so-radio-group-item value="a"></label></div>
				<div so-radio-group><label so-radio-group-item value="a"></label></div>`,
		})
		class TwoGroupsHost {}

		mountHost(TwoGroupsHost)

		const [first, second] = radios()

		expect(first.name).not.toBe(second.name)
	})

	it('name группы уходит радио', () => {
		@Component({
			standalone: true,
			imports: [TRadioGroupComponent, TRadioGroupItemComponent],
			template: `<div so-radio-group name="delivery">
				<label so-radio-group-item value="a"></label>
				<label so-radio-group-item value="b"></label>
			</div>`,
		})
		class NameHost {}

		mountHost(NameHost)

		expect(radios().map((radio) => radio.name)).toEqual(['delivery', 'delivery'])
	})
})

describe('value ↔ checked', () => {
	it('значение группы отмечает своё радио', () => {
		mountWith('b')

		expect(checked()).toEqual(['b'])
	})

	it('смена значения снаружи переносит отметку', () => {
		const fixture = mountWith('a')

		fixture.componentInstance.value.set('c')
		fixture.detectChanges()

		expect(checked()).toEqual(['c'])
	})

	it('выбор пользователя отдаёт changeValue', () => {
		const fixture = mountWith('a')

		choose(fixture, 'c')

		expect(fixture.componentInstance.changes.at(-1)).toEqual({ newValue: 'c', oldValue: 'a' })
		expect(checked()).toEqual(['c'])
	})

	it('без значения не отмечено ничего', () => {
		mountHost(Harness)

		expect(checked()).toEqual([])
	})

	it('радио, с которого отметку сняло значение снаружи, выбирается снова', () => {
		const fixture = mountWith('c')

		fixture.componentInstance.value.set('a')
		fixture.detectChanges()
		choose(fixture, 'c')

		expect(fixture.componentInstance.changes.at(-1)).toEqual({ newValue: 'c', oldValue: 'a' })
		expect(checked()).toEqual(['c'])
		expect(rootOf('c').dataset['selected']).toBe('true')
	})

	/**
	 * Настоящее состояние у потребителя. Радио уходят из группы и при её
	 * снятии, и по условию по одному — это не выбор «ничего», и значение
	 * потребителя переживает и то и другое.
	 */
	describe('значение потребителя переживает уход радио', () => {
		@Component({
			standalone: true,
			imports: [TRadioGroupComponent, TRadioGroupItemComponent],
			template: `@if (group()) {
				<div so-radio-group [value]="value()" (soChangeValue)="value.set($event.newValue)">
					<label so-radio-group-item value="a"></label>
					@if (second()) {
						<label so-radio-group-item value="b"></label>
					}
				</div>
			}`,
		})
		class ModelHost {
			readonly value = signal<TRadioGroupValue>('b')
			readonly group = signal(true)
			readonly second = signal(true)
		}

		it('выбор пишет значение потребителя', () => {
			const fixture = mountHost(ModelHost)

			choose(fixture, 'a')

			expect(fixture.componentInstance.value()).toBe('a')
		})

		it('снятие группы не стирает значение', () => {
			const fixture = mountHost(ModelHost)

			fixture.componentInstance.group.set(false)
			fixture.detectChanges()

			expect(fixture.componentInstance.value()).toBe('b')
		})

		/**
		 * Колбэк потребителя снимается раньше, чем уничтожаются контексты, и
		 * значение, стёртое при уничтожении, до него не дошло бы. Инстанс
		 * снаружи переживает монтирование — по нему видно само значение.
		 */
		it('снятие группы не стирает значение её инстанса', () => {
			@Component({
				standalone: true,
				imports: [TRadioGroupComponent, TRadioGroupItemComponent],
				template: `@if (shown()) {
					<div so-radio-group [ctrl]="group">
						<label so-radio-group-item value="a"></label>
						<label so-radio-group-item value="b"></label>
					</div>
				}`,
			})
			class CtrlHost {
				readonly group = new TRadioGroup({ value: 'b' })
				readonly shown = signal(true)
			}

			const fixture = mountHost(CtrlHost)

			expect(checked()).toEqual(['b'])

			fixture.componentInstance.shown.set(false)
			fixture.detectChanges()

			expect(fixture.componentInstance.group.value).toBe('b')
		})

		it('отмеченное радио ушло и вернулось — значение и отметка на месте', () => {
			const fixture = mountHost(ModelHost)

			fixture.componentInstance.second.set(false)
			fixture.detectChanges()

			expect(fixture.componentInstance.value()).toBe('b')
			expect(checked()).toEqual([])

			fixture.componentInstance.second.set(true)
			fixture.detectChanges()

			expect(checked()).toEqual(['b'])
		})
	})
})

/**
 * Приложение вправе отказать в выборе — подписчиком `item:activate:before`.
 * Браузер отмечает нажатое радио и снимает отметку с соседа ещё до `change`, а
 * модель запись не приняла и не сменилась: привязка `[checked]` пишет отметку
 * только на смену ядра и узел не тронет. Поля к модели возвращает плагин
 * группы.
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

	/** Группа над движком снаружи со значением `value`. */
	function mountRefusing(on: boolean, value?: string) {
		const { engine, refuse } = refusing(on)

		@Component({
			standalone: true,
			imports: [TRadioGroupComponent, TRadioGroupItemComponent],
			template: `<div
				so-radio-group
				[engine]="engine"
				[value]="value"
				(soChangeValue)="changes.push($event)"
			>
				<label so-radio-group-item value="a"></label>
				<label so-radio-group-item value="b"></label>
			</div>`,
		})
		class RefusingHost {
			readonly engine = engine
			readonly value: TRadioGroupValue = value
			readonly changes: TValuePayload<TRadioGroupValue>[] = []
		}

		return { fixture: mountHost(RefusingHost), engine, refuse }
	}

	it('пустая группа — нажатое радио не остаётся отмеченным', async () => {
		const { fixture, engine } = mountRefusing(true)

		await nextFrame()

		choose(fixture, 'a')

		expect(engine.extensions.activation.activeItem).toBeUndefined()
		expect(checked()).toEqual([])
		expect(fixture.componentInstance.changes).toEqual([])
	})

	it('отметка возвращается выбранному соседу', async () => {
		const { fixture, engine, refuse } = mountRefusing(false, 'b')

		await nextFrame()

		refuse.on = true
		choose(fixture, 'a')

		expect(engine.extensions.activation.activeItem?.value).toBe('b')
		expect(checked()).toEqual(['b'])
		expect(fixture.componentInstance.changes).toEqual([])
	})

	it('отказ сняли — клик по тому же радио выбирает его', async () => {
		const { fixture, engine, refuse } = mountRefusing(true)

		await nextFrame()

		choose(fixture, 'a')
		refuse.on = false
		choose(fixture, 'a')

		expect(fixture.componentInstance.changes.at(-1)).toEqual({
			newValue: 'a',
			oldValue: undefined,
		})
		expect(engine.extensions.activation.activeItem?.value).toBe('a')
		expect(checked()).toEqual(['a'])
	})

	it('отказ при выбранном соседе сняли — клик выбирает нажатое радио', async () => {
		const { fixture, engine, refuse } = mountRefusing(false, 'a')

		await nextFrame()

		refuse.on = true
		choose(fixture, 'b')
		refuse.on = false
		choose(fixture, 'b')

		expect(fixture.componentInstance.changes.at(-1)).toEqual({ newValue: 'b', oldValue: 'a' })
		expect(engine.extensions.activation.activeItem?.value).toBe('b')
		expect(checked()).toEqual(['b'])
	})
})

describe('выключенное радио', () => {
	it('нативный disabled без aria-disabled', () => {
		const fixture = mountHost(Harness)

		fixture.componentInstance.itemOff.set(true)
		fixture.detectChanges()

		expect(radioOf('b').disabled).toBe(true)
		expect(radioOf('b').hasAttribute('aria-disabled')).toBe(false)
		expect(radioOf('a').disabled).toBe(false)
	})

	it('выключенная группа выключает все радио', () => {
		const fixture = mountHost(Harness)

		fixture.componentInstance.groupOff.set(true)
		fixture.detectChanges()

		expect(radios().map((radio) => radio.disabled)).toEqual([true, true, true])
		expect(radios().some((radio) => radio.hasAttribute('aria-disabled'))).toBe(false)
	})

	/** ARIA и роль нативного радио — дубли, их нет. */
	it('у радио нет ни role, ни aria-checked', () => {
		mountWith('a')

		for (const radio of radios()) {
			expect(radio.hasAttribute('role')).toBe(false)
			expect(radio.hasAttribute('aria-checked')).toBe(false)
		}
	})
})

describe('состояние для темы — на корне радио', () => {
	it('корень — label с data-selected и data-disabled', () => {
		const fixture = mountWith('a')

		fixture.componentInstance.itemOff.set(true)
		fixture.detectChanges()

		expect(rootOf('a').tagName).toBe('LABEL')
		expect(rootOf('a').dataset['selected']).toBe('true')
		expect(rootOf('b').dataset['selected']).toBe('false')
		expect(rootOf('b').dataset['disabled']).toBe('true')
		expect(rootOf('a').dataset['disabled']).toBe('false')
	})

	it('отметка переезжает вместе с выбором', () => {
		const fixture = mountWith('a')

		choose(fixture, 'c')

		expect(rootOf('a').dataset['selected']).toBe('false')
		expect(rootOf('c').dataset['selected']).toBe('true')
	})

	it('вид группы — модификатор корня каждого радио', () => {
		@Component({
			standalone: true,
			imports: [TRadioGroupComponent, TRadioGroupItemComponent],
			template: `<div so-radio-group view="halo" size="lg">
				<label so-radio-group-item value="a"></label>
			</div>`,
		})
		class ViewHost {}

		mountHost(ViewHost)

		expect(rootOf('a').classList).toContain('so-radio-group-item--view-halo')
		expect(rootOf('a').classList).toContain('so-radio-group-item--size-lg')
	})

	/**
	 * Группа радио не раскладывает: они стоят где угодно, и номер в коллекции
	 * увёл бы радио по чужому флекс-ряду. У Vue привязки `order` у радио нет.
	 */
	it('места в коллекции на корне нет — радио стоит, где его поставили', () => {
		mountHost(Harness)

		expect(radios().map((radio) => rootOf(radio.value).style.order)).toEqual(['', '', ''])
	})

	/**
	 * Селектор радио — атрибут на `label`, и он остаётся на корне: метки soldy
	 * на поле не переезжают, хотя атрибуты потребителя делятся, как у поля.
	 */
	it('селектор радио остаётся на корне, поле его не несёт', () => {
		mountHost(Harness)

		expect(rootOf('a').hasAttribute('so-radio-group-item')).toBe(true)
		expect(radioOf('a').hasAttribute('so-radio-group-item')).toBe(false)
	})

	/**
	 * Размер, вид и имя раздаёт группа, и в разметке радио их не задать: входов
	 * `name`, `size` и `view` у радио нет.
	 */
	it('name, size и view — не входы радио', () => {
		expectTypeOf<TRadioGroupItemComponent>().not.toHaveProperty('name')
		expectTypeOf<TRadioGroupItemComponent>().not.toHaveProperty('size')
		expectTypeOf<TRadioGroupItemComponent>().not.toHaveProperty('view')
		expectTypeOf<TRadioGroupItemComponent>().toHaveProperty('value')
	})
})

describe('подпись', () => {
	/** Подпись внутри `label` — клик по ней выбирает радио, текст становится именем. */
	it('текст подписи лежит внутри корня-label', () => {
		mountHost(Harness)

		const text = rootOf('a').querySelector('.so-radio-group-item__text')

		expect(text?.textContent).toBe('Первый')
	})

	it('клик по подписи выбирает радио', () => {
		const fixture = mountHost(Harness)
		const text = rootOf('c').querySelector('.so-radio-group-item__text')

		if (!(text instanceof HTMLElement)) throw new Error('подписи радио «c» нет')

		text.click()
		fixture.detectChanges()

		expect(fixture.componentInstance.changes.at(-1)).toEqual({
			newValue: 'c',
			oldValue: undefined,
		})
		expect(checked()).toEqual(['c'])
	})

	/**
	 * Пустую обёртку тема прячет по `:empty`. Пробельный текст или элемент
	 * вокруг слота сделали бы её непустой; комментарий-якорь Angular `:empty` не
	 * мешает — по спецификации селектор его не считает.
	 */
	it('без подписи обёртка пуста — ни текста, ни элемента', () => {
		@Component({
			standalone: true,
			imports: [TRadioGroupComponent, TRadioGroupItemComponent],
			template: `<div so-radio-group>
				<label so-radio-group-item value="a" aria_label="Первый"></label>
			</div>`,
		})
		class EmptyHost {}

		mountHost(EmptyHost)

		const text = rootOf('a').querySelector('.so-radio-group-item__text')
		const texts = [...(text?.childNodes ?? [])].filter(
			(node) => node.nodeType === Node.TEXT_NODE,
		)

		expect(text?.children).toHaveLength(0)
		expect(texts).toEqual([])
		// Имя радио без подписи — на самом поле
		expect(radioOf('a').getAttribute('aria-label')).toBe('Первый')
	})

	/** Подпись в соседнем элементе ссылается на поле через `for`. */
	it('id из разметки уходит на поле, а не на корень', () => {
		@Component({
			standalone: true,
			imports: [TRadioGroupComponent, TRadioGroupItemComponent],
			template: `<div so-radio-group>
				<label so-radio-group-item id="pick-a" value="a"></label>
			</div>`,
		})
		class IdHost {}

		mountHost(IdHost)

		expect(radioOf('a').id).toBe('pick-a')
		expect(rootOf('a').id).toBe('')
	})

	/** Слушатель `change` потребителя на радио слышит выбор после группы. */
	it('change потребителя — после выбора', () => {
		@Component({
			standalone: true,
			imports: [TRadioGroupComponent, TRadioGroupItemComponent],
			template: `<div so-radio-group (soChangeValue)="order.push('группа')">
				<label so-radio-group-item value="a" (change)="order.push('потребитель')"></label>
			</div>`,
		})
		class OrderHost {
			readonly order: string[] = []
		}

		const fixture = mountHost(OrderHost)

		choose(fixture, 'a')

		expect(fixture.componentInstance.order).toEqual(['группа', 'потребитель'])
	})

	it('радио из входа items подписывает шаблон item со scope', () => {
		@Component({
			standalone: true,
			imports: [TRadioGroupComponent, SlotDirective],
			template: `<div so-radio-group value="b" [items]="items">
				<ng-template slot="item" let-item="item">Вариант {{ item.value }}</ng-template>
			</div>`,
		})
		class ItemsHost {
			readonly items = [{ value: 'a' }, { value: 'b' }]
		}

		mountHost(ItemsHost)

		expect(
			[...document.querySelectorAll('.so-radio-group-item__text')].map((text) =>
				text.textContent?.trim(),
			),
		).toEqual(['Вариант a', 'Вариант b'])
		expect(checked()).toEqual(['b'])
	})

	/** Подпись получает отметку радио (`active`), как содержимое таба. */
	it('подпись-шаблон получает active радио', () => {
		@Component({
			standalone: true,
			imports: [TRadioGroupComponent, TRadioGroupItemComponent, SlotDirective],
			template: `<div so-radio-group value="b">
				<label so-radio-group-item value="a"
					><ng-template slot="default" let-active="active">{{
						active
					}}</ng-template></label
				>
				<label so-radio-group-item value="b"
					><ng-template slot="default" let-active="active">{{
						active
					}}</ng-template></label
				>
			</div>`,
		})
		class ActiveHost {}

		mountHost(ActiveHost)

		expect(
			[...document.querySelectorAll('.so-radio-group-item__text')].map(
				(text) => text.textContent,
			),
		).toEqual(['false', 'true'])
	})

	/**
	 * Шаблон `item` группы — проброс подписи: scope подписи плюс само радио, и
	 * отметка доходит до него.
	 */
	it('item получает радио и его active, active следует за значением', () => {
		@Component({
			standalone: true,
			imports: [TRadioGroupComponent, SlotDirective],
			template: `<div so-radio-group [value]="value()" [items]="items">
				<ng-template slot="item" let-item="item" let-active="active"
					>{{ item.value }}:{{ active }}</ng-template
				>
			</div>`,
		})
		class RelayHost {
			readonly items = [{ value: 'a' }, { value: 'b' }]
			readonly value = signal<TRadioGroupValue>('b')
		}

		const fixture = mountHost(RelayHost)
		const labels = () =>
			[...document.querySelectorAll('.so-radio-group-item__text')].map((text) =>
				text.textContent?.trim(),
			)

		expect(labels()).toEqual(['a:false', 'b:true'])

		fixture.componentInstance.value.set('a')
		fixture.detectChanges()

		expect(labels()).toEqual(['a:true', 'b:false'])
	})
})

describe('группа имени', () => {
	it('aria_label группы — на корне с ролью radiogroup', () => {
		@Component({
			standalone: true,
			imports: [TRadioGroupComponent, TRadioGroupItemComponent],
			template: `<div so-radio-group aria_label="Доставка">
				<label so-radio-group-item value="a"></label>
			</div>`,
		})
		class NameHost {}

		mountHost(NameHost)

		const root = document.querySelector('[role="radiogroup"]')

		expect(root?.getAttribute('aria-label')).toBe('Доставка')
	})
})
