from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    flash,
    session,
    jsonify,
)
from flask_login import (
    login_required,
    current_user,
    login_user,
    logout_user,
    LoginManager,
)
from restaurant_db import Session, Users, Menu, Orders, Reservation
import secrets, uuid, os
from flask_session import Session as FlaskSession
from datetime import datetime
from sqlalchemy import select
from geopy.distance import geodesic
from dataclasses import dataclass
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider
from pydantic_ai.messages import ModelMessagesTypeAdapter, ModelRequest
from pydantic_core import to_jsonable_python

app = Flask(__name__)
app.config["SECRET_KEY"] = '#cx)4v8x$*t4gl;6d!@z1?:?№4"8)#'
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_USE_SIGNER"] = True

FlaskSession(app)

app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024
app.config["MAX_FORM_MEMORY_SIZE"] = 1024 * 1024
app.config["MAX_FORM_PARTS"] = 500

MARGANETS_COORDS = (46.432256, 30.752768)
KYIV_RADIUS_KM = 50
TABLE_NUM = {"1-2": 5, "3-4": 3, "4+": 2}

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"

provider = GoogleProvider(api_key=os.environ.get("GEMINI_API_KEY"))
model = GoogleModel("gemini-3.1-flash-lite-preview", provider=provider)
# model = GoogleModel("gemini-3-flash-preview", provider=provider)
agent = Agent(model)


@dataclass
class Deps:
    db_session: Session
    # current_user_id: int  # Додаємо ID користувача


assistant_agent = Agent(
    model,
    deps_type=Deps,
    system_prompt=(
        "Ти — віртуальний шеф-кухар ресторану 'Maison'. "
        "Допомагай гостям обирати страви. Твої відповіді мають бути короткими та апетитними. "
        "Ти маєш доступ до актуального меню через інструмент `get_menu`."
    ),
)


@assistant_agent.tool
def get_menu(ctx: RunContext[Deps]) -> str:
    with ctx.deps.db_session() as session:
        items = (
            session.execute(select(Menu).filter(Menu.active == True)).scalars().all()
        )
        return "\n".join([f"{i.name}: {i.description} - {i.price} грн" for i in items])


@login_manager.user_loader
def load_user(user_id):
    with Session() as session:
        return session.query(Users).filter_by(id=user_id).first()


@app.after_request
def apply_csp(response):
    csp = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "  # разрешаем JS из static + inline
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src https://fonts.gstatic.com; "
        "img-src 'self' data:; "
        "frame-ancestors 'none';"
    )
    response.headers["Content-Security-Policy"] = csp
    return response

@app.context_processor
def inject_globals():
    return dict(
        is_admin=current_user.is_authenticated and current_user.nickname == "Admin",
        csrf_token=session.get("csrf_token", "")
    )

@app.context_processor
def inject_basket_count():
    from flask import session as flask_session
    basket = flask_session.get("basket", {})
    count = sum(int(v) for v in basket.values()) if basket else 0
    return dict(basket_count=count)

@app.route("/")
@app.route("/home")
def home():
    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_hex(16)

    return render_template("home.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        if request.form.get("csrf_token") != session["csrf_token"]:
            return "Запит заблоковано!", 403

        nickname = request.form["nickname"]
        email = request.form["email"]
        phone = request.form["phone"]
        password = request.form["password"]

        with Session() as cursor:
            if (
                cursor.query(Users)
                .filter((Users.email == email) | (Users.nickname == nickname))
                .first()
            ):
                flash("Користувач з таким email або нікнеймом вже існує!", "danger")
                return render_template(
                    "register.html",
                )

            new_user = Users(nickname=nickname, email=email, phone=phone)
            new_user.set_password(password)
            cursor.add(new_user)
            cursor.commit()
            cursor.refresh(new_user)
            login_user(new_user)
            return redirect(url_for("home"))

    if current_user.is_authenticated:
        return redirect(url_for("home"))
    return render_template(
        "register.html",
    )


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        if request.form.get("csrf_token") != session["csrf_token"]:
            return "Запит заблоковано!", 403

        nickname = request.form["nickname"]
        password = request.form["password"]

        with Session() as cursor:
            user = cursor.query(Users).filter_by(nickname=nickname).first()
            if user and user.check_password(password):
                login_user(user)
                return redirect(url_for("home"))

            flash("Неправильний nickname або пароль!", "danger")

    if current_user.is_authenticated:
        return redirect(url_for("home"))
    return render_template(
        "login.html",
    )


@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("home"))


@app.route("/add_position", methods=["GET", "POST"])
@login_required
def add_position():
    if current_user.nickname != "Admin":
        return redirect(url_for("home"))

    if request.method == "POST":
        if request.form.get("csrf_token") != session["csrf_token"]:
            return "Запит заблоковано!", 403

        name = request.form["name"]
        file = request.files.get("img")
        ingredients = request.form["ingredients"]
        description = request.form["description"]
        price = request.form["price"]
        weight = request.form["weight"]

        if not file or not file.filename:
            return "Файл не вибрано або завантаження не вдалося"

        unique_filename = f"{uuid.uuid4()}_{file.filename}"
        output_path = os.path.join("static/menu", unique_filename)

        with open(output_path, "wb") as f:
            f.write(file.read())

        with Session() as cursor:
            new_position = Menu(
                name=name,
                ingredients=ingredients,
                description=description,
                price=price,
                weight=weight,
                file_name=unique_filename,
            )
            cursor.add(new_position)
            cursor.commit()

        flash("Позицію додано успішно!")
        
    return render_template(
        "add_position.html",
    )


@app.route("/menu")
def menu():
    with Session() as session:
        all_positions = session.query(Menu).filter_by(active=True).all()
    return render_template(
        "menu.html",
        all_positions=all_positions,
    )


@app.route("/position/<name>", methods=["GET", "POST"])
def position(name):
    with Session() as cursor:
        us_position = cursor.query(Menu).filter_by(active=True, name=name).first()

    if request.method == "POST":
        if request.form.get("csrf_token") != session["csrf_token"]:
            return "Запит заблоковано!", 403

        position_name = request.form.get("name")
        position_num = int(request.form.get("num"))

        if not (1 <= position_num <= 10):
            flash("Кількість має бути від 1 до 10!", "danger")
            return render_template("position.html", position=us_position)

        if "basket" not in session:
            session["basket"] = {}
        basket = session.get("basket")
        basket[position_name] = position_num
        session["basket"] = basket
        flash("Позицію додано у кошик!")

    return render_template("position.html", position=us_position)

@app.route("/basket", methods=["GET", "POST"])
def basket():
    if request.method == "POST":
        if request.form.get("csrf_token") != session["csrf_token"]:
            return "Запит заблоковано!", 403
        position_name = request.form.get("name")
        if "basket" in session:
            basket = session.get("basket")
            basket.pop(position_name)
            session["basket"] = basket
        flash("Позицію видалено з кошика!")
    products = session.get("basket", {}).items()
    basket_to_show = []
    total_price = 0
    with Session() as cursor:
        for product in products:
            full_product = (
                cursor.query(Menu).filter_by(active=True, name=product[0]).first()
            )
            basket_to_show.append(
                {
                    "name": product[0],
                    "qty": product[1],
                    "price": full_product.price,
                    "weight": full_product.weight,
                    "photo": full_product.file_name,
                }
            )
            total_price += product[1] * full_product.price

    return render_template(
        "basket.html",
        basket=basket_to_show,
        total_price=total_price,
    )


@app.route('/update_cart/<name>/<action>')
def update_cart(name, action):
    basket = session.get("basket", {})
    if name in basket:
        if action == "inc":
            basket[name] = int(basket[name]) + 1
            if basket[name] > 10:
                basket[name] = 10
        elif action == "dec":
            basket[name] = int(basket[name]) - 1
            if basket[name] < 1:
                basket.pop(name)
    session["basket"] = basket
    return redirect(url_for("basket"))


@app.route("/create_order", methods=["GET", "POST"])
def create_order():
    basket = session.get("basket")
    if request.method == "POST":

        if request.form.get("csrf_token") != session["csrf_token"]:
            return "Запит заблоковано!", 403

        if not current_user:
            flash("Для оформлення замовлення необхідно бути зареєстрованим")
        else:
            if not basket:
                flash("Ваш кошик порожній")
            else:
                with Session() as cursor:
                    new_order = Orders(
                        order_list=basket,
                        order_time=datetime.now(),
                        order_status="створено",
                        user_id=current_user.id,
                    )
                    cursor.add(new_order)
                    cursor.commit()
                    session.pop("basket")
                    cursor.refresh(new_order)
                    return redirect(f"/my_order/{new_order.id}")

    return render_template(
        "create_order.html",
        basket=basket,
    )


@app.route("/my_orders")
@login_required
def my_orders():
    with Session() as cursor:
        us_orders = cursor.query(Orders).filter_by(user_id=current_user.id).all()
    return render_template("my_orders.html", us_orders=us_orders)


@app.route("/my_order/<int:id>")
@login_required
def my_order(id):
    positions = []
    with Session() as cursor:
        us_order = cursor.query(Orders).filter_by(id=id).first()
        total_price = sum(
            int(cursor.query(Menu).filter_by(name=i).first().price) * int(cnt)
            for i, cnt in us_order.order_list.items()
        )
        for order in us_order.order_list.items():
            full_product = (
                cursor.query(Menu).filter_by(active=True, name=order[0]).first()
            )
            positions.append(
                {
                    "name": order[0],
                    "qty": order[1],
                    "price": full_product.price,
                    "weight": full_product.weight,
                    "photo": full_product.file_name,
                }
            )
    return render_template(
        "my_order.html",
        order=us_order,
        total_price=total_price,
        positions=positions,
    )


@app.route("/manage_orders", methods=["GET", "POST"])
@login_required
def manage_orders():
    if current_user.nickname != "Admin":
        return redirect(url_for("home"))

    if request.method == "POST":
        if request.form.get("csrf_token") != session["csrf_token"]:
            return "Запит заблоковано!", 403

        action = request.form["action"]
        order_id = request.form["order_id"]
        with Session() as cursor:
            if action == "change_status":
                new_status = request.form["new_status"]
                us_order = cursor.query(Orders).filter_by(id=order_id).first()
                us_order.order_status = new_status
            elif action == "cancel":
                us_order = cursor.query(Orders).filter_by(id=order_id).first()
                cursor.delete(us_order)
            cursor.commit()

    with Session() as cursor:
        all_orders = cursor.query(Orders).all()
        for order in all_orders:
            total_price = sum(
                int(cursor.query(Menu).filter_by(name=i).first().price) * int(cnt)
                for i, cnt in order.order_list.items()
            )
            order.total_price = total_price
        return render_template(
            "manage_orders.html",
            all_orders=all_orders,
        )


@app.route("/cancel_order/<int:id>", methods=["POST"])
@login_required
def cancel_order(id):
    with Session() as cursor:
        us_order = cursor.query(Orders).filter_by(id=id).first()
        cursor.delete(us_order)
        cursor.commit()
    return redirect(url_for("my_orders"))


@app.route("/reserved", methods=["GET", "POST"])
@login_required
def reserved():
    if request.method == "POST":
        if request.form.get("csrf_token") != session["csrf_token"]:
            return "Запит заблоковано!", 403

        table_type = request.form["table_type"]
        reserved_time_start = request.form["time"]
        user_latitude = request.form["latitude"]
        user_longitude = request.form["longitude"]

        if not user_longitude or not user_latitude:
            return "Ви не надали інформацію про своє місцезнаходження"

        user_cords = (float(user_latitude), float(user_longitude))
        distance = geodesic(MARGANETS_COORDS, user_cords).km
        if distance > KYIV_RADIUS_KM:
            return "Ви знаходитеся в зоні, недоступній для бронювання"

        with Session() as cursor:
            reserved_check = (
                cursor.query(Reservation).filter_by(type_table=table_type).count()
            )
            user_reserved_check = (
                cursor.query(Reservation).filter_by(user_id=current_user.id).first()
            )
            print(table_type)
            message = f"Бронь на {reserved_time_start} столика на {table_type} людини успішно створено!"
            if reserved_check < TABLE_NUM.get(table_type) and not user_reserved_check:
                new_reserved = Reservation(
                    type_table=table_type,
                    time_start=reserved_time_start,
                    user_id=current_user.id,
                )
                cursor.add(new_reserved)
                cursor.commit()
            elif user_reserved_check:
                message = "Можна мати лише одну активну бронь"
            else:
                message = "На жаль, бронь такого типу стола наразі неможлива"
            return render_template(
                "reserved.html",
                message=message,
            )
    return render_template(
        "reserved.html",
    )


@app.route("/reservations_check", methods=["GET", "POST"])
@login_required
def reservations_check():
    if current_user.nickname != "Admin":
        return redirect(url_for("home"))

    if request.method == "POST":
        if request.form.get("csrf_token") != session["csrf_token"]:
            return "Запит заблоковано!", 403

        reserv_id = request.form["reserv_id"]
        with Session() as cursor:
            reservation = cursor.query(Reservation).filter_by(id=reserv_id).first()
            cursor.delete(reservation)
            cursor.commit()

    with Session() as cursor:
        all_reservations = cursor.query(Reservation).all()
        return render_template(
            "reservations_check.html",
            all_reservations=all_reservations,
        )


@app.route("/menu_check", methods=["GET", "POST"])
@login_required
def menu_check():
    if current_user.nickname != "Admin":
        return redirect(url_for("home"))

    if request.method == "POST":
        if request.form.get("csrf_token") != session["csrf_token"]:
            return "Запит заблоковано!", 403

        position_id = request.form["pos_id"]
        with Session() as cursor:
            position_obj = cursor.query(Menu).filter_by(id=position_id).first()
            if "change_status" in request.form:
                position_obj.active = not position_obj.active
            elif "delete_position" in request.form:
                cursor.delete(position_obj)
            cursor.commit()

    with Session() as cursor:
        all_positions = cursor.query(Menu).all()
    return render_template(
        "check_menu.html",
        all_positions=all_positions,
    )


@app.route("/chat", methods=["POST"])
def chat():
    app.logger.debug(f"{request.json}")
    user_input = request.json.get("message")
    if not user_input:
        return jsonify({"answer": "Вибачте, я вас не почув."}), 400
    deps = Deps(db_session=Session)

    history = []
    history_raw = session.get("chat_history", [])
    if history_raw:
        try:
            history = ModelMessagesTypeAdapter.validate_python(history_raw)
        except Exception as e:
            print(f"Помилка відновлення історії: {e}")
            history = []

    app.logger.debug(f"{history_raw=}")
    try:
        result = assistant_agent.run_sync(
            user_input, deps=deps, message_history=history
        )
    except Exception as e:
        print(f"Помилка виконання агента: {e}")
        return (
            jsonify({"answer": "Вибачте, сталася помилка обробки вашого запиту."}),
            500,
        )

    new_history = result.all_messages()

    trimmed = new_history[-10:]

    while trimmed:
        first = trimmed[0]
        parts = getattr(first, "parts", [])
        if any(getattr(p, "part_kind", None) == "tool-return" for p in parts):
            trimmed = trimmed[1:]
        else:
            break

    session["chat_history"] = to_jsonable_python(trimmed)

    return {"answer": result.output}


if __name__ == "__main__":
    app.run(debug=True)
