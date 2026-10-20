/**
 * CSS-переходы темы в настоящем браузере — общее для спеков, которые смотрят,
 * как слой появляется и исчезает (`drawer.spec.ts`, `dialog.spec.ts`,
 * `popover.spec.ts`, `select.spec.ts`, `date-picker.spec.ts`,
 * `popover-swipe.spec.ts`, `anchored-swipe.spec.ts`, `calendar.spec.ts`), как
 * новое значение доезжает до места переходом (`slider.spec.ts`,
 * `progress-linear.spec.ts`, `tabs-line.spec.ts`, `tabs-contained.spec.ts`,
 * сосед перетаскиваемой колонки в `table.spec.ts`), когда переход начинается
 * (линия ручки ширины там же ждёт задержки указателя) и что ведут кадры
 * анимации (`progress-spinner.spec.ts`, `motion-mode.spec.ts`).
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

/** Задержка перехода, мс — `transition-delay`. `effect` бывает `null`. */
export const delayOf = (transition: CSSTransition): number => {
	const delay = transition.effect?.getTiming().delay

	if (delay === undefined) throw new Error(`${transition.transitionProperty}: задержки нет`)

	return delay
}

/** Кривая перехода — `transition-timing-function` в записи браузера. */
export const easingOf = (transition: CSSTransition): string => {
	const easing = transition.effect?.getTiming().easing

	if (easing === undefined) throw new Error(`${transition.transitionProperty}: кривой нет`)

	return easing
}

/** Сколько кадров самое большее ждать исчезания после действия: две секунды при 60 Гц. */
const LEAVING_FRAMES = 120

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Действие закрывает узел, и узел исчезает: `check` — в каждом кадре, где узел
 * уже закрыт (`data-open="false"` — его пишет слой у всех узлов вызова) и ещё
 * на экране, — до `display: none`. Отдаёт, сколько таких кадров было: исчезни
 * узел сразу, проверять было бы нечего, и сторож прошёл бы сам.
 *
 * Кадры смотрит цикл, заведённый до действия, а не после него: ответ
 * `userEvent` и команд идёт кругом RPC и под нагрузкой приходит позже, чем узел
 * успевает исчезнуть, — взгляд после действия застал бы уже `display: none`.
 * Поэтому до действия узел обязан быть открыт (`data-open="true"`): иначе
 * цикл не отличил бы это закрытие от прошлого, и сторож был бы пуст.
 *
 * Ошибку `check` цикл держит у себя и бросает, когда действие кончилось: так
 * протяжка не доедет до следующего теста, а отклонение не останется без
 * обработчика. Лимит кадров считается от конца действия — само действие идёт
 * столько, сколько ему нужно.
 */
export const whileLeaving = async (
	element: HTMLElement,
	action: () => Promise<unknown>,
	check: () => void,
): Promise<number> => {
	if (element.dataset.open !== 'true') {
		throw new Error(`до действия узел не открыт: data-open="${element.dataset.open}"`)
	}

	let seen = 0
	/** Кадров после конца действия; пока оно идёт — `null`. */
	let after: number | null = null
	/** Действие упало: цикл кончается, не дожидаясь узла. */
	let stopped = false

	// Ошибка — значением, а не отклонением: пока идёт действие, обработчика у
	// цикла нет
	const leaving = new Promise<{ error: unknown } | null>((resolve) => {
		const frame = () => {
			if (stopped) return resolve(null)

			const closed = element.dataset.open === 'false'

			if (closed && getComputedStyle(element).display === 'none') return resolve(null)

			if (after !== null) {
				if (after === LEAVING_FRAMES) {
					return resolve({
						error: new Error(
							`узел не исчез за ${LEAVING_FRAMES} кадров после действия`,
						),
					})
				}

				after += 1
			}

			if (closed) {
				try {
					check()
				} catch (error) {
					return resolve({ error })
				}

				seen += 1
			}

			requestAnimationFrame(frame)
		}

		requestAnimationFrame(frame)
	})

	try {
		await action()
	} catch (error) {
		stopped = true
		throw error
	}

	after = 0

	const failure = await leaving

	if (failure) throw failure.error

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
 * Переходы самого узла по свойствам — по мере прихода `transitionrun`, как у
 * `ownTransitionRuns`. Переход берётся в самом событии, а читать его можно и
 * после конца: длительность застаётся, даже если тест снова получил
 * управление, когда переход уже доиграл, — ответ Playwright на ввод идёт
 * кругом RPC. У свойства, которое переходом шло не раз, — последний переход.
 */
export const ownTransitions = (element: HTMLElement): ReadonlyMap<string, CSSTransition> => {
	const found = new Map<string, CSSTransition>()

	element.addEventListener('transitionrun', (event) => {
		if (event.target !== element || event.pseudoElement !== '') return

		found.set(event.propertyName, transitionOf(element, event.propertyName))
	})

	return found
}

/**
 * Закрытая панель у якоря пропадает, когда догасла: `display` у неё идёт ровно
 * время прозрачности (`themes/oren/src/mixins/_anchored.scss`) — и у той, что
 * уходит от якоря дольше. Дольше прозрачности — и догасшая панель висела бы в
 * раскладке прозрачной: глазу её нет, а скринридер видит закрытую панель, и
 * то, что ждёт конца закрытия (`afterTransitions`), срабатывает позже. Короче —
 * и панель пропала бы, не догаснув. Переходы — `ownTransitions`, заведённый
 * до закрытия.
 */
export const expectHidesWhenFaded = (transitions: ReadonlyMap<string, CSSTransition>): void => {
	const duration = (property: string): number => {
		const transition = transitions.get(property)

		if (transition === undefined) throw new Error(`${property}: перехода не было`)

		return durationOf(transition)
	}

	expect(duration('display'), 'display — ровно время прозрачности').toBe(duration('opacity'))
}

/**
 * Панель гаснет на месте и только потом пропадает — так закрывается панель у
 * якоря без жеста (`themes/oren/src/mixins/_anchored.scss`): Popover, Select
 * и DatePicker, а без движения — и с жестом. Панель меряется открытой, `close`
 * её закрывает, и в каждом кадре, пока закрытая панель на экране
 * (`whileLeaving`), она нажатий не ловит — указатель в её середине попадает в
 * то, что под ней, — не сдвигается, а прозрачность у неё только убывает.
 * Переходит одна прозрачность: из переходов самой панели, кроме `display`, —
 * только `opacity`. Пропадает панель, когда догасла (`expectHidesWhenFaded`).
 */
export const expectFadesInPlace = async (
	panel: HTMLElement,
	close: () => Promise<unknown>,
): Promise<void> => {
	const { top, left, width, height } = panel.getBoundingClientRect()
	const runs = ownTransitionRuns(panel)
	const transitions = ownTransitions(panel)
	const opacities: number[] = []

	const seen = await whileLeaving(panel, close, () => {
		const box = panel.getBoundingClientRect()
		const hit = document.elementFromPoint(left + width / 2, top + height / 2)

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
	expectHidesWhenFaded(transitions)
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

/**
 * Переход свойства у псевдоэлемента узла, который завело действие, — на паузе
 * с его же `transitionrun`. Слушатель вешается до действия и ставит паузу в
 * странице, в кадре, где пришло событие, — дальше мгновение перехода выбирает
 * тест (`currentTime`), а не ответ действия. Ответ `userEvent` идёт кругом RPC
 * и под нагрузкой приходит, когда переход уже идёт: так линия ручки ширины
 * таблицы, которая ждёт задержки указателя, застигалась уже загоревшейся.
 *
 * Ловится первый такой переход, следующие идут своим ходом. Нет его и через
 * два кадра после действия (`transitionEvents`) — тест падает здесь, а не по
 * своему таймауту.
 */
export const pausedPseudoTransition = async (
	element: HTMLElement,
	pseudo: string,
	property: string,
	action: () => Promise<unknown>,
): Promise<CSSTransition> => {
	/** Что застал слушатель: переход на паузе или ошибку. */
	const caught: Array<CSSTransition | Error> = []

	const listener = (event: TransitionEvent) => {
		if (
			event.target !== element ||
			event.pseudoElement !== pseudo ||
			event.propertyName !== property
		) {
			return
		}

		element.removeEventListener('transitionrun', listener)

		const found = element
			.getAnimations({ subtree: true })
			.find(
				(animation) =>
					animation instanceof CSSTransition &&
					animation.transitionProperty === property &&
					animation.effect instanceof KeyframeEffect &&
					animation.effect.target === element &&
					animation.effect.pseudoElement === pseudo,
			)

		if (found instanceof CSSTransition) {
			found.pause()
			caught.push(found)
		} else {
			caught.push(
				new Error(`${pseudo} ${property}: переход кончился до своего transitionrun`),
			)
		}
	}

	element.addEventListener('transitionrun', listener)

	try {
		await action()
		await transitionEvents()
	} finally {
		element.removeEventListener('transitionrun', listener)
	}

	const first = caught.at(0)

	if (first === undefined) throw new Error(`${pseudo} ${property}: перехода не было`)
	if (first instanceof Error) throw first

	return first
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
