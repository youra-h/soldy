import type { ReactElement, ReactNode } from 'react'
import type {
	ISelectItem,
	ITags,
	TDrawnEntry,
	TDrawnSection,
	TTagsCollection,
} from '@soldy-ui/core'
import {
	Elevate,
	hasSlot,
	relaySlot,
	renderSlot,
	roleIcon,
	toAriaProps,
	toControlAttrs,
	toReactStyle,
	toRootForward,
	toRootProps,
} from '../../adapter'
import { Frame } from '../frame'
import { Icon } from '../icon'
import { Input } from '../input'
import { Tags } from '../tags'
import { SelectItem } from './item'
import { SelectGroup } from './group'
import { useSetupSelect } from './setup.component'
import type { SelectAttributes, SelectProps } from './base.component'

/** Стрелка без слота — компонент на роль: `tag` у Icon — корень, а не роль. */
const ArrowIcon = roleIcon('arrowDown')

/**
 * Ряд тегов поля — пока выбор множественный: инстанс тегов и его коллекция
 * есть только в `multiple`. Своя разметка ряда — слот `tags` с ними в scope.
 * Ключ ряда — инстанс тегов: Select заводит новый на каждый переход в
 * `multiple`, а пересобранный Select без движка снаружи (StrictMode,
 * `<Activity>`) — ещё и новый движок с новыми тегами, и `Tags` над ними
 * монтируется заново, а не остаётся над прежними.
 */
function drawTags(
	props: SelectProps,
	tags: ITags | null | undefined,
	engine: TTagsCollection | null | undefined,
): ReactNode {
	if (!tags || !engine) return null

	return (
		renderSlot(props.tags, { tags, engine }) ?? (
			<Tags
				key={tags.uid}
				embedded="select.tags"
				className="so-select__tags"
				ctrl={tags}
				engine={engine}
			/>
		)
	)
}

/**
 * Запись того, что рисует список: опция из данных со слотами Select,
 * проброшенными целиком, или распорка на месте пропущенных окном.
 */
function drawEntry(props: SelectProps, entry: TDrawnEntry<ISelectItem>): ReactElement {
	if (entry.kind === 'filler') {
		return (
			<div
				key={entry.key}
				className="so-select__filler"
				aria-hidden="true"
				style={toReactStyle(entry.style)}
			/>
		)
	}

	return (
		<SelectItem
			key={entry.key}
			ctrl={entry.item}
			leading={renderSlot(props['item-leading'], { item: entry.item })}
			trailing={renderSlot(props['item-trailing'], { item: entry.item })}
			indicator-icon={relaySlot(props['item-indicator-icon'], { item: entry.item })}
		>
			{relaySlot(props.item, { item: entry.item })}
		</SelectItem>
	)
}

/**
 * Секция того, что рисует список, — узлами списка: разделитель перед ней, если
 * она не первая и Select их просит (`separated`), а дальше группа с подписью
 * или записи без группы прямо в списке. Ключи — разные у всех видов: у записи
 * — её ключ (число), у группы — ключ секции, у разделителя — свой от ключа
 * секции.
 */
function drawSection(
	props: SelectProps,
	section: TDrawnSection<ISelectItem>,
	separated: boolean,
): ReactElement[] {
	const entries = section.entries.map((entry) => drawEntry(props, entry))
	const separator = separated
		? [
				<div
					key={`separator:${section.key}`}
					className="so-select__separator"
					aria-hidden="true"
				/>,
			]
		: []

	if (!section.group) return [...separator, ...entries]

	return [
		...separator,
		<SelectGroup key={section.key} label={section.group.label}>
			{entries}
		</SelectGroup>,
	]
}

/**
 * Select — поле выбора из списка (Combobox, select-only или `editable`), как у
 * Vue: в корне поле и панель со списком.
 *
 * Корень — рамка: на нём `dataset` (`data-open` — стрелку тема разворачивает
 * по нему) и `attrs`. Набор `aria` Select — имя, описание, ошибка — у поля:
 * фокус всегда на `<input>`, а не в списке. Атрибуты потребителя делятся, как
 * у поля и у Vue: класс и стиль — корню, остальное — `<input>` поля, поверх
 * его наборов: `aria-label` и `id` потребителя называют комбобокс, а не
 * корень без роли. `ref` потребителя — корень.
 *
 * Поле — готовый `Input` (слот `field` его заменяет, scope — `field`): текст,
 * плейсхолдер и ARIA комбобокса принадлежат экземпляру `TInput`, которым
 * владеет Select (`field`), и разметка отдаёт его целиком (`ctrl={field}`) —
 * рядом с ним ни текста, ни плейсхолдера. Ключ поля — его экземпляр:
 * пересобранный Select без `ctrl` (StrictMode, `<Activity>`) — новый TSelect с
 * новым полем, и `Input` над ним монтируется заново, а не остаётся над
 * прежним. Своё поле в слоте `field` и свой ряд в слоте `tags` ставят над
 * экземплярами из scope тот же ключ (`key={scope.tags.uid}`): компонент
 * собирается над `ctrl` один раз за монтирование. Свой набор `aria` Select
 * кладёт на поле атрибутами: они доходят до `<input>` поверх набора
 * комбобокса, атрибуты потребителя — поверх обоих. Слоты поля по сторонам
 * Select отдаёт всегда, как Vue свои шаблоны `leading` и `trailing`: обёртки
 * поля стоят и без тегов. Кнопку очистки рисует поле, а не Select: свою кнопку
 * слота `clear` Select отдаёт полю как есть — scope у слотов один, команда
 * поля `clear`.
 *
 * Слева — ряд тегов, пока выбор множественный: второй компонент со своей
 * коллекцией, связку «опция ⇄ тег» держит `TSelectTagsExtension`. Слот `tags`
 * получает инстанс тегов и его коллекцию — то, что встроенный `Tags` берёт
 * `ctrl` и `engine`. За ними — слот `leading`. Справа — стрелка: класс на
 * обёртке, а не на иконке, — по нему тема разворачивает стрелку, а
 * `TSelectPointerPlugin` в `editable` открывает панель только кликом по ней;
 * иконка из слота `arrow-icon` поворачивается так же. За ней — `trailing`.
 *
 * Панель — Frame: телепорт, слой, привязка к корню (`anchor_anchor` — корень
 * значением рендера от `useRootElement`: `null` на сервере и до коммита, узел
 * после), пометка владельцем (`dismiss_ownerAttribute`): панель лежит вне
 * поддерева Select, и нажатие в неё иначе считалось бы нажатием мимо.
 * Открытость — это `visible` панели, а не `rendered`: опции входят в
 * коллекцию при монтировании и выбывают при снятии, и закрытие, снимающее
 * панель, вычистило бы вместе с ними выбор. Сторону и flip ядро выводит из
 * `placement` (`panelPlacement`, `panelFlip`), ширину по полю — из
 * `contentFit` (`autoFitWidth`); `panelDataset` — признак «тянут»
 * (`data-swiping`).
 *
 * В панели — полоса жеста (пока жест включён; немая, прямой потомок панели и
 * вне списка), затем список с набором `listAria` (`role="listbox"`, `id`,
 * `aria-multiselectable`). В нём опции — дети (`<Select.Item>`,
 * `<Select.Group>`), а без детей — то, что рисует коллекция, по секциям
 * группировки (`drawnSections`), как у ListBox: группа с подписью — в
 * `SelectGroup`, опции без группы — прямо в списке, между соседними
 * секциями, пока его просит Select (`groupSeparators`), — немой разделитель.
 * В секции — её записи по порядку, ключ — ключ записи: опции, а в окне
 * обёртки `Virtual` — и распорки на месте пропущенных, `div` под
 * `aria-hidden` со стилем от ядра. Пока показанных опций нет, на их месте
 * слот `empty`.
 *
 * Слоты опций статические и получают опцию через scope. Проброс целиком: у
 * каждого слота опции есть `item-<слот>` (`default` — `item`), scope — scope
 * слота опции плюс сама опция. Слоты со scope опция получает функцией
 * (`relaySlot`), края — готовыми узлами с опцией в scope; пустое, что вернул
 * проброс, опция видит и рисует своё — текст и отметку.
 *
 * Всё содержимое корня — в слое лифта Select (`Elevate`): опция,
 * смонтированная в панели, прочтёт движок и регистратор Select и при коммите
 * войдёт в его коллекцию, а поле — пустую связку поля формы, которую Select
 * опускает своему содержимому. Портал React контекст сохраняет, поэтому опции
 * в телепортированной панели слой Select видят. На сервере портала нет —
 * панели и опций в серверной разметке нет, как у Menu: Select из `items`
 * сервер рисует с текстом выбранного (в `multiple` — с тегами), опции
 * разметкой входят в коллекцию после гидратации.
 */
export function Select(props: SelectProps): ReactElement | null {
	const { ref, forwardProps, state, rootElement, field, layer } = useSetupSelect(props)

	const {
		rendered,
		attrs,
		aria,
		dataset,
		size,
		open,
		panelPlacement,
		panelFlip,
		autoFitWidth,
		panelDataset,
		handleRendered,
		listAria,
		drawnSections,
		groupSeparators,
		shown,
		tags,
		tags_engine,
		dismiss_ownerAttribute,
	} = state

	if (!rendered) return null

	// Корню — его наборы, класс и стиль потребителя; `ref` адаптера последним
	return (
		<div {...toRootProps(ref, state, [dataset, attrs], toRootForward(forwardProps))}>
			<Elevate layer={layer}>
				{renderSlot(props.field, { field }) ?? (
					<Input
						key={field.uid}
						embedded="select.field"
						className="so-select__field"
						ctrl={field}
						clear={props.clear}
						leading={
							<>
								{drawTags(props, tags, tags_engine)}
								{renderSlot(props.leading)}
							</>
						}
						trailing={
							<>
								<span className="so-select__arrow">
									{renderSlot(props['arrow-icon']) ?? (
										<Icon embedded="select.arrow" tag={ArrowIcon} size={size} />
									)}
								</span>
								{renderSlot(props.trailing)}
							</>
						}
						{...toAriaProps(aria)}
						{...toControlAttrs<SelectAttributes>(forwardProps)}
					/>
				)}
				<Frame
					embedded="select.frame"
					className="so-select__panel"
					visible={open}
					position="fixed"
					anchor_anchor={rootElement}
					anchor_placement={panelPlacement}
					anchor_flip={panelFlip}
					anchor_matchWidth={autoFitWidth}
					anchor_offset={4}
					{...toAriaProps(panelDataset)}
					{...toAriaProps(dismiss_ownerAttribute)}
				>
					{handleRendered ? (
						<div className="so-select__handle" aria-hidden="true" />
					) : null}
					<div className="so-select__list" {...toAriaProps(listAria)}>
						{hasSlot(props.children)
							? renderSlot(props.children)
							: drawnSections?.flatMap((section, index) =>
									drawSection(
										props,
										section,
										groupSeparators === true && index > 0,
									),
								)}
						{shown?.length === 0 ? renderSlot(props.empty) : null}
					</div>
				</Frame>
			</Elevate>
		</div>
	)
}
