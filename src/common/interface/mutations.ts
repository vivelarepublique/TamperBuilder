type MutationCallback = (...args: unknown[]) => void;

export interface ListenOptions {
    strictMode?: boolean;
    anyMutation?: boolean;
    callback?: MutationCallback;
    attributesConcern?: string;
    childrenConcern?: {
        action: MutationCallback;
        selector: string;
    }[];
    immediateImplementation?: boolean;
    triggerLimitation?: {
        delay: number;
        way: 'debounce' | 'throttle' | 'none';
    };
    manualSetupOptions?: {
        childList?: boolean;
        subtree?: boolean;
        attributes?: boolean;
    };
}
