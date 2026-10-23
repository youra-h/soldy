import type { ComponentType, ElementType, ReactElement } from 'react'
import type { TToastsItemType } from '@soldy-ui/core'
import {
	isToastRender,
	renderSlot,
	roleIcon,
	toAriaProps,
	toRootProps,
	type TRoleIconProps,
} from '../../../adapter'
import { Button } from '../../button'
import { Icon } from '../../icon'
import { ProgressSpinner } from '../../progress-spinner'
import { useSetupToastsItem } from './setup.component'
import type { ToastsItemProps } from './base.component'

/** Значок вида — своя роль у каждого: в принудительных цветах вид различает только глиф. */
const TYPE_ICONS = {
	info: roleIcon('info'),
	success: roleIcon('success'),
	warning: roleIcon('warning'),
	error: roleIcon('error'),
} satisfies Record<TToastsItemType, ComponentType<TRoleIconProps>>

const NOTIFICATION = roleIcon('notification')

const CLOSE = roleIcon('close')

/** ToastsItem — тост, внутренняя часть менеджера: рисует только регион `Toasts`. */
export function ToastsItem(props: ToastsItemProps): ReactElement | null {
	const { ctrl, ref, forwardProps, state } = useSetupToastsItem(props)

	const {
		rendered,
		tag,
		attrs,
		aria,
		dataset,
		classes,
		visible,
		order,
		type,
		loading,
		text,
		description,
		closable,
		closeAria,
		render,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const Render = isToastRender(render) ? render : undefined

	// `order` фасада раскладка корня поставила бы CSS-свойством: состояние — поимённо
	return (
		<Tag
			{...toRootProps(
				ref,
				{ classes, visible },
				[attrs, aria, dataset],
				forwardProps,
				order === undefined ? undefined : { '--so-toasts-depth': order },
			)}
		>
			<div className="so-toasts-item__card">
				<span className="so-toasts-item__icon" aria-hidden="true">
					{loading ? (
						<ProgressSpinner embedded="toasts.spinner" indeterminate />
					) : (
						(renderSlot(props.icon, { type }) ?? (
							<Icon
								embedded="toasts.icon"
								tag={type ? TYPE_ICONS[type] : NOTIFICATION}
							/>
						))
					)}
				</span>
				<div className="so-toasts-item__body">
					<div className="so-toasts-item__text">
						{renderSlot(props.children, { text: text ?? '' }) ?? text}
					</div>
					<div className="so-toasts-item__description">{description}</div>
					<div className="so-toasts-item__content">
						{renderSlot(props.content) ?? (Render ? <Render toast={ctrl} /> : null)}
					</div>
				</div>
				<Button
					embedded="toasts.close"
					type="button"
					className="so-toasts-item__close"
					rendered={closable}
					onClick={() => ctrl.close()}
					{...toAriaProps(closeAria)}
				>
					{renderSlot(props['close-icon']) ?? (
						<Icon embedded="toasts.close-icon" tag={CLOSE} />
					)}
				</Button>
			</div>
		</Tag>
	)
}
