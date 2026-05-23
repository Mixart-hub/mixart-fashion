def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "app" in data


def test_root(client):
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert "docs" in data


def test_currency_rate(client):
    r = client.get("/api/v1/system/currency-rate")
    assert r.status_code == 200


def test_branches_list(client):
    r = client.get("/api/v1/branches/")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_products_list(client):
    r = client.get("/api/v1/products/")
    assert r.status_code == 200


def test_promo_invalid_code(client):
    r = client.get("/api/v1/promo/check/INVALID_CODE_XYZ")
    assert r.status_code in (200, 404)
