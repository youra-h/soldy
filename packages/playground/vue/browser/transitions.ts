/**
 * CSS-переходы темы в настоящем браузере — общее для спеков, которые смотрят,
 * как слой появляется и исчезает (`drawer.spec.ts`, `dialog.spec.ts`,
 * `popover.spec.ts`, `select.spec.ts`, `date-picker.spec.ts`,
 * `popover-swipe.spec.ts`, `anchored-swipe.spec.ts`), как
 * новое значение доезжает до места переходом (`slider.spec.ts`,
 * `progress-linear.spec.ts`, `tabs-line.spec.ts`, `tabs-contained.spec.ts`) и
 * что ведут кадры анимации (`progress-spinner.spec.ts`, `motion-mode.spec.ts`).
 *
 * Хуков под анимацию у кода нет: переход держит тема, и увидеть его можно
 * только на самом узле. Браузер заводит на каждое свойство, которое идёт
 * переходом, объект `CSSTransition` (`getAnimations()`): по нему видно, идёт
 * ли переход, какое свойство он ведёт и сколько длится.
 *
 * Одна копия на всех, как у `colors.ts` и `media.ts`: разойдись две, один спек
 * молча мерил бы переход иначе, чем другой.
 */

import { expect } from 'vitest'

/**
 * Переходы на узле доигрывают, прежде чем мерить. Только свои: переходы
 * детей — цвет кнопки под фокусом и подобное — появлению слоя не принадлежат.
 */
export const settled = (element: Element): Promise<unknown> =>
	Promise.all(element.getAnimations().map((animation) => animation.finished))

/** Свойства, которые на узле сейчас идут CSS-переходом. */
export const transitioning = (element: Element): string[] =>
	element
		.getAnimations()
		.filter((animation) => animation instanceof CSSTransition)
		.map((animation) => animation.transitionProperty)

/** CSS-переход свойства на узле; нет его — тест падает здесь, а не на чтении. */
export const transitionOf = (element: Element, property: string): CSSTransition => {
	const found = element
		.getAnimations()
		.find(
			(animation) =>
				animation instanceof CSSTransition && animation.transitionProperty === property,
		)

	if (!(found instanceof CSSTransition)) throw new Error(`${property}: перехода нет`)

	return found
}

/** Длительность перехода, мс. `effect` бывает `null`, а `duration` — не только числом. */
export const durationOf = (transition: CSSTransition): number => {
	const duration = transition.effect?.getTiming().duration

	if (typeof duration !== 'number') {
		throw new Error(`${transition.transitionProperty}: длительности числом нет`)
	}

	return duration
}

/** Кривая перехода — `transition-timing-function` в записи браузера. */
export const easingOf = (transition: CSSTransition): string => {
	const easing = transition.effect?.getTiming().easing

	if (easing === undefined) throw new Error(`${transition.transitionProperty}: кривой нет`)

	return easing
}

/** Сколько кадров самое большее ждать исчезания: две секунды при 60 Гц. */
const LEAVING_FRAMES = 120

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Узел исчезает: `check` сразу и потом в каждом кадре, пока у узла не
 * `display: none`. Отдаёт, сколько раз узел застали на экране: исчезни он
 * сразу, проверять было бы нечего, и сторож прошёл бы сам.
 */
export const whileLeaving = async (element: Element, check: () => void): Promise<number> => {
	let seen = 0

	while (getComputedStyle(element).display !== 'none') {
		if (seen === LEAVING_FRAMES) throw new Error(`узел не исчез за ${LEAVING_FRAMES} кадров`)

		check()
		seen += 1
		await nextFrame()
	}

	return seen
}

/**
 * Свойства, которым браузер завёл переход на узле, — по мере прихода
 * `transitionrun`. Слушатель вешается до действия и застаёт переход, даже если
 * тот кончился раньше, чем тест снова получил управление: ответ Playwright на
 * ввод идёт кругом RPC, и снимок `getAnimations()` после действия мог бы уже
 * ничего не застать.
 */
export const transitionRuns = (element: HTMLElement): string[] => {
	const runs: string[] = []

	element.addEventListener('transitionrun', (event) => runs.push(event.propertyName))

	return runs
}

/**
 * `transitionRuns` только самого узла. События переходов детей всплывают до
 * него, и панель со списком или календарём внутри получала бы цвет строки под
 * указателем и кольцо фокуса дня, — появлению панели они не принадлежат.
 */
export const ownTransitionRuns = (element: HTMLElement): string[] => {
	const runs: string[] = []

	element.addEventListener('transitionrun', (event) => {
		if (event.target !== element || event.pseudoElement !== '') return

		runs.push(event.propertyName)
	})

	return runs
}

/**
 * Панель гаснет на месте и только потом пропадает — так закрывается панель у
 * якоря без жеста (`themes/oren/src/mixins/_anchored.scss`): Popover, Select
 * и DatePicker. Панель меряется открытой, `close` её закрывает, и пока у неё не
 * `display: none`, она закрыта (`data-open`), нажатий не ловит — указатель в
 * её середине попадает в то, что под ней, — не сдвигается, а прозрачность у
 * неё только убывает. Переходит одна прозрачность: из переходов самой панели,
 * кроме `display`, — только `opacity`.
 */
export const expectFadesInPlace = async (
	panel: HTMLElement,
	close: () => Promise<unknown>,
): Promise<void> => {
	const { top, left, width, height } = panel.getBoundingClientRect()
	const runs = ownTransitionRuns(panel)
	const opacities: number[] = []

	await close()

	const seen = await whileLeaving(panel, () => {
		const box = panel.getBoundingClientRect()
		const hit = document.elementFromPoint(left + width / 2, top + height / 2)

		expect(panel.dataset.open, 'закрыта').toBe('false')
		expect(getComputedStyle(panel).pointerEvents, 'нажатий не ловит').toBe('none')
		expect(hit !== null && panel.contains(hit), 'нажатие в середину — мимо неё').toBe(false)
		expect(Math.abs(box.top - top), 'на месте по вертикали').toBeLessThan(1)
		expect(Math.abs(box.left - left), 'на месте по горизонтали').toBeLessThan(1)
		opacities.push(Number(getComputedStyle(panel).opacity))
	})

	// Исчезни панель сразу, проверять было бы нечего, и сторож прошёл бы сам
	expect(seen, 'кадров на экране после закрытия').toBeGreaterThan(1)
	expect(
		runs.filter((name) => name !== 'display'),
		'переходит одна прозрачность',
	).toEqual(['opacity'])
	expect(Math.min(...opacities), 'прозрачность убывает').toBeLessThan(1)

	for (let index = 1; index < opacities.length; index += 1) {
		expect(opacities[index], `кадр ${index}`).toBeLessThanOrEqual(opacities[index - 1])
	}
}

/**
 * `transitionRuns` у псевдоэлемента узла. События переходов псевдоэлемента
 * браузер шлёт на сам узел с полем `pseudoElement`, а события переходов
 * детей всплывают до него же — их слушатель пропускает: так переходы цвета у
 * табов под указателем не попадают в переезд карточки списка.
 */
export const pseudoTransitionRuns = (element: HTMLElement, pseudo: string): string[] => {
	const runs: string[] = []

	element.addEventListener('transitionrun', (event) => {
		if (event.target !== element || event.pseudoElement !== pseudo) return

		runs.push(event.propertyName)
	})

	return runs
}

/**
 * Переходы псевдоэлемента узла доигрывают — `settled` для него. Переход,
 * перебитый новым значением, отменяется, и его `finished` отклонён: для
 * ожидания это тоже конец.
 */
export const pseudoSettled = (element: Element, pseudo: string): Promise<unknown> =>
	Promise.all(
		element
			.getAnimations({ subtree: true })
			.filter(
				(animation) =>
					animation.effect instanceof KeyframeEffect &&
					animation.effect.target === element &&
					animation.effect.pseudoElement === pseudo,
			)
			.map((animation) => animation.finished.catch(() => undefined)),
	)

/**
 * Дождаться событий переходов. Переход заводит пересчёт стиля — без замера
 * он случается только в кадре, после колбэков `requestAnimationFrame`, — а
 * `transitionrun` браузер шлёт в начале следующего кадра. Через два кадра
 * пришло всё, что вызвало действие, и пустой список значит, что переходов не
 * было.
 */
export const transitionEvents = async (): Promise<void> => {
	await nextFrame()
	await nextFrame()
}

/** Служебные ключи кадра `getKeyframes()` — не свойства. */
const FRAME_KEYS = new Set(['offset', 'computedOffset', 'easing', 'composite'])

/**
 * Свойства, которые ведут кадры анимации. Так видно, движение ли она: бег
 * индикатора ведёт сдвиг или поворот, мерцание без движения — одну
 * прозрачность.
 */
export const animatedProperties = (animation: Animation): string[] => {
	const frames = animation.effect instanceof KeyframeEffect ? animation.effect.getKeyframes() : []

	return [...new Set(frames.flatMap((frame) => Object.keys(frame)))].filter(
		(key) => !FRAME_KEYS.has(key),
	)
}
