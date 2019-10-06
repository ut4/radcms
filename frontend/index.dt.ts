interface FrontendPanelConfig {
    id: string;
    type: 'Generic' | 'List' | 'StaticMenu';
    title: string;
    contentNodes: Array<Object>;
    icon?: string;
}
