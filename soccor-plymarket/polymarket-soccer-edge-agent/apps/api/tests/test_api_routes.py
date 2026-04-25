from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_route() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_markets_route_has_demo_data() -> None:
    response = client.get("/markets")
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_manual_paper_trade_route_is_disabled() -> None:
    response = client.post(
        "/paper-trades",
        json={
            "market_id": "demo-ucl-inter-milan-over-25",
            "side": "buy",
            "outcome": "Over 2.5",
            "quantity": 25,
            "fill_mode": "market"
        },
    )
    assert response.status_code == 403
