import type { ElementType, ReactElement } from 'react'
import {
	Teleport,
	renderSlot,
	roleIcon,
	toAriaProps,
	toRootLayout,
	toRootProps,
} from '../../adapter'
import { Button } from '../button'
import { Icon } from '../icon'
import { useSetupDialog } from './setup.component'
import type { DialogProps } from './base.component'

/** Иконки кнопок шапки — компоненты на роль, по одному на модуль (`roleIcon`). */
const CloseIcon = roleIcon('close')
const MaximizeIcon = roleIcon('arrowsOutward')
const RestoreIcon = roleIcon('arrowsInward')

/**
 * Dialog — модальное окно.
 *
 * Окно телепортировано целиком (`Teleport` адаптера, цель — `target`):
 * подложка и панель — соседи, а не обёртка и содержимое. Подложка стоит в DOM
 * раньше панели: слой у них один (одно число `z-index` инлайном), и панель
 * рисуется поверх просто порядком. На сервере портала нет — окно появляется
 * после гидратации.
 *
 * Подложка обязательна и закрывает весь экран: фон под окном скрыт от
 * скринридера, но не от указателя, и к странице его не пускает только она.
 * Номер слоя и открытость у неё те же, что у окна (`backdropDataset`): для
 * окна под этим она — слой выше, и нажатие по ней его не закрывает, а гаснет
 * она вместе с окном. Пометки владельцем у неё нет — для своего окна нажатие
 * по ней мимо. Стиль слоя (`layout_backdropStyles`) и скрытие по `visible`
 * ей кладёт та же раскладка корня (`toRootLayout`), что и панели.
 *
 * Корень — сама панель: на ней слой (`data-layer`), пометка владельцем, место
 * (`so-dialog--placement-*`), размер (`--so-dialog-width`,
 * `--so-dialog-height`), `data-open` и `data-maximized`, атрибуты и `ref`
 * потребителя — `ref` получает панель от ref корня. Без пометки плагины не
 * нашли бы слой окна, и нажатие в панель, открытую из окна, закрыло бы его.
 * `tabIndex={-1}` — фокус встаёт на саму панель, когда внутри нечего
 * фокусировать; набор ядра и атрибуты потребителя его перекрывают, как у Vue.
 *
 * Открытость — `visible`: закрытое окно спрятано, а не размонтировано, и
 * состояние содержимого переживает закрытие. Появление и исчезание — переход
 * темы: `data-open` у панели и подложки говорит ей, проявляться или гаснуть.
 *
 * Порядок в DOM — заголовок, тело, подвал, потом кнопки. В строку заголовка
 * кнопки переносит тема, областями сетки. Поэтому фокус при открытии попадает
 * на первый контрол содержимого, а не на «развернуть», а крестик остаётся
 * последней остановкой Tab. Заголовок рисуется всегда: на него окно ссылается
 * `aria-labelledby`, и `id` для этой ссылки он берёт из `titleAria`; пустой
 * тема сворачивает по `:empty`. Тело несёт `id` для `aria-describedby`
 * предупреждения (`bodyAria`).
 *
 * Кнопка разворота — переключатель: имя одно, состояние в `aria-pressed`, а
 * иконок две, видна одна — по состоянию окна. Крестик просит окно закрыться
 * (`requestClose('button')`): отменить закрытие может подписчик
 * `close:before`. Кнопки шапки прячутся `rendered`, а не `visible`: тема
 * опирается на их отсутствие в DOM. Вида и размера у них нет — их красит тема
 * по контексту.
 */
export function Dialog(props: DialogProps): ReactElement | null {
	const { ctrl, ref, forwardProps, state } = useSetupDialog(props)

	const {
		rendered,
		tag,
		target,
		visible,
		attrs,
		aria,
		dataset,
		titleAria,
		bodyAria,
		closable,
		closeAria,
		maximizable,
		maximizeAria,
		maximized,
		backdropDataset,
		layout_backdropStyles,
		dismiss_ownerAttribute,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Teleport to={target}>
			<div
				{...toAriaProps(backdropDataset)}
				{...toRootLayout(
					{ layout_styles: layout_backdropStyles, visible },
					{ className: 'so-dialog__backdrop' },
				)}
			/>
			<Tag
				tabIndex={-1}
				{...toRootProps(
					ref,
					state,
					[attrs, aria, dataset, dismiss_ownerAttribute],
					forwardProps,
				)}
			>
				<h2 className="so-dialog__title" {...toAriaProps(titleAria)}>
					{renderSlot(props.title)}
				</h2>
				<div className="so-dialog__body" {...toAriaProps(bodyAria)}>
					{renderSlot(props.children)}
				</div>
				<div className="so-dialog__footer">{renderSlot(props.footer)}</div>
				<Button
					embedded="dialog.maximize"
					type="button"
					className="so-dialog__maximize"
					rendered={maximizable}
					onClick={() => ctrl.toggleMaximized()}
					{...toAriaProps(maximizeAria)}
				>
					{maximized
						? (renderSlot(props['restore-icon']) ?? (
								<Icon embedded="dialog.restore-icon" tag={RestoreIcon} />
							))
						: (renderSlot(props['maximize-icon']) ?? (
								<Icon embedded="dialog.maximize-icon" tag={MaximizeIcon} />
							))}
				</Button>
				<Button
					embedded="dialog.close"
					type="button"
					className="so-dialog__close"
					rendered={closable}
					onClick={() => ctrl.requestClose('button')}
					{...toAriaProps(closeAria)}
				>
					{renderSlot(props['close-icon']) ?? (
						<Icon embedded="dialog.close-icon" tag={CloseIcon} />
					)}
				</Button>
			</Tag>
		</Teleport>
	)
}
