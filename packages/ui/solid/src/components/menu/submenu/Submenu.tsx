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

/** Слоты пунктов из данных — одни на все уровни: подменю из данных их получает как есть. */
type TItemSlots = Pick<
	MenuSubmenuProps,
	'item' | 'item-leading' | 'item-trailing' | 'item-header' | 'item-arrow-icon' | 'item-content'
>

/**
 * Пункты из данных (`items`) — одна разметка на меню и подменю. Подменю из данных —
 * `Show` по записи `submenus` (`keyed`): запись у пункта устойчива, а `ctrl` и
 * `engine` подменю читает при сборке.
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

	const drawSectionItems = (section: Accessor<TGroupSection<IMenuItem>>) => (
		<For each={section().items}>{drawItem}</For>
	)

	const isFirst = (section: Accessor<TGroupSection<IMenuItem>>) =>
		state.sections?.[0]?.key === section().key

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
 * Пункт с подменю: строка пункта в меню над ним и своя панель с пунктами. Строка —
 * `Button` над экземпляром пункта (`row`, `TItemRow` на `div`), как у пункта-действия.
 */
export function MenuSubmenu(props: MenuSubmenuProps): JSX.Element {
	const binding = setupMenuSubmenu(props)
	const state = binding.state
	const context = binding.context
	const row = binding.row
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
	const rowAttrs = () => {
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
					ctrl={row}
					{...state.aria}
					{...rowAttrs()}
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
