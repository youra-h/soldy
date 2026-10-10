import type { ReactElement } from 'react'
import { Elevate, hasSlot, relaySlot, renderSlot, toReactStyle, toRootProps } from '../../adapter'
import { ListBoxItem } from './item'
import { useSetupListBox } from './setup.component'
import type { ListBoxProps } from './base.component'

/**
 * ListBox — список с выбором. Корень — `div` с `tabindex="0"`: список
 * фокусируется сам, и его клавиатура (`TListKeyboardPlugin`) слушает корень.
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
 * Пока показанных элементов нет, на их месте слот `empty` — как у Select:
 * пустой `listbox` для скринридера — тупик.
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
		<div tabIndex={0} {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			<Elevate layer={layer}>
				{renderSlot(props.header)}
				{hasSlot(props.children)
					? renderSlot(props.children)
					: drawn?.map((entry) =>
							entry.kind === 'filler' ? (
								<div
									key={entry.key}
									className="s-list-box__filler"
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
				{renderSlot(props.footer)}
			</Elevate>
		</div>
	)
}
