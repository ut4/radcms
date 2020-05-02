declare module "@rad-cpanel-commons" {
    namespace radCpanelCommons {
        // -- API ----
        export const contentPanelRegister: {
            registerImpl(name: string, Impl: any): void;
            getImpl(name: string): Impl?;
        };
        export const contentFormRegister: {
            registerImpl(name: string, Impl: any): void;
            getImpl(name: string): Impl?;
        };
        export const ContentPanelImpl: {
            DefaultSingle: string;
            DefaultCollection: string;
        };
        export const ContentFormImpl: {
            Default: string;
        };
        export class ContentNodeUtils {
            static makeTitle(contentNode: any): string;
        }
    }
    export = radCpanelCommons;
}

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

interface MultiFieldField {
    id: string;
    name: string;
    widget: {name: string, args: Object|null};
    value: any;
}

interface ContentType {
    name: string;
    friendlyName: string;
    isInternal: boolean;
    fields: Array<ContentTypeField>;
}

enum ContentNodePublishStatus {
    STATUS_PUBLISHED,
    STATUS_DRAFT,
    STATUS_DELETED,
}

interface ContentNode {
    id: string;
    contentType: string;
    status: ContentNodePublishStatus;
    isRevision: boolean;
    revisions?: Array<Object>;
    [fieldName: string]: any;
}

interface FrontendPanelConfig {
    id?: string;
    impl: string; // 'DefaultSingle' | 'DefaultCollection' | 'NameOfMyImpl'
    implProps?: Object;
    title: string;
    subtitle?: string;
    highlightSelector?: string;
    //
    contentTypeName: string;
    contentNodes: Array<ContentNode>;
    queryInfo: {where: {expr: string, bindVals: Array<any>;}};
}
