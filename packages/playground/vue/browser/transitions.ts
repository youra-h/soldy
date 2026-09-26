/**
 * CSS-переходы темы в настоящем браузере — общее для спеков, которые смотрят,
 * как слой появляется и исчезает (`drawer.spec.ts`, `dialog.spec.ts`).
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
