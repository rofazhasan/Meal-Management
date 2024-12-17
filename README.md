
# **Meal Management System**

This is a **Flask-based web application** for managing meals, users, and transactions efficiently. It includes powerful features like meal preference submission, balance management, meal price updates, and detailed analysis reports.

---

## **Features**

- **User Authentication**  
   - Secure login and registration with **role-based access control** (User/Admin).  

- **Meal Submission**  
   - Users can submit their **meal preferences** (Lunch/Dinner) for upcoming days.

- **Meal Management**  
   - Admins can **update meal prices** for lunch and dinner.  
   - Admins can **stop meals** for a day and refund users.  
   - Users can stop their own meals for upcoming days and get refunds.  

- **Balance Management**  
   - Admins can **add money** to user balances.  
   - Balances are **automatically deducted** based on meal prices.  

- **Analysis and Reporting**  
   - Users can view **meal and transaction history** with a running balance.  
   - Admins can filter and view user analysis by **date range**.  
   - Generate and download **PDF reports** for detailed insights.

- **Automated Meal Copying**  
   - If a user doesn’t submit a meal preference, the **previous day’s preference** is copied automatically.

---

## **Technologies Used**

- **Flask**: Web framework for building the backend.  
- **SQLAlchemy**: ORM for database interaction.  
- **Flask-WTF**: Simplifies web form creation.  
- **Flask-Bcrypt**: Ensures secure password hashing.  
- **Pytz**: Timezone management.  
- **ReportLab**: PDF generation for reports.  
- **Gunicorn/uWSGI**: WSGI servers for production deployment.

---

## **Project Structure**

```plaintext
meal-management-system/
├── app/
│   ├── __init__.py       # App factory and initialization
│   ├── models.py         # Database models
│   ├── forms.py          # Web forms
│   ├── routes.py         # Route definitions
│   ├── utils.py          # Helper functions (PDF generation, etc.)
│   ├── templates/        # HTML templates
│   └── static/           # Static files (CSS, JavaScript)
├── wsgi.py              # WSGI entry point for deployment
├── config.py            # Configuration settings
├── requirements.txt     # Project dependencies
└── README.md            # This file
```

---

## **Installation**

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/meal-management-system.git
   cd meal-management-system
   ```

2. **Create and activate a virtual environment:**

   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

4. **Configure the application:**
   - Create a `config.py` file with the following keys:  
     - `SECRET_KEY`: For session security.  
     - `SQLALCHEMY_DATABASE_URI`: Your database connection string.  

5. **Setup the database:**

   - Use Flask Shell or Migrations to initialize and create tables.

6. **Run the application:**

   ```bash
   python app.py
   ```

7. **Access the app:**

   Open [http://localhost:5000](http://localhost:5000) in your browser.

---

## **Deployment**

1. Use a **WSGI server** like **Gunicorn** or **uWSGI** for production:

   ```bash
   gunicorn -w 4 wsgi:app
   ```

2. Configure **Nginx** or any web server to:  
   - Serve static files.  
   - Proxy requests to the WSGI server.  

---

## **Contributing**

Contributions are welcome! Feel free to:

- Open an issue for bugs or feature requests.  
- Submit pull requests for improvements.  

For major changes, please discuss them with me first via an issue.

---

## **License**

This project is licensed under the [MIT License](LICENSE).

---

## **Credits**

- **Developed by:** [Md. Rofaz Hasan Rafiu](https://github.com/rofazhasan)  
- **AI Contribution:** Documentation generated with the help of **ChatGPT** to ensure clarity and structure.

---

## **Contact**

For any queries or suggestions, feel free to connect:

- **Email:** mdrofazhasanrafiu@gmail.com  
- **GitHub:** [rofazhasan](https://github.com/rofazhasan)  
- **LinkedIn:** [Md. Rofaz Hasan Rafiu](https://www.linkedin.com/in/md-rofaz-hasan-rafiu)

---
