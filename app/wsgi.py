from app import create_app  # Assuming your app factory is in app/__init__.py

app = create_app()

if __name__ == "__main__":
    app.run()