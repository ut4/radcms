update ${p}websiteState set
`layoutMatchers` = '[{"pattern":"art.+","layoutFileName":"article-layout.tmpl.php"},{"pattern":".*","layoutFileName":"main-layout.tmpl.php"}]';

insert into ${p}GenericBlobs values
(1, 'home-content', '(c) 2034 MySite');

insert into ${p}Articles values
(1, 'art1', 'Article 1', 'Hello from article 1'),
(2, 'art2', 'Article 2', 'Hello from article 2'),
(3, 'art3', 'Article 3', 'Hello from article 3');
