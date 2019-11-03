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
    contentNodes?: Array<Object>;
}

interface ControlPanelAppProps {
    page: {url: string;};
    contentPanels: Array<FrontendPanelConfig>;
    adminPanels: Array<FrontendPanelConfig>;
    baseUrl: string;
}
