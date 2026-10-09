import type { ElementType, ReactElement, ReactNode } from 'react'
import {
	NativeInput,
	renderSlot,
	roleIcon,
	toAriaProps,
	toControlAttrs,
	toRootLayout,
} from '../../adapter'
import { useSetupCheckBox } from './setup.component'
import type { CheckBoxAttributes, CheckBoxProps } from './base.component'

/** Отметки без слота — иконки по ролям, компонент на роль один на модуль (`roleIcon`). */
const CheckMark = roleIcon('check')
const IndeterminateMark = roleIcon('checkIndeterminate')

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
 *
 * Отметка без слота — `svg` иконки по роли, а не компонент `Icon`: она
 * появляется и пропадает с каждой сменой отметки, и `Icon` собирал бы на
 * каждую свой контекст и плагины — в таблице «выбрать все» собирала их
 * тысячами. Размер и цвет отметке даёт тема флажка по `s-check-box__mark`.
 */
export function CheckBox(props: CheckBoxProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupCheckBox(props)

	const { rendered, tag, attrs, aria, id, value, indeterminate, name, disabled, required } = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const scope = { value, indeterminate: indeterminate ?? false }

	// «Выбрано частично» рисуется поверх значения, как во Vue: его снимает клик
	// (`toggle` ядра), а не смена `value`
	let mark: ReactNode = null

	if (indeterminate) {
		mark = renderSlot(props['indeterminate-icon'], scope) ?? (
			<IndeterminateMark className="s-check-box__mark" />
		)
	} else if (value) {
		mark = renderSlot(props.icon, scope) ?? <CheckMark className="s-check-box__mark" />
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
