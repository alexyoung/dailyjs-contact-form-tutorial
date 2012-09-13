var express = require('express')
  , app = express()
  , SendGrid = require('sendgrid').SendGrid
  , Validator = require('validator').Validator
  ;

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'secret goes here' }));
  app.use(express.bodyParser());
  app.use(app.router);
  app.use(express.csrf());
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function() {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  app.locals.pretty = true;
  sendgrid = {
    send: function(opts, cb) {
      console.log('Email:', opts);
      cb(true, opts);
    }
  };
});

app.configure('production', function() {
  app.use(express.errorHandler());
  sendgrid = new SendGrid(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);
});

app.locals.errors = {};
app.locals.message = {};

function csrf(req, res, next) {
  res.locals.token = req.session._csrf;
  next();
}

function validate(message) {
  var v = new Validator()
    , errors = []
    ;

  v.error = function(msg) {
    errors.push(msg);
  };

  v.check(message.name, 'Please enter your name').len(1, 100);
  v.check(message.email, 'Please enter a valid email address').isEmail();
  v.check(message.message, 'Please enter a valid message').len(1, 1000);

  return errors;
}

function sendEmail(message, fn) {
  sendgrid.send({
    to: process.env.EMAIL_RECIPIENT
  , from: message.email
  , subject: 'Contact Message'
  , text: message.message
  }, fn);
}

app.get('/', csrf, function(req, res) {
  res.render('index');
});

app.post('/contact', csrf, function(req, res) {
  var message = req.body.message
    , errors = validate(message)
    , locals = {}
    ;

  function render() {
    res.render('index', locals);
  }

  if (errors.length === 0) {
    sendEmail(message, function(success) {
      if (!success) {
        locals.error = 'Error sending message';
        locals.message = message;
      } else {
        locals.notice = 'Your message has been sent.';
      }
      render();
    });
  } else {
    locals.error = 'Your message has errors:';
    locals.errors = errors;
    locals.message = message;
    render();
  }
});

app.get('/contacts', function(req, res) {
  res.redirect('/');
});

app.listen(process.env.PORT || 3000);
