/**
 * Серверный рендер компонентов Angular и гидратация его разметки.
 *
 * Сервер — `renderApplication` из `@angular/platform-server`, как в
 * приложении, браузер — `bootstrapApplication` с `provideClientHydration` над
 * разметкой сервера (`server.ts`). Эффекты базы компонента выполняются и на
 * сервере, поэтому разметка сервера несёт классы, наборы и стиль ядра на теге,
 * который написал потребитель. Эффектов после отрисовки на сервере нет, и
 * слой (Frame) стоит там на месте скрытым: в цель он уезжает в браузере, после
 * гидратации.
 *
 * Разметка сервера проверяется разобранной документом, как её получил бы
 * браузер: порядок атрибутов у сервера свой, а важно, что на каком узле стоит.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { Component, type Type } from '@angular/core'
import { TButton } from '@soldy-ui/core'
import { TBasePlugin, type IPluginContext } from '@soldy-ui/plugins'
import { getIcon, usePlugins } from '@soldy-ui/setup'
import {
	RoleIconDirective,
	TButtonComponent,
	TFrameComponent,
	TIconComponent,
	TProgressSpinnerComponent,
	TSkeletonComponent,
} from '@soldy-ui/angular'
import { find } from './mount'
import { hydrate, leavePage, loadPage, renderOnServer } from './server'

/** Пространство имён SVG: в нём документ разбирает рисунок иконки. */
const SVG = 'http://www.w3.org/2000/svg'

/** Страница сервера, разобранная документом, — как её получил бы браузер. */
async function serverPage(app: Type<unknown>): Promise<Document> {
	return new DOMParser().parseFromString(await renderOnServer(app), 'text/html')
}

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [TButtonComponent],
	template: `<button
			so-button
			text="Сохранить"
			size="lg"
			variant="brand"
			class="app-save"
		></button>
		<button so-button disabled class="native"></button>
		<a so-button href="/next" disabled></a>
		<button so-button [visible]="false" style="color: red" class="hidden"></button>`,
})
class ButtonPage {}

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [TIconComponent, RoleIconDirective],
	template: `<svg so-icon so-role-icon="check" [width]="20"></svg>`,
})
class IconPage {}

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [TProgressSpinnerComponent],
	template: `<span so-progress-spinner [value]="40"></span>`,
})
class ProgressSpinnerPage {}

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [TSkeletonComponent],
	template: `<div so-skeleton><span class="content">Панель</span></div>`,
})
class SkeletonPage {}

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [TFrameComponent],
	template: `<section class="place">
		<div so-frame visible class="layer">Слой</div>
		<div so-frame contained visible class="inside"><span>Внутри</span></div>
	</section>`,
})
class FramePage {}

describe('серверный рендер', () => {
	it('Button — классы ядра и потребителя на его теге, наборы и текст', async () => {
		const page = await serverPage(ButtonPage)
		const button = find(page, '.app-save', HTMLButtonElement)

		expect([...button.classList]).toEqual(
			expect.arrayContaining([
				'app-save',
				's-button',
				's-button--size-lg',
				's-button--variant-brand',
			]),
		)
		expect(button.getAttribute('data-disabled')).toBe('false')
		expect(button.querySelector('.s-button__text')?.textContent).toBe('Сохранить')
		// Атрибут с именем входа — запись входа, а не атрибут корня, и на сервере
		expect(button.hasAttribute('text')).toBe(false)
		expect(button.hasAttribute('size')).toBe(false)
	})

	it('Button выключенная: нативный disabled на <button>, aria-disabled — на другом теге', async () => {
		const page = await serverPage(ButtonPage)
		const native = find(page, '.native', HTMLButtonElement)
		const link = find(page, 'a[so-button]', HTMLAnchorElement)

		expect(native.getAttribute('disabled')).toBe('disabled')
		expect(native.hasAttribute('aria-disabled')).toBe(false)
		expect(native.getAttribute('data-disabled')).toBe('true')
		expect(link.getAttribute('href')).toBe('/next')
		expect(link.getAttribute('aria-disabled')).toBe('true')
		expect(link.getAttribute('role')).toBe('button')
		expect(link.hasAttribute('disabled')).toBe(false)
	})

	it('Button скрытая — display: none рядом со стилем потребителя', async () => {
		const page = await serverPage(ButtonPage)
		const hidden = find(page, '.hidden', HTMLButtonElement)

		expect(hidden.style.display).toBe('none')
		expect(hidden.style.color).toBe('red')
	})

	it('Icon по роли — <svg> с рисунком роли, размером и скрытием от скринридера', async () => {
		const page = await serverPage(IconPage)
		const svg = find(page, 'svg[so-icon]', SVGSVGElement)
		const source = getIcon('check')

		expect(svg.getAttribute('class')).toBe('s-icon s-icon--size-normal')
		expect(svg.getAttribute('aria-hidden')).toBe('true')
		expect(svg.style.width).toBe('20px')
		expect(svg.getAttribute('viewBox')).toBe(source.viewBox)
		expect(svg.querySelector('path')?.namespaceURI).toBe(SVG)
	})

	it('ProgressSpinner — доля в стиле корня, роль и значения', async () => {
		const page = await serverPage(ProgressSpinnerPage)
		const spinner = find(page, '[so-progress-spinner]', HTMLSpanElement)

		expect(spinner.getAttribute('role')).toBe('progressbar')
		expect(spinner.getAttribute('aria-valuenow')).toBe('40')
		expect(spinner.style.getPropertyValue('--s-progress-spinner-fraction')).toBe('0.4')
	})

	it('Skeleton — заглушка и содержимое, корень не скрыт', async () => {
		const page = await serverPage(SkeletonPage)
		const skeleton = find(page, '[so-skeleton]', HTMLDivElement)

		expect(
			skeleton.querySelector('.s-skeleton__placeholder')?.getAttribute('aria-hidden'),
		).toBe('true')
		expect(skeleton.getAttribute('aria-busy')).toBe('true')
		expect(skeleton.querySelector('.content')?.textContent).toBe('Панель')
		expect(skeleton.style.display).toBe('')
	})

	/** Убрать элемент потребителя компонент не может: на сервере слой стоит на месте скрытым. */
	it('Frame без contained — на месте и скрыт: в цель он уезжает в браузере', async () => {
		const page = await serverPage(FramePage)
		const layer = find(page, '.layer', HTMLDivElement)

		expect(layer.parentElement?.className).toBe('place')
		expect(layer.style.display).toBe('none')
		expect(layer.getAttribute('data-open')).toBe('true')
		expect(layer.textContent).toBe('Слой')
	})

	it('Frame с contained — на месте, вместе с содержимым и раскладкой', async () => {
		const page = await serverPage(FramePage)
		const inside = find(page, '.inside', HTMLDivElement)

		expect(inside.parentElement?.className).toBe('place')
		expect(inside.getAttribute('data-contained')).toBe('true')
		// Внутри контейнера — `absolute` без координат: место решает тема
		expect(inside.style.position).toBe('absolute')
		expect(inside.style.left).toBe('')
		expect(inside.style.top).toBe('')
		expect(inside.style.display).toBe('')
		expect(inside.querySelector('span')?.textContent).toBe('Внутри')
	})
})

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [
		TButtonComponent,
		TIconComponent,
		RoleIconDirective,
		TSkeletonComponent,
		TFrameComponent,
	],
	template: `<button so-button text="Сохранить"></button>
		<svg so-icon so-role-icon="check"></svg>
		<div so-skeleton><span>Панель</span></div>
		<section class="place"><div so-frame visible class="layer">Слой</div></section>`,
})
class HydrationPage {}

describe('гидратация', () => {
	afterEach(() => {
		vi.restoreAllMocks()
		leavePage()
	})

	/**
	 * Гидратация берёт узлы, которые напечатал сервер, а не рисует свои: тот же
	 * узел до и после — признак того, что она прошла, а не откатилась к
	 * отрисовке с нуля. О расхождении разметки Angular сообщает ошибкой или
	 * предупреждением в консоль.
	 */
	it('узлы сервера переиспользуются, ошибок и предупреждений нет', async () => {
		const error = vi.spyOn(console, 'error')
		const warn = vi.spyOn(console, 'warn')

		loadPage(await renderOnServer(HydrationPage))

		const button = find(document, '[so-button]', HTMLButtonElement)
		const svg = find(document, 'svg[so-icon]', SVGSVGElement)
		const skeleton = find(document, '[so-skeleton]', HTMLDivElement)
		const layer = find(document, '.layer', HTMLDivElement)
		const app = await hydrate(HydrationPage)

		await app.whenStable()

		expect(find(document, '[so-button]', HTMLButtonElement)).toBe(button)
		expect(find(document, 'svg[so-icon]', SVGSVGElement)).toBe(svg)
		expect(find(document, '[so-skeleton]', HTMLDivElement)).toBe(skeleton)
		expect(find(document, '.layer', HTMLDivElement)).toBe(layer)
		expect(button.querySelector('.s-button__text')?.textContent).toBe('Сохранить')
		expect(svg.getAttribute('viewBox')).toBe(getIcon('check').viewBox)
		expect(error).not.toHaveBeenCalled()
		expect(warn).not.toHaveBeenCalled()
	})

	it('Frame после гидратации уезжает в цель тем же узлом и показывается', async () => {
		loadPage(await renderOnServer(HydrationPage))

		const layer = find(document, '.layer', HTMLDivElement)
		const app = await hydrate(HydrationPage)

		await app.whenStable()

		expect(layer.parentElement).toBe(document.body)
		expect(layer.style.display).toBe('')
	})
})

/** Id монтирования, которые наборы кнопок выдали плагинам при сборке, по порядку. */
const mountIds: string[] = []

/** Плагин-зонд: запоминает `id` части, который строит его контекст. */
class TMountIdProbePlugin extends TBasePlugin<TButton> {
	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		mountIds.push(ctx.createId('probe'))
	}
}

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [TButtonComponent],
	template: `<button so-button></button><button so-button></button>`,
})
class IdsPage {}

describe('id монтирования', () => {
	let dispose: (() => void) | undefined

	afterEach(() => {
		dispose?.()
		dispose = undefined
		mountIds.length = 0
		leavePage()
	})

	/**
	 * Id монтирования — номер сборки компонента в его приложении, с префиксом
	 * `APP_ID` (по умолчанию `ng`). Приложение у каждого запроса и у браузера
	 * своё, а гидратация собирает компоненты в том же порядке, что и сервер,
	 * поэтому номера у них сходятся. Счётчик процесса тут не годится: рендер
	 * сервера уже сдвинул бы его, и браузер получил бы другие номера.
	 */
	it('у сервера и браузера одни и те же id, у каждого монтирования свой', async () => {
		dispose = usePlugins(TButton, [TMountIdProbePlugin])

		loadPage(await renderOnServer(IdsPage))

		const server = mountIds.splice(0)

		await hydrate(IdsPage)

		expect(server).toEqual(['ng-1-probe', 'ng-2-probe'])
		expect(mountIds).toEqual(server)
	})

	it('второй рендер сервера — своё приложение: номера с начала', async () => {
		dispose = usePlugins(TButton, [TMountIdProbePlugin])

		await renderOnServer(IdsPage)
		await renderOnServer(IdsPage)

		expect(mountIds).toEqual(['ng-1-probe', 'ng-2-probe', 'ng-1-probe', 'ng-2-probe'])
	})
})
