import {
	ChangeDetectionStrategy,
	Component,
	ViewContainerRef,
	signal,
	viewChild,
} from '@angular/core'
import { enUS, type TLocale } from '@soldy-ui/plugins'
import { LocaleProviderDirective } from '@soldy-ui/angular'

/**
 * Язык шапки — один на все корни хоста: сигнал, который читает провайдер
 * каждого корня. Смена — новая локаль провайдера, и он пишет её в свой
 * источник: компоненты не пересобираются.
 */
export const language = signal<TLocale>(enUS)

/**
 * Корень превью хоста Angular: свой `so-locale-provider` вокруг места под
 * компонент. Контекст провайдера оболочки в чужой корень не проходит, и язык
 * шапки корню даёт хост.
 *
 * Компонент в место (`outlet`) ставит хост, а не шаблон: пропсы приходят
 * именами разметки, и раздать их входам по имени умеет только код
 * (`createComponent` со связками входов) — привязки шаблона Angular
 * перечисляет поимённо. DI места идёт через провайдер, и сборка компонента
 * видит его локаль.
 *
 * Корень — свой элемент в узле оболочки, а не сам узел: корню на готовом
 * элементе Angular ставит `ng-version` и при снятии элемент не очищает, а узел
 * оболочки обязан остаться пустым. Раскладки корень не меняет
 * (`display: contents`): компонент стоит в ячейке оболочки, как у остальных
 * хостов.
 */
@Component({
	selector: 'pg-angular-root',
	imports: [LocaleProviderDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { style: 'display: contents' },
	template: `
		<ng-container so-locale-provider [locale]="language()">
			<ng-container #outlet />
		</ng-container>
	`,
})
export class PreviewRootComponent {
	protected readonly language = language.asReadonly()

	/** Место под компонент — внутри провайдера. */
	readonly outlet = viewChild.required('outlet', { read: ViewContainerRef })
}
