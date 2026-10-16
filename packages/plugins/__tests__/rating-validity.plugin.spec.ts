// @vitest-environment jsdom

/**
 * Обязательная оценка (`TRatingValidityPlugin`): пока её не поставили, у поля
 * ошибка, и браузер форму не отправит.
 *
 * У `input[type=range]` нет ни `required`, ни состояния «пусто», поэтому
 * ошибку полю ставит плагин — `setCustomValidity` со строкой локали — и
 * снимает её сам. Разметку тест строит сам, как её рисует Vue: корень,
 * дорожка со звёздами и ручка с полем. Плагины собраны настоящим набором,
 * узел плагин получает кадром, как от адаптера. Отправку формы, сообщение
 * браузера и цвет ошибки проверяет настоящий браузер —
 * `playground/vue/browser/rating.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TRating } from '@soldy-ui/core'
import type { IRatingProps } from '@soldy-ui/core'
import {
	TElementPlugin,
	TLocaleSource,
	TPluginBundle,
	TRatingValidityPlugin,
	enUS,
	ruRU,
} from '../src'
import type { IPlugin, IPluginConstructor } from '../src'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Плагин, который тест поставил сам: без него дальше проверять нечего. */
function pluginOf<P extends IPlugin<any, any>>(
	bundle: TPluginBundle,
	ctor: IPluginConstructor<any, any, P>,
): P {
	const plugin = bundle.get(ctor)

	if (!plugin) throw new Error(`${ctor.name} не установлен в bundle`)

	return plugin
}

const bundles: TPluginBundle[] = []

afterEach(() => {
	for (const bundle of bundles.splice(0)) bundle.destroy()

	document.body.innerHTML = ''
})

/** Разметка оценки: корень, дорожка со звёздами и ручка с полем во весь ряд. */
function markup(owner: TRating) {
	const root = document.createElement('span')
	const track = document.createElement('span')
	const thumb = document.createElement('span')
	const field = document.createElement('input')

	root.className = owner.classes.base
	track.className = owner.classes.resolve('__track')
	thumb.className = owner.classes.resolve('__thumb')
	field.type = 'range'

	const stars = owner.stars.map(() => {
		const star = document.createElement('span')

		star.className = owner.classes.resolve('__star')

		return star
	})

	thumb.append(field)
	track.append(...stars, thumb)
	root.append(track)
	document.body.append(root)

	return { root, field }
}

/** Оценка с набором плагинов на источнике локали; узел — по `bind`. */
function assemble(props: Partial<IRatingProps> = {}) {
	const owner = new TRating(props)
	const source = new TLocaleSource(enUS)
	const bundle = new TPluginBundle(owner, 'm1', source)
		.use(TElementPlugin)
		.use(TRatingValidityPlugin)

	bundles.push(bundle)

	/** Корень — плагину узла, как от адаптера; объявляет его кадр. */
	const bind = async (root: Element | null) => {
		pluginOf(bundle, TElementPlugin).element = root
		await nextFrame()
	}

	return { owner, source, bundle, bind }
}

/** Оценка на странице: узел уже объявлен. */
async function mount(props: Partial<IRatingProps> = {}) {
	const assembled = assemble(props)
	const { root, field } = markup(assembled.owner)

	await assembled.bind(root)

	return { ...assembled, root, field }
}

describe('обязательная оценка без оценки — ошибка поля', () => {
	it('required и 0 — у поля ошибка со строкой локали', async () => {
		const { field } = await mount({ required: true })

		expect(field.validity.customError).toBe(true)
		expect(field.validationMessage).toBe('Please select a rating')
		expect(field.checkValidity()).toBe(false)
	})

	it('оценку поставили — ошибки нет; вернули 0 — снова есть', async () => {
		const { owner, field } = await mount({ required: true })

		owner.value = 3

		expect(field.validity.customError).toBe(false)
		expect(field.checkValidity()).toBe(true)

		owner.value = 0

		expect(field.validity.customError).toBe(true)
	})

	it('без required ошибки нет; включили required — есть, сняли — нет', async () => {
		const { owner, field } = await mount()

		expect(field.validity.customError).toBe(false)

		owner.required = true

		expect(field.validity.customError).toBe(true)

		owner.required = false

		expect(field.validity.customError).toBe(false)
	})

	it('только для показа ошибки нет, как у нативного поля readonly', async () => {
		const { owner, field } = await mount({ required: true, readonly: true })

		expect(field.validity.customError).toBe(false)

		owner.readonly = false

		expect(field.validity.customError).toBe(true)

		owner.readonly = true

		expect(field.validity.customError).toBe(false)
	})

	it('оценка, которую шкала свела к 0, — тоже без оценки', async () => {
		const { owner, field } = await mount({ required: true, value: 0.2, step: 0.5 })

		// 0.2 к шагу 0,5 — это 0: значение у оценки — итог по шкале
		expect(owner.value).toBe(0)
		expect(field.validity.customError).toBe(true)

		owner.step = 0.1

		expect(owner.value).toBe(0.2)
		expect(field.validity.customError).toBe(false)
	})
})

describe('локаль', () => {
	it('сменили локаль — сообщение на новом языке', async () => {
		const { source, field } = await mount({ required: true })

		source.locale = ruRU

		expect(field.validationMessage).toBe('Поставьте оценку')
	})

	it('локаль сменилась, когда оценка уже стоит, — ошибки по-прежнему нет', async () => {
		const { source, field } = await mount({ required: true, value: 2 })

		source.locale = ruRU

		expect(field.validity.customError).toBe(false)
	})
})

describe('узел', () => {
	it('без узла ничего не делает и не падает: сборка идёт и на сервере', () => {
		const { owner, source } = assemble({ required: true })

		expect(() => {
			owner.value = 2
			owner.value = 0
			owner.readonly = true
			owner.required = false
			source.locale = ruRU
		}).not.toThrow()
	})

	it('ошибка ставится, когда узел объявлен: до кадра поля у плагина нет', async () => {
		const { owner, bundle } = assemble({ required: true })
		const { root, field } = markup(owner)

		pluginOf(bundle, TElementPlugin).element = root

		expect(field.validity.customError).toBe(false)

		await nextFrame()

		expect(field.validity.customError).toBe(true)
	})

	it('заменили узел — ошибка на новом поле, со старого снята', async () => {
		const { owner, field, bind } = await mount({ required: true })
		const next = markup(owner)

		await bind(next.root)

		expect(next.field.validity.customError).toBe(true)
		expect(field.validity.customError).toBe(false)
	})

	it('узла не стало — ошибку плагин снимает, смена оценки поле не трогает', async () => {
		const { owner, field, bind } = await mount({ required: true })

		expect(field.validity.customError).toBe(true)

		await bind(null)

		expect(field.validity.customError).toBe(false)

		owner.value = 2
		owner.value = 0

		expect(field.validity.customError).toBe(false)
	})

	it('плагин снят — ошибки у поля нет, смена оценки его не трогает', async () => {
		const { owner, bundle, field } = await mount({ required: true })

		expect(field.validity.customError).toBe(true)

		bundle.remove(TRatingValidityPlugin)

		expect(field.validity.customError).toBe(false)

		owner.value = 2
		owner.value = 0

		expect(field.validity.customError).toBe(false)
	})
})
