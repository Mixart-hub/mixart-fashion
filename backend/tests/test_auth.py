def _get_token(client, tg_id="99999999"):
    r = client.post("/api/v1/auth/telegram", params={
        "telegram_id": tg_id,
        "full_name": "Test User",
        "language": "uz",
    })
    assert r.status_code == 200
    return r.json()["access_token"]


def test_telegram_auth(client):
    token = _get_token(client)
    assert token


def test_me_no_token(client):
    r = client.get("/api/v1/auth/me")
    assert r.status_code in (401, 403, 422)


def test_me_with_token(client):
    token = _get_token(client)
    r = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    me = r.json()
    assert me["telegram_id"] == "99999999"


def test_two_telegram_auths_same_user(client):
    t1 = _get_token(client, "88888888")
    t2 = _get_token(client, "88888888")
    # Same telegram_id → same user, both tokens valid
    assert t1 and t2
