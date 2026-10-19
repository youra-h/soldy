import type { ElementType, ReactElement } from 'react'
import { Elevate, renderSlot, roleIcon, toAriaProps, toRootProps } from '../../adapter'
import { Icon } from '../icon'
import { useSetupField } from './setup.component'
import type { FieldProps } from './base.component'

/** Значок ошибки — компонент на роль: `tag` у Icon — корень, а не роль. */
const ErrorGlyph = roleIcon('error')

/**
 * Field — поле формы: подпись, контрол, подсказка и ошибка, связанные с
 * контролом сами. Корень рисуется по `tag`, по умолчанию `div`. На корне —
 * модификаторы `so-field--position-*` (`top`, `start`, `end`) и
 * `so-field--size-*`. Своих состояний у Field нет: выключенность, только
 * чтение и обязательность тема читает с корня контрола, ошибку контрол рисует
 * по своему `data-invalid` — его пишет связка поля с контролом.
 *
 * Порядок частей один на все стороны — подпись, контрол, подсказка, ошибка:
 * сторону рисует тема. Часть стоит, пока задан её текст: ссылки контрола на
 * части ставит ядро, а слотов оно не видит. Ошибка рисуется при `invalid` и
 * встаёт на место подсказки. Что рисовать, решает ядро (`helperRendered`,
 * `errorRendered`).
 *
 * - подпись — проп `label`, своя разметка — слот `label-content`. Связку с
 *   контролом — `id` и `for` — несёт набор `labelAria`: `for` на поле у
 *   контролов с `<input>`, а группу (RadioGroup) называет ссылка
 *   `aria-labelledby` на `id`;
 * - контрол — `children` (слот `default`): Input, CheckBox, Switch, RadioGroup
 *   или Label с контролом;
 * - подсказка — проп `helper`, своя разметка — слот `helper-content`, её `id`
 *   (набор `helperAria`) — в `aria-describedby` контрола;
 * - ошибка — проп `error`, своя разметка — слот `error-content`, её `id`
 *   (набор `errorAria`) — в `aria-describedby` вместо подсказки. Значок — роль
 *   `error`, декор: смысл несёт текст. Размера у значка нет — его ставит тема.
 *
 * Всё содержимое — в слое лифта поля (`Elevate`): контрол, смонтированный
 * внутри, прочтёт связку этого поля при своей сборке.
 */
export function Field(props: FieldProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupField(props)

	const {
		rendered,
		tag,
		label,
		helper,
		error,
		helperRendered,
		errorRendered,
		labelAria,
		helperAria,
		errorAria,
		attrs,
		aria,
		dataset,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним (`toRootProps`)
	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			<Elevate layer={layer}>
				{label ? (
					<label className="so-field__label" {...toAriaProps(labelAria)}>
						{renderSlot(props['label-content']) ?? label}
					</label>
				) : null}
				<div className="so-field__control">{renderSlot(props.children)}</div>
				{helperRendered ? (
					<div className="so-field__helper" {...toAriaProps(helperAria)}>
						{renderSlot(props['helper-content']) ?? helper}
					</div>
				) : null}
				{errorRendered ? (
					<div className="so-field__error" {...toAriaProps(errorAria)}>
						<Icon
							embedded="field.error-icon"
							className="so-field__error-icon"
							tag={ErrorGlyph}
						/>
						<div className="so-field__error-text">
							{renderSlot(props['error-content']) ?? error}
						</div>
					</div>
				) : null}
			</Elevate>
		</Tag>
	)
}
