def test_products_empty(client):
    r = client.get("/api/v1/products/")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, (list, dict))


def test_products_search(client):
    r = client.get("/api/v1/products/?search=test")
    assert r.status_code == 200


def test_products_filter_category(client):
    r = client.get("/api/v1/products/?category_id=1")
    assert r.status_code == 200


def test_product_not_found(client):
    r = client.get("/api/v1/products/999999")
    assert r.status_code == 404


def test_categories_list(client):
    r = client.get("/api/v1/products/categories")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
