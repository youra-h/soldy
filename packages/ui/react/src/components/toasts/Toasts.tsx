import type { ElementType, ReactElement } from 'react'
import { Elevate, Teleport, relaySlot, renderSlot, toRootProps } from '../../adapter'
import { ToastsItem } from './item'
import { useSetupToasts } from './setup.component'
import type { ToastsProps } from './base.component'

/**
 * Toasts — менеджер уведомлений и их регион, как у Vue.
 *
 * Менеджер оборачивает приложение, как `LocaleProvider`: `children` — само
 * приложение, своей разметки вокруг него нет. Регион с тостами — следом,
 * телепортом в цель слоя (`target`, по умолчанию `body`), в обёртку
 * `Teleport`. Приложение стоит вне условия региона: оно рисуется и без
 * региона. На сервере портала нет — регион появляется после гидратации.
 *
 * Приложение и регион — в слое лифта менеджера (`Elevate`): потомок берёт API
 * тостов (`useToasts()`) из этого слоя, а тосты в регионе — движок и
 * регистратор. Регион в портале, а портал React контекст сохраняет, и лифт до
 * тостов доходит.
 *
 * Регион стоит всегда, и пустым: живая область должна быть в документе до
 * первого тоста. Места он не занимает и нажатий мимо тостов не ловит — это
 * тема. На нём: место — модификатор `so-toasts--placement-*` и раскладка —
 * `so-toasts--layout-*`, номер слоя — `z-index` (`layout_styles`) и
 * `data-layer`, `role="region"`, `aria-live` и имя из локали, `dir`. Атрибуты
 * потребителя — поверх наборов, `ref` адаптера последним: `ref` потребителя
 * получает регион от ref корня (`TRootRef`). Колесо и стрелки стопки слушает
 * на нём плагин стопки.
 *
 * Тост — по одному на каждый показанный (`shown`), новый — первым: на экране
 * он у края окна, а список растёт от края. Ключ — `uid` тоста: тосты —
 * экземпляры, и перестановка переносит их узлы, а не рисует заново. Закрытый
 * тост остаётся, пока гаснет, и уходит из коллекции, когда доиграли переходы
 * его корня.
 *
 * Слоты тоста пробрасываются целиком: `item-<слот>` (`default` — `item`),
 * scope — scope слота тоста плюс сам тост. Текст и значок тост зовёт со своим
 * scope (`{ text }`, `{ type }`), и их проброс — функция (`relaySlot`); своё
 * содержимое и иконку крестика — без scope, и владелец рисует их сам, с
 * тостом в scope (`renderSlot`). Незаданный менеджеру слот тосту не уходит, а
 * пустое, что вернул заданный, тост заменяет своим — значком вида, текстом,
 * `render`, иконкой крестика.
 *
 * Логики здесь нет — см. `useSetupToasts`.
 */
export function Toasts(props: ToastsProps): ReactElement {
	const { ref, forwardProps, state, layer } = useSetupToasts(props)

	const { rendered, tag, target, attrs, aria, dataset, shown } = state

	const Tag = tag as ElementType

	return (
		<Elevate layer={layer}>
			{renderSlot(props.children)}
			{rendered ? (
				<Teleport to={target}>
					{/* Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним */}
					<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
						<ol className="so-toasts__list">
							{shown?.map((item) => (
								<ToastsItem
									key={item.uid}
									ctrl={item}
									icon={relaySlot(props['item-icon'], { item })}
									content={renderSlot(props['item-content'], { item })}
									close-icon={renderSlot(props['item-close-icon'], { item })}
								>
									{relaySlot(props.item, { item })}
								</ToastsItem>
							))}
						</ol>
					</Tag>
				</Teleport>
			) : null}
		</Elevate>
	)
}
