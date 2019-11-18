"use strict";

// APPLICATION DEPENDENCIES

require("dotenv").config();
const express = require("express");
const superagent = require("superagent");
const cors = require("cors");
const pg = require("pg");
const methodOverride = require("method-override");

// APPLICATION SETUP

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());

// DATABASE SETUP

const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on("error", err => console.error(err));

// APPLICATION MIDDLEWARE

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// METHOD OVERRIDE  (for post and delete)

app.use(
  methodOverride((request, response) => {
    if (
      request.body &&
      typeof request.body === "object" &&
      "_method" in request.body
    ) {
      var method = request.body._method;
      delete request.body._method;
      return method;
    }
  })
);

// VIEW ENGINE (for server-side templating)

app.set("view engine", "ejs");

// API ROUTES

app.get("/", getBooks); //define route to get all books
app.get("/searches/new", newSearch); //new.ejs
app.get("/books/:id", getOneBook); //show details of one book
app.put("/books/:id", saveBook); //update single book
app.post("/searches", createSearch);
app.post("/books", createBook); //redirect to details page

// DELETE ROUTE
app.delete("/books/:id", deleteBook);

// ERROR ROUTE
app.get("*", (request, response) =>
  response.status(404).send("This route does not exist")
);

//BOOK CONSTRUCTOR

function Book(info) {
  const placeholderImage = "https://i.imgur.com/J5LVHEL.jpg";
  let httpRegex = /^(http:\/\/)/g;

  this.title = info.title ? info.title : "No title available";
  this.author = info.authors ? info.authors[0] : "No author available";
  this.isbn = info.industryIdentifiers
    ? `ISBN_13 ${info.industryIdentifiers[0].identifier}`
    : "No ISBN available";
  this.image_url = info.imageLinks
    ? info.imageLinks.smallThumbnail.replace(httpRegex, "https://")
    : placeholderImage;
  this.description = info.description
    ? info.description
    : "No description available";
  this.id = info.industryIdentifiers
    ? `${info.industryIdentifiers[0].identifier}`
    : "";
}

// HELPER FUNCTIONS

function newSearch(request, response) {
  response.render("pages/searches/new");
}

function createSearch(request, response) {
  let url = "https://www.googleapis.com/books/v1/volumes?q=";

  if (request.body.search[1] === "title") {
    url += `+intitle:${request.body.search[0]}`;
  }
  if (request.body.search[1] === "author") {
    url += `+inauthor:${request.body.search[0]}`;
  }

  superagent
    .get(url)
    .then(apiResponse =>
      apiResponse.body.items.map(bookResult => new Book(bookResult.volumeInfo))
    )
    .then(results =>
      response.render("pages/searches/show", { searchResults: results })
    )
    .catch(err => handleError(err, response));
}

function getBooks(request, response) {
  let SQL = `SELECT * FROM books WHERE id=$1;`;
  let values = [request.params.id];
  return client
    .query(SQL, values)
    .then(result => {
      response.render("pages/index", { results: result.rows[0] });
    })
    .catch(err => handleError(err, response));
}

function createBook(request, response) {
  let lcBookshelf = request.body.bookshelf.toLowerCase();
  let { title, author, isbn, image_url, description } = request.body;
  let SQL =
    "INSERT INTO books (title, author, isbn, image_url, description, bookshelf) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;";
  let values = [title, author, isbn, image_url, description, lcBookshelf];
  client
    .query(SQL, values)
    .then(result => response.redirect(`/books/${result.rows[0].id}`))
    .catch(handleError);
}

function getOneBook(request, response) {
  getBookshelves()
    .then(shelves => {
      let SQL = "SELECT * FROM books WHERE id=$1;";
      let values = [request.params.id];
      client.query(SQL, values).then(result => {
        response.render("pages/books/show", {
          book: result.rows[0],
          bookshelves: shelves.rows
        });
      });
    })
    .catch(handleError);
}

function getBookshelves() {
  let SQL = "SELECT DISTINCT bookshelf FROM books ORDER BY bookshelf;";
  return client.query(SQL);
}

function saveBook(request, response) {
  let { title, author, isbn, image_url, description, bookshelf } = request.body;
  let SQL =
    "UPDATE books SET title=$1, author=$2, isbn=$3, image_url=$4, description=$5, bookshelf=$6 WHERE id=$7";
  let values = [
    title,
    author,
    isbn,
    image_url,
    description,
    bookshelf,
    request.params.id
  ];
  client
    .query(SQL, values)
    .then(response.redirect(`/books/${request.params.id}`))
    .catch(handleError);
}

// DELETE FUNCTION

function deleteBook(request, response) {
  let SQL = "DELETE FROM books WHERE id=$1;";
  let values = [request.params.id];

  client
    .query(SQL, values)
    .then(response.redirect("/"))
    .catch(handleError);
}

// ERROR FUNCTION

function handleError(error, response) {
  response.render("pages/error", { error: error });
}

//INNERVATE

app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));
