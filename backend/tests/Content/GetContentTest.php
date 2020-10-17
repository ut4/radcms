<?php

namespace RadCms\Tests\Content;

use Pike\PikeException;
use RadCms\Tests\_Internal\ApiRequestFactory;

final class GetContentTest extends ContentControllersTestCase {
    public function testGETContentReturnsContentNode() {
        $s = $this->setupGetContentTest();
        $this->insertTestProducts(self::TEST_PRODUCT_1);
        $this->sendGetContentNodeRequest($s);
        $this->verifyReturnedProducts((object) self::TEST_PRODUCT_1, $s);
    }
    private function setupGetContentTest() {
        $state = new \stdClass;
        $state->spyingResponse = null;
        return $state;
    }
    private function sendGetContentNodeRequest($s) {
        $req = ApiRequestFactory::create('/api/content/' . self::TEST_PRODUCT_1['id'] . '/Products', 'GET');
        $s->spyingResponse = $this->makeSpyingResponse();
        $this->sendRequest($req, $s->spyingResponse, $this->app);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testGETContentReturnsContentNodesByContentType() {
        $s = $this->setupGetContentTest();
        $this->insertTestProducts(self::TEST_PRODUCT_1);
        $this->insertTestBrand();
        $this->sendGetContentNodesByTypeRequest($s);
        $this->verifyResponseMetaEquals(200, 'application/json', $s->spyingResponse);
        $this->verifyResponseBodyEquals([self::fillWithDefaults((object) self::TEST_BRAND_1)],
                                        $s->spyingResponse);
    }
    private function sendGetContentNodesByTypeRequest($s, $urlTail = 'Brands') {
        $req = ApiRequestFactory::create("/api/content/${urlTail}", 'GET');
        $s->spyingResponse = $this->makeSpyingResponse();
        $this->sendRequest($req, $s->spyingResponse, $this->app);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testGETContentRejectsInvalidFilterIdentifiers() {
        $s = $this->setupGetContentTest();
        $this->expectException(PikeException::class);
        $this->expectExceptionMessage('Filter column name `DROP TABLE table` is not valid identifier');
        $this->sendGetContentNodesByTypeRequest($s, 'Products/{"DROP TABLE table":{"$eq":1}}');
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testGETContentRejectsInvalidLimitValue() {
        $s = $this->setupGetContentTest();
        $this->expectException(PikeException::class);
        $this->expectExceptionMessage('limit expression (DROP TABLE table) not valid');
        $this->sendGetContentNodesByTypeRequest($s, 'Products/{"$limit":"DROP TABLE table"}');
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testGETContentRejectsUnknownFilters() {
        $s = $this->setupGetContentTest();
        $this->expectException(PikeException::class);
        $this->expectExceptionMessage('Unsupported filter type `$nonExistingFilter`');
        $this->sendGetContentNodesByTypeRequest($s, 'Products/{"id":{"$nonExistingFilter":"foo"}}');
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testGETContentLimitsResults() {
        $s = $this->setupGetContentTest();
        $this->insertTestProducts(self::TEST_PRODUCT_1,
                                  self::TEST_PRODUCT_2,
                                  self::TEST_PRODUCT_3);
        $this->sendGetContentNodesByTypeRequest($s, 'Products/{"$limit":2}');
        $this->verifyReturnedProducts([(object) self::TEST_PRODUCT_1,
                                       (object) self::TEST_PRODUCT_2], $s);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testGETContentFiltersContentByList() {
        $s = $this->setupGetContentTest();
        $this->insertTestProducts(self::TEST_PRODUCT_1,
                                  self::TEST_PRODUCT_2,
                                  self::TEST_PRODUCT_3);
        $this->sendGetContentNodesByTypeRequest($s, 'Products/{"id":{"$in":["2",3]}}');
        $this->verifyReturnedProducts([(object) self::TEST_PRODUCT_2,
                                       (object) self::TEST_PRODUCT_3], $s);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testGETContentFiltersContentByStartsWith() {
        $s = $this->setupStartsWithFilterTest();
        $this->insertTestProducts(...$s->testProducts);
        $this->sendGetContentNodesByTypeRequest($s, 'Products/{"title":{"$startsWith":"foo"}}');
        $this->verifyReturnedProducts([(object) $s->testProducts[0],
                                       (object) $s->testProducts[2]], $s);
    }
    private function setupStartsWithFilterTest() {
        $state = $this->setupGetContentTest();
        $state->testProducts = [
            self::TEST_PRODUCT_1,
            self::TEST_PRODUCT_2,
            self::TEST_PRODUCT_3
        ];
        $state->testProducts[0]['title'] = 'foo bar';
        $state->testProducts[1]['title'] = 'baz';
        $state->testProducts[2]['title'] = 'Foooo baz';
        return $state;
    }
    private function verifyReturnedProducts($expected, $s) {
        $this->verifyResponseMetaEquals(200, 'application/json', $s->spyingResponse);
        if (!is_array($expected))
            $this->verifyResponseBodyEquals(self::fillWithDefaults($expected), $s->spyingResponse);
        else
            $this->verifyResponseBodyEquals(array_map(function ($n) { return self::fillWithDefaults($n); }, $expected),
                                            $s->spyingResponse);
    }
    private static function fillWithDefaults($contentNode) {
        return (object) array_merge((array) $contentNode,
                                    ['isDraft' => false,
                                     'currentDraft' => null]);
    }
}
