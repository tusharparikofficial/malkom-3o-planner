-- The Client Deployment Model now lives as a tab on the Architecture & Flow
-- page (run the regenerated 0006_architecture_page.sql first). This removes
-- the standalone deployment-model page.
begin;
delete from "ContentRevision" where "blockId" in (select cb.id from "ContentBlock" cb join "Section" s on s.id=cb."sectionId" where s."pageId" in (select id from "Page" where slug='deployment-model'));
delete from "ContentBlock" where "sectionId" in (select id from "Section" where "pageId" in (select id from "Page" where slug='deployment-model'));
delete from "Section" where "pageId" in (select id from "Page" where slug='deployment-model');
delete from "Page" where slug='deployment-model';
commit;
