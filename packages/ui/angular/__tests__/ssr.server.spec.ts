/**
 * Серверный рендер компонентов Angular и гидратация его разметки.
 *
 * Сервер — `renderApplication` из `@angular/platform-server`, как в
 * приложении, браузер — `bootstrapApplication` с `provideClientHydration` над
 * разметкой сервера (`server.ts`). Эффекты базы компонента выполняются и на
 * сервере, поэтому разметка сервера несёт классы, наборы и стиль ядра на теге,
 * который написал потребитель. Слой (Frame) есть только в браузере, как
 * оверлей CDK: эффектов после отрисовки на сервере нет, и от него в разметке
 * сервера — только пустой скрытый элемент потребителя.
 *
 * После гидратации всё, что называет ядро, база берёт своим поверх разметки
 * сервера (`root-attributes.ts`): смена входа меняет классы, наборы и стиль, а
 * не копит их рядом с напечатанными.
 *
 * Разметка сервера проверяется разобранной документом, как её получил бы
 * браузер: порядок атрибутов у сервера свой, а важно, что на каком узле стоит.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { Component, signal, type ApplicationRef, type Type } from '@angular/core'
import { TButton, type TComponentSize } from '@soldy-ui/core'
import { TBasePlugin, TElementPlugin, type IPluginContext } from '@soldy-ui/plugins'
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
				'so-button',
				'so-button--size-lg',
				'so-button--variant-brand',
			]),
		)
		expect(button.getAttribute('data-disabled')).toBe('false')
		expect(button.querySelector('.so-button__text')?.textContent).toBe('Сохранить')
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

		expect(svg.getAttribute('class')).toBe('so-icon so-icon--size-normal')
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
		expect(spinner.style.getPropertyValue('--so-progress-spinner-fraction')).toBe('0.4')
	})

	it('Skeleton — заглушка и содержимое, корень не скрыт', async () => {
		const page = await serverPage(SkeletonPage)
		const skeleton = find(page, '[so-skeleton]', HTMLDivElement)

		expect(
			skeleton.querySelector('.so-skeleton__placeholder')?.getAttribute('aria-hidden'),
		).toBe('true')
		expect(skeleton.getAttribute('aria-busy')).toBe('true')
		expect(skeleton.querySelector('.content')?.textContent).toBe('Панель')
		expect(skeleton.style.display).toBe('')
	})

	/**
	 * Слой есть только в браузере, как оверлей CDK. Убрать элемент потребителя
	 * компонент не может, поэтому на сервере от панели остаётся сам этот
	 * элемент — на месте, скрытый и без содержимого, — а от ядра на нём нет
	 * ничего: ни классов, ни наборов, ни раскладки.
	 */
	it.each([
		['без contained', '.layer'],
		['с contained', '.inside'],
	])(
		'Frame %s на сервере не рисуется: пустой скрытый элемент потребителя',
		async (_case, selector) => {
			const page = await serverPage(FramePage)
			const frame = find(page, selector, HTMLDivElement)

			expect(frame.parentElement?.className).toBe('place')
			expect(frame.style.display).toBe('none')
			expect(frame.textContent).toBe('')
			expect(frame.children).toHaveLength(0)
			expect([...frame.classList]).toEqual([selector.slice(1)])
			expect(frame.hasAttribute('data-open')).toBe(false)
			expect(frame.hasAttribute('data-layer')).toBe(false)
			expect(frame.hasAttribute('data-contained')).toBe(false)
			expect(frame.style.position).toBe('')
			expect(frame.style.zIndex).toBe('')
		},
	)

	/**
	 * Узел плагинам — только в браузере, как у остальных адаптеров: на сервере
	 * ни рефы, ни attachment-ы не зовутся. Узел эмуляции DOM сервера плагинам
	 * ни к чему — мерить его и слушать на нём нечего, — а без
	 * `requestAnimationFrame` в Node `TElementPlugin` не объявил бы его вовсе.
	 */
	it('на сервере TElementPlugin узла не получает', async () => {
		const bind = vi.spyOn(TElementPlugin.prototype, 'element', 'set')

		try {
			await renderOnServer(ButtonPage)

			// Уничтожение приложения сервера узел снимает — `null`, но не отдаёт
			expect(bind.mock.calls.filter(([el]) => el !== null)).toEqual([])
		} finally {
			bind.mockRestore()
		}
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
		<section class="place">
			<div so-frame visible class="layer">
				<button so-button text="Слой" class="inner"></button>
			</div>
		</section>`,
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
	 * предупреждением в консоль. Содержимого панели в разметке сервера нет, и
	 * его Angular создаёт заново: узлы проекции, которых сервер не вставил,
	 * гидратация не ищет.
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
		expect(button.querySelector('.so-button__text')?.textContent).toBe('Сохранить')
		expect(svg.getAttribute('viewBox')).toBe(getIcon('check').viewBox)
		expect(layer.querySelector('.inner .so-button__text')?.textContent).toBe('Слой')
		expect(error).not.toHaveBeenCalled()
		expect(warn).not.toHaveBeenCalled()
	})
})

/** Страница, которая меняет входы после гидратации. */
@Component({
	selector: 'app-root',
	standalone: true,
	imports: [TButtonComponent, TProgressSpinnerComponent, TFrameComponent],
	template: `<button so-button text="Сохранить" [size]="size()"></button>
		<div so-button class="app-div" [disabled]="disabled()"></div>
		<span so-progress-spinner [value]="value()"></span>
		<section class="place">
			<div so-frame visible class="layer" [x]="x()" [y]="20"><b>Слой</b></div>
			<div so-frame class="menu" [visible]="open()" [x]="30" [y]="40">Меню</div>
		</section>`,
})
class ChangesPage {
	readonly size = signal<TComponentSize>('normal')
	readonly disabled = signal(true)
	readonly value = signal(40)
	readonly x = signal(10)
	readonly open = signal(false)
}

/** Разметка сервера в документе и гидратация над ней: приложение браузера и его страница. */
async function hydrated(): Promise<{ app: ApplicationRef; page: ChangesPage }> {
	loadPage(await renderOnServer(ChangesPage))

	const app = await hydrate(ChangesPage)

	await app.whenStable()

	const page: unknown = app.components[0]?.instance

	if (!(page instanceof ChangesPage)) throw new Error('Корень приложения — не ChangesPage')

	return { app, page }
}

/**
 * После гидратации на корне стоит всё, что напечатал сервер, а память базы
 * пуста. Всё, что называет ядро, база берёт своим поверх разметки сервера,
 * поэтому смена входа меняет классы, наборы и стиль, а не оставляет
 * напечатанное рядом с новым.
 */
describe('после гидратации', () => {
	afterEach(() => {
		leavePage()
	})

	/**
	 * Без статического `class` в разметке потребителя гидратация оставляет на
	 * узле классы, которые напечатал сервер: свою статику Angular пишет на узел
	 * заново, только когда она есть.
	 */
	it('Button: смена size меняет модификатор, а не добавляет второй', async () => {
		const { app, page } = await hydrated()
		const button = find(document, 'button[so-button]', HTMLButtonElement)

		expect(button.classList).toContain('so-button--size-normal')

		page.size.set('xl')
		await app.whenStable()

		expect([...button.classList]).toEqual(['so-button', 'so-button--size-xl'])
	})

	it('Button: включение <div so-button disabled> снимает aria-disabled и возвращает tabindex', async () => {
		const { app, page } = await hydrated()
		const div = find(document, '.app-div', HTMLDivElement)

		expect(div.getAttribute('aria-disabled')).toBe('true')
		expect(div.getAttribute('data-disabled')).toBe('true')
		expect(div.hasAttribute('tabindex')).toBe(false)

		page.disabled.set(false)
		await app.whenStable()

		expect(div.hasAttribute('aria-disabled')).toBe(false)
		expect(div.getAttribute('data-disabled')).toBe('false')
		expect(div.getAttribute('tabindex')).toBe('0')
		expect(div.getAttribute('role')).toBe('button')
		// Чего ядро не называет, база не трогает
		expect(div.classList).toContain('app-div')
	})

	it('ProgressSpinner: доля в стиле корня идёт за значением', async () => {
		const { app, page } = await hydrated()
		const spinner = find(document, '[so-progress-spinner]', HTMLSpanElement)

		expect(spinner.style.getPropertyValue('--so-progress-spinner-fraction')).toBe('0.4')

		page.value.set(60)
		await app.whenStable()

		expect(spinner.style.getPropertyValue('--so-progress-spinner-fraction')).toBe('0.6')
		expect(spinner.getAttribute('aria-valuenow')).toBe('60')
	})

	/**
	 * На сервере слоя нет, и номер слоя у браузера свой: `z-index` и
	 * `data-layer` — от слоя браузера, без следов сервера.
	 */
	it('Frame: в цели тем же узлом, с содержимым, слоем и раскладкой браузера', async () => {
		loadPage(await renderOnServer(ChangesPage))

		const layer = find(document, '.layer', HTMLDivElement)
		const app = await hydrate(ChangesPage)

		await app.whenStable()

		expect(find(document, '.layer', HTMLDivElement)).toBe(layer)
		expect(layer.parentElement).toBe(document.body)
		expect(layer.style.display).toBe('')
		expect(layer.querySelector('b')?.textContent).toBe('Слой')
		expect(layer.classList).toContain('so-frame')
		expect(layer.getAttribute('data-open')).toBe('true')
		expect(layer.getAttribute('data-layer')).not.toBeNull()
		expect(layer.style.zIndex).toBe(layer.getAttribute('data-layer'))
		expect(layer.style.position).toBe('fixed')
		expect(layer.style.left).toBe('10px')
		expect(layer.style.top).toBe('20px')
	})

	it('Frame: смена координат после гидратации доходит до узла', async () => {
		const { app, page } = await hydrated()
		const layer = find(document, '.layer', HTMLDivElement)

		page.x.set(40)
		await app.whenStable()

		expect(layer.style.left).toBe('40px')
		expect(layer.style.top).toBe('20px')
	})

	/** Показ после гидратации поднимает слой браузера в обоих местах. */
	it('Frame: показ после гидратации — открытость, слой и раскладка на узле', async () => {
		const { app, page } = await hydrated()
		const menu = find(document, '.menu', HTMLDivElement)

		expect(menu.parentElement).toBe(document.body)
		expect(menu.style.display).toBe('none')
		expect(menu.getAttribute('data-open')).toBe('false')

		page.open.set(true)
		await app.whenStable()

		const layer = menu.getAttribute('data-layer')

		expect(menu.style.display).toBe('')
		expect(menu.getAttribute('data-open')).toBe('true')
		expect(layer).not.toBeNull()
		expect(menu.style.zIndex).toBe(layer)
		expect(menu.style.left).toBe('30px')
		expect(menu.style.top).toBe('40px')
		expect(menu.textContent).toBe('Меню')
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

/**
 * Кнопка в панели Frame: на сервере панели нет, и её содержимое не попадает в
 * разметку, но собирается — проекцию создаёт шаблон страницы, а не Frame.
 */
@Component({
	selector: 'app-root',
	standalone: true,
	imports: [TButtonComponent, TFrameComponent],
	template: `<button so-button></button>
		<div so-frame visible><button so-button></button></div>
		<button so-button></button>`,
})
class FrameIdsPage {}

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

	/**
	 * Содержимое панели на сервере собирается, хотя в разметку не попадает, а
	 * в браузере Angular создаёт его заново: номера тех, кто после панели, у
	 * сервера и браузера всё равно одни.
	 */
	it('кнопка в панели Frame и после неё — те же id у сервера и браузера', async () => {
		dispose = usePlugins(TButton, [TMountIdProbePlugin])

		loadPage(await renderOnServer(FrameIdsPage))

		const server = mountIds.splice(0)
		const app = await hydrate(FrameIdsPage)

		await app.whenStable()

		// Номер 2 — у самой панели
		expect(server).toEqual(['ng-1-probe', 'ng-3-probe', 'ng-4-probe'])
		expect(mountIds).toEqual(server)
	})

	it('второй рендер сервера — своё приложение: номера с начала', async () => {
		dispose = usePlugins(TButton, [TMountIdProbePlugin])

		await renderOnServer(IdsPage)
		await renderOnServer(IdsPage)

		expect(mountIds).toEqual(['ng-1-probe', 'ng-2-probe', 'ng-1-probe', 'ng-2-probe'])
	})
})
