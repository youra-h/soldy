/**
 * Label под Angular: подпись вокруг контрола.
 *
 * Сценарии — те же, что у React (`label.spec.tsx`) и Vue (`label.spec.ts`).
 * Корень — `label`, внутри две части: контрол (слот `default`) и текст (слот
 * `content`, без него — проп `text`). Связи через `for` и `id` нет: контрол —
 * первый labelable-потомок `label`, поэтому клик по тексту переключает его, а
 * текст становится его доступным именем.
 *
 * Угол зрения здесь свой. Обёртки нет: корень — элемент, который написал
 * потребитель (`<label so-label>`), классы и наборы ядра на него кладёт база
 * компонента, а слот `content` — элемент с атрибутом `slot`, как у Button.
 * Корень радио — тоже элемент потребителя: внутри подписи радио пишут на
 * строчном теге, `<span so-radio-group-item>`.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { Component, signal } from '@angular/core'
import type { TLabelPosition, TRadioGroupValue, TValuePayload } from '@soldy-ui/core'
import {
	TCheckBoxComponent,
	TLabelComponent,
	TRadioGroupComponent,
	TRadioGroupItemComponent,
	TSwitchComponent,
} from '@soldy-ui/angular'
import { find, findIn, mountHost, nextFrame } from './mount'

afterEach(() => {
	vi.restoreAllMocks()
})

/** Корень подписи в разметке хоста. */
const labelOf = (fixture: Parameters<typeof findIn>[0]) =>
	findIn(fixture, '[so-label]', HTMLLabelElement)

/** Обёртка текста подписи. */
const textOf = (root: Element) => find(root, '.so-label__text', HTMLElement)

@Component({
	standalone: true,
	imports: [TLabelComponent, TCheckBoxComponent],
	template: `<label so-label text="Согласен"><so-check-box /></label>`,
})
class CheckBoxLabelHost {}

@Component({
	standalone: true,
	imports: [TLabelComponent],
	template: `<span so-label text="Подпись"></span>`,
})
class SpanLabelHost {}

@Component({
	standalone: true,
	imports: [TLabelComponent],
	template: `<label so-label [position]="position()" direction="rtl"></label>`,
})
class PositionHost {
	readonly position = signal<TLabelPosition>('start')
}

@Component({
	standalone: true,
	imports: [TLabelComponent],
	template: `<label so-label [text]="text()"></label>`,
})
class TextHost {
	readonly text = signal('До')
}

@Component({
	standalone: true,
	imports: [TLabelComponent],
	template: `<label so-label text="Проп"><b slot="content">Слот</b></label>`,
})
class ContentSlotHost {}

@Component({
	standalone: true,
	imports: [TLabelComponent],
	template: `<label so-label></label>`,
})
class EmptyHost {}

describe('Label · разметка', () => {
	it('корень — label, внутри контрол, потом текст', () => {
		const el = labelOf(mountHost(CheckBoxLabelHost))

		expect([...el.classList]).toEqual([
			'so-label',
			'so-label--size-normal',
			'so-label--position-end',
		])
		expect([...el.children].map((part) => part.className)).toEqual([
			'so-label__control',
			'so-label__text',
		])
		expect(el.querySelector('.so-label__control > .so-check-box > input')).not.toBeNull()
		expect(textOf(el).textContent).toBe('Согласен')
	})

	/** Корень — тот элемент, что написан: тег ядро берёт у него. */
	it('корень — элемент потребителя любого тега', () => {
		const fixture = mountHost(SpanLabelHost)
		const el = findIn(fixture, '[so-label]', HTMLSpanElement)

		expect(el.classList.contains('so-label')).toBe(true)
		expect(textOf(el).textContent).toBe('Подпись')
	})

	it('смена position меняет модификатор стороны, direction: rtl — dir на корне', () => {
		const fixture = mountHost(PositionHost)
		const el = labelOf(fixture)

		expect(el.classList.contains('so-label--position-start')).toBe(true)
		expect(el.getAttribute('dir')).toBe('rtl')

		fixture.componentInstance.position.set('top')
		fixture.detectChanges()

		expect(el.classList.contains('so-label--position-top')).toBe(true)
		expect(el.classList.contains('so-label--position-start')).toBe(false)
	})

	/** Атрибут-вход — запись входа, а не атрибут корня. */
	it('атрибута text на корне нет', () => {
		const el = labelOf(mountHost(CheckBoxLabelHost))

		expect(el.hasAttribute('text')).toBe(false)
	})
})

describe('Label · текст: проп и слот', () => {
	it('без слота — проп text, смена пропа доходит до текста', () => {
		const fixture = mountHost(TextHost)
		const el = labelOf(fixture)

		expect(textOf(el).textContent).toBe('До')

		fixture.componentInstance.text.set('После')
		fixture.detectChanges()

		expect(textOf(el).textContent).toBe('После')
	})

	it('слот content переопределяет проп и встаёт в обёртку текста', () => {
		const el = labelOf(mountHost(ContentSlotHost))

		expect(textOf(el).querySelector('b')?.textContent).toBe('Слот')
		expect(textOf(el).textContent).toBe('Слот')
		expect(el.querySelector('.so-label__control b')).toBeNull()
	})

	/**
	 * Тема прячет пустую обёртку по `:empty`, а пробельный текст или элемент
	 * внутри этот селектор выключили бы: рядом с одиноким контролом остался бы
	 * зазор. Пустой текстовый узел и комментарий-якорь Angular `:empty` не
	 * мешают — по спецификации их селектор не считает.
	 */
	it('без текста обёртка пуста — ни пробела, ни элемента', () => {
		const text = textOf(labelOf(mountHost(EmptyHost)))

		expect(text.children).toHaveLength(0)
		expect(text.textContent).toBe('')
	})
})

/**
 * Подпись с контролом и колбэком смены значения. Селектор у хостов свой: их
 * разметка различается только тегом контрола, а тег в id компонента Angular
 * не входит — без селектора id совпал бы (предупреждение NG0912).
 */
@Component({
	selector: 'probe-check-box-change',
	standalone: true,
	imports: [TLabelComponent, TCheckBoxComponent],
	template: `<label so-label text="Согласен"
		><so-check-box (soChangeValue)="changes.push($event)"
	/></label>`,
})
class CheckBoxChangeHost {
	readonly changes: unknown[] = []
}

@Component({
	selector: 'probe-switch-change',
	standalone: true,
	imports: [TLabelComponent, TSwitchComponent],
	template: `<label so-label text="Согласен"
		><so-switch (soChangeValue)="changes.push($event)"
	/></label>`,
})
class SwitchChangeHost {
	readonly changes: unknown[] = []
}

/** CheckBox и Switch устроены одинаково: корень и `<input type="checkbox">` в нём. */
const CHECKABLES = [
	['CheckBox', CheckBoxChangeHost],
	['Switch', SwitchChangeHost],
] as const

describe.each(CHECKABLES)('Label · %s в подписи', (_name, host) => {
	it('у поля одна подпись — сама Label', () => {
		const el = labelOf(mountHost(host))
		const input = find(el, 'input', HTMLInputElement)

		expect([...(input.labels ?? [])]).toEqual([el])
	})

	it('клик по тексту переключает контрол один раз', async () => {
		const fixture = mountHost(host)
		const el = labelOf(fixture)

		// Слушатель поля плагин вешает кадром позже, по `ready` узла
		await nextFrame()

		textOf(el).click()
		fixture.detectChanges()

		expect(find(el, 'input', HTMLInputElement).checked).toBe(true)
		expect(fixture.componentInstance.changes).toEqual([{ newValue: true, oldValue: false }])
	})
})

/** Группа с одним радио внутри подписи: корень радио — `label` или `span`. */
@Component({
	standalone: true,
	imports: [TLabelComponent, TRadioGroupComponent, TRadioGroupItemComponent],
	template: `<div so-radio-group (soChangeValue)="changes.push($event)">
		<label so-label text="Курьер"><label so-radio-group-item value="a"></label></label>
	</div>`,
})
class LabelRadioHost {
	readonly changes: TValuePayload<TRadioGroupValue>[] = []
}

@Component({
	standalone: true,
	imports: [TLabelComponent, TRadioGroupComponent, TRadioGroupItemComponent],
	template: `<div so-radio-group (soChangeValue)="changes.push($event)">
		<label so-label text="Курьер"
			><span so-radio-group-item value="a" (change)="fieldChanges = fieldChanges + 1"></span
		></label>
	</div>`,
})
class LabelSpanRadioHost {
	readonly changes: TValuePayload<TRadioGroupValue>[] = []
	fieldChanges = 0
}

describe('Label · радио в подписи', () => {
	/** Тексты предупреждений подписи о вложенном `label`. */
	const nestedWarnings = (calls: readonly unknown[][]): string[] =>
		calls.map(([message]) => String(message)).filter((text) => text.includes('[soldy] Label'))

	it('радио на label — предупреждение о вложенном label', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		mountHost(LabelRadioHost)

		// Плагин смотрит узел по `ready`, то есть кадром позже
		await nextFrame()

		const warnings = nestedWarnings(warn.mock.calls)

		expect(warnings).toHaveLength(1)
		expect(warnings[0]).toContain('tag="span"')
	})

	/**
	 * Клик по тексту подписи браузер доводит до её первого поля — радио, и
	 * `change` поле получает один, как у любого `label`.
	 */
	it('радио на span — тишина, у радио одна подпись, клик по тексту даёт один change', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const fixture = mountHost(LabelSpanRadioHost)

		await nextFrame()

		const label = labelOf(fixture)
		const input = find(label, 'input', HTMLInputElement)

		expect(nestedWarnings(warn.mock.calls)).toEqual([])
		expect([...(input.labels ?? [])]).toEqual([label])
		expect(find(label, '.so-radio-group-item', HTMLSpanElement).tagName).toBe('SPAN')

		textOf(label).click()
		fixture.detectChanges()

		expect(input.checked).toBe(true)
		expect(fixture.componentInstance.fieldChanges).toBe(1)
		expect(fixture.componentInstance.changes).toEqual([{ newValue: 'a', oldValue: undefined }])
	})
})
