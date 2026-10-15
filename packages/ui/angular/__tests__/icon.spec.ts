/**
 * Icon под Angular: размер из разметки, доступное имя, иконка по роли и тег по
 * умолчанию.
 *
 * Сценарии — те же, что у React, Svelte и Solid (`icon.spec.*`): размер держит
 * плагин раскладки, имя — плагин доступного имени, а база компонента их только
 * раскладывает на корень. Забытая раскладка молча оставила бы иконку без
 * размера или без имени.
 *
 * Корень — элемент потребителя (`<i so-icon>`), поэтому тега-компонента, как
 * у JSX-адаптеров, здесь нет: иконку из пакета на `<svg so-icon>` кладёт
 * директива `RoleIconDirective`, а класс, стиль, ARIA и `TElementPlugin` у
 * этого `<svg>` — та же база Icon.
 */

import { describe, it, expect } from 'vitest'
import { Component, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { TIcon } from '@soldy-ui/core'
import { getIcon } from '@soldy-ui/setup'
import { RoleIconDirective, TIconComponent } from '@soldy-ui/angular'
import { findIn, mountHost, nextFrame } from './mount'

/** Пространство имён SVG: в нём документ разбирает рисунок иконки. */
const SVG = 'http://www.w3.org/2000/svg'

/**
 * Содержимое иконки так, как его разбирает документ: SVG внутри HTML jsdom
 * пишет с закрывающими тегами (`<path></path>`), а пакет — самозакрытыми.
 */
function parsed(body: string): string {
	const svg = document.createElementNS(SVG, 'svg')

	svg.innerHTML = body

	return svg.innerHTML
}

@Component({
	standalone: true,
	imports: [TIconComponent],
	template: `<i so-icon [width]="24" height="2em"></i>`,
})
class SizedHost {}

@Component({
	standalone: true,
	imports: [TIconComponent],
	template: `<i so-icon [ctrl]="ctrl"></i>`,
})
class CtrlHost {
	readonly ctrl = new TIcon({ width: 32 })
}

@Component({
	standalone: true,
	imports: [TIconComponent],
	template: `<i so-icon [width]="width()"></i>`,
})
class WidthHost {
	readonly width = signal<number | undefined>(24)
}

@Component({
	standalone: true,
	imports: [TIconComponent],
	template: `<i so-icon></i><i so-icon aria_label="Ошибка"></i>`,
})
class NameHost {}

describe('Icon · размер из разметки', () => {
	it('width и height стоят в style с монтирования', () => {
		const el = findIn(mountHost(SizedHost), '[so-icon]', HTMLElement)

		expect(el.style.width).toBe('24px')
		expect(el.style.height).toBe('2em')
		// Атрибуты-входы — запись входа, а не атрибуты корня
		expect(el.hasAttribute('height')).toBe(false)
	})

	it('внешний ctrl с размером — тоже', () => {
		const el = findIn(mountHost(CtrlHost), '[so-icon]', HTMLElement)

		expect(el.style.width).toBe('32px')
		expect(el.style.height).toBe('')
	})

	it('без размеров атрибута style нет: размер даёт size', () => {
		const el = findIn(mountHost(NameHost), '[so-icon]', HTMLElement)

		expect(el.hasAttribute('style')).toBe(false)
		expect(el.classList.contains('so-icon--size-normal')).toBe(true)
	})

	it('смена размера доходит до style, снятый размер его убирает', () => {
		const fixture = mountHost(WidthHost)
		const el = findIn(fixture, '[so-icon]', HTMLElement)

		fixture.componentInstance.width.set(32)
		fixture.detectChanges()

		expect(el.style.width).toBe('32px')

		fixture.componentInstance.width.set(undefined)
		fixture.detectChanges()

		expect(el.style.width).toBe('')
	})
})

describe('Icon · доступное имя', () => {
	it('без имени скрыта от скринридера', () => {
		// Иконка почти всегда дублирует соседний текст
		const el = findIn(mountHost(NameHost), '[so-icon]', HTMLElement)

		expect(el.getAttribute('aria-hidden')).toBe('true')
	})

	it('с именем становится картинкой и перестаёт быть скрытой', () => {
		const el = findIn(mountHost(NameHost), '[aria-label]', HTMLElement)

		// Скрытый элемент не участвует в вычислении имени: плагин обязан снять
		// aria-hidden, поставленный ядром, а не просто добавить имя
		expect(el.hasAttribute('aria-hidden')).toBe(false)
		expect(el.getAttribute('role')).toBe('img')
		expect(el.getAttribute('aria-label')).toBe('Ошибка')
	})
})

@Component({
	standalone: true,
	imports: [TIconComponent, RoleIconDirective],
	template: `<svg
		so-icon
		[so-role-icon]="role()"
		[width]="20"
		(soElementReady)="ready.push($event)"
	>
		<text>внутри</text>
	</svg>`,
})
class RoleIconHost {
	readonly role = signal('arrowDown')
	readonly ready: Element[] = []
}

@Component({
	standalone: true,
	imports: [TIconComponent, RoleIconDirective],
	template: `<svg so-icon so-role-icon="close" aria_label="Закрыть"></svg>`,
})
class NamedRoleIconHost {}

/**
 * Иконка по роли — `<svg so-icon so-role-icon="…">`: рисунок из пакета иконок
 * кладёт директива, а корень Icon — сам этот `<svg>`, с атрибутами корня и
 * связью с `TElementPlugin`.
 */
describe('Icon · иконка по роли', () => {
	it('корень — <svg> иконки с классами, ARIA и размером', () => {
		const svg = findIn(mountHost(RoleIconHost), 'svg', SVGSVGElement)
		const source = getIcon('arrowDown')

		expect(svg.getAttribute('class')).toBe('so-icon so-icon--size-normal')
		expect(svg.getAttribute('aria-hidden')).toBe('true')
		expect(svg.style.width).toBe('20px')
		expect(svg.getAttribute('viewBox')).toBe(source.viewBox)
		// Рисунок — из пакета, написанное внутри элемента не выводится
		expect(svg.innerHTML).toBe(parsed(source.body))
		// Содержимое иконки — в пространстве имён SVG, а не HTML
		expect(svg.firstElementChild?.namespaceURI).toBe(SVG)
	})

	it('ready приходит с <svg> иконки', async () => {
		const fixture = mountHost(RoleIconHost)

		await nextFrame()

		expect(fixture.componentInstance.ready).toEqual([findIn(fixture, 'svg', SVGSVGElement)])
	})

	it('с именем — картинка с ролью и именем', () => {
		const svg = findIn(mountHost(NamedRoleIconHost), 'svg', SVGSVGElement)

		expect(svg.getAttribute('role')).toBe('img')
		expect(svg.getAttribute('aria-label')).toBe('Закрыть')
		expect(svg.hasAttribute('aria-hidden')).toBe(false)
		expect(svg.innerHTML).toBe(parsed(getIcon('close').body))
	})

	it('смена роли — рисунок другой роли на том же <svg>, узел не пересоздан', async () => {
		const fixture = mountHost(RoleIconHost)
		const svg = findIn(fixture, 'svg', SVGSVGElement)

		await nextFrame()

		fixture.componentInstance.role.set('check')
		fixture.detectChanges()
		await nextFrame()

		const source = getIcon('check')

		expect(findIn(fixture, 'svg', SVGSVGElement)).toBe(svg)
		expect(svg.getAttribute('viewBox')).toBe(source.viewBox)
		expect(svg.innerHTML).toBe(parsed(source.body))
		expect(fixture.componentInstance.ready).toEqual([svg])
	})
})

@Component({
	standalone: true,
	imports: [TIconComponent],
	template: `<i so-icon>текст</i>`,
})
class ContentHost {}

describe('Icon · без содержимого', () => {
	/** Слотов у иконки нет: шаблон пуст, и проецировать написанное некуда. */
	it('написанное внутри элемента не выводится', () => {
		const el = findIn(mountHost(ContentHost), '[so-icon]', HTMLElement)

		expect(el.childNodes).toHaveLength(0)
		expect(el.textContent).toBe('')
	})
})

describe('Icon · элемент, созданный самим Angular', () => {
	/** По первому селектору (`span[so-icon]`) — тег ядра по умолчанию. */
	it('рисует span — элемент, который знает HTML', () => {
		const fixture = TestBed.createComponent(TIconComponent, { inferTagName: true })

		fixture.detectChanges()

		const el: HTMLElement = fixture.nativeElement

		expect(el.localName).toBe('span')
		expect(el.classList.contains('so-icon')).toBe(true)
	})
})
