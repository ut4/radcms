import preact from 'preact';
import 'cpanel-commons.d.ts';

declare module "@rad-commons" {
    namespace radCommons {
        export const config: {
            userPermissions: {
                canCreateContent: boolean;
                canConfigureContent: boolean;
                canDeleteContent: boolean;
                canManageFieldsOfMultiFieldContent: boolean;
            };
            user: {
                role: number;
            };
        }
        export const http: {
            get(url: string): Promise<Object>;
            post(url: string, data: Object|string, method: string = 'POST'): Promise<Object>;
            put(url: string, data: Object|string): Promise<Object>;
            delete(url: string): Promise<Object>;
        }
        export function myFetch(url: string, settings?: Object): Promise<XMLHttpRequest>;
        export const toasters: {
            [key: string]: (message: string|function, level: keyof {info: 1; error: 1; message: 1;}) => any;
        };
        export const env: {
            sessionStorage: WindowSessionStorage;
            console: WindowConsole;
        };

        ////////////////////////////////////////////////////////////////////////

        export function hookForm(vm: preact.Component,
                                 values?: {[key: string]: any},
                                 inputs?: {[key: string]: {
                                     value: any;
                                     validations: Array<[string, ...any]|[[function, string], ...any]>;
                                     label?: string;
                                }}): {
            values: Object;
            errors: Object;
            classes: Object;
        }
        export class InputGroup extends preact.Component<
            {
                classes?: {invalid: boolean; focused: boolean; blurredAtLeastOnce: boolean;};
                className?: string;
            },
            {}>
        {
        }
        export interface InputProps {
            vm: preact.Component;
            myOnChange?: (state: Object) => Object;
            validations?: Array<[string, ...any]>;
            errorLabel?: string;
            [key: string]: any;
        }
        export class Input extends preact.Component<
            InputProps,
            {}>
        {
        }
        export class Textarea extends preact.Component<
            InputProps,
            {}>
        {
        }
        export class Select extends preact.Component<
            InputProps,
            {}>
        {
        }
        export class InputError extends preact.Component<
            {error?: string;},
            {}>
        {
        }
        export class FormButtons extends preact.Component<
            {
                buttons?: Array<'submit'|'submitWithAlt'|'cancel'|preact.VNode>;
                submitButtonText?: string;
                altSubmitButtonText?: string;
                cancelButtonText?: string;
                returnTo?: string;
                className?: string;
            },
            {}>
        {
        }
        export class Toaster extends preact.Component<
            {id?: string; autoCloseTimeoutMillis?: number;},
            {}>
        {
        }
        export class View extends preact.Component<
            {},
            {}>
        {
        }
        export class Confirmation extends preact.Component<
            {
                onConfirm: () => any;
                onCancel: () => any;
                confirmButtonText?: string;
                cancelButtonText?: string;
            },
            {}>
        {
        }
        export class FormConfirmation extends preact.Component<
            {
                onConfirm: (e: UIEvent) => any;
                onCancel: () => any;
                confirmButtonText?: string;
                cancelButtonText?: string;
            },
            {}>
        {
        }
        export class FeatherSvg extends preact.Component<
            {iconId: string; className?: string;},
            {}>
        {
        }
        export const dateUtils: {
            getLocaleDateString(date: Date, includeTime: boolean = false): string;
            getLocaleTimeString(date: Date): string;
        };
        export const urlUtils: {
            baseUrl: string;
            assetBaseUrl: string;
            currentPagePath: string;
            redirect(to: string, full?: boolean);
            reload();
            makeUrl(url: string): string;
            makeAssetUrl(url: string): string;
            normalizeUrl(url: string): string;
        }
        export class Sortable {
            register(el: HTMLElement, options: Object): void;
            getImpl(): Object;
        }
    }
    export = radCommons;
}

interface SiteInfo {
    baseUrl: string;         // /foo/, tai /foo/index.php?q=/
    assetBaseUrl: string;    // /foo/
    currentPagePath: string; // /
}

interface ControlPanelLoadArgs {
    adminPanels: Array<FrontendPanelConfig>;
    baseUrl: string;
    assetBaseUrl: string;
    user: Object;
    userPermissions: Object;
}

interface PageLoadArgs {
    contentPanels: Array<FrontendPanelConfig>;
    currentPagePath: string;
}
