
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from dotenv import load_dotenv
import os
# Initialize the database
db = SQLAlchemy()

# Function to initialize the database with the Flask app
def init_app(app):
    load_dotenv()  # Load environment variables from .env file

    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SECRET_KEY'] = 'your-secret-key'
    db.init_app(app)


