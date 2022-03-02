let express = require("express");
let sqlite3 = require("sqlite3");
let { open } = require("sqlite");
let path = require("path");
let bcrypt = require("bcrypt");
let app = express();
let jwt = require("jsonwebtoken");

let dbpath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;
app.use(express.json());
let database = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3002, () => {
      console.log("iam");
    });
  } catch (e) {
    console.log(`${e.message}`);
    process.exit(1);
  }
};
database();

app.post("/login/", async (request, response) => {
  let body = request.body;
  let { username, password } = body;
  let query1 = `SELECT * FROM user  WHERE username='${username}';`;
  let details = await db.get(query1);
  //console.log(details.length === 0);
  if (details === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    let is_password = await bcrypt.compare(password, details.password);
    if (is_password === true) {
      let playload = { username: username };
      const jwtToken = jwt.sign(playload, "My_Secret_Token");
      request.username = playload.username;
      response.send({ jwtToken });
      console.log(jwtToken);
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});
function convert(obj) {
  return {
    stateId: obj.state_id,
    stateName: obj.state_name,
    population: obj.population,
  };
}
function convert_(obj) {
  return {
    districtId: obj.district_id,
    districtName: obj.district_name,
    stateId: obj.state_id,
    cases: obj.cases,
    cured: obj.cured,
    active: obj.active,
    deaths: obj.deaths,
  };
}

let autenticate_token = (request, response, next) => {
  const token_header = request.headers["authorization"];
  //console.log(token_header);
  if (token_header === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    let token = token_header.split(" ")[1];
    //console.log(token);
    if (token !== undefined) {
      jwt.verify(token, "My_Secret_Token", async (error, playload) => {
        if (error) {
          console.log("d");
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
          request.username = playload.username;
          next();
        }
      });
    } else {
      response.status(401);
      response.send("Invalid JWT Token");
    }
  }
};

app.get("/states/", autenticate_token, async (request, response) => {
  let query = `SELECT * FROM state;`;
  let ans = await db.all(query);
  response.send(ans.map((each) => convert(each)));
});

app.get("/states/:stateId/", autenticate_token, async (request, response) => {
  let param = request.params;
  let query = `SELECT * FROM state WHERE state_id='${param.stateId}';`;
  let ans = await db.get(query);
  response.send(convert(ans));
});
//district Post

app.post("/districts/", autenticate_token, async (request, response) => {
  let body = request.body;
  console.log(body);
  let query = `INSERT INTO district 
    (district_name,state_id,cases,cured,active,deaths)
    VALUES
    ('${body.districtName}','${body.stateId}','${body.cases}',
    '${body.cured}','${body.active}','${body.deaths}');`;
  let ans = await db.run(query);
  response.send("District Successfully Added");
});

app.get(
  "/districts/:districtId/",
  autenticate_token,
  async (request, response) => {
    let param = request.params;
    console.log(param);
    let query = `SELECT * FROM district WHERE district_id='${param.districtId}';`;
    let ans = await db.get(query);
    console.log(ans);
    response.send(convert_(ans));
  }
);

app.delete(
  "/districts/:districtId/",
  autenticate_token,
  async (request, response) => {
    let param = request.params;
    let query = `DELETE FROM district WHERE district_id='${param.districtId}';`;

    await db.run(query);
    response.send("District Removed");
  }
);

//put

app.put(
  "/districts/:districtId/",
  autenticate_token,
  async (request, response) => {
    let { districtName, stateId, cases, cured, active, deaths } = request.body;
    let para = request.params;
    let query = `UPDATE district 
    SET district_name='${districtName}',
        state_id='${stateId}',
        cases='${cases}',
        cured='${cured}',
        active='${active}',
        deaths='${deaths}'
    WHERE district_id='${para.districtId}';`;
    let k = await db.run(query);

    response.send("District Details Updated");
  }
);

//stats

app.get(
  "/states/:stateId/stats/",
  autenticate_token,
  async (request, response) => {
    let param = request.params;
    let query = `SELECT SUM(cases) AS totalCases,SUM(cured) AS totalCured,SUM(active) AS totalActive, SUM(deaths) AS totalDeaths
   FROM district 
   WHERE state_id='${param.stateId}'
  GROUP BY state_id;`;
    let ans = await db.get(query);
    console.log(ans);
    response.send(ans);
  }
);

module.exports = app;
