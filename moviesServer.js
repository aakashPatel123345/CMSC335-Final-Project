const http = require('http');
const path = require('path');
require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') })  
let portNumber = 5000;
const httpSuccessStatus = 200;
const express = require("express"); /* Accessing express module */
const app = express(); /* app is a request handler function */
const bodyParser = require("body-parser"); /* To handle post parameters */
process.stdin.setEncoding("utf8");
// We need to get the submit button from teh application.ejs file

// Mongo DB connection
const uri = process.env.MONGO_CONNECTION_STRING;
const databaseAndCollection = {db: "CMSC335_Final_DB", collection:"database"};
const { MongoClient, ServerApiVersion } = require('mongodb');
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const axios = require('axios');

// Checking if the user has provided the correct number of arguments
if (process.argv.length != 3) {
    console.log("Usage: node  moviesServer.js");
    process.exit();
}

else {
 portNumber = process.argv[2];
}

// Setting up the express app
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

app.get("/", (request, response) => {
    response.render("index");
});

app.get("/removeAllMovies", (request, response) => {
    response.render("removeAllMovies");
});

app.post("/removeAllMovies", (request, response) => {
    const promise = clearDatabase();
    promise.then((variables) => {
        const vars = {
            numberRemoved: variables.numberRemoved
        }
        // We will now return to the main page
        response.render("index", vars);
    }).catch((error) => {
        console.log(error);
    });
});

app.get("/viewAllMovies", (request, response) => {
    const promise = getAllMovies();
    promise.then((variables) => {
        const vars = {
            movies: variables.movies
        }
        response.render("viewAllMovies", vars);
    }).catch((error) => {
        console.log(error);
    });
}
);

app.get("/insertMovie", (request, response) => {
    const vars = {
        movieName: request.query.movieName,
        priority: request.query.priority,
        notes: request.query.notes
    }
    response.render("insertMovie", vars);
});

app.post("/insertMovie", bodyParser.urlencoded({ extended: false }), (request, response) => {
    const variables = {
        movieName: request.body.movieName,
        priority: request.body.priority,
        notes: request.body.notes
    };
    insertMovie(variables);
    response.render("insertionConfirmation", variables);
});

app.get("/researchMovie", (request, response) => {
    const variables = {
        movieName: request.query.movieName
    };
    response.render("researchMovie", variables);
});

app.post("/researchMovie",  bodyParser.urlencoded({ extended: false }), (request, response) => {
    const variables = {
        movieName: request.body.movieName
    };
    // We will now get the information of the movie from an API
    const promise = getMovieInformation(variables);
    promise.then((variables) => {
        const vars = {
            movieName: variables.movieName,
            year: variables.year,
            starring: variables.starring,
            poster: variables.poster
        }
        response.render("viewResearchedMovie", vars);
    }).catch((error) => {
        console.log(error);
    }
    );
});



async function getMovieInformation(variables) {
    try {
        const options = {
            method: 'GET',
            url: 'https://imdb8.p.rapidapi.com/auto-complete',
            params: {q: variables.movieName},
            headers: {
                'X-RapidAPI-Key': '599870d854mshe1c6c1b5565b260p1c338cjsn232a36710f18',
                'X-RapidAPI-Host': 'imdb8.p.rapidapi.com'
            }
          };
          
          const response = await axios.request(options);
          let movieInformation = {
              movieName: response.data.d[0].l,
              year: response.data.d[0].y,
              starring: response.data.d[0].s,
              poster: response.data.d[0].i.imageUrl
          };
          const promise = new Promise((resolve, reject) => {
              if (movieInformation) {
                  resolve(movieInformation);
              } else {
                  reject("There are no movies on IMDB with that name");
              }
          });
          return promise;
    } catch (e) {
        console.error(e);
    }
}

async function insertMovie(variables) {
    try {
        await client.connect();
        let movieInformation = {
            movieName: variables.movieName,
            priority: variables.priority,
            notes: variables.notes
        };
        console.log(movieInformation);
        const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(movieInformation);
        const promise = new Promise((resolve, reject) => {
            if (result) {
                resolve(result);
            } else {
                reject("There was an error inserting the movie into the database");
            }
        }
        );
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function clearDatabase() {
    try {
        await client.connect();
        const result = await client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .deleteMany({});
        let variables = {
            numberRemoved: result.deletedCount
        }
        const promise = new Promise((resolve, reject) => {
            if (variables) {
                resolve(variables);
            } else {
                reject("There are no movies in the database");
            }
        });
        return promise;
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function getAllMovies() {
    try {
        await client.connect();
        const result = await client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .find({})
        .toArray();
        let variables = {
            movies: result
        }
        const promise = new Promise((resolve, reject) => {
            if (variables) {
                resolve(variables);
            } else {
                reject("There are no movies in the database");
            }
        });
        return promise;
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

app.listen(portNumber);
console.log(`Web server is running at http://localhost:${portNumber}`);