const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const viewsDir = path.join(__dirname, "views");
app.use(express.static(viewsDir));
app.use(express.static(path.join(__dirname, "./public")));
app.use(express.static(path.join(__dirname, "../images")));
app.use(express.static(path.join(__dirname, "../media")));

app.get("/", (req, res) => res.redirect("/index"));

app.listen(3000, () => console.log("Listening on port 3000!"));
