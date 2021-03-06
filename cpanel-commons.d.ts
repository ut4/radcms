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
        export class ContentNodeUtils {
            static makeTitle(contentNode: any): string;
        }
        export class FieldsFilter {
            constructor(fieldsToDisplay: Array<string>): FieldsFilter;
            doFilter(fields: Array<{name: string; [key: any]: any;}>): Array<{name: string; [key: any]: any;}>;
            fieldShouldBeShown(field: {name: string; [key: any]: any;}): boolean;
            getFieldsToDisplay(): Array<string>;
        }
    }
    export = radCpanelCommons;
}

interface FieldWidget {
    name: string;
    args: Object;
}

interface ContentTypeField {
    name: string;
    friendlyName: string;
    dataType: {type: keyof {"text":1, "json":1, "int":1, "uint":1}; length?: number;};
    defaultValue: string;
    visibility: number;
    widget: FieldWidget;
    validationRules?: Array<[string, ...any]>;
}

interface MultiFieldField {
    id: string;
    name: string;
    widget: FieldWidget;
    value: any;
}

interface ContentType {
    name: string;
    friendlyName: string;
    description: string;
    isInternal: boolean;
    frontendFormImpl: string;
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
    implProps: Object;
    formImpl: string;
    formImplProps?: Object;
    title: string;
    subtitle?: string;
    highlightSelector?: string;
    //
    contentTypeName: string;
    contentNodes: Array<ContentNode>;
    queryInfo: {where: {expr: string, bindVals: Array<any>;}};
}
