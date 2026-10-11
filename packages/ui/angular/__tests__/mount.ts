/**
 * Монтирование в спеках компонентов Angular.
 *
 * Хост — компонент спека с разметкой потребителя: корень компонента soldy —
 * элемент, который в ней написан (`<i so-icon>`), и найти его можно только в
 * разметке хоста. Значения, которые хост меняет по ходу теста, — сигналы:
 * хосты `OnPush`, и `fixture.detectChanges()` перепроверяет шаблон только по
 * смене сигнала.
 */

import type { Type } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'

/** Смонтировать хост и выполнить первую проверку изменений. */
export function mountHost<T>(host: Type<T>): ComponentFixture<T> {
	const fixture = TestBed.createComponent(host)

	fixture.detectChanges()

	return fixture
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
export function find<T extends Element>(
	scope: ParentNode,
	selector: string,
	type: { new (): T; prototype: T },
): T {
	const element = scope.querySelector(selector)

	if (!(element instanceof type)) throw new Error(`${selector}: нужного узла нет`)

	return element
}

/** Элемент разметки хоста по селектору. */
export function findIn<T extends Element>(
	fixture: ComponentFixture<unknown>,
	selector: string,
	type: { new (): T; prototype: T },
): T {
	const host: HTMLElement = fixture.nativeElement

	return find(host, selector, type)
}

/**
 * Кадр: `TElementPlugin` объявляет узел через `requestAnimationFrame`, и
 * `element:ready` приходит после него.
 */
export const nextFrame = (): Promise<void> =>
	new Promise((resolve) => requestAnimationFrame(() => resolve()))
