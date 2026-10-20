/**
 * Локаль поддерева в Angular.
 *
 * Своего языка и своих строк у компонента нет: их даёт ближайший
 * `LocaleProviderDirective` выше по дереву. Его источник уходит поддереву
 * через `providers` директивы, сборка компонента берёт ближайший из DI и
 * отдаёт своему набору плагинов (`bundle.locale`), а плагины языка и имён
 * пишут компоненту тег и имена. Проверяется сам путь — источник в наборе с
 * первой сборки, смена на лету без перемонтирования, вложенный провайдер и
 * провайдер на `<ng-container>`, без провайдера — английский, — и первый
 * компонент Angular со строками: имя кнопки очистки Input.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { Component, signal } from '@angular/core'
import { TButton } from '@soldy-ui/core'
import {
	TBasePlugin,
	TPluginBundle,
	enUS,
	ruRU,
	zhCN,
	type ILocaleSource,
	type IPluginContext,
	type TLocale,
} from '@soldy-ui/plugins'
import { usePlugins } from '@soldy-ui/setup'
import { LocaleProviderDirective, TButtonComponent, TInputComponent } from '@soldy-ui/angular'
import { announced } from './element-plugin'
import { find, mountHost } from './mount'

/** Тег локали источника набора. */
const tagOf = (source: ILocaleSource) => source.locale.tag

/** Хост, который собирает наборы своих кнопок из `(soBundleCreate)`, по порядку объявления. */
abstract class TBundlesHost {
	readonly bundles: TPluginBundle[] = []

	collect(bundle: unknown): void {
		if (bundle instanceof TPluginBundle) this.bundles.push(bundle)
	}
}

@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<button so-button (soBundleCreate)="collect($event)"></button>
		<button so-button (soBundleCreate)="collect($event)"></button>`,
})
class BareHost extends TBundlesHost {}

/**
 * Провайдер на элементе. Селектор свой у этого хоста и у `ContainerHost`: их
 * разметка различается только тегом провайдера и выражением входа, а ни тег,
 * ни выражения в id компонента Angular не входят — без селектора id совпал бы
 * (предупреждение NG0912).
 */
@Component({
	selector: 'probe-provided',
	standalone: true,
	imports: [TButtonComponent, LocaleProviderDirective],
	template: `<div so-locale-provider [locale]="locale()">
		<button so-button (soBundleCreate)="collect($event)"></button>
	</div>`,
})
class ProvidedHost extends TBundlesHost {
	readonly locale = signal<TLocale>(ruRU)
}

@Component({
	standalone: true,
	imports: [TButtonComponent, LocaleProviderDirective],
	template: `<section so-locale-provider [locale]="outer">
		<button so-button class="outer" (soBundleCreate)="collect($event)"></button>
		<div so-locale-provider [locale]="inner">
			<button so-button class="inner" (soBundleCreate)="collect($event)"></button>
		</div>
	</section>`,
})
class NestedHost extends TBundlesHost {
	readonly outer = ruRU
	readonly inner = enUS
}

/** Провайдер на `<ng-container>`. Зачем селектор — см. `ProvidedHost`. */
@Component({
	selector: 'probe-container',
	standalone: true,
	imports: [TButtonComponent, LocaleProviderDirective],
	template: `<ng-container so-locale-provider [locale]="locale">
		<button so-button (soBundleCreate)="collect($event)"></button>
	</ng-container>`,
})
class ContainerHost extends TBundlesHost {
	readonly locale = ruRU
}

/** Компонент приложения со своим шаблоном: кнопка — в его представлении, а не в разметке хоста. */
@Component({
	selector: 'app-panel',
	standalone: true,
	imports: [TButtonComponent],
	template: `<button so-button (soBundleCreate)="collect($event)"></button>`,
})
class PanelComponent extends TBundlesHost {}

@Component({
	standalone: true,
	imports: [PanelComponent, LocaleProviderDirective],
	template: `<ng-container so-locale-provider [locale]="locale"><app-panel /></ng-container>`,
})
class DeepHost {
	readonly locale = ruRU
}

/** Теги локали, которые плагины видели при установке, — то есть при сборке компонента. */
const installed: string[] = []

/** Плагин-зонд: запоминает локаль контекста в момент сборки набора. */
class TLocaleProbePlugin extends TBasePlugin<TButton> {
	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		installed.push(tagOf(ctx.locale))
	}
}

let dispose: (() => void) | undefined

afterEach(() => {
	dispose?.()
	dispose = undefined
	installed.length = 0
})

describe('LocaleProviderDirective', () => {
	it('без провайдера — английская локаль, своя у набора', async () => {
		const fixture = mountHost(BareHost)

		await announced()

		const [first, second] = fixture.componentInstance.bundles

		expect(tagOf(first.locale)).toBe(enUS.tag)
		expect(first.locale).not.toBe(second.locale)
	})

	it('источник провайдера — в наборе компонента, с первой сборки', async () => {
		const fixture = mountHost(ProvidedHost)

		await announced()

		const { bundles } = fixture.componentInstance

		expect(bundles).toHaveLength(1)
		expect(tagOf(bundles[0].locale)).toBe(ruRU.tag)
	})

	/**
	 * Источник провайдер создаёт раньше, чем получит вход, но вход Angular пишет
	 * раньше, чем зовёт `ngOnInit` детей: собранная в том же проходе кнопка видит
	 * при сборке уже локаль из входа, а не английскую.
	 */
	it('плагины кнопки при сборке видят локаль из входа', () => {
		dispose = usePlugins(TButton, [TLocaleProbePlugin])

		mountHost(ProvidedHost)

		expect(installed).toEqual([ruRU.tag])
	})

	it('смена локали провайдера — в тот же источник, без перемонтирования', async () => {
		const fixture = mountHost(ProvidedHost)

		await announced()

		const { bundles } = fixture.componentInstance
		const [bundle] = bundles
		const source = bundle.locale
		const host: HTMLElement = fixture.nativeElement
		const button = find(host, '[so-button]', HTMLButtonElement)
		const changes: string[] = []

		source.events.on('change', (next) => changes.push(next.tag))

		fixture.componentInstance.locale.set(zhCN)
		fixture.detectChanges()
		await announced()

		// Набор тот же и объявлен один раз: компонент не пересобран
		expect(bundles).toHaveLength(1)
		expect(bundle.locale).toBe(source)
		expect(tagOf(source)).toBe(zhCN.tag)
		expect(changes).toEqual([zhCN.tag])
		expect(find(host, '[so-button]', HTMLButtonElement)).toBe(button)
	})

	it('вложенный провайдер даёт поддереву свою локаль', async () => {
		const fixture = mountHost(NestedHost)

		await announced()

		const [outer, inner] = fixture.componentInstance.bundles

		expect(tagOf(outer.locale)).toBe(ruRU.tag)
		expect(tagOf(inner.locale)).toBe(enUS.tag)
		expect(inner.locale).not.toBe(outer.locale)
	})

	it('провайдер на <ng-container> — то же: своей разметки у него нет', async () => {
		const fixture = mountHost(ContainerHost)

		await announced()

		const host: HTMLElement = fixture.nativeElement

		expect(tagOf(fixture.componentInstance.bundles[0].locale)).toBe(ruRU.tag)
		// Контейнер не оставляет в разметке ни элемента, ни атрибута
		expect(host.querySelector('[so-locale-provider]')).toBeNull()
	})

	it('компонент в представлении компонента приложения получает локаль провайдера', () => {
		dispose = usePlugins(TButton, [TLocaleProbePlugin])

		mountHost(DeepHost)

		expect(installed).toEqual([ruRU.tag])
	})
})

@Component({
	standalone: true,
	imports: [TInputComponent, LocaleProviderDirective],
	template: `<ng-container so-locale-provider [locale]="locale()">
		<div so-input clearable name="Город"></div>
	</ng-container>`,
})
class ClearNameHost {
	readonly locale = signal<TLocale>(ruRU)
}

@Component({
	standalone: true,
	imports: [TInputComponent],
	template: `<div so-input clearable name="Город"></div>`,
})
class BareClearNameHost {}

describe('Input · имя кнопки очистки', () => {
	/** Кнопка очистки в разметке хоста. */
	const clearOf = (host: HTMLElement) => find(host, '.so-input__clear', HTMLButtonElement)

	it('строку имени задаёт локаль поддерева, без провайдера — английская', () => {
		const provided: HTMLElement = mountHost(ClearNameHost).nativeElement
		const bare: HTMLElement = mountHost(BareClearNameHost).nativeElement

		expect(clearOf(provided).getAttribute('aria-label')).toBe('Очистить Город')
		expect(clearOf(bare).getAttribute('aria-label')).toBe('Clear Город')
	})

	/**
	 * Провайдер пишет новую локаль в тот же источник, плагин имён переписывает
	 * набор кнопки, а разметка поля кладёт его на ту же кнопку: ни поле, ни
	 * кнопка не пересобраны.
	 */
	it('смена локали провайдера переводит имя на той же кнопке', () => {
		const fixture = mountHost(ClearNameHost)
		const host: HTMLElement = fixture.nativeElement
		const button = clearOf(host)
		const input = find(host, '[so-input]', HTMLElement)

		fixture.componentInstance.locale.set(enUS)
		fixture.detectChanges()

		expect(clearOf(host)).toBe(button)
		expect(find(host, '[so-input]', HTMLElement)).toBe(input)
		expect(button.getAttribute('aria-label')).toBe('Clear Город')

		fixture.componentInstance.locale.set(zhCN)
		fixture.detectChanges()

		expect(button.getAttribute('aria-label')).toBe('清除Город')
	})
})
