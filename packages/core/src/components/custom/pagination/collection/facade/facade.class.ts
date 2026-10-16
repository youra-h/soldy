import { TActivationCollectionFacade } from '../../../../base/collection'
import type {
	TCollectionEngine,
	TCollectionFacadeOptions,
	TCollectionFacadeProps,
} from '../../../../base/collection'
import { completeEngine } from '../../../../base/collection/create/internal'
import type { IPaginationItem } from '../../item/types'
import type { IPagination } from '../../types'
import type { TPaginationCell } from '../extensions'
import { paginationExtensions } from '../factory'
import type {
	TPaginationCollectionExtensions,
	TPaginationCollectionFacadeEngine,
	TPaginationCollectionFacadeEvents,
} from '../types'

/**
 * Фасад коллекции пагинации.
 *
 * Состав и текущая страница — из `TActivationCollectionFacade`: у пагинации
 * активность, а не выбор, — текущая страница одна, и снять её, не выбрав
 * другую, нельзя. Своё — окно для разметки (`cells`), проекция расширения
 * `pagination`: события расширения фасад отдаёт наружу `relayAll`.
 */
export class TPaginationCollectionFacade extends TActivationCollectionFacade<
	IPaginationItem,
	TPaginationCollectionExtensions,
	TPaginationCollectionFacadeEvents
> {
	constructor(
		props: TCollectionFacadeProps<IPaginationItem> = {},
		options: TCollectionFacadeOptions<TPaginationCollectionFacadeEngine, IPagination> = {},
	) {
		// Движок мог прийти снаружи собранным на любом уровне — `completeEngine`
		// доставит в него то, чего не хватает пагинации. Именно здесь, а не в
		// теле: базы трогают расширения в своих конструкторах
		super(
			{},
			{
				engine: completeEngine(options.engine, paginationExtensions()) as TCollectionEngine<
					IPaginationItem,
					TPaginationCollectionExtensions
				>,
				owner: options.owner,
			},
		)

		if (!options.engine) this.bindOwner()

		this.events.relayAll(this.extensions.pagination.events)

		this.applyProps(props)
	}

	/** Окно по порядку: страницы и пропуски между ними. */
	get cells(): ReadonlyArray<TPaginationCell> {
		return this.extensions.pagination.cells
	}
}
