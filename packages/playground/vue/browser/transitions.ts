/**
 * CSS-переходы темы в настоящем браузере — общее для спеков, которые смотрят,
 * как слой появляется и исчезает (`drawer.spec.ts`, `dialog.spec.ts`), и как
 * новое значение доезжает до места переходом (`slider.spec.ts`,
 * `progress-linear.spec.ts`).
 *
 * Хуков под анимацию у кода нет: переход держит тема, и увидеть его можно
 * только на самом узле. Браузер заводит на каждое свойство, которое идёт
 * переходом, объект `CSSTransition` (`getAnimations()`): по нему видно, идёт
 * ли переход, какое свойство он ведёт и сколько длится.
 *
 * Одна копия на всех, как у `colors.ts` и `media.ts`: разойдись две, один спек
 * молча мерил бы переход иначе, чем другой.
 */

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
