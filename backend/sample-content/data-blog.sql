insert into ${p}websiteConfigs values
(1, '${siteName}', '[{"pattern":"art.+","layoutFileName":"article-layout.tmpl.php"},{"pattern":".*","layoutFileName":"main-layout.tmpl.php"}]');

insert into ${p}contentTypes values
(1, '${Generic blobs.name}', '${Generic blobs.fields}'),
(2, '${Articles.name}', '${Articles.fields}');

insert into ${p}contentNodes values
(1, 'footer', '{"body":"(c) 2034 MySite"}', 1, NULL),
(2, 'art1', '{"title":"Article 1","body":"Hello from article 1"}', 2, NULL),
(3, 'art2', '{"title":"Article 2","body":"Hello from article 2"}', 2, NULL),
(4, 'art3', '{"title":"Article 3","body":"Hello from article 3"}', 2, NULL);