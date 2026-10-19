import type { ElementType, ReactElement } from 'react'
import {
	NativeInput,
	elevated,
	renderSlot,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
} from '../../adapter'
import { useSetupSwitch } from './setup.component'
import type { SwitchAttributes, SwitchProps } from './base.component'

/**
 * Switch — переключатель: корень по `tag` и нативный
 * `<input type="checkbox">` внутри, рядом — дорожка с ручкой.
 *
 * Корень по умолчанию — `span`: переключатель кладут в подпись `Label`, а
 * внутри `label` HTML разрешает только строчную разметку. Поэтому и всё
 * внутри — `span`. На корне — `attrs` и `dataset` (`data-disabled`,
 * `data-invalid`): тема красит дорожку и подпись поля формы `Field` по корню,
 * а `aria` — у вложенного `<input>`.
 *
 * `role="switch"` ядро пишет в `aria` поля, состояние скринридеру сообщает
 * нативный `checked` — свойство узла, его проводит поле адаптера
 * (`NativeInput`); переключает значение плагин по `change` поля.
 *
 * Дорожка — декор: `aria-hidden` не пускает содержимое слотов в доступное
 * имя, которое переключателю даёт подпись. В ручке — слот `on` у включённого
 * и `off` у выключенного, scope `{ value, ctrl }`.
 *
 * Поле формы `Field` над переключателем отдаёт ему ошибку, `id` и ссылки на
 * части (`TFieldControlExtension`), а своему содержимому переключатель
 * опускает пустую связку. Поэтому содержимое слотов ручки — в слое лифта
 * переключателя (`elevated`).
 */
export function Switch(props: SwitchProps): ReactElement | null {
	const { ctrl, ref, forwardProps, state, layer } = useSetupSwitch(props)

	const { rendered, tag, attrs, aria, dataset, id, value, name, disabled, required } = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const scope = { value, ctrl }

	// Корню — его наборы, класс и стиль потребителя; `ref` адаптера последним
	return (
		<Tag {...toRootProps(ref, state, [attrs, dataset], toRootForward(forwardProps))}>
			<NativeInput
				type="checkbox"
				id={id}
				name={name}
				disabled={disabled}
				required={required}
				{...toAriaProps(aria)}
				{...toControlAttrs<SwitchAttributes>(forwardProps)}
				live={{ checked: value }}
			/>
			<span className="so-switch__track" aria-hidden="true">
				<span className="so-switch__track--thumb">
					{elevated(
						layer,
						value ? renderSlot(props.on, scope) : renderSlot(props.off, scope),
					)}
				</span>
			</span>
		</Tag>
	)
}
