# models.py
from app.database import db
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(15), nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('user', 'admin', name='user_roles'), default='user', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<User {self.name}>'

# Meal Model
class Meal(db.Model):
    __tablename__ = 'meals'
    meal_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    meal_date = db.Column(db.Date, nullable=False)
    lunch = db.Column(db.Boolean, default=True, nullable=False)
    dinner = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('meals', lazy=True))

    def __repr__(self):
        return f'<Meal {self.meal_id} for User {self.user_id}>'

# Price Model
class Price(db.Model):
    __tablename__ = 'prices'
    price_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    meal_date = db.Column(db.Date, nullable=False)
    lunch_price = db.Column(db.Numeric(10, 2), nullable=False)
    dinner_price = db.Column(db.Numeric(10, 2), nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Price {self.price_id} for {self.meal_date}>'

# Transaction Model
class Transaction(db.Model):
    __tablename__ = 'transactions'
    transaction_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    transaction_type = db.Column(db.Enum('add_fund', 'deduction', 'refund', name='transaction_types'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    balance_after_transaction = db.Column(db.Numeric(10, 2), nullable=False)
    transaction_date = db.Column(db.DateTime, default=datetime.utcnow)
    remarks = db.Column(db.String(255))

    user = db.relationship('User', backref=db.backref('transactions', lazy=True))

    def __repr__(self):
        return f'<Transaction {self.transaction_id} for User {self.user_id}>'

# Balance Model
class Balance(db.Model):
    __tablename__ = 'balances'
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), primary_key=True)
    current_balance = db.Column(db.Numeric(10, 2), default=0.00, nullable=False)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('balances', uselist=False))

    def __repr__(self):
        return f'<Balance for User {self.user_id}: {self.current_balance}>'
