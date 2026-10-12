import { Show, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { createRootProps, renderSlot, rootTag, toControlAttrs, toRootForward } from '../../adapter'
import { setupSwitch } from './setup.component'
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
 * нативный `checked` — Solid пишет его свойством узла, а на сервере —
 * атрибутом; переключает значение плагин по `change` поля. Атрибуты
 * потребителя делятся, как у CheckBox: класс и стиль — корню, остальное —
 * полю.
 *
 * Дорожка — декор: `aria-hidden` не пускает содержимое слотов в доступное
 * имя, которое переключателю даёт подпись. В ручке — слот `on` у включённого
 * и `off` у выключенного, scope `{ value, ctrl }`. Запасного содержимого у
 * них нет, и каждый слот читается один раз — когда ручка его показывает.
 */
export function Switch(props: SwitchProps): JSX.Element {
	const binding = setupSwitch(props)
	const state = binding.state
	const ctrl = binding.ctrl
	// Корню — его набор, класс и стиль потребителя; `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs],
		forward: toRootForward(binding.forwardProps()),
	}))
	const scope = () => ({ value: state.value, ctrl })

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<input
					type="checkbox"
					id={state.id}
					name={state.name}
					disabled={state.disabled}
					required={state.required}
					{...state.aria}
					{...toControlAttrs<SwitchAttributes>(binding.forwardProps())}
					checked={state.value}
				/>
				<span class="s-switch__track" aria-hidden="true">
					<span class="s-switch__track--thumb">
						<Show when={state.value} fallback={renderSlot(props.off, scope())}>
							{renderSlot(props.on, scope())}
						</Show>
					</span>
				</span>
			</Dynamic>
		</Show>
	)
}
