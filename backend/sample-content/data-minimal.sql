insert into ${p}websiteConfigs values
(1, '${siteName}', '[{"pattern":".*","layoutFileName":"main-layout.tmp.php"}]');

insert into ${p}contentTypes values
(1, '${Generic blobs.name}', '${Generic blobs.fields}');

insert into ${p}contentNodes values
(1, 'footer', '{"content":"(c) 2034 MySite"}', 1, NULL);
