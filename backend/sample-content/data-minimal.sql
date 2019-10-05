insert into ${p}websiteConfigs values
(1, '${siteName}', '[{"pattern":".*","layoutFileName":"main-layout.tmpl.php"}]');

insert into ${p}contentTypes values
(1, '${Generic blobs.name}', '${Generic blobs.fields}');

insert into ${p}contentNodes values
(1, 'home-content', '{"content":"Hello World!"}', 1, NULL);
