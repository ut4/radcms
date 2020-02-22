interface ContentTypeField {
    name: string;
    friendlyName: string;
    dataType: string;
    defaultValue: string;
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
