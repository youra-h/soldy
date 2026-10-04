/**
 * Ожидание конца переезда геометрии активного таба — когда `TTabsViewPlugin`
 * может снять со списка признак переезда.
 *
 * Геометрию активного таба тема рисует псевдоэлементами самого списка —
 * карточку `contained`, — и ведёт её переходом, пока на списке стоит признак
 * `--active-tab-moving`; без него длительность перехода нулевая. Снимать
 * признак надо, когда переход доиграл: снятый посреди переезда, он выключил бы
 * переход у сдвига, пришедшего следом (сосед встал на место закрытого таба), и
 * карточка доскочила бы рывком.
 *
 * Чисел темы здесь нет: сколько длится переход, знает сам переход.
 *
 * Устроено как ожидание закрытия у замка прокрутки в `@soldy-ui/plugins`
 * (`scroll-lock/transitions.ts`). Утилиты плагинов наружу не отдаются, а
 * выборка здесь своя: переходы псевдоэлементов узла, а не самого узла.
 */

/**
 * Позвать `done`, когда псевдоэлементы узла доиграют CSS-переходы, которые
 * идут у них кадром позже. Отдаёт отмену: после неё `done` не позовётся, даже
 * если ожидание кончится потом.
 *
 * **Кадр.** Переменные на списке плагин пишет сразу, а выбранный таб адаптер
 * отрисует в своём цикле — от него зависит, есть ли карточка вовсе. Кадром
 * позже разметка уже отрисована. Отрисовки кадра ждать не нужно:
 * `getAnimations()` сам применяет отложенные стили, и переход, который начала
 * запись, виден сразу.
 *
 * **Какие переходы.** Только псевдоэлементов самого узла: у списка в
 * `getAnimations({ subtree: true })` есть и переходы табов — цвет текста
 * строки под указателем и подобное, — а переезду они не принадлежат. И только
 * `CSSTransition`: у перехода конец есть всегда. Классы берутся из окна узла, а
 * не глобальные: компонент живёт и в `iframe`, и объекты его анимаций — из
 * чужого окна.
 *
 * **Конец** — `finished` у каждого перехода. Отменённый переход (`finished`
 * отклонён с `AbortError`: карточку сняли, переход перебит новым значением) —
 * тоже конец, и отклонение обработано здесь же: необработанное ушло бы в
 * `unhandledrejection`. Переходов нет или нет Web Animations вовсе (jsdom) —
 * `done` зовётся в том же кадре.
 */
export function afterPseudoTransitions(element: Element, done: () => void): () => void {
	let cancelled = false

	const finish = (): void => {
		if (!cancelled) done()
	}

	const frame = requestAnimationFrame(() => {
		const transitions = pseudoTransitionsOf(element)

		if (transitions.length === 0) {
			finish()

			return
		}

		void Promise.all(transitions.map(ended)).then(finish)
	})

	return () => {
		cancelled = true
		cancelAnimationFrame(frame)
	}
}

/** Идущие CSS-переходы псевдоэлементов самого узла. */
function pseudoTransitionsOf(element: Element): Animation[] {
	const view = element.ownerDocument.defaultView
	const Transition = view?.CSSTransition
	const Effect = view?.KeyframeEffect

	// Без Web Animations переходов не видно — ждать нечего
	if (
		typeof Transition !== 'function' ||
		typeof Effect !== 'function' ||
		typeof element.getAnimations !== 'function'
	) {
		return []
	}

	return element
		.getAnimations({ subtree: true })
		.filter(
			(animation) =>
				animation instanceof Transition &&
				animation.effect instanceof Effect &&
				animation.effect.target === element &&
				animation.effect.pseudoElement !== null,
		)
}

/** Переход доиграл или его отменили — для признака это одно и то же. */
function ended(transition: Animation): Promise<unknown> {
	return transition.finished.catch(() => undefined)
}
