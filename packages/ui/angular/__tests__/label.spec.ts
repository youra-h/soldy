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
 * Радио в подписи появится с RadioGroup: у Angular коллекций пока нет.
 */

import { describe, it, expect } from 'vitest'
import { Component, signal } from '@angular/core'
import type { TLabelPosition } from '@soldy-ui/core'
import { TCheckBoxComponent, TLabelComponent, TSwitchComponent } from '@soldy-ui/angular'
import { find, findIn, mountHost, nextFrame } from './mount'

/** Корень подписи в разметке хоста. */
const labelOf = (fixture: Parameters<typeof findIn>[0]) =>
	findIn(fixture, '[so-label]', HTMLLabelElement)

/** Обёртка текста подписи. */
const textOf = (root: Element) => find(root, '.s-label__text', HTMLElement)

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
			's-label',
			's-label--size-normal',
			's-label--position-end',
		])
		expect([...el.children].map((part) => part.className)).toEqual([
			's-label__control',
			's-label__text',
		])
		expect(el.querySelector('.s-label__control > .s-check-box > input')).not.toBeNull()
		expect(textOf(el).textContent).toBe('Согласен')
	})

	/** Корень — тот элемент, что написан: тег ядро берёт у него. */
	it('корень — элемент потребителя любого тега', () => {
		const fixture = mountHost(SpanLabelHost)
		const el = findIn(fixture, '[so-label]', HTMLSpanElement)

		expect(el.classList.contains('s-label')).toBe(true)
		expect(textOf(el).textContent).toBe('Подпись')
	})

	it('смена position меняет модификатор стороны, direction: rtl — dir на корне', () => {
		const fixture = mountHost(PositionHost)
		const el = labelOf(fixture)

		expect(el.classList.contains('s-label--position-start')).toBe(true)
		expect(el.getAttribute('dir')).toBe('rtl')

		fixture.componentInstance.position.set('top')
		fixture.detectChanges()

		expect(el.classList.contains('s-label--position-top')).toBe(true)
		expect(el.classList.contains('s-label--position-start')).toBe(false)
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
		expect(el.querySelector('.s-label__control b')).toBeNull()
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

/** Подпись с контролом и колбэком смены значения. */
@Component({
	standalone: true,
	imports: [TLabelComponent, TCheckBoxComponent],
	template: `<label so-label text="Согласен"
		><so-check-box (changeValue)="changes.push($event)"
	/></label>`,
})
class CheckBoxChangeHost {
	readonly changes: unknown[] = []
}

@Component({
	standalone: true,
	imports: [TLabelComponent, TSwitchComponent],
	template: `<label so-label text="Согласен"
		><so-switch (changeValue)="changes.push($event)"
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
