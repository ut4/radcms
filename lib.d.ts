import preact from 'preact';

declare module "@rad-commons" {
    namespace radCommons {
        export const config: {
            baseUrl: string;
            assetBaseUrl: string;
        }
        export const http: {
            get(url: string): Promise<Object>;
            post(url: string, data: Object|string, method: string = 'POST'): Promise<Object>;
            put(url: string, data: Object|string): Promise<Object>;
        }
        export function myFetch(url: string, settings?: Object): Promise<XMLHttpRequest>;


        ////////////////////////////////////////////////////////////////////////


        export class FeatherSvg extends preact.Component<
            {iconId: string; className?: string;},
            {}>
        {
        }
        export class Form extends preact.Component<
            {label: preact.ComponentChild?; id?: string; className?: string; inline?: boolean;},
            {}>
        {
            static receiveInputValue(e:Event, dhis: preact.VNode, name?: string): void;
            close(): void;
        }
        export function InputGroup(props: {label?: preact.ComponentChild; inline?: boolean; className?: string;}): preact.VNode;
        export class Toaster extends preact.Component<
            {autoCloseTimeoutMillis?: number; publishFactoryTo?: Object;},
            {}>
        {
        }
        export function View(props: any): preact.VNode;
        export const dateUtils: {
            getLocaleDateString(date: Date, includeTime: boolean = false): string;
            getLocaleTimeString(date: Date): string;
        };
        export const urlUtils: {
            redirect(to: string, full?: boolean);
            makeUrl(url: string): string;
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
