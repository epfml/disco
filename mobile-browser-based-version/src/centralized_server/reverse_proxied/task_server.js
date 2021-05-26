var express = require("express");
var app = express();

app.get('/tasks', (req,res) => {
    res.send("Hello world! from TASK SERVER.");
});

/*
 * TODO
 * Read task info/params from config.json.
 * Model download will require more than a single json file.
 */

// read port from config.json
app.listen(3002);
