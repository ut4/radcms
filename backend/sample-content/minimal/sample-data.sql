update ${p}websiteConfigs set
`layoutMatchers` = '[{"pattern":".*","layoutFileName":"main-layout.tmpl.php"}]';

insert into ${p}GenericBlobs values
(1, 'home-content', 'Hello World!');
