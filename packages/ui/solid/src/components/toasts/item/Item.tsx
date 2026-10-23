import type { Component, JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import type { TToastsItemType } from '@soldy-ui/core'
import {
	createRootProps,
	isToastRender,
	resolveSlot,
	roleIcon,
	rootTag,
	type TRoleIconProps,
	type TToastRender,
} from '../../../adapter'
import { Show } from '../../../adapter/runtime/flow'
import { Button } from '../../button'
import { Icon } from '../../icon'
import { ProgressSpinner } from '../../progress-spinner'
import { setupToastsItem } from './setup.component'
import type { ToastsItemProps } from './base.component'

/** Значок вида — по роли; таблица закрыта по виду (`satisfies`): вид без значка не соберётся. */
const TYPE_ICONS = {
	info: roleIcon('info'),
	success: roleIcon('success'),
	warning: roleIcon('warning'),
	error: roleIcon('error'),
} satisfies Record<TToastsItemType, Component<TRoleIconProps>>

/** Значок обычного сообщения — тоста без вида. */
const NOTIFICATION = roleIcon('notification')

/** Иконка крестика по умолчанию. */
const CLOSE = roleIcon('close')

/**
 * Тост — внутренняя часть Toasts. Корень — место в списке, плашка — отдельный узел:
 * место растёт и схлопывается переходом высоты, а плашка своего размера не меняет.
 */
export function ToastsItem(props: ToastsItemProps): JSX.Element {
	const binding = setupToastsItem(props)
	const state = binding.state
	const ctrl = binding.ctrl
	// Состояние — поимённо, без `order` фасада; глубина — стиль-выходом
	const root = createRootProps(() => ({
		state: { classes: state.classes, visible: state.visible },
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
		style: { '--so-toasts-depth': state.order ?? '' },
	}))
	const icon = resolveSlot(
		() => props.icon,
		() => ({ type: state.type }),
	)
	const text = resolveSlot(
		() => props.children,
		() => ({ text: state.text ?? '' }),
	)
	const content = resolveSlot(
		() => props.content,
		() => ({}),
	)
	const closeIcon = resolveSlot(
		() => props['close-icon'],
		() => ({}),
	)

	/** Своё содержимое — когда `render` тоста компонент Solid; иначе его нет. */
	const render = (): TToastRender | undefined =>
		isToastRender(state.render) ? state.render : undefined

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<div class="so-toasts-item__card">
					<span class="so-toasts-item__icon" aria-hidden="true">
						<Show
							when={!state.loading}
							fallback={<ProgressSpinner embedded="toasts.spinner" indeterminate />}
						>
							{icon() ?? (
								<Icon
									embedded="toasts.icon"
									tag={state.type ? TYPE_ICONS[state.type] : NOTIFICATION}
								/>
							)}
						</Show>
					</span>
					<div class="so-toasts-item__body">
						<div class="so-toasts-item__text">{text() ?? state.text}</div>
						<div class="so-toasts-item__description">{state.description}</div>
						<div class="so-toasts-item__content">
							{content() ?? <Dynamic component={render()} toast={ctrl} />}
						</div>
					</div>
					<Button
						embedded="toasts.close"
						type="button"
						class="so-toasts-item__close"
						rendered={state.closable}
						onClick={() => ctrl.close()}
						{...state.closeAria}
					>
						{closeIcon() ?? <Icon embedded="toasts.close-icon" tag={CLOSE} />}
					</Button>
				</div>
			</Dynamic>
		</Show>
	)
}
