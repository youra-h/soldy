import type { ElementType, ReactElement } from 'react'
import { renderSlot, roleIcon, toAriaProps, toRootProps } from '../../adapter'
import { Button } from '../button'
import { Icon } from '../icon'
import { useSetupScroller } from './setup.component'
import type { ScrollerProps } from './base.component'

/**
 * Одна иконка на обе кнопки: роли «влево» в контракте иконок нет, и ту
 * стрелку, что смотрит в начало строки, зеркалит тема. Компонент на роль —
 * один на модуль (`roleIcon`).
 */
const Arrow = roleIcon('arrowRight')

/**
 * Scroller — лента произвольного содержимого в одну строку, которую двигают
 * две кнопки. Корень — ряд из трёх мест: кнопка «назад», вьюпорт, кнопка
 * «вперёд». Атрибуты потребителя — корню, как у Vue.
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
 * Вида разметка кнопкам не передаёт: значения вида объявляет тема, и красит
 * она кнопку по контексту (`:where(.so-scroller__prev)`). Выключенность
 * считает ядро — «выключена лента или упёрлись в край»: тема корень не гасит,
 * и `disabled` обязан доехать до кнопок разметкой. Значок — иконка роли
 * `arrowRight` у обеих кнопок, стрелку «назад» зеркалит тема; слоты
 * `prev-icon` и `next-icon` — свои значки.
 *
 * Вьюпорт — он же ряд: обёртки-дорожки между ним и содержимым нет. Это один
 * узел с тремя обязанностями — прокручиваемый контейнер, строка содержимого и
 * носитель роли от потребителя. `viewportAria` идёт после `tabIndex`:
 * значение потребителя сильнее нашего — ряд с roving tabindex сам решает,
 * кому быть остановкой. Содержимое — слот по умолчанию, его элементы
 * становятся прямыми детьми вьюпорта: по ним тема расставляет точки снапа, а
 * плагин считает края.
 */
export function Scroller(props: ScrollerProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupScroller(props)

	const {
		rendered,
		tag,
		attrs,
		aria,
		dataset,
		size,
		prevDisabled,
		nextDisabled,
		prevAria,
		nextAria,
		viewportTabIndex,
		viewportAria,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			<Button
				embedded="scroller.prev"
				type="button"
				className="so-scroller__prev"
				size={size}
				disabled={prevDisabled}
				{...toAriaProps(prevAria)}
			>
				{renderSlot(props['prev-icon']) ?? (
					<Icon embedded="scroller.prev-icon" tag={Arrow} size={size} />
				)}
			</Button>

			<div
				className="so-scroller__viewport"
				tabIndex={viewportTabIndex}
				{...toAriaProps(viewportAria)}
			>
				{renderSlot(props.children)}
			</div>

			<Button
				embedded="scroller.next"
				type="button"
				className="so-scroller__next"
				size={size}
				disabled={nextDisabled}
				{...toAriaProps(nextAria)}
			>
				{renderSlot(props['next-icon']) ?? (
					<Icon embedded="scroller.next-icon" tag={Arrow} size={size} />
				)}
			</Button>
		</Tag>
	)
}
