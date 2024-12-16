# forms.py
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, FloatField, SubmitField, DateField, IntegerField, HiddenField,SelectField,EmailField
from wtforms.validators import DataRequired, Length, EqualTo, ValidationError, NumberRange
from app.models import User

class LoginForm(FlaskForm):
    phone_number = StringField(
        'Phone Number',
        validators=[DataRequired(), Length(min=10, max=15, message="Invalid phone number length.")]
    )
    password = PasswordField(
        'Password',
        validators=[DataRequired(), Length(min=6, message="Password must be at least 6 characters long.")]
    )
    submit = SubmitField('Login')

class AddUserForm(FlaskForm):
    name = StringField(
        'Name',
        validators=[DataRequired(), Length(max=100, message="Name cannot exceed 100 characters.")]
    )
    email = EmailField('E-mail', validators=[DataRequired()])
    phone = StringField(
        'Phone Number',
        validators=[DataRequired(), Length(min=10, max=15, message="Invalid phone number length.")]
    )
    password = PasswordField(
        'Password',
        validators=[
            DataRequired(),
            Length(min=6, message="Password must be at least 6 characters long."),
            EqualTo('confirm_password', message="Passwords must match.")
        ]
    )
    confirm_password = PasswordField('Confirm Password', validators=[DataRequired()])
    role = SelectField('Role',
                       choices=[('user','User'),('admin','Admin')],
                       validators=[DataRequired()])
    submit = SubmitField('Add User')

    def validate_phone_number(self, phone):
        user = User.query.filter_by(phone=phone.data).first()
        if user:
            raise ValidationError("Phone number already registered.")

class AddMoneyForm(FlaskForm):
    money = FloatField('Money to Add', validators=[DataRequired(), NumberRange(min=0, message="Amount must be positive")])
    submit = SubmitField('Add Money')


class UpdateMealPriceForm(FlaskForm):
    lunch_price = FloatField(
        'Lunch Price',
        validators=[DataRequired(), NumberRange(min=0, message="Price must be a positive value.")]
    )
    dinner_price = FloatField(
        'Dinner Price',
        validators=[DataRequired(), NumberRange(min=0, message="Price must be a positive value.")]
    )
    effective_date = DateField(
        'Effective Date',
        format='%Y-%m-%d',
        validators=[DataRequired()],
        description="Date from which the new price will be applied."
    )
    submit = SubmitField('Update Price')

class SetNextDayMealForm(FlaskForm):
    lunch = BooleanField('Lunch')
    dinner = BooleanField('Dinner')
    submit = SubmitField('Save')

class ChangePasswordForm(FlaskForm):
    old_password = PasswordField('Old Password', validators=[DataRequired()])
    new_password = PasswordField('New Password', validators=[DataRequired(), Length(min=6)])
    confirm_password = PasswordField('Confirm New Password', validators=[DataRequired(), EqualTo('new_password')])
    submit = SubmitField('Change Password')

class AnalysisForm(FlaskForm):
    start_date = DateField('Date (YYYY-MM-DD)', format='%Y-%m-%d', validators=[DataRequired()])
    end_date = DateField('Date (YYYY-MM-DD)', format='%Y-%m-%d', validators=[DataRequired()])
    submit = SubmitField('Submit')
