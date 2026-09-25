import type { ElementType, ReactElement } from 'react'
import { NativeInput, renderSlot, toAriaProps, toControlAttrs, toRootLayout } from '../../adapter'
import { useSetupSwitch } from './setup.component'
import type { SwitchAttributes, SwitchProps } from './base.component'

/**
 * Switch — переключатель: корень по `tag` и нативный
 * `<input type="checkbox">` внутри, рядом — дорожка с ручкой.
 *
 * Корень по умолчанию — `span`: переключатель кладут в подпись `Label`, а
 * внутри `label` HTML разрешает только строчную разметку. Поэтому и всё
 * внутри — `span`.
 *
 * `role="switch"` ядро пишет в `aria` поля, состояние скринридеру сообщает
 * нативный `checked` — свойство узла, его проводит поле адаптера
 * (`NativeInput`); переключает значение плагин по `change` поля.
 *
 * Дорожка — декор: `aria-hidden` не пускает содержимое слотов в доступное
 * имя, которое переключателю даёт подпись. В ручке — слот `on` у включённого
 * и `off` у выключенного, scope `{ value, ctrl }`.
 */
export function Switch(props: SwitchProps): ReactElement | null {
	const { ctrl, ref, forwardProps, state } = useSetupSwitch(props)

	const { rendered, tag, attrs, aria, id, value, name, disabled, required } = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const scope = { value, ctrl }

	return (
		<Tag ref={ref} {...toRootLayout(state, forwardProps)} {...toAriaProps(attrs)}>
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
			<span className="s-switch__track" aria-hidden="true">
				<span className="s-switch__track--thumb">
					{value ? renderSlot(props.on, scope) : renderSlot(props.off, scope)}
				</span>
			</span>
		</Tag>
	)
}
