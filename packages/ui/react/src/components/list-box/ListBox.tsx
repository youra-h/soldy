import type { ReactElement } from 'react'
import type { IListBoxItem, TDrawnEntry, TDrawnSection } from '@soldy-ui/core'
import {
	Elevate,
	hasSlot,
	relaySlot,
	renderSlot,
	toAriaProps,
	toControlAttrs,
	toReactStyle,
	toRootForward,
	toRootProps,
} from '../../adapter'
import { ListBoxItem } from './item'
import { ListBoxGroup } from './group'
import { useSetupListBox } from './setup.component'
import type { ListBoxAttributes, ListBoxProps } from './base.component'

/**
 * Запись того, что рисует список: элемент из данных со слотами списка,
 * проброшенными целиком, или распорка на месте пропущенных окном.
 */
function drawEntry(props: ListBoxProps, entry: TDrawnEntry<IListBoxItem>): ReactElement {
	if (entry.kind === 'filler') {
		return (
			<div
				key={entry.key}
				className="so-list-box__filler"
				aria-hidden="true"
				style={toReactStyle(entry.style)}
			/>
		)
	}

	return (
		<ListBoxItem
			key={entry.key}
			ctrl={entry.item}
			leading={renderSlot(props['item-leading'], { item: entry.item })}
			trailing={renderSlot(props['item-trailing'], { item: entry.item })}
			indicator-icon={relaySlot(props['item-indicator-icon'], { item: entry.item })}
		>
			{relaySlot(props.item, { item: entry.item })}
		</ListBoxItem>
	)
}

/**
 * Секция того, что рисует список, — узлами списка: разделитель перед всеми,
 * кроме первой, а дальше группа с подписью или записи без группы прямо в
 * списке. Ключи — разные у всех видов: у записи — её ключ (число), у группы —
 * ключ секции, у разделителя — свой от ключа секции.
 */
function drawSection(
	props: ListBoxProps,
	section: TDrawnSection<IListBoxItem>,
	index: number,
): ReactElement[] {
	const entries = section.entries.map((entry) => drawEntry(props, entry))
	const separator =
		index > 0
			? [
					<div
						key={`separator:${section.key}`}
						className="so-list-box__separator"
						aria-hidden="true"
					/>,
				]
			: []

	if (!section.group) return [...separator, ...entries]

	return [
		...separator,
		<ListBoxGroup key={section.key} label={section.group.label}>
			{entries}
		</ListBoxGroup>,
	]
}

/**
 * ListBox — список с выбором. Корень — рамка: шапка, узел списка
 * (`so-list-box__list`) и подвал. Набор `aria` владельца — это сам список
 * (`role="listbox"`, `aria-multiselectable`, имя от `aria_label`), и лежит он
 * на узле списка: в `listbox` ARIA пускает только опции и группы, а шапка и
 * подвал — место полей и кнопок. На узле списка и остановка Tab
 * (`tabIndex={0}`): список фокусируется сам, и клавиши его клавиатуры
 * (`TListKeyboardPlugin`) — с этого узла. На корне — `attrs` и `dataset`, как
 * у Vue.
 *
 * Атрибуты потребителя делятся, как у поля и у Vue: класс и стиль — корню,
 * остальное — узлу списка, поверх его `aria` и остановки Tab: `aria-label` и
 * `id` потребителя называют список, `tabIndex={-1}` снимает его с остановок
 * Tab. `ref` потребителя — корень.
 *
 * Элементы — дети (`<ListBox.Item>`), а без детей — то, что рисует коллекция,
 * по секциям группировки (`drawnSections`): группа с подписью — в
 * `ListBoxGroup`, элементы без группы — прямо в списке, между соседними
 * секциями — немой разделитель (`aria-hidden`, не `separator`: в `listbox`
 * ARIA пускает только опции и группы). Секции идут порядком показанного, и
 * стрелки ходят так же, как элементы стоят на экране. Без групп секция одна —
 * ни обёртки, ни разделителя. В секции — её записи по порядку, ключ — ключ
 * записи: без окна это все показанные элементы секции, по `ListBoxItem` на
 * каждый, в окне обёртки `Virtual` (у списка без групп) — видимые и распорки
 * на месте пропущенных: `div` под `aria-hidden`, высоту которого тема берёт из
 * его стиля, а стиль пишет ядро. Одна петля на элементы и распорки: петли по
 * блокам перемонтировали бы элемент, когда он переходит из блока в блок.
 *
 * Слоты элементов статические и получают элемент через scope. Проброс
 * целиком: у каждого слота элемента есть `item-<слот>` (`default` — `item`),
 * и scope у него — scope слота элемента плюс сам элемент. Слоты со scope
 * элемент получает функцией (`relaySlot`), а не готовым узлом: узел, который
 * нарисовал список, scope элемента терял бы. Слот отметки отдаётся элементу,
 * только когда задан списку: без него элемент рисует свою.
 *
 * Пока показанных элементов нет, на их месте слот `empty`, внутри списка, —
 * как у Select: пустой `listbox` для скринридера — тупик.
 *
 * Всё содержимое — в слое лифта списка (`Elevate`): элемент, смонтированный
 * внутри, прочтёт движок и регистратор этого списка и при коммите войдёт в его
 * коллекцию. Группа слоя не заводит: элементы в ней читают слой списка.
 */
export function ListBox(props: ListBoxProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupListBox(props)

	const { rendered, drawnSections, shown, attrs, aria, dataset } = state

	if (!rendered) return null

	return (
		<div {...toRootProps(ref, state, [attrs, dataset], toRootForward(forwardProps))}>
			<Elevate layer={layer}>
				{renderSlot(props.header)}
				<div
					className="so-list-box__list"
					tabIndex={0}
					{...toAriaProps(aria)}
					{...toControlAttrs<ListBoxAttributes>(forwardProps)}
				>
					{hasSlot(props.children)
						? renderSlot(props.children)
						: drawnSections?.flatMap((section, index) =>
								drawSection(props, section, index),
							)}
					{shown?.length === 0 ? renderSlot(props.empty) : null}
				</div>
				{renderSlot(props.footer)}
			</Elevate>
		</div>
	)
}
