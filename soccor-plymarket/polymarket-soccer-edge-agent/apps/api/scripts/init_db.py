from app.db.session import SessionLocal, create_all
from app.seed.demo_data import seed_demo_data


def main() -> None:
    create_all()
    with SessionLocal() as db:
        seed_demo_data(db)
    print("Database initialized with demo data.")


if __name__ == "__main__":
    main()

