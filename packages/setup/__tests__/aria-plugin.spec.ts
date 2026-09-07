/**
 * TAriaPlugin — доступное имя как опциональный плагин, а не свойство базы.
 *
 * Имя нужно не всякому компоненту: у кнопки с текстом и у заголовка оно
 * вычисляется из содержимого само. Поэтому `label` не живёт в
 * `TComponentView`, а приходит плагином — и подключается адресно.
 *
 * Своего набора атрибутов у плагина нет: он пишет в `instance.aria`, туда же,
 * куда пишут ядро и расширения коллекции. Разметка биндит один набор.
 */

import { describe, it, expect } from 'vitest'
import { TAriaPlugin, TIconLayoutPlugin } from '@soldy/plugins'
import { TButton, TIcon, TSkeleton } from '@soldy/core'
import type { IComponentView } from '@soldy/core'
import {
	ButtonDescriptor,
	IconDescriptor,
	SpinnerDescriptor,
	SkeletonDescriptor,
	FrameDescriptor,
} from '../descriptors'
import { createAdapterContext, resolveDefaultExtensions, TPluginPropsExtension } from '../adapter'

const install = (instance: IComponentView, options?: { role?: string }) => {
	const plugin = new TAriaPlugin()

	plugin.install({ getInstance: () => instance } as any, options)

	return plugin
}

describe('запись имени в общий набор', () => {
	it('без имени атрибутов не появляется', () => {
		const button = new TButton()

		install(button)

		expect(button.aria.has('aria-label')).toBe(false)
		expect(button.aria.has('aria-labelledby')).toBe(false)
	})

	it('label становится aria-label', () => {
		const button = new TButton()

		install(button).label = 'Закрыть'

		expect(button.aria.get('aria-label')).toBe('Закрыть')
	})

	it('снятое имя убирает атрибут', () => {
		const button = new TButton()
		const plugin = install(button)

		plugin.label = 'Закрыть'
		plugin.label = undefined

		expect(button.aria.has('aria-label')).toBe(false)
	})

	it('пустая строка приравнена к отсутствию', () => {
		// `aria-label=""` имени не даёт, но глушит вычисление имени из
		// содержимого — хуже, чем не ставить атрибут вовсе
		const button = new TButton()

		install(button).label = ''

		expect(button.aria.has('aria-label')).toBe(false)
	})

	it('labelledBy и describedBy пишутся как есть', () => {
		const button = new TButton()
		const plugin = install(button)

		plugin.labelledBy = 'h1'
		plugin.describedBy = 'hint'

		expect(button.aria.get('aria-labelledby')).toBe('h1')
		expect(button.aria.get('aria-describedby')).toBe('hint')
	})

	it('describedBy сам по себе именем не считается', () => {
		// Пояснение — не имя: элемент с одним aria-describedby остаётся безымянным
		const plugin = install(new TButton())

		plugin.describedBy = 'hint'

		expect(plugin.named).toBe(false)
	})

	it('роль от ядра остаётся на месте — плагин пишет только своё', () => {
		const button = new TButton({ tag: 'div' })

		install(button).label = 'Закрыть'

		expect(button.aria.get('role')).toBe('button')
		expect(button.aria.get('aria-label')).toBe('Закрыть')
	})
})

describe('декоративный элемент: имя снимает aria-hidden', () => {
	it('без имени иконка остаётся скрытой', () => {
		const icon = new TIcon()

		install(icon, { role: 'img' })

		expect(icon.aria.get('aria-hidden')).toBe('true')
		expect(icon.aria.has('role')).toBe(false)
	})

	it('с именем иконка становится картинкой и перестаёт быть скрытой', () => {
		const icon = new TIcon()

		install(icon, { role: 'img' }).label = 'Ошибка'

		// Скрытый элемент не участвует в вычислении имени — одно отменило бы
		// другое, поэтому плагин обязан снять атрибут, а не просто дать имя
		expect(icon.aria.has('aria-hidden')).toBe(false)
		expect(icon.aria.get('role')).toBe('img')
		expect(icon.aria.get('aria-label')).toBe('Ошибка')
	})

	it('снятое имя возвращает иконку в декоративное состояние', () => {
		// Обе стороны у одного владельца — иначе было бы неясно, кому
		// возвращать aria-hidden
		const icon = new TIcon()
		const plugin = install(icon, { role: 'img' })

		plugin.label = 'Ошибка'
		plugin.label = undefined

		expect(icon.aria.get('aria-hidden')).toBe('true')
		expect(icon.aria.has('role')).toBe(false)
	})

	it('labelledBy работает так же, как label', () => {
		const icon = new TIcon()

		install(icon, { role: 'img' }).labelledBy = 'caption'

		expect(icon.aria.has('aria-hidden')).toBe(false)
		expect(icon.aria.get('role')).toBe('img')
	})

	it('без role плагин ролей не выдумывает и aria-hidden не трогает', () => {
		const button = new TButton()

		install(button).label = 'Загрузка'

		expect(button.aria.has('role')).toBe(false)
		expect(button.aria.has('aria-hidden')).toBe(false)
	})
})

describe('две поверхности управления', () => {
	it('смена имени через instance порождает событие', () => {
		const plugin = install(new TButton())
		const seen: (string | undefined)[] = []

		plugin.events.on('change:label', (value) => seen.push(value))

		plugin.label = 'Меню'
		plugin.label = 'Меню'

		// Повтор того же значения события не даёт
		expect(seen).toEqual(['Меню'])
	})

	it('запись в набор порождает change:aria — по нему обновляется разметка', () => {
		const button = new TButton()
		const plugin = install(button)
		let count = 0

		button.events.on('change:aria', () => count++)
		plugin.label = 'Меню'

		expect(count).toBe(1)
	})
})

describe('кому плагин подключён', () => {
	const hasAria = (descriptor: { plugins: readonly { ctor: unknown }[] }) =>
		descriptor.plugins.some((p) => p.ctor === TAriaPlugin)

	it('интерактивным — всегда: имя обязательно для любого контрола', () => {
		expect(hasAria(ButtonDescriptor())).toBe(true)
	})

	it('иконке, спиннеру и рамке — адресно', () => {
		expect(hasAria(IconDescriptor())).toBe(true)
		expect(hasAria(SpinnerDescriptor())).toBe(true)
		expect(hasAria(FrameDescriptor())).toBe(true)
	})

	it('скелетону — нет: заглушка декоративна', () => {
		expect(hasAria(SkeletonDescriptor())).toBe(false)
	})

	it('пропсы приходят с неймспейсом aria', () => {
		const names = ButtonDescriptor()
			.getProps()
			.map((p) => p.name.getName())

		expect(names).toContain('aria:label')
		expect(names).toContain('aria:labelledBy')
		expect(names).toContain('aria:describedBy')
	})

	it('вычисленного набора у плагина нет — он пишет в общий', () => {
		const names = ButtonDescriptor()
			.getProps()
			.map((p) => p.name.getName())

		expect(names).not.toContain('aria:attributes')
		expect(names).toContain('aria')
	})

	it('label остаётся вне ядра — иначе он был бы у каждого наследника', () => {
		expect('label' in new TButton()).toBe(false)
		expect('label' in new TSkeleton()).toBe(false)
	})
})

describe('начальные значения плагинных пропсов', () => {
	/**
	 * Ядро получает пропсы через конструктор, плагины — нет. Разницу
	 * закрывает TPluginPropsExtension: без него `<Button aria_label="…">`
	 * при монтировании имени не получал бы, а только со второго изменения.
	 */
	it('подключается там, где у плагина есть пропсы, пишущиеся снаружи', () => {
		expect(resolveDefaultExtensions(ButtonDescriptor())).toContain(TPluginPropsExtension)
	})

	it('не подключается там, где все плагинные пропсы protected', () => {
		// У Skeleton только layout-плагин, его `styles` вычисляется внутри
		expect(resolveDefaultExtensions(SkeletonDescriptor())).not.toContain(TPluginPropsExtension)
	})

	it('доносит значение до плагина под именем с неймспейсом', () => {
		const context = createAdapterContext(ButtonDescriptor(), {
			props: { aria_label: 'Закрыть' },
		})

		expect(context.instance.aria.get('aria-label')).toBe('Закрыть')
	})

	it('принимает и имя без неймспейса — так зовут проп headless-код и тесты', () => {
		const context = createAdapterContext(ButtonDescriptor(), { props: { label: 'Закрыть' } })

		expect(context.instance.aria.get('aria-label')).toBe('Закрыть')
	})

	it('непереданный проп не трогает', () => {
		const context = createAdapterContext(ButtonDescriptor(), { props: {} })

		expect(context.instance.aria.has('aria-label')).toBe(false)
	})

	it('protected-пропсы плагина снаружи не пишутся', () => {
		// `styles` вычисляет сам плагин; попытка задать его извне игнорируется
		const context = createAdapterContext(IconDescriptor(), {
			props: { layout_styles: { color: 'red' } },
		})

		expect(context.bundle?.get(TIconLayoutPlugin)?.styles).not.toEqual({ color: 'red' })
	})
})
