/**
 * TInputWriter — фреймворк → ядро: входные пропсы пишутся в свои приёмники, и только сменившиеся.
 *
 * Писатель помнит, какие пропсы фреймворк задал, и последнее значение каждого.
 * Без этой памяти `undefined` неотличим: «проп не передан» и «проп сняли».
 * Первое должно оставить состояние инстанса как есть (внешний `ctrl`), второе
 * — вернуть проп к умолчанию декларации: у трёхзначных пропсов (`closable`
 * элемента Tabs, `contentFit` элемента ListBox) умолчание `undefined` и значит
 * «как у владельца», и без сброса к нему компонент оставался с прежним
 * значением.
 *
 * По той же памяти `writeAll` отличает сменившийся проп от повторённого.
 * React, Solid и Svelte отдают полный набор пропсов на каждом проходе, и
 * запись каждого откатила бы к разметке то, что с тех пор поменяли ядро или
 * код через инстанс: список, открытый кликом при переданном `open={false}`,
 * закрылся бы от смены плейсхолдера. Vue, Angular и Web Components сообщают
 * только об изменившемся, так что во всех шести адаптерах в ядро пишется лишь
 * то, что поменял фреймворк.
 *
 * Начальные значения пишет не писатель, а сборка контекста
 * (`applyInitialProps`). Память начинается с пропсов, с которыми контекст
 * собран: первый проход фреймворка сверяется с ними и пишет только сменившееся
 * с тех пор. Наружу память не выставлена.
 *
 * Как писать, решает приёмник (`IInputSink`): свойство (`TProperty`) пропускает
 * то же значение и знает своё умолчание, а `pluginProps` разбирают плагины
 * монтирования. Писатель их не различает.
 */

import type { IInputSink, ISurfaceProp } from './types'

export class TInputWriter {
	/**
	 * Заданные входы — пропсами сборки или фреймворком после неё — и последнее
	 * значение каждого, не `undefined`. Нет ключа — вход не задан: не
	 * передавали или сняли.
	 */
	private readonly _assigned = new Map<ISurfaceProp, unknown>()

	/**
	 * @param sinks входы поверхности, которым есть куда писать. Свойство плагина,
	 * которого нет в наборе (фасад на чужом наборе), аксессор не собрал, и входа
	 * здесь нет — писатель его пропускает
	 * @param initial пропсы, с которыми собран контекст
	 */
	constructor(
		private readonly _sinks: ReadonlyMap<ISurfaceProp, IInputSink>,
		initial: object,
	) {
		for (const prop of _sinks.keys()) {
			const value = this.read(prop, initial)

			if (value !== undefined) this._assigned.set(prop, value)
		}
	}

	/** Значение входа в пропсах фреймворка: по имени во фреймворке, затем по сырому. */
	read(prop: ISurfaceProp, props: object): unknown {
		return Reflect.get(props, prop.exportName) ?? Reflect.get(props, prop.name.name)
	}

	write(prop: ISurfaceProp, value: unknown): void {
		const sink = this._sinks.get(prop)

		if (!sink) return

		if (value === undefined) {
			// Не задавали — `undefined` значит «не передан», и состояние инстанса
			// не трогается. Задавали — проп сняли: вернуть умолчание
			if (this._assigned.delete(prop)) sink.reset()

			return
		}

		// Заданным вход становится до записи: значение может уже лежать в ядре, а
		// снятый потом проп всё равно должен вернуться к умолчанию
		this._assigned.set(prop, value)
		sink.assign(value)
	}

	writeAll(props: object): void {
		for (const prop of this._sinks.keys()) {
			const value = this.read(prop, props)

			// Прошлое значение повторилось — проп не менялся: запись откатила бы
			// то, что с тех пор поменяли ядро или код через инстанс. У незаданного
			// входа прошлое значение — `undefined`: снова не передан, снова не пишется
			if (Object.is(this._assigned.get(prop), value)) continue

			this.write(prop, value)
		}
	}

	writeChanged(changes: object): void {
		for (const prop of this._sinks.keys()) {
			if (Object.hasOwn(changes, prop.exportName) || Object.hasOwn(changes, prop.name.name)) {
				this.write(prop, this.read(prop, changes))
			}
		}
	}
}
