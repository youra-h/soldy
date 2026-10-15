import type { ElementType, ReactElement } from 'react'
import { NativeInput, renderSlot, toAriaProps, toRootProps } from '../../../adapter'
import { useSetupTableColumn } from './setup.component'
import type { TableColumnProps } from './base.component'

/**
 * TableColumn — заголовок колонки (`Table.Column`). Корень — сама ячейка
 * шапки, рисуется по `tag` колонки (по умолчанию `th`). На ней наборы колонки:
 * `aria-sort` (только у первой по приоритету), `data-sort` и
 * `data-sort-priority`, `data-align`, `data-sized`, `data-resizing`, — и
 * ширина переменной `--so-table-column-width` (`widthStyle`, считает ядро) —
 * стиль-выходом компонента, под стилем потребителя (`toRootProps`).
 *
 * Имя заголовка — ссылка на обёртку содержимого (`aria-labelledby` в `aria`):
 * своё имя браузер собрал бы из всей ячейки, и значение поля ручки вошло бы в
 * имя заголовка («Имя 150»). Ссылку и `id` обёртки пишет плагин связок.
 * Обработчиков здесь нет: протяжку ловит плагин ручки на корне, клавиши и
 * жест скринридера — он же на поле.
 *
 * Содержимое — слот `children` со scope `{ text, sortable }`, пустой — текст
 * колонки. Наполняет его таблица: у сортируемой колонки — кнопкой сортировки,
 * у остальных — текстом. Здесь их нет: кнопке нужны размер и «выключена»
 * таблицы и её команда, а у колонки их нет. Обёртка — блок во всю ячейку: по
 * ней тема раскладывает кнопку и текст, и ею названы заголовок и поле ручки
 * (`contentAria`).
 *
 * Ручка ширины — полоса у края заголовка, только когда она есть
 * (`resizerRendered`: колонка `resizable`, не выключена, и ширина известна).
 * Поле в ней — нативный `range`, как поле ручки Slider: мобильные скринридеры
 * двигают его своим жестом. Ход и ширина — значение ядра (`resizer`), имя —
 * ссылка на обёртку содержимого (`resizerAria`). Ширину ведёт ядро, поэтому
 * поле — поле адаптера (`NativeInput`): `<input value>` без `onChange` React
 * считает ошибкой, а `onChange` писал бы ширину вторым путём рядом с плагином
 * ручки.
 */
export function TableColumn(props: TableColumnProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupTableColumn(props)

	const {
		rendered,
		tag,
		text,
		sortable,
		widthStyle,
		contentAria,
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
			<span className="so-table-column__content" {...toAriaProps(contentAria)}>
				{renderSlot(props.children, { text: text ?? '', sortable: sortable ?? false }) ??
					text}
			</span>
			{resizerRendered && resizer ? (
				<span className="so-table-column__resizer">
					<NativeInput
						className="so-table-column__input"
						type="range"
						min={resizer.min}
						max={resizer.max}
						{...toAriaProps(resizerAria)}
						live={{ value: String(resizer.value) }}
					/>
				</span>
			) : null}
		</Tag>
	)
}
