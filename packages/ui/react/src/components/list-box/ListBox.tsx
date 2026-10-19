import type { ReactElement } from 'react'
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
import { useSetupListBox } from './setup.component'
import type { ListBoxAttributes, ListBoxProps } from './base.component'

/**
 * ListBox — список с выбором. Корень — рамка: шапка, узел списка
 * (`so-list-box__list`) и подвал. Набор `aria` владельца — это сам список
 * (`role="listbox"`, `aria-multiselectable`, имя от `aria_label`), и лежит он
 * на узле списка: в `listbox` ARIA пускает только опции, а шапка и подвал —
 * место полей и кнопок. На узле списка и остановка Tab (`tabIndex={0}`): список
 * фокусируется сам, и клавиши его клавиатуры (`TListKeyboardPlugin`) — с этого
 * узла. На корне — `attrs` и `dataset`, как у Vue.
 *
 * Атрибуты потребителя делятся, как у поля и у Vue: класс и стиль — корню,
 * остальное — узлу списка, поверх его `aria` и остановки Tab: `aria-label` и
 * `id` потребителя называют список, `tabIndex={-1}` снимает его с остановок
 * Tab. `ref` потребителя — корень.
 *
 * Элементы — дети (`<ListBox.Item>`), а без детей — то, что рисует коллекция
 * (`drawn`), по порядку, ключ — ключ записи. Без окна это все показанные
 * элементы, по `ListBoxItem` на каждый. В окне обёртки `Virtual` — видимые и
 * распорки на месте пропущенных: `div` под `aria-hidden`, высоту которого тема
 * берёт из его стиля, а стиль пишет ядро. Одна петля на элементы и распорки:
 * петли по блокам перемонтировали бы элемент, когда он переходит из блока в
 * блок.
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
 * коллекцию.
 */
export function ListBox(props: ListBoxProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupListBox(props)

	const { rendered, drawn, shown, attrs, aria, dataset } = state

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
						: drawn?.map((entry) =>
								entry.kind === 'filler' ? (
									<div
										key={entry.key}
										className="so-list-box__filler"
										aria-hidden="true"
										style={toReactStyle(entry.style)}
									/>
								) : (
									<ListBoxItem
										key={entry.key}
										ctrl={entry.item}
										leading={renderSlot(props['item-leading'], {
											item: entry.item,
										})}
										trailing={renderSlot(props['item-trailing'], {
											item: entry.item,
										})}
										indicator-icon={relaySlot(props['item-indicator-icon'], {
											item: entry.item,
										})}
									>
										{relaySlot(props.item, { item: entry.item })}
									</ListBoxItem>
								),
							)}
					{shown?.length === 0 ? renderSlot(props.empty) : null}
				</div>
				{renderSlot(props.footer)}
			</Elevate>
		</div>
	)
}
