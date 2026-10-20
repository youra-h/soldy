import type { ElementType, ReactElement } from 'react'
import { NativeInput, renderSlot, roleIcon, toAriaProps, toRootProps } from '../../../adapter'
import { Button } from '../../button'
import { Icon } from '../../icon'
import { useSetupTableColumn } from './setup.component'
import type { TableColumnProps } from './base.component'

/** Стрелка сортировки — иконка по роли, компонент на роль один на модуль (`roleIcon`). */
const SortIcon = roleIcon('arrowUpward')

/**
 * TableColumn — заголовок колонки (`Table.Column`). Корень — сама ячейка
 * шапки, рисуется по `tag` колонки (по умолчанию `th`). На ней наборы колонки:
 * `aria-sort` (только у первой по приоритету), `data-sort` и
 * `data-sort-priority`, `data-align`, `data-sized`, `data-resizing`, — и
 * ширина переменной `--so-table-column-width` (`widthStyle`, считает ядро) —
 * стиль-выходом компонента, под стилем потребителя (`toRootProps`).
 *
 * Имя заголовка — ссылка на подпись (`aria-labelledby` в `aria`): своё имя
 * браузер собрал бы из всей ячейки, а в ней и значение поля ручки («Имя 150»),
 * и имя кнопки сортировки. Ссылку и `id` подписи пишет плагин связок.
 * Обработчиков на ячейке нет: протяжку ловит плагин ручки на корне, клавиши и
 * жест скринридера — он же на поле. Нажатие по ячейке не сортирует.
 *
 * Содержимое — ряд, как у Vue: подпись, а у сортируемой колонки за ней
 * кнопка сортировки; где ряд стоит и с какой стороны подписи кнопка, решает
 * тема. Подпись — у всех колонок: слот `children` со scope
 * `{ text, sortable }`, пустой — текст колонки; таблица отдаёт в него свой
 * слот `header`, и своё действие по заголовку потребитель ставит туда
 * контролом. Подписью названы заголовок и поле ручки (`textAria`).
 *
 * Кнопка сортировки — `Button` (`embedded: 'table.sort'`), только у
 * `sortable`: её рисует колонка, а не таблица через слот — кнопка в подписи
 * дописала бы своё имя к имени заголовка. Нажатие — просьба колонки
 * (`toggleSort`), сортирует расширение коллекции строк; выключена вместе с
 * таблицей. Текста у кнопки нет — имя ей с подписью колонки пишет плагин имён
 * от локали (`sortAria`), а направление скринридер объявляет по `aria-sort`
 * заголовка, поэтому обёртка стрелки скрыта от него. Вида и размера кнопке и
 * стрелке разметка не передаёт: их даёт тема по контексту.
 *
 * Ручка ширины — полоса у края заголовка, только когда она есть
 * (`resizerRendered`: колонка `resizable`, не выключена, и ширина известна).
 * Поле в ней — нативный `range`, как поле ручки Slider: мобильные скринридеры
 * двигают его своим жестом. Ход и ширина — значение ядра (`resizer`), имя —
 * ссылка на подпись (`resizerAria`). Ширину ведёт ядро, поэтому поле — поле
 * адаптера (`NativeInput`): `<input value>` без `onChange` React считает
 * ошибкой, а `onChange` писал бы ширину вторым путём рядом с плагином ручки.
 */
export function TableColumn(props: TableColumnProps): ReactElement | null {
	const { ref, forwardProps, state, column } = useSetupTableColumn(props)

	const {
		rendered,
		tag,
		text,
		sortable,
		disabled,
		widthStyle,
		textAria,
		sortAria,
		resizerRendered,
		resizer,
		resizerAria,
		attrs,
		aria,
		dataset,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps, widthStyle)}>
			<span className="so-table-column__content">
				<span className="so-table-column__text" {...toAriaProps(textAria)}>
					{renderSlot(props.children, {
						text: text ?? '',
						sortable: sortable ?? false,
					}) ?? text}
				</span>
				{sortable ? (
					<Button
						embedded="table.sort"
						type="button"
						className="so-table-column__sort"
						disabled={disabled}
						{...toAriaProps(sortAria)}
						onActionPress={() => column.toggleSort()}
					>
						<span className="so-table-column__sort-icon" aria-hidden="true">
							<Icon embedded="table.sort-icon" tag={SortIcon} />
						</span>
					</Button>
				) : null}
			</span>
			{resizerRendered && resizer ? (
				<span className="so-table-column__resizer">
					<NativeInput
						className="so-table-column__input"
						type="range"
						min={resizer.min}
						max={resizer.max}
						{...toAriaProps(resizerAria)}
						live={{ value: resizer.value }}
					/>
				</span>
			) : null}
		</Tag>
	)
}
