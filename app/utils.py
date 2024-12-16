from datetime import datetime,time,timedelta
import pytz
from reportlab.lib.styles import ParagraphStyle
from app.models import Transaction,Balance
from app.database import db
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors

# Define some styles for the PDF
styles = {
    'h1': ParagraphStyle(name='Heading1', fontSize=14, leading=16, fontName="Helvetica-Bold"),
    'h2': ParagraphStyle(name='Heading2', fontSize=12, leading=14, fontName="Helvetica-Bold"),
    'normal': ParagraphStyle(name='Normal', fontSize=10, leading=12),
}

def generate_pdf(transactions, user, meals):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []

    # User Information
    elements.append(Paragraph(f"Analysis Report for User: {user.name}", styles['h1']))
    elements.append(Paragraph(f"User ID: {user.user_id}", styles['normal']))

    # Meal Information
    elements.append(Spacer(1, 0.2*inch))
    elements.append(Paragraph("Meal Details", styles['h2']))
    meal_data = [["Date", "Lunch", "Dinner"]]
    for meal in meals:
        meal_data.append([meal.meal_date.strftime('%Y-%m-%d'), "Yes" if meal.lunch else "No", "Yes" if meal.dinner else "No"])
    meal_table = Table(meal_data)
    meal_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(meal_table)

    # Transaction Information
    elements.append(Spacer(1, 0.2*inch))
    elements.append(Paragraph("Transaction Details", styles['h2']))
    transaction_data = [["Date", "Details", "Amount", "After Transaction", "Type"]]
    for transaction in transactions:
        transaction_data.append([
            transaction.transaction_date.strftime('%Y-%m-%d'),
            transaction.remarks,  # Assuming 'remarks' is the details field
            transaction.amount,
            transaction.balance_after_transaction,
            transaction.transaction_type
        ])
    transaction_table = Table(transaction_data)
    transaction_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(transaction_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer.read()


def all_users_generate_pdf(transactions, users, meals):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []

    # Title
    elements.append(Paragraph("Analysis Report for All Users", styles['h1']))

    for user in users:
        elements.append(Spacer(1, 0.2*inch))
        elements.append(Paragraph(f"User: {user.name} (ID: {user.user_id})", styles['h2']))

        # Filter transactions and meals for the current user
        user_transactions = [t for t in transactions if t.user_id == user.user_id]
        user_meals = [m for m in meals if m.user_id == user.user_id]

        # Meal Information
        if user_meals:
            elements.append(Paragraph("Meal Details", styles['h2']))
            meal_data = [["Date", "Lunch", "Dinner"]]
            for meal in user_meals:
                meal_data.append([meal.meal_date.strftime('%Y-%m-%d'), "Yes" if meal.lunch else "No", "Yes" if meal.dinner else "No"])
            meal_table = Table(meal_data)
            meal_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            elements.append(meal_table)

        # Transaction Information
        if user_transactions:
            elements.append(Spacer(1, 0.2*inch))
            elements.append(Paragraph("Transaction Details", styles['h2']))
            transaction_data = [["Date", "Details", "Amount", "After Transaction", "Type"]]
            for transaction in user_transactions:
                transaction_data.append([
                    transaction.transaction_date.strftime('%Y-%m-%d'),
                    transaction.remarks,
                    transaction.amount,
                    transaction.balance_after_transaction,
                    transaction.transaction_type
                ])
            transaction_table = Table(transaction_data)
            transaction_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            elements.append(transaction_table)

        # Add more elements or calculations as needed for each user

    doc.build(elements)
    buffer.seek(0)
    return buffer.read()
dhaka_timezone = pytz.timezone('Asia/Dhaka')
dhaka_time = datetime.now(dhaka_timezone)
def current_time():
    now_time=dhaka_time
    return now_time
def current_date():
    now_date = dhaka_time.date()
    return now_date
def  deadline():
    end_time = dhaka_timezone.localize(datetime.combine(dhaka_time.date(), time(23, 0)))
    return end_time
def transactions(user_id, transaction_type, amount, remarks=None):
    """
    Creates a new transaction record and updates the user's balance.

    Args:
        user_id (int): The ID of the user.
        transaction_type (str): The type of transaction ('add_fund', 'deduction', or 'refund').
        amount (decimal): The amount of the transaction.
        remarks (str, optional): Any remarks for the transaction. Defaults to None.
    """
    try:
        user_balance = Balance.query.filter_by(user_id=user_id).first()

        if not user_balance:
            # Handle case where user balance doesn't exist (e.g., create a new balance)
            user_balance = Balance(user_id=user_id, current_balance=0)
            db.session.add(user_balance)

        # Create the transaction record
        transaction = Transaction(
            user_id=user_id,
            transaction_type=transaction_type,
            amount=amount,
            balance_after_transaction=user_balance.current_balance,
            transaction_date=datetime.utcnow(),
            remarks=remarks
        )
        db.session.add(transaction)
        db.session.commit()

    except Exception as e:
        db.session.rollback()
        raise e