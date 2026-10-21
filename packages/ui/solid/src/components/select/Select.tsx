import { Show, type Accessor, type JSX } from 'solid-js'
import type { ISelectItem, TDrawnEntry, TDrawnSection } from '@soldy-ui/core'
import {
	Elevate,
	KeyedFor,
	ResolvedSlot,
	createRootProps,
	relaySlot,
	renderSlot,
	roleIcon,
	toControlAttrs,
	toRootForward,
} from '../../adapter'
import { Frame } from '../frame'
import { Icon } from '../icon'
import { Input } from '../input'
import { Tags } from '../tags'
import { SelectItem } from './item'
import { SelectGroup } from './group'
import { setupSelect } from './setup.component'
import type { SelectAttributes, SelectProps } from './base.component'

/** Стрелка без слота — компонент на роль: `tag` у Icon — корень, а не роль. */
const ARROW = roleIcon('arrowDown')

/** Опция записи; у распорки её нет. */
function itemOf(entry: TDrawnEntry<ISelectItem>): ISelectItem | undefined {
	return entry.kind === 'item' ? entry.item : undefined
}

/** Стиль распорки — высота пропущенных опций; у записи опции его нет. */
function fillerStyleOf(entry: TDrawnEntry<ISelectItem>): JSX.CSSProperties | undefined {
	return entry.kind === 'filler' ? entry.style : undefined
}

/**
 * Select — поле выбора из списка (Combobox, select-only или `editable`), как у
 * Vue: в корне поле и панель со списком.
 *
 * Корень — рамка: на нём `dataset` (`data-open` — стрелку тема разворачивает
 * по нему) и `attrs`. Набор `aria` Select — имя, описание, ошибка — у поля:
 * фокус всегда на `<input>`, а не в списке. Атрибуты потребителя делятся, как
 * у поля и у Vue: класс и стиль — корню, остальное, кроме `ref`, — `<input>`
 * поля, поверх его наборов: `aria-label` и `id` потребителя называют
 * комбобокс, а не корень без роли. `ref` потребителя — корень.
 *
 * Поле — готовый `Input` (слот `field` его заменяет, scope — `field`): текст,
 * плейсхолдер и ARIA комбобокса принадлежат экземпляру `TInput`, которым
 * владеет Select (`field`), и разметка отдаёт его целиком (`ctrl={field}`) —
 * рядом с ним ни текста, ни плейсхолдера. Свой набор `aria` Select кладёт на
 * него атрибутами: они доходят до `<input>` поверх набора комбобокса,
 * атрибуты потребителя — поверх обоих. Слоты поля по сторонам Select отдаёт
 * всегда, как Vue свои шаблоны `leading` и `trailing`: обёртки поля стоят и
 * без тегов. Кнопку очистки рисует поле, а не Select: свою кнопку слота
 * `clear` Select отдаёт полю, только когда она задана.
 *
 * Слева — ряд тегов, пока выбор множественный: второй компонент со своей
 * коллекцией, связку «опция ⇄ тег» держит `TSelectTagsExtension`. Слот `tags`
 * получает инстанс тегов и его коллекцию — то, что встроенный `Tags` берёт
 * `ctrl` и `engine`. За ними — слот `leading`. Справа — стрелка: класс на
 * обёртке, а не на иконке, — по нему тема разворачивает стрелку, а
 * `TSelectPointerPlugin` в `editable` открывает панель только кликом по ней;
 * иконка из слота `arrow-icon` поворачивается так же. За ней — `trailing`.
 *
 * Панель — Frame: телепорт, слой, привязка к корню (`anchor_anchor` — корень,
 * его узел отдаёт аксессор адаптера `rootElement`), пометка владельцем
 * (`dismiss_ownerAttribute`): панель лежит вне поддерева Select, и нажатие в
 * неё иначе считалось бы нажатием мимо. Открытость — это `visible` панели, а
 * не `rendered` и не `<Show>`: опции входят в коллекцию при монтировании и
 * выбывают при снятии, и закрытие, снимающее панель, вычистило бы вместе с
 * ними выбор. Сторону и flip ядро выводит из `placement` (`panelPlacement`,
 * `panelFlip`), ширину по полю — из `contentFit` (`autoFitWidth`);
 * `panelDataset` — признак «тянут» (`data-swiping`).
 *
 * В панели — полоса жеста (пока жест включён; немая, прямой потомок панели и
 * вне списка), затем список с набором `listAria` (`role="listbox"`, `id`,
 * `aria-multiselectable`). В нём опции — содержимое (`<Select.Item>`,
 * `<Select.Group>`), а без него — то, что рисует коллекция, по секциям
 * группировки (`drawnSections`), как у ListBox: группа с подписью — в
 * `SelectGroup`, опции без группы — прямо в списке, между соседними
 * секциями, пока его просит Select (`groupSeparators`), — немой разделитель.
 * В секции — её записи по порядку: опции, а в окне обёртки `Virtual` — и
 * распорки на месте пропущенных, `div` под `aria-hidden` со стилем от ядра.
 * Петли — по ключу (`KeyedFor`): записи `drawnSections` новые на каждую
 * смену, и `<For>`, сравнивая их по ссылке, пересоздавал бы все опции вместе
 * с узлами. Пока показанных опций нет, на их месте слот `empty`.
 *
 * Слоты опций статические и получают опцию через scope. Проброс целиком: у
 * каждого слота опции есть `item-<слот>` (`default` — `item`), scope — scope
 * слота опции плюс сама опция. Слоты со scope опция получает функцией
 * (`relaySlot`), края — готовыми узлами с опцией в scope; пустое, что вернул
 * проброс, опция видит и рисует своё — текст и отметку.
 *
 * Всё содержимое корня — в слое лифта Select (`Elevate`): опция,
 * смонтированная в панели, прочтёт движок и регистратор Select и при своей
 * сборке войдёт в его коллекцию, а поле — пустую связку поля формы, которую
 * Select опускает своему содержимому. Слоты, по которым разметка решает, что
 * рисовать, — поле, ряд тегов, стрелка и опции, — разворачиваются там же
 * (`ResolvedSlot`): узлы Solid создал бы там, где развернули слот, — вне слоя
 * Select. Опции стоят в панели, внутри телепорта Frame: собираются они, когда
 * портал впервые читает содержимое, — на сервере, где портала нет, панели и
 * опций нет, как у Menu. Select из `items` сервер рисует с текстом выбранного
 * (в `multiple` — с тегами), опции разметкой входят в коллекцию только в
 * браузере.
 */
export function Select(props: SelectProps): JSX.Element {
	const binding = setupSelect(props)
	const state = binding.state
	const field = binding.field
	// Корню — его наборы, класс и стиль потребителя; `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.dataset, state.attrs],
		forward: toRootForward(binding.forwardProps()),
	}))
	// Полю — остальное от потребителя, поверх наборов Select
	const control = () => toControlAttrs<SelectAttributes>(binding.forwardProps())

	/**
	 * Ряд тегов поля — пока выбор множественный: инстанс тегов и его коллекция
	 * есть только в `multiple`. Своя разметка ряда — слот `tags`.
	 */
	const drawTags = () => (
		<Show when={state.tags}>
			{(tags) => (
				<Show when={state.tags_engine}>
					{(engine) => (
						<ResolvedSlot
							content={props.tags}
							scope={() => ({ tags: tags(), engine: engine() })}
							fallback={
								<Tags
									embedded="select.tags"
									class="so-select__tags"
									ctrl={tags()}
									engine={engine()}
								/>
							}
						/>
					)}
				</Show>
			)}
		</Show>
	)

	/** Стрелка — в обёртке, которую разворачивает тема; своя иконка — слот `arrow-icon`. */
	const drawArrow = () => (
		<span class="so-select__arrow">
			<ResolvedSlot
				content={props['arrow-icon']}
				fallback={<Icon embedded="select.arrow" tag={ARROW} size={state.size} />}
			/>
		</span>
	)

	/** Опция из данных — со слотами Select, проброшенными целиком. */
	const drawItem = (item: ISelectItem) => (
		<SelectItem
			ctrl={item}
			leading={renderSlot(props['item-leading'], { item })}
			trailing={renderSlot(props['item-trailing'], { item })}
			indicator-icon={relaySlot(props['item-indicator-icon'], { item })}
		>
			{relaySlot(props.item, { item })}
		</SelectItem>
	)

	/** Запись `drawn`: опция или распорка на месте пропущенных. */
	const drawEntry = (entry: Accessor<TDrawnEntry<ISelectItem>>) => (
		<Show
			when={itemOf(entry())}
			keyed
			fallback={
				<div class="so-select__filler" aria-hidden="true" style={fillerStyleOf(entry())} />
			}
		>
			{drawItem}
		</Show>
	)

	/** Записи секции по порядку — по ключу записи. */
	const drawEntries = (section: Accessor<TDrawnSection<ISelectItem>>) => (
		<KeyedFor each={section().entries} by={(entry) => entry.key}>
			{drawEntry}
		</KeyedFor>
	)

	/** Первая ли секция: перед ней разделителя нет. */
	const isFirst = (section: Accessor<TDrawnSection<ISelectItem>>) =>
		state.drawnSections?.[0]?.key === section().key

	/**
	 * Секция: разделитель перед ней, если она не первая и Select их просит
	 * (`groupSeparators`), а дальше группа с подписью или записи без группы
	 * прямо в списке.
	 */
	const drawSection = (section: Accessor<TDrawnSection<ISelectItem>>) => (
		<>
			<Show when={state.groupSeparators && !isFirst(section)}>
				<div class="so-select__separator" aria-hidden="true" />
			</Show>
			<Show when={section().group} fallback={drawEntries(section)}>
				{(group) => <SelectGroup label={group().label}>{drawEntries(section)}</SelectGroup>}
			</Show>
		</>
	)

	return (
		<Show when={state.rendered}>
			<div {...root()} ref={binding.ref}>
				<Elevate layer={binding.layer}>
					<ResolvedSlot
						content={props.field}
						scope={() => ({ field })}
						fallback={
							<Input
								embedded="select.field"
								class="so-select__field"
								ctrl={field}
								clear={props.clear}
								leading={
									<>
										{drawTags()}
										{renderSlot(props.leading)}
									</>
								}
								trailing={
									<>
										{drawArrow()}
										{renderSlot(props.trailing)}
									</>
								}
								{...state.aria}
								{...control()}
							/>
						}
					/>
					<Frame
						embedded="select.frame"
						class="so-select__panel"
						visible={state.open}
						position="fixed"
						anchor_anchor={binding.rootElement()}
						anchor_placement={state.panelPlacement}
						anchor_flip={state.panelFlip}
						anchor_matchWidth={state.autoFitWidth}
						anchor_offset={4}
						{...state.panelDataset}
						{...state.dismiss_ownerAttribute}
					>
						<Show when={state.handleRendered}>
							<div class="so-select__handle" aria-hidden="true" />
						</Show>
						<div class="so-select__list" {...state.listAria}>
							<ResolvedSlot
								content={props.children}
								fallback={
									<KeyedFor
										each={state.drawnSections}
										by={(section) => section.key}
									>
										{drawSection}
									</KeyedFor>
								}
							/>
							<Show when={state.shown?.length === 0}>{renderSlot(props.empty)}</Show>
						</div>
					</Frame>
				</Elevate>
			</div>
		</Show>
	)
}
