import type { Accessor, JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import type { IMenuItem, TGroupSection, TMenuSubmenuEntries } from '@soldy-ui/core'
import {
	Elevate,
	KeyedFor,
	ResolvedSlot,
	chainHandler,
	createRootProps,
	relaySlot,
	renderSlot,
	resolveSlot,
	roleIcon,
	rootTag,
	toControlAttrs,
	toPartClass,
	toRootForward,
} from '../../../adapter'
import { For, Show } from '../../../adapter/runtime/flow'
import { Button } from '../../button'
import { Frame } from '../../frame'
import { Icon } from '../../icon'
import { MenuGroup } from '../group'
import { MenuItem } from '../item'
import { MenuSeparator } from '../separator'
import { setupMenuSubmenu } from './setup.component'
import type { MenuSubmenuAttributes, MenuSubmenuProps } from './base.component'

/** Стрелка без слота — иконка из пакета по роли, компонент на роль один на модуль. */
const ARROW = roleIcon('arrowRight')

/** Что пунктам из данных нужно от состояния владельца — меню или подменю. */
type TItemsState = {
	/** Секции показанных пунктов: группа с подписью или пункты без группы. */
	readonly sections?: ReadonlyArray<TGroupSection<IMenuItem>>
	/** Подменю из данных по пункту — пункт и движок его пунктов. */
	readonly submenus?: TMenuSubmenuEntries
	/** Рисовать ли разделитель между соседними секциями. */
	readonly groupSeparators?: boolean
}

/**
 * Слоты пунктов из данных — одни у меню и подменю: свои `item` и `item-*`
 * владелец отдаёт подменю из данных под теми же именами.
 */
type TItemSlots = Pick<
	MenuSubmenuProps,
	'item' | 'item-leading' | 'item-trailing' | 'item-header' | 'item-arrow-icon' | 'item-content'
>

/**
 * Пункты из данных (`items`) — одна разметка на меню и подменю, и подменю
 * рисует ею свои уровни само: у Vue её четыре копии только из-за шаблонов.
 * Зовёт её разметка владельца там, где стоят пункты, — в слое его лифта: узлы
 * пунктов Solid создаёт там, где её позвали.
 *
 * Пункты — по секциям показанных (`sections`): группа с подписью — в
 * `MenuGroup`, пункты без группы — прямо в списке, между соседними секциями,
 * пока его просит владелец (`groupSeparators`), — разделитель. Секции идут
 * порядком показанного, поэтому стрелки ходят так же, как пункты стоят на
 * экране; без групп секция одна — ни обёртки, ни разделителя. Секции — новые
 * записи на каждую смену, и петля по ним — по ключу секции (`KeyedFor`):
 * `<For>`, сравнивая их по ссылке, пересоздавал бы все пункты вместе с узлами
 * и фокусом. Пункты секции — экземпляры, и их держит `<For>` по ссылке.
 *
 * Пункт с вложенным `items` — подменю из данных: коллекция отдаёт его запись
 * (`submenus`), и она ложится в пропсы `MenuSubmenu` — пункт (`ctrl`) и движок
 * его пунктов (`engine`). Запись у пункта устойчива, а снимок `submenus` —
 * новый на каждую смену, и подменю читает `ctrl` и `engine` при сборке,
 * поэтому `Show` — по записи (`keyed`): запись та же — подменю то же.
 * Остальные пункты — действия.
 *
 * Слоты пункта пробрасываются целиком: у каждого слота строки есть
 * `item-<слот>`, scope — scope слота строки плюс сам пункт (`item`). Со своим
 * scope строки слот пункт получает функцией (`relaySlot`), а не готовыми
 * узлами: узлы, нарисованные владельцем, scope строки теряли бы. `default` у
 * действия — `item`, у подменю — `item-content`: пусто — подменю рисует свои
 * пункты из данных. Свои `item` и `item-*` владелец отдаёт подменю как есть —
 * слоты одни на все уровни.
 */
export function drawItems(state: TItemsState, slots: TItemSlots): JSX.Element {
	/** Пункт из данных — подменю, если коллекция завела ему движок, иначе действие. */
	const drawItem = (item: IMenuItem) => (
		<Show
			when={state.submenus?.get(item)}
			keyed
			fallback={
				<MenuItem
					ctrl={item}
					leading={renderSlot(slots['item-leading'], { item })}
					trailing={renderSlot(slots['item-trailing'], { item })}
				>
					{relaySlot(slots.item, { item })}
				</MenuItem>
			}
		>
			{(entry) => (
				<MenuSubmenu
					ctrl={entry.ctrl}
					engine={entry.engine}
					leading={renderSlot(slots['item-leading'], { item })}
					header={relaySlot(slots['item-header'], { item })}
					arrow-icon={renderSlot(slots['item-arrow-icon'], { item })}
					item={slots.item}
					item-leading={slots['item-leading']}
					item-trailing={slots['item-trailing']}
					item-header={slots['item-header']}
					item-arrow-icon={slots['item-arrow-icon']}
					item-content={slots['item-content']}
				>
					{renderSlot(slots['item-content'], { item })}
				</MenuSubmenu>
			)}
		</Show>
	)

	/** Пункты секции по порядку. */
	const drawSectionItems = (section: Accessor<TGroupSection<IMenuItem>>) => (
		<For each={section().items}>{drawItem}</For>
	)

	/** Первая ли секция: перед ней разделителя нет. */
	const isFirst = (section: Accessor<TGroupSection<IMenuItem>>) =>
		state.sections?.[0]?.key === section().key

	/**
	 * Секция: разделитель перед ней, если она не первая и владелец их просит,
	 * а дальше группа с подписью или пункты без группы прямо в списке.
	 */
	const drawSection = (section: Accessor<TGroupSection<IMenuItem>>) => (
		<>
			<Show when={state.groupSeparators && !isFirst(section)}>
				<MenuSeparator />
			</Show>
			<Show when={section().group} fallback={drawSectionItems(section)}>
				{(group) => (
					<MenuGroup label={group().label}>{drawSectionItems(section)}</MenuGroup>
				)}
			</Show>
		</>
	)

	return (
		<KeyedFor each={state.sections} by={(section) => section.key}>
			{drawSection}
		</KeyedFor>
	)
}

/**
 * MenuSubmenu — пункт с подменю: строка пункта в меню над ним и своя панель с
 * пунктами, как `Menu.Submenu` у Vue.
 *
 * Корень по `tag` несёт состояние для темы (`data-highlighted`,
 * `data-disabled`, `data-open`), `attrs` и модификаторы размера меню и своего
 * варианта, а строка красится от него, как у пункта: открытый пункт горит,
 * пока открыта его панель. Корень — якорь панели: его прямоугольник —
 * строка, его узел отдаёт аксессор адаптера (`rootElement`). Атрибуты
 * потребителя делятся, как у пункта: класс и стиль — корню, остальное —
 * строке, поверх её `aria`.
 *
 * Строка — `Button` на `div` (`menu.row`): на ней ARIA пункта — роль
 * `menuitem`, `aria-haspopup="menu"`, `aria-expanded`, `id` и
 * `aria-controls` на панель, `tabindex="-1"` от меню — и DOM-фокус, когда
 * пункт подсвечен. Нажатие строки открывает подменю, а не переключает:
 * открытое наведением клик не закроет. Решает меню
 * (`adapters.menu.open()`): выключенному отказывает. Стрелку к концу строки,
 * Enter и пробел клавиатура пункта гасит сама и открывает подменю на первом
 * пункте — клика из них нет.
 *
 * Текст строки — слот `header` (scope — `text` и `open`), без него — текст
 * пункта; стрелка у конца строки — слот `arrow-icon` в обёртке, которая
 * держит её место, зеркалит её в RTL и скрыта от скринридера (подменю
 * объявляет `aria-haspopup`), без слота — иконка роли `arrowRight`. По этим
 * слотам разметка выбирает, что рисовать, поэтому их разворачивает адаптер,
 * один раз (`resolveSlot`). Значок — слот `leading` в обёртке колонки, без
 * пробелов: пустую тема прячет по `:empty`.
 *
 * Панель — Frame, как у меню: телепорт, слой выше панели меню над ним
 * (нажатие в ней меню мимо не считает), привязка к корню пункта и пометка
 * владельцем. Встаёт у конца строки, верхом вровень с ней, без зазора
 * (`end-start`); у края окна привязка переводит её к началу строки, в RTL —
 * наоборот. На неё ложится набор панели (`panelAria`): `role="menu"`, `id`,
 * на который ссылается `aria-controls` строки, и `aria-labelledby` на строку —
 * имя подменю. `tabindex="-1"` — фокус встаёт на саму панель, пока ни один
 * пункт не подсвечен. Открытость — `visible` панели, а не `rendered`: пункты
 * входят в коллекцию подменю при монтировании, и закрытие не должно её
 * вычищать. Классы — свой набор (`panelClasses`): блок панели меню с
 * размером подменю и вариантом его панели — своим вариантом подменю, а без
 * него вариантом меню над ним; строкой его раскладывает адаптер
 * (`toPartClass`).
 *
 * Панель — в слое лифта подменю (`Elevate`): пункт, смонтированный в ней,
 * прочтёт движок и регистратор подменю и войдёт в его коллекцию, а не в
 * коллекцию меню над ним. Пункты — содержимое (`<Menu.Item>`), а без него —
 * свои пункты из данных (`drawItems`); содержимое разворачивается там же
 * (`ResolvedSlot`), а не в теле подменю, — иначе узлы пунктов Solid создал бы
 * вне его слоя.
 *
 * Логики здесь нет — см. `setupMenuSubmenu`.
 */
export function MenuSubmenu(props: MenuSubmenuProps): JSX.Element {
	const binding = setupMenuSubmenu(props)
	const state = binding.state
	const context = binding.context
	// Корню — его наборы, класс и стиль потребителя; `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.dataset, state.attrs],
		forward: toRootForward(binding.forwardProps()),
	}))
	const header = resolveSlot(
		() => props.header,
		() => ({ text: state.text ?? '', open: state.open ?? false }),
	)
	const arrowIcon = resolveSlot(
		() => props['arrow-icon'],
		() => ({}),
	)

	/** Атрибуты строки — всё от потребителя, кроме класса и стиля; клик — сначала открытие. */
	const row = () => {
		const { onClick, ...attributes } = toControlAttrs<MenuSubmenuAttributes>(
			binding.forwardProps(),
		)

		return {
			...attributes,
			onClick: chainHandler(() => context?.adapters.menu.open(), onClick),
		}
	}

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Button
					embedded="menu.row"
					tag="div"
					size={state.size}
					disabled={state.disabled}
					{...state.aria}
					{...row()}
					leading={<span class="so-menu-item__icon">{renderSlot(props.leading)}</span>}
					trailing={
						<span class="so-menu-item__arrow" aria-hidden="true">
							{arrowIcon() ?? (
								<Icon embedded="menu.arrow" tag={ARROW} size={state.size} />
							)}
						</span>
					}
				>
					{header() ?? state.text}
				</Button>
				<Elevate layer={binding.layer}>
					<Frame
						embedded="menu.submenu-frame"
						class={toPartClass(state.panelClasses)}
						tabindex="-1"
						visible={state.open}
						position="fixed"
						anchor_anchor={binding.rootElement()}
						anchor_placement="end-start"
						{...state.panelAria}
						{...state.dismiss_ownerAttribute}
					>
						<div class="so-menu__list">
							<ResolvedSlot
								content={props.children}
								fallback={drawItems(state, props)}
							/>
						</div>
					</Frame>
				</Elevate>
			</Dynamic>
		</Show>
	)
}
