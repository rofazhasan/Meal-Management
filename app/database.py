
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Initialize the database
db = SQLAlchemy()

# Function to initialize the database with the Flask app
def init_app(app):
    app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://rofaz-admin:TpuYgn8vfMK6@ep-delicate-hat-a1c6e7zy.ap-southeast-1.pg.koyeb.app/koyebdb'
    app.config['SECRET_KEY'] = 'your-secret-key'
    db.init_app(app)


