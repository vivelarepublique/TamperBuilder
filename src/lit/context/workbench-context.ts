import { createContext } from '@lit/context';
import type { RenderLabDependencies } from '../../common/components/benchmark';
import type { Task, TaskPriority } from '../../common/components/workbench';

export interface LitWorkbenchValue {
    readonly tasks: readonly Task[];
    readonly nextId: number;
    readonly dependencies: RenderLabDependencies;
}

export type LitWorkbenchCommand =
    | { readonly type: 'add'; readonly title: string; readonly priority: TaskPriority }
    | { readonly type: 'toggle'; readonly taskId: number }
    | { readonly type: 'delete'; readonly taskId: number }
    | { readonly type: 'clear-completed' }
    | { readonly type: 'reset' };

export const workbenchContext = createContext<LitWorkbenchValue>(Symbol('lit-component-lab-workbench'));

export class LitWorkbenchCommandEvent extends CustomEvent<LitWorkbenchCommand> {
    constructor(command: LitWorkbenchCommand) {
        super('lit-workbench-command', { detail: command, bubbles: true, composed: true });
    }
}

declare global {
    interface HTMLElementEventMap {
        'lit-workbench-command': LitWorkbenchCommandEvent;
    }
}
