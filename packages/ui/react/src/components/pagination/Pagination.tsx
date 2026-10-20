import type { ElementType, ReactElement } from 'react'
import { Elevate, relaySlot, renderSlot, roleIcon, toAriaProps, toRootProps } from '../../adapter'
import { Button } from '../button'
import { Icon } from '../icon'
import { PaginationItem } from './item'
import { useSetupPagination } from './setup.component'
import type { PaginationProps } from './base.component'

/**
 * Одна иконка на обе стрелки: роли «влево» в контракте иконок нет, и ту
 * стрелку, что смотрит в начало строки, зеркалит тема. Компонент на роль —
 * один на модуль (`roleIcon`).
 */
const Arrow = roleIcon('arrowRight')

/**
 * Pagination — ряд в одну строку: стрелка «назад», список страниц, стрелка
 * «вперёд». Корень рисуется по `tag` (по умолчанию `nav`): ориентир для
 * скринридера. Имя ему даёт приложение — `aria_label` или `aria_labelledBy`,
 * они в наборе `aria`: что листают, знает только оно. На корне — модификаторы
 * `--size-*` и `--variant-*` и `data-disabled`; атрибуты потребителя — тоже
 * корню, как у Vue.
 *
 * Стрелки стоят вне списка: в списке только страницы и пропуски. Отдельных
 * кнопок «в начало» и «в конец» нет — их роль играют первая и последняя
 * страницы, они видны всегда. Стрелка листает командой пагинации
 * (`prev()`, `next()`), выключенность считает пагинация (`prevDisabled`,
 * `nextDisabled`), имя из локали — в наборах `prevAria` и `nextAria`. `size` и
 * `variant` — пагинации: цвет тема берёт с модификатора кнопки. Вида нет:
 * `plain` и квадрат даёт тема по контексту. Слоты `prev-icon` и `next-icon` —
 * свои иконки; в слот кладут стрелку, которая смотрит в конец строки, — тема
 * зеркалит и её.
 *
 * Страницы и пропуски — по порядку окна (`cells`): первая страница, пропуск,
 * N страниц вокруг текущей, пропуск, последняя (`1 … 4 5 6 … 10`). Страница —
 * элемент коллекции; пропуск — разметка владельца, не кнопка и не иконка: на
 * нём ничего не нажимают, и фокуса у него нет. Ключ места — `cell.key`, у
 * страницы — её `uid`: страница, оставшаяся на экране при сдвиге окна, — тот
 * же экземпляр, и узел с фокусом на нём не пересобирается.
 *
 * Слот страницы пробрасывается целиком: `item`, scope — scope слота страницы
 * (`text`) плюс сама страница; страница получает его функцией (`relaySlot`).
 *
 * Содержимое — в слое лифта пагинации (`Elevate`): страница, смонтированная
 * внутри, при коммите войдёт в её коллекцию.
 */
export function Pagination(props: PaginationProps): ReactElement | null {
	const { ctrl, ref, forwardProps, state, layer } = useSetupPagination(props)

	const {
		rendered,
		tag,
		attrs,
		aria,
		dataset,
		size,
		variant,
		prevDisabled,
		nextDisabled,
		prevAria,
		nextAria,
		cells,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			<Elevate layer={layer}>
				<Button
					embedded="pagination.prev"
					type="button"
					className="so-pagination__prev"
					size={size}
					variant={variant}
					disabled={prevDisabled}
					onClick={() => ctrl.prev()}
					{...toAriaProps(prevAria)}
				>
					{renderSlot(props['prev-icon']) ?? (
						<Icon embedded="pagination.prev-icon" tag={Arrow} size={size} />
					)}
				</Button>

				<ol className="so-pagination__list">
					{cells?.map((cell) =>
						cell.kind === 'item' ? (
							<PaginationItem key={cell.key} ctrl={cell.item}>
								{relaySlot(props.item, { item: cell.item })}
							</PaginationItem>
						) : (
							<li key={cell.key} className="so-pagination__ellipsis">
								…
							</li>
						),
					)}
				</ol>

				<Button
					embedded="pagination.next"
					type="button"
					className="so-pagination__next"
					size={size}
					variant={variant}
					disabled={nextDisabled}
					onClick={() => ctrl.next()}
					{...toAriaProps(nextAria)}
				>
					{renderSlot(props['next-icon']) ?? (
						<Icon embedded="pagination.next-icon" tag={Arrow} size={size} />
					)}
				</Button>
			</Elevate>
		</Tag>
	)
}
