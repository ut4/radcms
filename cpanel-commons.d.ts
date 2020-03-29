interface ContentTypeField {
    name: string;
    friendlyName: string;
    dataType: string;
    defaultValue: string;
    visibility: number;
    widget: {
        name: string;
        args: Object;
    };
}

interface ContentType {
    name: string;
    friendlyName: string;
    isInternal: boolean;
    fields: Array<ContentTypeField>;
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
