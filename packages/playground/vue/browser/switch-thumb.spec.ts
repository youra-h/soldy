/**
 * Ручка Switch в настоящем браузере — где она стоит выключенной и
 * включённой, в LTR и в RTL.
 *
 * Место ручки задаёт тема (`themes/oren/src/components/switch/`): ручка ходит
 * от начала строки (`inset-inline-start`), и в RTL переключатель
 * разворачивается сам — выключенная ручка стоит справа, включённая уходит
 * влево. Раньше место было физическим (`left`), а включённую ручку уводил
 * `translate`, у которого логических направлений нет: в RTL переключатель
 * выглядел так же, как в LTR. Раскладки jsdom не считает — поэтому спек
 * браузерный.
 *
 * Направление задаётся так же, как его задаёт потребитель: `dir` у предка и
 * проп `direction`, который пишет `dir` корню. Обратный случай — проп `ltr`
 * внутри RTL-предка: селектор темы по атрибуту `dir` предка развернул бы и
 * его, а логическое свойство берёт направленность самого переключателя.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { defineComponent, h, nextTick } from 'vue'
import { TSwitch } from '@soldy-ui/core'
import type { TComponentSize, TDirection } from '@soldy-ui/core'
import { Switch } from '@soldy-ui/vue'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'

import { find } from './colors'
import { settled, transitionEvents, transitionRuns } from './transitions'

import '@soldy-ui/theme-oren'

/** Допуск на субпиксельное округление координат, px. */
const EPSILON = 0.5

type TLine = 'ltr' | 'rtl'

type TEdge = 'left' | 'right'

/** Край дорожки — словом, для сообщений проверок. */
const EDGE: Record<TEdge, string> = { left: 'левого', right: 'правого' }

type TCase = {
	name: string
	/** `dir` предка; нет его — направление страницы, LTR. */
	ancestor?: TLine
	/** Проп `direction` переключателя. */
	direction?: TDirection
	/** Направление строки, которое из них выходит. */
	line: TLine
}

const CASES: readonly TCase[] = [
	{ name: 'LTR', line: 'ltr' },
	{ name: 'RTL у предка', ancestor: 'rtl', line: 'rtl' },
	{ name: 'RTL пропом direction', direction: 'rtl', line: 'rtl' },
	{ name: 'LTR пропом direction в RTL-предке', ancestor: 'rtl', direction: 'ltr', line: 'ltr' },
]

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

const thumb = () => find('.s-switch__track--thumb')

/** Выключенный переключатель в сцене. Включает его тест через экземпляр ядра. */
async function show(size: TComponentSize, { ancestor, direction }: TCase): Promise<TSwitch> {
	const ctrl = new TSwitch()

	render(
		defineComponent({
			render: () =>
				h('div', { dir: ancestor, style: 'padding: 16px' }, [
					h(Switch, { ctrl, size, direction }),
				]),
		}),
	)

	await nextTick()
	await nextFrame()

	return ctrl
}

/** Зазоры между ручкой и левым и правым краем дорожки, px. */
function gaps(): Record<TEdge, number> {
	const track = find('.s-switch__track').getBoundingClientRect()
	const knob = thumb().getBoundingClientRect()

	return { left: knob.left - track.left, right: track.right - knob.right }
}

/** Включить и дождаться, пока ручка доедет: в пути она стоит между краями. */
async function switchOn(ctrl: TSwitch): Promise<void> {
	ctrl.value = true

	await transitionEvents()
	await settled(thumb())
}

afterEach(() => {
	cleanup()
})

describe.each(CASES)('$name', (scenario) => {
	/** Края дорожки по направлению строки: где её начало и где конец. */
	const [start, end] =
		scenario.line === 'ltr' ? (['left', 'right'] as const) : (['right', 'left'] as const)

	it.each(COMPONENT_SIZES)(
		'%s: выключенная ручка у начала строки, включённая — у конца',
		async (size) => {
			const ctrl = await show(size, scenario)
			const off = gaps()

			await switchOn(ctrl)

			const on = gaps()

			expect(off[start], `выключенная — у ${EDGE[start]} края`).toBeLessThan(off[end])

			// Включённая — зеркало выключенной: у другого края с тем же зазором
			const mirrored = Math.abs(on[end] - off[start])

			expect(mirrored, `включённая — у ${EDGE[end]} края`).toBeLessThanOrEqual(EPSILON)
		},
	)

	/**
	 * Положительный контроль хода: место ручки — `inset-inline-start`, и
	 * переход обязан идти по нему. Переход прежнего сдвига остался бы без
	 * дела, и ручка прыгала бы с края на край.
	 */
	it('включение — ручка едет переходом, а не прыгает', async () => {
		const ctrl = await show('normal', scenario)
		const runs = transitionRuns(thumb())

		ctrl.value = true
		await transitionEvents()

		expect(runs).not.toEqual([])
	})
})
