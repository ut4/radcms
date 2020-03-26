import preact from 'preact';
import 'cpanel-commons.d.ts';

declare module "@rad-commons" {
    namespace radCommons {
        export const config: {
            baseUrl: string;
            assetBaseUrl: string;
            userPermissions: {
                canCreateContent: boolean;
                canConfigureContent: boolean;
                canManageFieldsOfMultiFieldContent: boolean;
            };
            user: {
                role: number;
            }
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

        ////////////////////////////////////////////////////////////////////////


        export class FeatherSvg extends preact.Component<
            {iconId: string; className?: string;},
            {}>
        {
        }
        interface FormProps {
            onSubmit: (e: Event) => any;
            submitButtonText?: string;
            cancelButtonText?: string;
            returnTo?: string;
            omitButtons?: boolean;
            formId?: string;
            action?: string;
            method?: string;
            encType?: string;
        }
        export class Form extends preact.Component<
            FormProps,
            {}>
        {
            static receiveInputValue(e:Event, dhis: preact.VNode, name?: string): void;
            close(): void;
        }
        export class InputGroup extends preact.Component<
            {label?: string|Function; inline?: boolean; className?: string;},
            {}>
        {
        }
        interface InputProps {
            validations: Array<[string, ...any]>;
            [key: string]: any;
        };
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
        export class InputErrors extends preact.Component<
            {},
            {}>
        {
        }
        export class Toaster extends preact.Component<
            {id?: string; autoCloseTimeoutMillis?: number;},
            {}>
        {
        }
        export function View(props: any): preact.VNode;
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
        export const dateUtils: {
            getLocaleDateString(date: Date, includeTime: boolean = false): string;
            getLocaleTimeString(date: Date): string;
        };
        export const urlUtils: {
            redirect(to: string, full?: boolean);
            reload();
            makeUrl(url: string): string;
            makeAssetUrl(url: string): string;
            normalizeUrl(url: string): string;
        }
    }
    export = radCommons;
}

declare module "@rad-cpanel-commons" {
    namespace radCpanelCommons {
        export const uiPanelRegister: {
            registerUiPanelImpl(name: string, Impl: any): void;
        }
        export class ContentNodeUtils {
            static makeTitle(contentNode: any): string;
        }
    }
    export = radCpanelCommons;
}
