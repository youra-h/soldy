// @vitest-environment jsdom

/**
 * Направление роста — одно понятие на указатель и клавиатуру: ось,
 * вычисленное направление письма и `inverted` сводятся в него один раз. По нему
 * точка указателя переводится в долю хода, а стрелка — в шаг.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { arrowStep, fractionAt, lengthAlong, slideDirection } from '../src'
import type { TSlideDirection } from '../src'
import type { TSlideOrientation } from '@soldy-ui/core'

afterEach(() => {
	document.body.innerHTML = ''
})

/** Узел с направлением письма от предка — вычисленное, а не своё. */
function nodeIn(dir: 'ltr' | 'rtl'): Element {
	const host = document.createElement('div')
	const node = document.createElement('span')

	host.dir = dir
	host.append(node)
	document.body.append(host)

	return node
}

describe('slideDirection — все сочетания оси, направления письма и inverted', () => {
	it.each<[TSlideOrientation, 'ltr' | 'rtl', boolean, TSlideDirection]>([
		['horizontal', 'ltr', false, 'from-left'],
		['horizontal', 'ltr', true, 'from-right'],
		['horizontal', 'rtl', false, 'from-right'],
		['horizontal', 'rtl', true, 'from-left'],
		['vertical', 'ltr', false, 'from-bottom'],
		['vertical', 'ltr', true, 'from-top'],
		['vertical', 'rtl', false, 'from-bottom'],
		['vertical', 'rtl', true, 'from-top'],
	])('%s, %s, inverted: %s → %s', (orientation, dir, inverted, expected) => {
		expect(slideDirection({ orientation, inverted }, nodeIn(dir))).toBe(expected)
	})
})

describe('fractionAt — доля хода по коробке дорожки и точке', () => {
	// Дорожка 200×40 с левым верхним углом в (100, 50)
	const box = new DOMRect(100, 50, 200, 40)

	it.each<[TSlideDirection, number, number, number]>([
		['from-left', 150, 0, 0.25],
		['from-right', 150, 0, 0.75],
		['from-bottom', 0, 60, 0.75],
		['from-top', 0, 60, 0.25],
	])('%s: точка (%s, %s) → %s', (direction, clientX, clientY, expected) => {
		expect(fractionAt(direction, box, { clientX, clientY })).toBe(expected)
	})

	it('за краями дорожки — край', () => {
		expect(fractionAt('from-left', box, { clientX: 20, clientY: 0 })).toBe(0)
		expect(fractionAt('from-left', box, { clientX: 900, clientY: 0 })).toBe(1)
		expect(fractionAt('from-bottom', box, { clientX: 0, clientY: 0 })).toBe(1)
	})

	it('коробка нулевой длины — начало хода', () => {
		expect(
			fractionAt('from-left', new DOMRect(10, 10, 0, 0), { clientX: 40, clientY: 0 }),
		).toBe(0)
	})
})

describe('lengthAlong — длина хода по оси направления', () => {
	// Та же дорожка 200×40: по ней радиус щелчка в px становится долей хода
	const box = new DOMRect(100, 50, 200, 40)

	it.each<[TSlideDirection, number]>([
		['from-left', 200],
		['from-right', 200],
		['from-bottom', 40],
		['from-top', 40],
	])('%s → %s px', (direction, expected) => {
		expect(lengthAlong(direction, box)).toBe(expected)
	})
})

describe('arrowStep — стрелка своей оси ведёт туда, куда смотрит', () => {
	it.each<[TSlideDirection, Record<string, 1 | -1>]>([
		['from-left', { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }],
		['from-right', { ArrowLeft: 1, ArrowUp: 1, ArrowRight: -1, ArrowDown: -1 }],
		['from-bottom', { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }],
		['from-top', { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }],
	])('%s', (direction, expected) => {
		const actual = Object.fromEntries(
			Object.keys(expected).map((key) => [key, arrowStep(direction, key)]),
		)

		expect(actual).toEqual(expected)
	})

	it('не стрелка — null', () => {
		expect(arrowStep('from-left', 'Home')).toBeNull()
		expect(arrowStep('from-left', 'a')).toBeNull()
	})
})
