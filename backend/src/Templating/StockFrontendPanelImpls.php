<?php

declare(strict_types=1);

namespace RadCms\Templating;

abstract class StockFrontendPanelImpls {
    /**
     * Oletushallintapaneeli-implementaatio yksittäiselle sisältönodelle
     * (fetchOne()).
     */
    public const DEFAULT_SINGLE = 'DefaultSingle';
    /**
     * Oletushallintapaneeli-implementaatio sisältönodetaulukolle (fetchAll()).
     */
    public const DEFAULT_COLLECTION = 'DefaultCollection';
}
