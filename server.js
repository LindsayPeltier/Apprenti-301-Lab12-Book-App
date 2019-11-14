'use strict';

// Application Dependencies
require('dotenv').config();
const express = require('express');
const superagent = require('superagent');
const cors = require('cors');
const pg = require('pg');
//const path = require('path');
//const methodOverride = require('method-override');

// Application Setup
const app = express();
const PORT = process.env.PORT || 3000;

// Application Middleware
app.use(express.urlencoded({extended:true}));
app.use(express.static('public'));
app.use(cors());

//Method Override
// app.use(methodOverride(function (request, response) {
//   if (req.body && typeof req.body === 'object' && '_method' in req.body) {
//     console.log(req.body._method);
//     var method = req.body._method;
//     delete req.body._method;
//     return method;
//   }
// }));

//DataBase Setup
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', err => console.error(err));

// Set the view engine for server-side templating
app.set('view engine', 'ejs');

// API Routes
app.get('/', getBooks) //define route to get all books
app.get('/searches/new', newSearch);
app.post('/searches', createSearch);
app.post('/books', createBook)
app.get('/books/:id', getOneBook);


app.get('*', (request, response) => response.status(404).send('This route does not exist'));

app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));

// HELPER FUNCTIONS
function Book(info) {
  const placeholderImage = 'https://i.imgur.com/J5LVHEL.jpg';
  let httpRegex = /^(http:\/\/)/g

  this.title = info.title ? info.title : 'No title available';
  this.author = info.authors ? info.authors[0] : 'No author available';
  this.isbn = info.industryIdentifiers ? `ISBN_13 ${info.industryIdentifiers[0].identifier}` : 'No ISBN available';
  this.image_url = info.imageLinks ? info.imageLinks.smallThumbnail.replace(httpRegex, 'https://') : placeholderImage;
  this.description = info.description ? info.description : 'No description available';
  this.id = info.industryIdentifiers ? `${info.industryIdentifiers[0].identifier}` : '';
}

function newSearch(request, response) {
  response.render('pages/index');
}

function createSearch(request, response) {
  let url = 'https://www.googleapis.com/books/v1/volumes?q=';

  if (request.body.search[1] === 'title') { url += `+intitle:${request.body.search[0]}`; }
  if (request.body.search[1] === 'author') { url += `+inauthor:${request.body.search[0]}`; }

  superagent.get(url)
    .then(apiResponse => apiResponse.body.items.map(bookResult => new Book(bookResult.volumeInfo)))
    .then(results => response.render('pages/searches/show', { searchResults: results }))
    .catch(err => handleError(err, response));
}

function getBooks(request, response){
  let SQL = `SELECT * FROM books WHERE id=$1;`; //console.log(request.params);
  let values = [request.params.id]; return client.query(SQL, values)
    .then(result => {
      response.render('pages/books/show', {results: result.rows[0]}); })
    .catch (err => errorPage(err, response)); }


function createBook(){
  //create a SQL statement to insert book
  //return id of book back to calling function

}

function getOneBook(){
  //use the id passed in from the front-end (ejs form) 

}

function handleError(error, response) {
  response.render('pages/error', { error: error });
}
