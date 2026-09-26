/**
 * Ожидание конца перехода закрытия — когда замку можно отдать свой счёт.
 *
 * Закрытая панель ещё на экране: тема ведёт её переходом — окно гаснет,
 * выезжающая панель уезжает к краю, — а `display: none` приходит только в
 * конце (`transition-behavior: allow-discrete`). Отпусти замок сразу — полоса
 * прокрутки вернётся, область просмотра сузится, и панель `position: fixed`
 * переедет вбок, пока исчезает. Поэтому замок ждёт, пока корень доиграет свои
 * переходы.
 *
 * Чисел темы здесь нет: сколько длится переход, знает сам переход.
 */

/**
 * Позвать `done`, когда узел доиграет CSS-переходы, которые идут у него
 * кадром позже. Отдаёт отмену: после неё `done` не позовётся, даже если
 * ожидание кончится потом.
 *
 * **Кадр.** Открытость меняется раньше разметки: когда плагин узнаёт о
 * закрытии, адаптер её ещё не перерисовал, и переходов закрытия нет. Кадром
 * позже разметка уже закрыта — на этом же допущении стоят фокус в панели у
 * `TOverlayFocusPlugin` и сброс сдвига у `TDrawerSwipePlugin`. Отрисовки кадра
 * ждать не нужно: `getAnimations()` сам применяет отложенные стили, и переход,
 * который начал рендер, виден сразу.
 *
 * **Какие переходы.** Только свои (`getAnimations()` без `subtree`): переходы
 * детей — цвет кнопки под указателем и подобное — исчезанию не принадлежат. И
 * только `CSSTransition`: у перехода конец есть всегда, а бесконечная
 * CSS-анимация корня держала бы замок вечно. Класс берётся из окна узла, а не
 * глобальный: компонент живёт и в `iframe`, и объекты его анимаций — из
 * чужого окна.
 *
 * **Конец** — `finished` у каждого перехода. Отменённый переход (`finished`
 * отклонён с `AbortError`: узел снят, переход перебит обратным) — тоже конец,
 * и отклонение обработано здесь же: необработанное ушло бы в
 * `unhandledrejection`. Переходов нет или нет Web Animations вовсе (jsdom) —
 * `done` зовётся в том же кадре.
 */
export function afterTransitions(element: Element, done: () => void): () => void {
	let cancelled = false

	const finish = (): void => {
		if (!cancelled) done()
	}

	const frame = requestAnimationFrame(() => {
		const transitions = transitionsOf(element)

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

/** Идущие CSS-переходы самого узла. */
function transitionsOf(element: Element): Animation[] {
	const Transition = element.ownerDocument.defaultView?.CSSTransition

	// Без Web Animations переходов не видно — ждать нечего
	if (typeof Transition !== 'function' || typeof element.getAnimations !== 'function') return []

	return element.getAnimations().filter((animation) => animation instanceof Transition)
}

/** Переход доиграл или его отменили — для замка это одно и то же. */
function ended(transition: Animation): Promise<unknown> {
	return transition.finished.catch(() => undefined)
}
