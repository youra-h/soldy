import type { ElementType, ReactElement } from 'react'
import { renderSlot, toAriaProps, toRootProps } from '../../../adapter'
import { Button } from '../../button'
import { useSetupPaginationItem } from './setup.component'
import type { PaginationItemProps } from './base.component'

/**
 * PaginationItem — страница пагинации, внутренняя часть, как тост у Toasts:
 * её рисует только `Pagination`, по одной на каждую страницу окна,
 * потребитель её в разметку не ставит, и из пакета она не выходит.
 *
 * Корень — место страницы в списке, рисуется по `tag` (по умолчанию `li`). На
 * нём набор `dataset`: `data-selected` (текущая — пишет активация коллекции,
 * как у таба) и `data-disabled`. Атрибуты снаружи — тоже корню: ставит
 * страницу только владелец, и своих атрибутов у него для неё нет.
 *
 * Строка — Button с номером или текстом страницы (слот `default` со scope
 * `{ text }`, запасное — `text` страницы). На ней `size` и `variant` страницы
 * (их диктует пагинация, как табам набор), `disabled` и набор `aria`:
 * `aria-current="page"` у текущей, его пишет расширение коллекции. Текущая —
 * обычная, не выключенная кнопка: каждая страница — своя остановка Tab.
 *
 * Нажатие делает страницу текущей — активацией коллекции, как у таба;
 * значение пагинации за ней пишет расширение коллекции. Нажатие по текущей
 * ничего не меняет.
 */
export function PaginationItem(props: PaginationItemProps): ReactElement | null {
	const { ref, forwardProps, state, context } = useSetupPaginationItem(props)

	const { rendered, tag, text, disabled, size, variant, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, dataset], forwardProps)}>
			<Button
				embedded="pagination.page"
				type="button"
				disabled={disabled}
				size={size}
				variant={variant}
				onClick={() => {
					if (context) context.adapters.activation.active = true
				}}
				{...toAriaProps(aria)}
			>
				{renderSlot(props.children, { text: text ?? '' }) ?? text}
			</Button>
		</Tag>
	)
}
