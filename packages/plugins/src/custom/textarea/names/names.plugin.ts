import type { ITextarea, TEventSink } from '@soldy-ui/core'
import { TNamesPlugin } from '../../../locale/names.plugin'
import type { IPluginContext } from '../../../base'
import type { ILocaleSource, TTranslations } from '../../../locale/types'
import type { TTextareaNamesPluginEvents } from './types'

/**
 * Счётчик с пределом: шаблон из локали, на месте `{count}` — набранное, на
 * месте `{max}` — предел. Порядок у каждого языка свой, поэтому места в
 * шаблоне, а не склейка.
 */
function counterText(template: string, count: string, max: string): string {
	return template.split('{count}').join(count).split('{max}').join(max)
}

/**
 * TTextareaNamesPlugin — текст счётчика символов Textarea от локали: «12 / 200».
 *
 * Счётчик рисует библиотека, и его текст — строка языка, как значение оценки
 * Rating: при пределе `maxlength` — шаблон локали `textarea.counter`, без
 * предела — одно число. Числа — по тегу локали (`toLocaleString`): «1 234»,
 * а не «1234», и цифрами языка. Набранное считает ядро (`textLength`) — тем
 * же счётом, что `data-limit` и браузер у `maxlength`.
 *
 * Текст — выходом (`counter`), а не в набор: у счётчика своего экземпляра
 * нет, его разметку рисует шаблон поля. Пишет при установке, синхронно, —
 * счётчик есть уже в первой и серверной отрисовке, — и на смену локали,
 * значения и предела. Живым регионом счётчик не объявляется — тот шумел бы
 * на каждый символ: поле ссылается на него `aria-describedby`
 * (`TTextareaIdsPlugin`), и скринридер читает текст на фокусе поля.
 */
export class TTextareaNamesPlugin extends TNamesPlugin<ITextarea, TTextareaNamesPluginEvents> {
	/** Источник локали набора — за тегом для чисел: строки база отдаёт сама */
	private _locale: ILocaleSource | null = null
	private _counter = ''

	/** Текст счётчика: «12 / 200», без предела — «12». */
	get counter(): string {
		return this._counter
	}

	protected override get _sink(): TEventSink<TTextareaNamesPluginEvents> {
		return this.events
	}

	override install(ctx: IPluginContext, options?: unknown): void {
		// До установки базы: первую запись база делает тем же вызовом
		this._locale = ctx.locale

		super.install(ctx, options)
	}

	override destroy(): void {
		this._locale = null

		super.destroy()
	}

	protected override _name(owner: ITextarea, translations: TTranslations): void {
		const tag = this._locale?.locale.tag
		const count = owner.textLength.toLocaleString(tag)
		const max = owner.maxlength
		const counter =
			max === undefined
				? count
				: counterText(translations.textarea.counter, count, max.toLocaleString(tag))

		if (this._counter === counter) return

		this._counter = counter
		this._sink.emit('change:counter', counter)
	}

	protected override _watch(owner: ITextarea, name: () => void): void {
		this._listenTo(owner.events, 'change:value', name)
		this._listenTo(owner.events, 'change:maxlength', name)
	}
}
