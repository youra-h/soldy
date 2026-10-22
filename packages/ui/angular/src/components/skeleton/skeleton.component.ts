import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { ISkeleton } from '@soldy-ui/core'
import { TSkeletonSurface } from '../../generated/skeleton.metadata'
import { setupSkeleton } from './setup.component'

/**
 * Заглушка поверх будущего содержимого. Видимость решает только, показана ли заглушка, —
 * корень не прячется: AGENTS.md (Angular), «Видимость прячет корень, кроме Skeleton».
 */
@Component({
	selector: '[so-skeleton]',
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './skeleton.component.html',
})
export class TSkeletonComponent extends TSkeletonSurface<ISkeleton> {
	constructor() {
		super(setupSkeleton, { strategy: 'host', hides: false })
	}
}
