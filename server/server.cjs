const express = require('express');
const jwt = require('jsonwebtoken');
const neo4j = require('neo4j-driver');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const ws = require('ws');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const jwtUnpack = (req, res, next) => {
  jwt.verify(req.cookies.token, process.env.TOKEN_SECRET, (err, decoded) => {
    if(!err) {
      req.token = decoded;
    }

    next();
  });
};

const app = express();
app.use(
  express.json(),
  cookieParser(),
  jwtUnpack,
);

const port = 3000;
const server = app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});

const wsServer = new ws.Server({ server, path: '/ws' });

let driver = null;

let wsHandlers = {};

const connect = async () => {
  try {
    driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(
        process.env.NEO4J_USERNAME,
        process.env.NEO4J_PASSWORD
      )
    );
  
    await driver.getServerInfo();
  } catch(error) {
    console.log(error);
    driver = null;
  } finally {
    console.log(`DB connected: ${driver !== null}`);
  }
};

connect();

const userAuth = (username, password) => async (session) => {
  return await session.executeRead(async (tx) => {
    const result = await tx.run(
      'MATCH (u:user { username: $username }) RETURN u;',
      { username }
    );

    const records = result.records;
    if(records.length > 0) {
      const user = records[0].get("u").properties;
      const passwordsMatch = user.password === crypto.pbkdf2Sync(password, process.env.SPICE, 1000, 64, 'sha512').toString('hex');
      return passwordsMatch ? 0 : 1;
    } else {
      return 2; // User not found
    }
  });
};

const execQuery = async (query, results) => {
  let result = -1;
  let session;

  if(driver !== null) {
    try {
      session = driver.session();
      result = await query(session);
    } catch(error) {
      console.log(error);
    } finally {
      session?.close();
    }
  }
  
  return results(result);
};

app.post('/api/login', async function(req, res) {
  if(
    req.body.username !== undefined &&
    req.body.password !== undefined
  ) {
    const username = req.body.username.trim();
    const result = await execQuery(userAuth(username, req.body.password), (n) => {
      switch(n) {
        case 0:
          return { status: 200, cookie: jwt.sign({ username }, process.env.TOKEN_SECRET) };
        case 1:
          return { status: 401 };
        case 2:
          return { status: 404 };
        default:
          return { status: 500 };
      }
    });

    if(!!result.cookie) {
      res.cookie("token", result.cookie, { sameSite: "lax" });
      res.cookie("username", username, { sameSite: "lax" });
    }

    res.status(result.status).send();
  } else {
    res.status(400).send();
  }
});

const userExists = async (session, username) => await session.executeRead(async tx => {
  return (await tx.run(
    'MATCH (u:user { username: $username }) RETURN u;',
    { username }
  )).records.length > 0;
});

const createUser = (username, password) => async (session) => {
  let result = 0; // successful write
  if(!(await userExists(session, username))) {
    try {
      await session.executeWrite(async tx => {
        return await tx.run(
          'CREATE (:user { username: $username, password: $password });',
          {
            username,
            password: pbkdf2Sync(password, process.env.SPICE, 1000, 64, 'sha512').toString('hex')
          }
        );
      });
    } catch(error) {
      console.log(error);
      result = -2; // write unsuccessful
    }
  } else {
    result = 1; // user already exists
  }

  return result;
};

app.post('/api/register', async (req, res) => {
  let result = { status: 400 };

  if(
    req.body.username !== undefined &&
    req.body.password !== undefined
  ) {
    const username = req.body.username.trim();

    if(
      !!username.match(/^[a-zA-Z0-9_]+$/) &&
      !!req.body.password.match(/^(?=(.*[0-9]){2,})(?=(.*[a-z]){2,})(?=(.*[A-Z]){2,})(?=(.*[!@#$%^&*()\-__+.]){1,}).{8,}$/)
    ) {
      result = await execQuery(createUser(username, req.body.password), (n) => {
        switch(n) {
          case 0:
            return { status: 200 };
          case 1:
            return { status: 409 };
          default:
            return { status: 500 };
        }
      });
    }
  }

  res.status(result.status).send();
});

const saveScore = (username, score) => async (session) => {
  let result = 0;
  if(await userExists(session, username)) {
    try {
      await session.executeWrite(async tx => {
        return await tx.run(
          'MATCH (u:user { username: $username }) CREATE (u)-[:SCORED { datetime: datetime() }]->(:score { value: $score, id: $id });',
          { username, score, id: uuidv4() }
        );
      });
    } catch(error) {
      console.log(error);
      result = -2; // 500
    }
  } else {
    result = 1;
  }

  return result;
};

app.post('/api/score', async (req, res) => {
  let result = { status: 400 };
  if(
    req.body.score !== undefined &&
    !!req.body.score.toString().match(/^[0-9]+$/) &&
    req.token !== undefined
  ) {
    await execQuery(saveScore(req.token.username, req.body.score), (n) => {
      switch(n) {
        case 0:
          result.status = 200;
          break;
        case 1:
          result.status = 404;
          break;
        default:
          result.status = 500;
      }
    });

    if(wsHandlers[req.token.username]) {
      const data = await execQuery(getTopScores(req.token.username), (n) => {
        return n.code === 0 ? n.data : null;
      });
      
      wsHandlers[req.token.username](JSON.stringify(data));
    }
  }

  res.status(result.status).send();
});

const getTopScores = (username) => async (session) => {
  let result = { code: 0 };
  if(await userExists(session, username)) {
    try {
      const queryResult = await session.executeRead(async tx => {
        return await tx.run(
          'MATCH (:user { username: "joe" })-[:SCORED]->(s:score) WITH s ORDER BY s.value DESC WITH collect(s) AS scores UNWIND scores[0..10] as r RETURN r.value',
          { username }
        );
      });

      result.data = queryResult.records.map(record => record.get('r.value'));
    } catch(error) {
      console.log(error);
      result.code = -2; // 500
      result.data = undefined;
    }
  } else {
    result.code = 1;
  }

  return result;
};

app.get('/api/topScores', async (req, res) => {
  const result = { status: 400, data: {} };
  
  if(req.token !== undefined) {
    await execQuery(getTopScores(req.token.username), (n) => {
      switch(n.code) {
        case 0:
          result.data = n.data
          result.status = 200;
          break;
        case 1:
          result.status = 404;
          break;
        default:
          result.status = 500;
      }
    });
  }

  res.status(result.status).json({data: result.data});
});

const getScores = (username) => async (session) => {
  let result = { code: 0 };
  if(await userExists(session, username)) {
    try {
      const queryResult = await session.executeRead(async tx => {
        return await tx.run(
          'MATCH (:user { username: "joe" })-[:SCORED]->(s:score) RETURN s;',
          { username }
        );
      });

      result.data = queryResult.records.map(record => record.get('s').properties);
    } catch(error) {
      console.log(error);
      result.code = -2; // 500
      result.data = undefined;
    }
  } else {
    result.code = 1;
  }

  return result;
};

app.get('/api/scores', async (req, res) => {
  const result = { status: 400, data: {} };
  
  if(req.token !== undefined) {
    await execQuery(getScores(req.token.username), (n) => {
      switch(n.code) {
        case 0:
          result.data = n.data;
          result.status = 200;
          break;
        case 1:
          result.status = 404;
          break;
        default:
          result.status = 500;
      }
    });
  }

  res.status(result.status).json({data: result.data});
});

const deleteScore = (scoreId) => async (session) => {
  let result = 0;

  try {
    await session.executeWrite(async tx => {
      return await tx.run(
        'MATCH ()-[r:SCORED]->(s:score { id: $id }) DELETE r,s;',
        { id: scoreId }
      );
    });
  } catch(error) {
    console.log(error);
    result = -2; // 500
  }

  return result;
};

app.delete('/api/scores', async (req, res) => {
  let status = 400;

  if(
    req.token !== undefined &&
    req.body.scoreId !== undefined
  ) {
    await execQuery(deleteScore(req.body.scoreId), (n) => {
      switch(n) {
        case 0:
          status = 200;
          break;
        default:
          status = 500;
      }
    });
  }

  res.status(status).send();
});

const parseCookie = str =>
  str
    .split(';')
    .map(v => v.split('='))
    .reduce((acc, v) => {
      acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
      return acc;
    }, {});

wsServer.on('connection', function connection(socket, req) {
  const cookies = parseCookie(req.headers.cookie);
  const token = cookies.token;

  jwt.verify(token, process.env.TOKEN_SECRET, (err, payload) => {
    if(!err) {
      wsHandlers[payload.username] = (data) => {
        socket.send(data);
      }
    } else {
      console.log(err);
    }
  });
});
