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

/**
 * Значок вида — по роли, своей у каждого вида: в режиме принудительных цветов
 * вид различает только глиф. Роль выбирает разметка, как отметку CheckBox,
 * тема значок только красит. Таблица закрыта по виду (`satisfies`): новый вид
 * без своего значка не соберётся. Компонент на роль — один на модуль
 * (`roleIcon`): `tag` у Icon — корень, а не роль.
 */
const TYPE_ICONS = {
	info: roleIcon('info'),
	success: roleIcon('success'),
	warning: roleIcon('warning'),
	error: roleIcon('error'),
} satisfies Record<TToastsItemType, ComponentType<TRoleIconProps>>

/** Значок обычного сообщения — тоста без вида. */
const NOTIFICATION = roleIcon('notification')

/** Иконка крестика по умолчанию. */
const CLOSE = roleIcon('close')

/**
 * ToastsItem — тост, внутренняя часть менеджера, как у Vue: его рисует только
 * регион `Toasts`, по одному на показанный элемент коллекции, и наружу пакета
 * он не выходит.
 *
 * Корень — место тоста в списке (по `tag`, по умолчанию `li`): высота места,
 * сдвиг жеста, уход и прозрачность (тема). На нём: вид сообщения —
 * модификатор `so-toasts-item--type-*`, `data-open` (с первой отрисовки;
 * `false` — тост закрыт и гаснет), `data-swiping`, роль `status` или `alert`
 * для срочного, `tabindex` — фокус по F8 и Escape на тосте под фокусом.
 * Атрибуты снаружи — поверх наборов, `ref` адаптера последним. Сдвиг во
 * время жеста (`--so-swipe-offset`) плагин жеста пишет сюда сам.
 *
 * Глубина в стопке (`--so-toasts-depth`) — место тоста в составе, `order`
 * фасада: в стопке передний — первый. Своего CSS-свойства `order` у тоста нет,
 * как у Vue: порядок узлов в регионе и есть порядок коллекции. Состояние двух
 * контекстов несёт `order` фасада, и раскладка корня (`toRootLayout`)
 * поставила бы его свойством `order`, — поэтому ей оно отдаётся поимённо, без
 * `order`, а глубина уходит стиль-выходом.
 *
 * Плашка — то, что видно: поверхность, кромка, тень и кольцо фокуса корня.
 * Отдельный узел, а не корень: место растёт и схлопывается переходом высоты
 * без замеров, а плашка своего размера не меняет.
 *
 * Коробка значка стоит всегда, и в ней одно из трёх: пока тост ждёт
 * (`loading`) — бегущее кольцо, при любом виде и что бы ни дал слот; задан
 * слот `icon` (scope — вид) — свой значок; иначе — значок вида по роли.
 * Пустое, что вернул слот, уступает место значку вида, как пустые
 * слоты-иконки у элементов коллекций. Коробка — декор: что случилось, говорит
 * текст, поэтому она спрятана от скринридера вместе с ролью кольца.
 *
 * Текст — заголовок (слот `children` со scope `{ text }`, запасное — `text`
 * тоста), описание (`description`) и своё содержимое (слот `content`,
 * запасное — `render` тоста: компонент React, тост приходит ему пропом
 * `toast`, и рисуется он, только когда это компонент, — `isToastRender`).
 * Пустую часть тема сворачивает по `:empty`.
 *
 * Крестик — последним в DOM: последняя остановка Tab в тосте. Прячется
 * `rendered` (`closable`), имя — из локали вместе с текстом тоста
 * (`closeAria`). Вида и размера у него нет: квадрат и вид даёт тема по
 * контексту. `type="button"` — как у каждой кнопки-детали: в форме она форму
 * не отправляет.
 */
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
	// Своё содержимое — когда `render` тоста компонент React; иначе его нет
	const Render = isToastRender(render) ? render : undefined

	// Состояние — поимённо, без `order` фасада; глубина — стиль-выходом
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
