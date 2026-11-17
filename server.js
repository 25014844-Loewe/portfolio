const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Configure EJS templates and serve CSS/JavaScript from the public folder.
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/projects', (req, res) => {
  // The EJS page has placeholder projects ready until you add your own.
  res.render('projects', { projects: [] });
});

app.get('/about', (req, res) => {
  res.render('about', { page: 'about', activePage: 'about' });
});

app.get('/contact', (req, res) => {
  res.render('contact', { page: 'contact', sent: req.query.sent === '1', error: false });
});

app.post('/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  const validEmail = typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const valid = [name, subject, message].every(value => typeof value === 'string' && value.trim()) && validEmail;

  if (!valid) {
    return res.status(400).render('contact', { page: 'contact', sent: false, error: true });
  }

  // The site has no mail transport configured; confirm the form POST and direct visitors to email.
  return res.redirect(303, '/contact?sent=1');
});

app.listen(port, () => {
  console.log(`Portfolio running at http://localhost:${port}`);
});
