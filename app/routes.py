from flask import Blueprint, request, send_file, render_template, flash, redirect, url_for, session
from app.models import User, Price, Balance, Meal,Transaction
from app.forms import LoginForm, AddUserForm, UpdateMealPriceForm, AddMoneyForm, SetNextDayMealForm,AnalysisForm,ChangePasswordForm
from app.database import db
from io import BytesIO
from app.utils import current_time, deadline, current_date, timedelta,transactions,generate_pdf, all_users_generate_pdf
app = Blueprint('app', __name__)

@app.route('/')
def index():
    return redirect(url_for('app.login'))
   
@app.route('/login',methods=["GET","POST"])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        phone = form.phone_number.data
        password = form.password.data
        user = User.query.filter_by(phone=phone).first()
        if user and user.password == password:
            session['logged_in'] = True
            session['user_id'] = user.user_id
            session['user_role'] = user.role
            if session['user_role'] == 'admin':
                return redirect(url_for('app.admin_dashboard'))
            else :
                return redirect(url_for('app.user_dashboard'))
        else :
            flash("Invalid phone or  password")
    return render_template('login.html', form=form)
@app.route('/change_password', methods=['GET', 'POST'])
def change_password():
    if not session.get('logged_in'):
        return redirect(url_for('app.login'))

    form = ChangePasswordForm()
    user_id = session.get('user_id')
    user = User.query.filter_by(user_id=user_id).first()

    if form.validate_on_submit():
        old_password = form.old_password.data
        new_password = form.new_password.data

        # Check if the old password matches the stored password (without encryption)
        if user.password == old_password:
            # Update the user's password in the database (without encryption)
            user.password = new_password
            db.session.commit()

            flash('Password changed successfully!', 'success')
            if session['user_role'] == 'user':
                    return redirect(url_for('app.user_dashboard'))
                else:
                    return redirect(url_for('app.admin_dashboard'))  # Redirect to user dashboard
        else:
            flash('Incorrect old password.', 'danger')

    return render_template('change_password.html', form=form)
@app.route('/logout')
def logout():
    session.pop('logged_in',None)
    session.pop('user_id', None)
    session.pop('user_role',None)
    return redirect(url_for('app.login'))


@app.route('/analysis', methods=['GET', 'POST'])
def analysis():
    if not (session.get('logged_in') and (session.get('user_role') == 'user' or session.get('user_role') == 'admin')):
        return redirect(url_for('app.login'))

    form = AnalysisForm()
    if session.get('user_role') == 'user':
        if form.validate_on_submit():
            start_date = form.start_date.data
            end_date = form.end_date.data
            user = User.query.filter_by(user_id=session.get('user_id')).first()
            transactions = Transaction.query.filter(
                Transaction.user_id == session['user_id'],
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date
            ).all()
            meals = Meal.query.filter(
                Meal.user_id == session['user_id'],
                Meal.meal_date >= start_date,
                Meal.meal_date <= end_date
            ).all()

            # Assuming generate_pdf takes transactions, user, and meals
            pdf_bytes = generate_pdf(transactions, user, meals)
            return send_file(
                BytesIO(pdf_bytes),
                as_attachment=True,
                download_name='user_analysis.pdf',
                mimetype='application/pdf'
            )
            # Pass transactions, user, and meals to the template even if form is not submitted
            # This allows you to display the data in the HTML
        user = User.query.filter_by(user_id=session.get('user_id')).first()
        transactions = Transaction.query.filter_by(user_id=session['user_id']).all()
        meals = Meal.query.filter_by(user_id=session['user_id']).all()
        return render_template('user_analysis.html', form=form, transactions=transactions, user=user, meals=meals)


    if session.get('user_role') == 'admin':
        if form.validate_on_submit():
            start_date = form.start_date.data
            end_date = form.end_date.data
            transactions = Transaction.query.filter(
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date
            ).all()
            users = User.query.all()  # Get all users for admin analysis
            meals = Meal.query.filter(
                Meal.meal_date >= start_date,
                Meal.meal_date <= end_date
            ).all()

            # Assuming all_users_generate_pdf takes transactions, users, and meals
            pdf_bytes = all_users_generate_pdf(transactions, users, meals)
            return send_file(
                BytesIO(pdf_bytes),
                as_attachment=True,
                download_name='admin_analysis.pdf',
                mimetype='application/pdf'
            )
        transactions = Transaction.query.all()
        users = User.query.all()
        meals = Meal.query.all()
        return render_template('admin_analysis.html', form=form, transactions=transactions, users=users, meals=meals)

@app.route('/admin_dashboard')
def admin_dashboard():
    if not (session.get('logged_in') and session.get('user_role') == 'admin'):
        return redirect(url_for('app.login'))

    user = User.query.filter_by(user_id=session.get('user_id')).first()
    num_of_users = User.query.count()  # More efficient way to count users
    balance = Balance.query.filter_by(user_id=session.get('user_id')).first()
    meals = Meal.query.filter_by(user_id=session.get('user_id'), meal_date=current_date()).first()
    mealst = Meal.query.filter_by(user_id=session.get('user_id'), meal_date=current_date() + timedelta(days=1)).first()
    latest_price = Price.query.filter(Price.meal_date <= current_date()).order_by(Price.meal_date.desc()).first()

    # Handle potential AttributeError if meals or mealst is None
    lunch = meals.lunch if meals else False
    dinner = meals.dinner if meals else False
    tlunch = mealst.lunch if mealst else False
    tdinner = mealst.dinner if mealst else False
    no_of_lunch = Meal.query.filter_by(meal_date=current_date(), lunch=True).count()
    no_of_dinner = Meal.query.filter_by(meal_date=current_date(), dinner=True).count()
    latest_price = Price.query.filter(Price.meal_date <= current_date()).order_by(Price.meal_date.desc()).first()
    no_meals = no_of_dinner + no_of_lunch
    lunch_value = no_of_lunch * latest_price.lunch_price if latest_price else 0
    dinner_value = no_of_dinner * latest_price.dinner_price if latest_price else 0
    total_value = lunch_value + dinner_value

    return render_template("admin_dashboard.html",
                           name=user.name,user_id=user.user_id, num=num_of_users,
                           balance=balance.current_balance if balance else 0,
                           lunchP=latest_price.lunch_price if latest_price else 0,
                           dinnerP=latest_price.dinner_price if latest_price else 0,
                           lunch=lunch, dinner=dinner,
                           tlunch=tlunch, tdinner=tdinner,current_time=current_time,deadline=deadline,
                           total_value=total_value,no_meals=no_meals)


@app.route('/admin/add_user', methods=["GET", "POST"])
def add_user():
    if not (session.get('logged_in') and session.get('user_role') == 'admin'):
        return redirect(url_for('app.login'))
    form = AddUserForm()

    if form.validate_on_submit():  # Move this check to the beginning
        name = form.name.data
        phone = form.phone.data
        password = form.password.data
        email = form.email.data
        role = form.role.data

        new_user = User(name=name, phone=phone, password=password, email=email, role=role)

        try:
            db.session.add(new_user)
            db.session.commit()
            flash("User added successfully!", "success")
            return redirect(url_for('app.admin_dashboard'))  # Redirect to admin dashboard
        except Exception as e:
            db.session.rollback()
            flash(f"Error adding user: {e}", "danger")

    return render_template('add_user.html', form=form)
@app.route('/admin/view_user')
def view_user():
    if not (session.get('logged_in') and session.get('user_role') == 'admin'):
        return redirect(url_for('app.login'))

    users = User.query.all()
    return render_template('view_user.html', users=users)
@app.route('/admin/view_today_meal')
def view_today_meal():
    if not (session.get('logged_in') and session.get('user_role') == 'admin'):
        return redirect(url_for('app.login'))

    users = User.query.all()

    # Get the latest meal entry for each user for today
    meals = []
    for user in users:
        meal = Meal.query.filter_by(user_id=user.user_id, meal_date=current_date()).order_by(Meal.meal_id.desc()).first()
        if meal:
            meals.append(meal)

    no_of_lunch = Meal.query.filter_by(meal_date=current_date(), lunch=True).count()
    no_of_dinner = Meal.query.filter_by(meal_date=current_date(), dinner=True).count()

    latest_price = Price.query.filter(Price.meal_date <= current_date()).order_by(Price.meal_date.desc()).first()

    lunch_value = no_of_lunch * latest_price.lunch_price if latest_price else 0
    dinner_value = no_of_dinner * latest_price.dinner_price if latest_price else 0
    total_value = lunch_value + dinner_value

    return render_template("view_today_meal.html",
                           users=users, meals=meals, current_date=current_date(),
                           no_of_lunch=no_of_lunch, no_of_dinner=no_of_dinner,
                           lunch_value=lunch_value, dinner_value=dinner_value, total_value=total_value)
@app.route('/admin/delete_user/<int:user_id>',methods=['POST'])
def delete_user(user_id):
    if not (session.get('logged_in') and session.get('user_role') =='admin'):
        return redirect(url_for('app.login'))
    user = User.query.get_or_404(user_id)
    users = User.query.all()
    try:
        db.session.delete(user)
        db.session.commit()
        flash("User deleted successfully!", "success")
        return redirect(url_for('app.view_user'))  # Redirect to admin dashboard
    except Exception as e:
        db.session.rollback()
        flash(f"Error adding user: {e}", "danger")
    return render_template("delete_user.html", name=user.name,users=users)
@app.route('/admin/update_meal_price',methods=['GET','POST'])
def update_meal_price():
    if not (session.get('logged_in') and session.get('user_role') =='admin'):
        return redirect(url_for('app.login'))
    form = UpdateMealPriceForm()
    if form.validate_on_submit():
        lunch = form.lunch_price.data
        dinner = form.dinner_price.data
        eff_date = form.effective_date.data
        try:
            # Check if a price entry already exists for the given date
            existing_price = Price.query.filter_by(meal_date=eff_date).first()

            if existing_price:
                # Update the existing price entry
                existing_price.lunch_price = lunch
                existing_price.dinner_price = dinner
                flash("Meal prices updated for the selected date!", "success")
            else:
                # Create a new price entry
                new_price = Price(meal_date=eff_date, lunch_price=lunch, dinner_price=dinner)
                db.session.add(new_price)
                flash("New meal prices added!", "success")

            db.session.commit()
            return redirect(url_for('app.admin_dashboard'))
        except Exception as e:
            db.session.rollback()
            flash(f"Error updating meal prices: {e}", "danger")

    return render_template('update_meal_price.html', form=form)
@app.route('/admin/add_money/<int:user_id>',methods=['POST','GET'])
def add_money(user_id):
    if not (session.get('logged_in') and session.get('user_role') =='admin'):
        return redirect(url_for('app.login'))
    form = AddMoneyForm()
    user =  User.query.filter_by(user_id=user_id).first()
    if form.validate_on_submit():
        money = form.money.data
    try:
        # Check if a price entry already exists for the given date
        c_money = Balance.query.filter_by(user_id=user_id).first()

        if c_money:
            # Update the existing money entry
            c_money.current_balance += money
            transactions(user_id,'add_fund',money,'by '+user.name)
            flash("New money added updated for the selected date!", "success")
        else:
            # Create a new price entry
            new_added_money = Balance(user_id=user_id, current_balance=money)
            db.session.add(new_added_money)
            transactions(user_id, 'add_fund', money, 'add_by'+user.name)
            flash("New money added!", "success")

        db.session.commit()
        return redirect(url_for('app.admin_dashboard'))
    except Exception as e:
        db.session.rollback()
        flash(f"Error Money adding: {e}", "danger")


    if c_money :
        return render_template('add_money.html', form=form, balance=c_money.current_balance, name=user.name, phone=user.phone)
    else:
        return render_template('add_money.html', form=form, balance=0, name=user.name, phone=user.phone)


@app.route('/admin/stop_all_meals', methods=['GET', 'POST'])
def stop_all_meals():
    if not (session.get('logged_in') and session.get('user_role') == 'admin'):
        return redirect(url_for('app.login'))
    user = User.query.filter_by(user_id=session.get('user_id')).first()

    if request.method == 'POST':
        try:
            stop_date = current_date()  # Get today's date

            # Get the latest meal entry for each user for today
            meals_to_stop = []
            all_users = User.query.all()
            for user in all_users:
                meal = Meal.query.filter_by(user_id=user.user_id, meal_date=stop_date).order_by(
                    Meal.meal_id.desc()).first()
                if meal:
                    meals_to_stop.append(meal)

            for meal in meals_to_stop:
                latest_price = Price.query.filter(Price.meal_date <= stop_date).order_by(Price.meal_date.desc()).first()
                if latest_price:
                    refund = 0
                    if meal.lunch:
                        refund += latest_price.lunch_price
                    if meal.dinner:
                        refund += latest_price.dinner_price
                    transactions(session.get('user_id'), 'refund', refund, 'by ' + user.name)

                    user_balance = Balance.query.filter_by(user_id=meal.user_id).first()
                    if user_balance:
                        user_balance.current_balance += refund

                # Delete the latest meal entry for the user
                db.session.delete(meal)

            db.session.commit()
            flash(f"All meals for today have been stopped and refunds processed!", "success")
            return redirect(url_for('app.admin_dashboard'))

        except ValueError:
            flash("Invalid date format. Please use YYYY-MM-DD.", "danger")
        except Exception as e:
            db.session.rollback()
            flash(f"Error stopping meals: {e}", "danger")

    return render_template('view_user.html')


@app.route('/user_dashboard')
def user_dashboard():
    if not (session.get('logged_in') and session.get('user_role') == 'user'):
        return redirect(url_for('app.login'))

    user = User.query.filter_by(user_id=session.get('user_id')).first()
    balance = Balance.query.filter_by(user_id=session.get('user_id')).first()
    meals = Meal.query.filter_by(user_id=session.get('user_id'), meal_date=current_date()).first()
    mealst = Meal.query.filter_by(user_id=session.get('user_id'), meal_date=current_date() + timedelta(days=1)).first()
    latest_price = Price.query.filter(Price.meal_date <= current_date()).order_by(Price.meal_date.desc()).first()

    # Handle potential AttributeError if meals or mealst is None
    lunch = meals.lunch if meals else False
    dinner = meals.dinner if meals else False
    tlunch = mealst.lunch if mealst else False
    tdinner = mealst.dinner if mealst else False

    return render_template('user_dashboard.html',
                           name=user.name,user_id=user.user_id, balance=balance.current_balance  if balance else 0,
                           lunchP=latest_price.lunch_price if latest_price else 0,
                           dinnerP=latest_price.dinner_price if latest_price else 0,
                           lunch=lunch, dinner=dinner,
                           tlunch=tlunch, tdinner=tdinner,current_time=current_time,deadline=deadline)
@app.route('/user/set_next_day_meal', methods=['GET', 'POST'])
def set_next_day_meal():
    if not (session.get('logged_in') and (session.get('user_role') == 'user' or session.get('user_role') == 'admin')):
        return redirect(url_for('app.login'))

    form = SetNextDayMealForm()
    user = User.query.filter_by(user_id=session['user_id']).first()
    balance = Balance.query.filter_by(user_id=session['user_id']).first()
    lastest_price = Price.query.filter(Price.meal_date <= current_date()).order_by(Price.meal_date.desc()).first()

    if current_time() <= deadline():
        if form.validate_on_submit():
            lunch = form.lunch.data
            dinner = form.dinner.data
            try:
                # Check if the user has enough balance
                total_meal_price = (lastest_price.lunch_price if lunch else 0) + \
                                   (lastest_price.dinner_price if dinner else 0)
                if balance.current_balance >= total_meal_price:
                    new_meal = Meal(lunch=lunch, dinner=dinner, meal_date=current_date() + timedelta(days=1),
                                    user_id=session.get('user_id'))
                    db.session.add(new_meal)

                    balance.current_balance -= total_meal_price
                    transactions(session.get('user_id'), 'deduction', total_meal_price,'by'+user.name )
                    db.session.commit()
                    flash("Meal set for tomorrow!", "success")
                else:
                    flash("Insufficient balance!", "danger")
                if session['user_role'] == 'user':
                    return redirect(url_for('app.user_dashboard'))
                else:
                    return redirect(url_for('app.admin_dashboard'))
            except Exception as e:
                db.session.rollback()
                flash(f"Error setting meal: {e}", "danger")
    else:
        # After deadline, copy yesterday's meal (if any)
        yesterday_meal = Meal.query.filter_by(user_id=session['user_id'], meal_date=current_date()).first()
        if yesterday_meal:
            try:
                # Check if the user has enough balance
                total_meal_price = (lastest_price.lunch_price if yesterday_meal.lunch else 0) + \
                                   (lastest_price.dinner_price if yesterday_meal.dinner else 0)
                if balance.current_balance >= total_meal_price:
                    new_meal = Meal(lunch=yesterday_meal.lunch, dinner=yesterday_meal.dinner,
                                    meal_date=current_date() + timedelta(days=1),
                                    user_id=session.get('user_id'))
                    db.session.add(new_meal)

                    balance.current_balance -= total_meal_price
                    transactions(session.get('user_id'), 'deduction', total_meal_price,'by'+user.name )
                    db.session.commit()
                    flash("Meal set for tomorrow! (Copied from yesterday)", "success")
                else:
                    flash("Insufficient balance!", "danger")
                if session['user_role'] == 'user':
                    return redirect(url_for('app.user_dashboard'))
                else:
                    return redirect(url_for('app.admin_dashboard'))
            except Exception as e:
                db.session.rollback()
                flash(f"Error setting meal: {e}", "danger")

    return render_template('set_next_day_meal.html', form=form)

@app.route('/user/stop_meal/<int:user_id>', methods=['POST', 'GET'])
def stop_meal(user_id):
    if not (session.get('logged_in') and (session.get('user_role') == 'user' or session.get('user_role') == 'admin')):
        return redirect(url_for('app.login'))

    try:
        user = User.query.filter_by(user_id=session['user_id']).first()
        balance = Balance.query.filter_by(user_id=session['user_id']).first()
        latest_price = Price.query.filter(Price.meal_date <= current_date()).order_by(Price.meal_date.desc()).first()
        meal = Meal.query.filter_by(user_id=user_id, meal_date=current_date() + timedelta(days=1)).first()

        if meal:
            meals_to_stop = request.args.get('meals')

            # Get the latest meal entry for the user for tomorrow
            latest_meal = Meal.query.filter_by(user_id=user_id, meal_date=current_date() + timedelta(days=1)).order_by(
                Meal.meal_id.desc()).first()

            if latest_meal:
                if meals_to_stop == 'lunch':
                    balance.current_balance += latest_price.lunch_price
                    transactions(session.get('user_id'), 'refund', latest_price.lunch_price, 'by ' + user.name)
                    # Delete the latest meal entry instead of setting lunch to False
                    db.session.delete(latest_meal)
                elif meals_to_stop == 'dinner':
                    balance.current_balance += latest_price.dinner_price
                    transactions(session.get('user_id'), 'refund', latest_price.dinner_price, 'by ' + user.name)
                    # Delete the latest meal entry instead of setting dinner to False
                    db.session.delete(latest_meal)
                else:
                    balance.current_balance += latest_price.lunch_price + latest_price.dinner_price
                    transactions(session.get('user_id'), 'refund', latest_price.lunch_price + latest_price.dinner_price,
                                 'by ' + user.name)
                    # Delete the latest meal entry instead of setting both to False
                    db.session.delete(latest_meal)

                db.session.commit()
                flash("Meal stopped successfully!", "success")
            else:
                flash("No meal found for tomorrow to stop.", "info")
    except Exception as e:
        db.session.rollback()
        flash(f"Error stopping meal: {e}", "danger")

    if session['user_role'] == 'user':
                    return redirect(url_for('app.user_dashboard'))
                else:
                    return redirect(url_for('app.admin_dashboard'))








