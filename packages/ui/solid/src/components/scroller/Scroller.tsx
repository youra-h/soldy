import { Show, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { createRootProps, renderSlot, resolveSlot, roleIcon, rootTag } from '../../adapter'
import { Button } from '../button'
import { Icon } from '../icon'
import { setupScroller } from './setup.component'
import type { ScrollerProps } from './base.component'

/**
 * Одна иконка на обе кнопки: роли «влево» в контракте иконок нет, и ту
 * стрелку, что смотрит в начало строки, зеркалит тема. Компонент на роль —
 * один на модуль: `tag` у Icon — корень, а не роль.
 */
const ARROW = roleIcon('arrowRight')

/**
 * Scroller — лента произвольного содержимого в одну строку, которую двигают
 * две кнопки. Корень — ряд из трёх мест: кнопка «назад», вьюпорт, кнопка
 * «вперёд». Корень рисуется по `tag`.
 *
 * Кнопки стоят снаружи вьюпорта намеренно: роль ряда у первого потребителя
 * (`role="listbox"` у тегов) приходит на вьюпорт, а листбокс владеет только
 * опциями — кнопке внутри него места нет.
 *
 * Обработчиков нажатия здесь нет: клики ловит плагин слушателем на корне и
 * зовёт команды ядра. Связка «нажали ⇄ листаем» иначе повторилась бы в каждом
 * из шести адаптеров. `data-can-prev` и `data-can-next` приезжают в `dataset`
 * — по ним тема гасит подсказку у края и снимает обе кнопки, когда листать
 * нечего. `dir` приходит в `attrs` сам.
 *
 * Кнопкам вида разметка не передаёт: значения вида объявляет тема, и красит
 * она кнопку по контексту (`:where(.so-scroller__prev)`). Выключенность считает
 * ядро — «выключена лента или упёрлись в край»: тема корень не гасит, и
 * `disabled` обязан доехать до кнопок разметкой. Имена кнопок — в наборах
 * `prevAria` и `nextAria`, их пишет плагин имён по локали поддерева.
 *
 * Значок кнопки — слот `prev-icon` или `next-icon`, по умолчанию — иконка роли
 * `arrowRight`. По слоту разметка выбирает, что рисовать, поэтому его
 * разворачивает адаптер, один раз (`resolveSlot`).
 *
 * Вьюпорт — он же ряд: обёртки-дорожки между ним и содержимым нет, лишний
 * узел отрезал бы элементы от роли ряда. `viewportAria` идёт после
 * `tabindex`: значение потребителя сильнее нашего — ряд с roving tabindex сам
 * решает, кому быть остановкой. Содержимое — слот по умолчанию, его элементы
 * — прямые дети вьюпорта: по ним тема расставляет точки снапа, а плагин
 * считает края.
 */
export function Scroller(props: ScrollerProps): JSX.Element {
	const binding = setupScroller(props)
	const state = binding.state
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))
	const prevIcon = resolveSlot(
		() => props['prev-icon'],
		() => ({}),
	)
	const nextIcon = resolveSlot(
		() => props['next-icon'],
		() => ({}),
	)

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Button
					embedded="scroller.prev"
					type="button"
					class="so-scroller__prev"
					size={state.size}
					disabled={state.prevDisabled}
					{...state.prevAria}
				>
					{prevIcon() ?? (
						<Icon embedded="scroller.prev-icon" tag={ARROW} size={state.size} />
					)}
				</Button>
				<div
					class="so-scroller__viewport"
					tabindex={state.viewportTabIndex}
					{...state.viewportAria}
				>
					{renderSlot(props.children)}
				</div>
				<Button
					embedded="scroller.next"
					type="button"
					class="so-scroller__next"
					size={state.size}
					disabled={state.nextDisabled}
					{...state.nextAria}
				>
					{nextIcon() ?? (
						<Icon embedded="scroller.next-icon" tag={ARROW} size={state.size} />
					)}
				</Button>
			</Dynamic>
		</Show>
	)
}
