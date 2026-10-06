/**
 * Позвать `done`, когда узел доиграет CSS-переходы, которые идут у него
 * кадром позже. Отдаёт отмену: после неё `done` не позовётся, даже если
 * ожидание кончится потом.
 *
 * Это ожидание конца перехода закрытия. Закрытая панель ещё на экране: тема
 * ведёт её переходом — окно гаснет, выезжающая панель уезжает к краю, — а
 * `display: none` приходит только в конце
 * (`transition-behavior: allow-discrete`). Что меняет вид исчезающей панели,
 * ждёт, пока она доиграет:
 *
 * - замок прокрутки (`TScrollLockPlugin`) отдаёт свой счёт, когда корень
 *   доиграл переходы закрытия: вернись полоса прокрутки сразу, область
 *   просмотра сузилась бы, и панель `position: fixed` переехала бы вбок, пока
 *   исчезает;
 * - ввод Select (`TEditablePlugin`) снимает отбор, когда догасла панель:
 *   снятый сразу, он показал бы в гаснущей панели весь список.
 *
 * Живёт в общих утилитах, а не у одного из них: вторая копия ожидания
 * разошлась бы с первой. Чисел темы здесь нет: сколько длится переход, знает
 * сам переход.
 *
 * **Кадр.** Открытость меняется раньше разметки: когда плагин узнаёт о
 * закрытии, адаптер её ещё не перерисовал, и переходов закрытия нет. Кадром
 * позже разметка уже закрыта — на этом же допущении стоят фокус в панели у
 * `TOverlayFocusPlugin` и сброс сдвига у `TSwipePlugin`. Отрисовки кадра
 * ждать не нужно: `getAnimations()` сам применяет отложенные стили, и переход,
 * который начал рендер, виден сразу.
 *
 * **Какие переходы.** Только свои (`getAnimations()` без `subtree`): переходы
 * детей — цвет кнопки под указателем и подобное — исчезанию не принадлежат. И
 * только `CSSTransition`: у перехода конец есть всегда, а бесконечная
 * CSS-анимация узла держала бы ожидание вечно. Класс берётся из окна узла, а не
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

/** Переход доиграл или его отменили — для ожидания это одно и то же. */
function ended(transition: Animation): Promise<unknown> {
	return transition.finished.catch(() => undefined)
}
