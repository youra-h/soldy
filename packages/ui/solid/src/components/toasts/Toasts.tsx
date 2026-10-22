import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { Elevate, Teleport, createRootProps, relaySlot, renderSlot, rootTag } from '../../adapter'
import { For, Show } from '../../adapter/runtime/flow'
import { ToastsItem } from './item'
import { setupToasts } from './setup.component'
import type { ToastsProps } from './base.component'

/**
 * Toasts — менеджер уведомлений и их регион, как у Vue.
 *
 * Менеджер оборачивает приложение, как `LocaleProvider`: `children` — само
 * приложение, своей разметки вокруг него нет. Регион с тостами — следом,
 * телепортом в цель слоя (`target`, по умолчанию `body`), в обёртку портала.
 * Приложение стоит вне условия региона: оно рисуется и без региона. На сервере
 * портала нет — регион появляется на клиенте.
 *
 * Приложение и регион — в слое лифта менеджера (`Elevate`): потомок берёт API
 * тостов (`useToasts()`) из этого слоя, а тосты в регионе — движок и
 * регистратор. Регион телепортирован, но содержимое портала собирается под
 * владельцем места, где стоит телепорт, — внутри того же `Elevate`, — и лифт
 * до тостов доходит.
 *
 * Регион стоит всегда, и пустым: живая область должна быть в документе до
 * первого тоста. Места он не занимает и нажатий мимо тостов не ловит — это
 * тема. На нём: место — модификатор `so-toasts--placement-*` и раскладка —
 * `so-toasts--layout-*`, номер слоя — `z-index` (`layout_styles`) и
 * `data-layer`, `role="region"`, `aria-live` и имя из локали, `dir`. Атрибуты
 * потребителя — поверх наборов, `ref` адаптера последним: `ref` потребителя
 * получает регион. Колесо и стрелки стопки слушает на нём плагин стопки.
 *
 * Тост — по одному на каждый показанный (`shown`), новый — первым: на экране
 * он у края окна, а список растёт от края. Тосты — экземпляры, и ссылка на
 * них устойчива: петля `<For>` по `shown` переставляет их узлы, а не рисует
 * заново. Закрытый тост остаётся, пока гаснет, и уходит из коллекции, когда
 * доиграли переходы его корня.
 *
 * Слоты тоста пробрасываются целиком: `item-<слот>` (`default` — `item`),
 * scope — scope слота тоста плюс сам тост. Текст и значок тост зовёт со своим
 * scope (`{ text }`, `{ type }`), и их проброс — функция (`relaySlot`);
 * своё содержимое и иконку крестика — без scope, и владелец рисует их сам, с
 * тостом в scope (`renderSlot`). Незаданный менеджеру слот тосту не уходит,
 * а пустое, что вернул заданный, тост заменяет своим — значком вида, текстом,
 * `render`, иконкой крестика.
 *
 * Логики здесь нет — см. `setupToasts`.
 */
export function Toasts(props: ToastsProps): JSX.Element {
	const binding = setupToasts(props)
	const state = binding.state
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))

	return (
		<Elevate layer={binding.layer}>
			{renderSlot(props.children)}
			<Show when={state.rendered}>
				<Teleport to={state.target}>
					<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
						<ol class="so-toasts__list">
							<For each={state.shown}>
								{(item) => (
									<ToastsItem
										ctrl={item}
										icon={relaySlot(props['item-icon'], { item })}
										content={renderSlot(props['item-content'], { item })}
										close-icon={renderSlot(props['item-close-icon'], { item })}
									>
										{relaySlot(props.item, { item })}
									</ToastsItem>
								)}
							</For>
						</ol>
					</Dynamic>
				</Teleport>
			</Show>
		</Elevate>
	)
}
