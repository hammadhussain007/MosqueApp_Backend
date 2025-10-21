const path = require('path');
const env = require('dotenv');
const csrf = require('csurf');
const express = require('express');
const flash = require('express-flash');
const bodyParser = require('body-parser');
const session = require('express-session');
const expressHbs = require('express-handlebars');
const SequelizeStore = require('connect-session-sequelize')(session.Store);

const app = express();
const csrfProtection = csrf();

const webRoutes = require('./routes/web');
const sequelize = require('./config/database');
const errorController = require('./app/controllers/ErrorController');

env.config();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
	resave: true,
	saveUninitialized: true,
	secret: process.env.SESSION_SECRET,
	cookie: { path: '/', httpOnly: true, maxAge: 1209600000 },
	store: new SequelizeStore({ db: sequelize, table: 'sessions' }),
}));

// Enable CSRF protection by default. To disable (development/testing only), set
// DISABLE_CSRF=true in your environment or .env file.
if (!process.env.DISABLE_CSRF || process.env.DISABLE_CSRF === 'false') {
	app.use(csrfProtection);
}

app.use(flash());

// Basic CORS middleware
app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-csrf-token');
	if (req.method === 'OPTIONS') return res.sendStatus(204);
	next();
});

// CSRF token endpoint
app.get('/csrf-token', (req, res) => {
	if (!process.env.DISABLE_CSRF || process.env.DISABLE_CSRF === 'false') {
		try { return res.json({ csrfToken: req.csrfToken() }); } catch (e) { return res.json({ csrfToken: null }); }
	}
	return res.json({ csrfToken: null });
});

app.use((req, res, next) => {
	res.locals.isAuthenticated = req.session.isLoggedIn;
	if (!process.env.DISABLE_CSRF || process.env.DISABLE_CSRF === 'false') {
		try { res.locals.csrfToken = req.csrfToken(); } catch (e) { res.locals.csrfToken = null; }
	} else {
		res.locals.csrfToken = null;
	}
	next();
});

app.engine('hbs', expressHbs.engine({
	layoutsDir: 'views/layouts/',
	defaultLayout: 'web_layout',
	partialsDir: ['views/partials/'],
	extname: 'hbs'
}));
app.set('view engine', 'hbs');
app.set('views', 'views');

app.use(webRoutes);
app.use(errorController.pageNotFound);

sequelize.sync()
	//.sync({ force: true })
	.then(() => {
		app.listen(process.env.PORT);
		console.log('App listening on port ' + process.env.PORT);
	})
	.catch(err => console.log(err));

