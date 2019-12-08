interface FormProps {
    onConfirm: (e: Event) => any;
    onCancel?: (e: Event) => any;
    close?: Function;
    doDisableConfirmButton?: () => boolean;
    noAutoClose?: bool;
    confirmButtonText?: string;
    cancelButtonText?: string;
}

interface FrontendPanelConfig {
    id?: string;
    impl: string; // 'Generic' | 'List' | ...
    title: string;
    contentTypeName?: string;
    contentNodes?: Array<Object>;
}

interface SiteInfo {
    baseUrl: string;         // /foo/, tai /foo/index.php?q=/
    assetBaseUrl: string;    // /foo/
    currentPagePath: string; // /
}

interface ControlPanelAppProps extends SiteInfo {
    contentPanels: Array<FrontendPanelConfig>;
    adminPanels: Array<FrontendPanelConfig>;
}

interface ContentNode {
    id: string;
    [key: string]: any;
}

interface ContentType {
    name: string;
    friendlyName: string;
    fields: Array<{name: string; dataType: string; widget?: string;}>;
}
