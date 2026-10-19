import type { ElementType, ReactElement, ReactNode } from 'react'
import {
	Elevate,
	NativeInput,
	renderSlot,
	roleIcon,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
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
 * `span`. На корне — `attrs` и `dataset` (`data-disabled`, `data-invalid`):
 * тема красит коробку и подпись поля формы `Field` по корню, а `aria` — у
 * вложенного `<input>`.
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
 * тысячами. Размер и цвет отметке даёт тема флажка по `so-check-box__mark`.
 *
 * Поле формы `Field` над флажком отдаёт ему ошибку, `id` и ссылки на части
 * (`TFieldControlExtension`), а своему содержимому флажок опускает пустую
 * связку. Поэтому содержимое — в слое лифта флажка (`Elevate`).
 */
export function CheckBox(props: CheckBoxProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupCheckBox(props)

	const {
		rendered,
		tag,
		attrs,
		aria,
		dataset,
		id,
		value,
		indeterminate,
		name,
		disabled,
		required,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const scope = { value, indeterminate: indeterminate ?? false }

	// «Выбрано частично» рисуется поверх значения, как во Vue: его снимает клик
	// (`toggle` ядра), а не смена `value`
	let mark: ReactNode = null

	if (indeterminate) {
		mark = renderSlot(props['indeterminate-icon'], scope) ?? (
			<IndeterminateMark className="so-check-box__mark" />
		)
	} else if (value) {
		mark = renderSlot(props.icon, scope) ?? <CheckMark className="so-check-box__mark" />
	}

	// Корню — его наборы, класс и стиль потребителя; `ref` адаптера последним
	return (
		<Tag {...toRootProps(ref, state, [attrs, dataset], toRootForward(forwardProps))}>
			<Elevate layer={layer}>
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
				<span className="so-check-box__container" aria-hidden="true">
					{mark}
				</span>
			</Elevate>
		</Tag>
	)
}
