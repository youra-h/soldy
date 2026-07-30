// extension/batch.extension.ts — массовые операции

import type { IExtension, IExtensionContext } from './types';
import { TAddCommand, TRemoveCommand, TClearCommand } from '../command';

export class TBatchExtension<T> implements IExtension<T> {
    readonly name = 'batch';

    private ctx!: IExtensionContext<T>;

    install(ctx: IExtensionContext<T>): void {
        this.ctx = ctx;
    }

    addMany(items: T[]): void {
        this.ctx.batch(() => {
            items.forEach(item => this.ctx.execute(new TAddCommand(item)));
        });
        this.ctx.events.emit('items:added', items);
    }

    removeMany(items: T[]): void {
        this.ctx.batch(() => {
            items.forEach(item => this.ctx.execute(new TRemoveCommand(item)));
        });
        this.ctx.events.emit('items:removed', items);
    }

    clear(): void {
        this.ctx.execute(new TClearCommand());
        this.ctx.events.emit('items:removed', []);
    }
}
