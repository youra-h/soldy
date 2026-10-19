import { Show, type Accessor, type JSX } from 'solid-js'
import type { IListBoxItem, TDrawnEntry, TDrawnSection } from '@soldy-ui/core'
import {
	Elevate,
	KeyedFor,
	ResolvedSlot,
	createRootProps,
	relaySlot,
	renderSlot,
	toControlAttrs,
	toRootForward,
} from '../../adapter'
import { ListBoxItem } from './item'
import { ListBoxGroup } from './group'
import { setupListBox } from './setup.component'
import type { ListBoxAttributes, ListBoxProps } from './base.component'

/** Элемент записи; у распорки его нет. */
function itemOf(entry: TDrawnEntry<IListBoxItem>): IListBoxItem | undefined {
	return entry.kind === 'item' ? entry.item : undefined
}

/** Стиль распорки — высота пропущенных элементов; у записи элемента его нет. */
function fillerStyleOf(entry: TDrawnEntry<IListBoxItem>): JSX.CSSProperties | undefined {
	return entry.kind === 'filler' ? entry.style : undefined
}

/**
 * ListBox — список с выбором. Корень — рамка: шапка, узел списка
 * (`so-list-box__list`) и подвал. Набор `aria` владельца — это сам список
 * (`role="listbox"`, `aria-multiselectable`, имя от `aria_label`), и лежит он
 * на узле списка: в `listbox` ARIA пускает только опции и группы, а шапка и
 * подвал — место полей и кнопок. На узле списка и остановка Tab
 * (`tabindex="0"`): список фокусируется сам, и клавиши его клавиатуры
 * (`TListKeyboardPlugin`) — с этого узла. На корне — `attrs` и `dataset`, как
 * у Vue.
 *
 * Атрибуты потребителя делятся, как у поля и у Vue: класс и стиль — корню,
 * остальное, кроме `ref`, — узлу списка, поверх его `aria` и остановки Tab:
 * `aria-label` и `id` потребителя называют список, `tabindex="-1"` снимает
 * его с остановок Tab. `ref` потребителя — корень.
 *
 * Элементы — содержимое (`<ListBox.Item>`), а без него — то, что рисует
 * коллекция, по секциям группировки (`drawnSections`): группа с подписью — в
 * `ListBoxGroup`, элементы без группы — прямо в списке, между соседними
 * секциями — немой разделитель (`aria-hidden`, не `separator`: в `listbox`
 * ARIA пускает только опции и группы). Секции идут порядком показанного, и
 * стрелки ходят так же, как элементы стоят на экране. Без групп секция одна —
 * ни обёртки, ни разделителя. В секции — её записи по порядку: без окна это
 * все показанные элементы секции, по `ListBoxItem` на каждый, в окне обёртки
 * `Virtual` (у списка без групп) — видимые и распорки на месте пропущенных:
 * `div` под `aria-hidden`, высоту которого тема берёт из его стиля, а стиль
 * пишет ядро. Одна петля на элементы и распорки: петли по блокам
 * перемонтировали бы элемент, когда он переходит из блока в блок. Петли —
 * по ключу (`KeyedFor`): секции — по ключу секции, записи — по ключу записи;
 * записи `drawnSections` новые на каждую смену, и `<For>`, сравнивая их по
 * ссылке, пересоздавал бы все элементы вместе с узлами и фокусом.
 *
 * Слоты элементов статические и получают элемент через scope. Проброс
 * целиком: у каждого слота элемента есть `item-<слот>` (`default` — `item`),
 * и scope у него — scope слота элемента плюс сам элемент. Слоты со scope
 * элемент получает функцией (`relaySlot`), а не готовыми узлами: узлы,
 * которые нарисовал список, scope элемента теряли бы. Слот отметки отдаётся
 * элементу, только когда задан списку: без него элемент рисует свою.
 *
 * Пока показанных элементов нет, на их месте слот `empty`, внутри списка, —
 * как у Select: пустой `listbox` для скринридера — тупик.
 *
 * Всё содержимое — в слое лифта списка (`Elevate`): элемент, смонтированный
 * внутри, прочтёт движок и регистратор этого списка и при своей сборке войдёт
 * в его коллекцию. Содержимое разворачивается там же (`ResolvedSlot`), а не в
 * теле списка: узлы элементов Solid создал бы там, где развернули слот, — вне
 * его слоя. Группа слоя не заводит: элементы в ней читают слой списка.
 */
export function ListBox(props: ListBoxProps): JSX.Element {
	const binding = setupListBox(props)
	const state = binding.state
	// Корню — его наборы, класс и стиль потребителя; `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.dataset],
		forward: toRootForward(binding.forwardProps()),
	}))
	// Узлу списка — остальное от потребителя, поверх его `aria`
	const control = () => toControlAttrs<ListBoxAttributes>(binding.forwardProps())

	/** Элемент из данных — со слотами списка, проброшенными целиком. */
	const drawItem = (item: IListBoxItem) => (
		<ListBoxItem
			ctrl={item}
			leading={renderSlot(props['item-leading'], { item })}
			trailing={renderSlot(props['item-trailing'], { item })}
			indicator-icon={relaySlot(props['item-indicator-icon'], { item })}
		>
			{relaySlot(props.item, { item })}
		</ListBoxItem>
	)

	/** Запись `drawn`: элемент или распорка на месте пропущенных. */
	const drawEntry = (entry: Accessor<TDrawnEntry<IListBoxItem>>) => (
		<Show
			when={itemOf(entry())}
			keyed
			fallback={
				<div
					class="so-list-box__filler"
					aria-hidden="true"
					style={fillerStyleOf(entry())}
				/>
			}
		>
			{drawItem}
		</Show>
	)

	/** Записи секции по порядку — по ключу записи. */
	const drawEntries = (section: Accessor<TDrawnSection<IListBoxItem>>) => (
		<KeyedFor each={section().entries} by={(entry) => entry.key}>
			{drawEntry}
		</KeyedFor>
	)

	/** Первая ли секция: перед ней разделителя нет. */
	const isFirst = (section: Accessor<TDrawnSection<IListBoxItem>>) =>
		state.drawnSections?.[0]?.key === section().key

	/**
	 * Секция: разделитель перед всеми, кроме первой, а дальше группа с
	 * подписью или записи без группы прямо в списке.
	 */
	const drawSection = (section: Accessor<TDrawnSection<IListBoxItem>>) => (
		<>
			<Show when={!isFirst(section)}>
				<div class="so-list-box__separator" aria-hidden="true" />
			</Show>
			<Show when={section().group} fallback={drawEntries(section)}>
				{(group) => (
					<ListBoxGroup label={group().label}>{drawEntries(section)}</ListBoxGroup>
				)}
			</Show>
		</>
	)

	return (
		<Show when={state.rendered}>
			<div {...root()} ref={binding.ref}>
				<Elevate layer={binding.layer}>
					{renderSlot(props.header)}
					<div class="so-list-box__list" tabindex="0" {...state.aria} {...control()}>
						<ResolvedSlot
							content={props.children}
							fallback={
								<KeyedFor each={state.drawnSections} by={(section) => section.key}>
									{drawSection}
								</KeyedFor>
							}
						/>
						<Show when={state.shown?.length === 0}>{renderSlot(props.empty)}</Show>
					</div>
					{renderSlot(props.footer)}
				</Elevate>
			</div>
		</Show>
	)
}
