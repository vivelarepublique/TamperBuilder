export interface ListenOptions {
    strictMode?: boolean;
    anyMutation?: boolean;
    callback?: (...args: any[]) => any;
    attributesConcern?: string;
    childrenConcern?: {
        action: (...args: any[]) => any;
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
