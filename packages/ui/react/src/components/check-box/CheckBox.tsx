import type { ElementType, ReactElement, ReactNode } from 'react'
import {
	NativeInput,
	renderSlot,
	roleIcon,
	toAriaProps,
	toControlAttrs,
	toRootLayout,
} from '../../adapter'
import { Icon } from '../icon'
import { useSetupCheckBox } from './setup.component'
import type { CheckBoxAttributes, CheckBoxProps } from './base.component'

/**
 * CheckBox — флажок: корень по `tag` и нативный `<input type="checkbox">`
 * внутри, рядом — коробка с отметкой.
 *
 * Корень по умолчанию — `span`: флажок кладут в подпись `Label`, а внутри
 * `label` HTML разрешает только строчную разметку. Поэтому и всё внутри —
 * `span`.
 *
 * Отметку и «выбрано частично» скринридеру сообщают нативные `checked` и
 * `indeterminate` поля, `aria-checked` ядро не пишет. Оба — свойства узла, и
 * проводит их поле адаптера (`NativeInput`); переключает значение плагин
 * флажка по `change` поля.
 *
 * Коробка — декор: `aria-hidden` не пускает иконки слотов в доступное имя,
 * которое флажку даёт подпись. Отметка — слот `icon` у выбранного и
 * `indeterminate-icon` у частично выбранного (scope `{ value, indeterminate }`),
 * без слота — иконка из пакета по ролям `check` и `checkIndeterminate`.
 */
export function CheckBox(props: CheckBoxProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupCheckBox(props)

	const { rendered, tag, attrs, aria, id, value, indeterminate, name, disabled, required, size } =
		state

	if (!rendered) return null

	const Tag = tag as ElementType
	const scope = { value, indeterminate: indeterminate ?? false }

	// «Выбрано частично» рисуется поверх значения, как во Vue: его снимает клик
	// (`toggle` ядра), а не смена `value`
	let mark: ReactNode = null

	if (indeterminate) {
		mark = renderSlot(props['indeterminate-icon'], scope) ?? (
			<Icon
				embedded="check-box.indeterminate-icon"
				tag={roleIcon('checkIndeterminate')}
				size={size}
			/>
		)
	} else if (value) {
		mark = renderSlot(props.icon, scope) ?? (
			<Icon embedded="check-box.icon" tag={roleIcon('check')} size={size} />
		)
	}

	return (
		<Tag ref={ref} {...toRootLayout(state, forwardProps)} {...toAriaProps(attrs)}>
			<NativeInput
				type="checkbox"
				id={id}
				name={name}
				disabled={disabled}
				required={required}
				{...toAriaProps(aria)}
				{...toControlAttrs<CheckBoxAttributes>(forwardProps)}
				live={{ checked: value, indeterminate }}
			/>
			<span className="s-check-box__container" aria-hidden="true">
				{mark}
			</span>
		</Tag>
	)
}
