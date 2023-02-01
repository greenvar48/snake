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
let wsHandlers = {};

let driver = null;

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
  let result = {};

  const queryResult = await session.executeRead(async (tx) =>
    await tx.run(
      'MATCH (u:user { username: $username }) RETURN u;',
      { username }
  ));

  const records = queryResult.records;
  if(records.length > 0) {
    const user = records[0].get("u").properties;
    const passwordsMatch = user.password === crypto.pbkdf2Sync(password, process.env.SPICE, 1000, 64, 'sha512').toString('hex');
    result.status = passwordsMatch ? 200 : 401; // ok or unauthorized
  } else {
    result = 404; // User not found
  }

  return result;
};

const execQuery = async (query) => {
  let result = {};
  let session;

  if(driver !== null) {
    try {
      session = driver.session();
      result = await query(session);
    } catch(error) {
      console.log(error);
      result.status = 500;
    } finally {
      session?.close();
    }
  }
  
  return result;
};

app.post('/api/login', async function(req, res) {
  let result = { status: 400 };

  if(
    req.body.username !== undefined &&
    req.body.password !== undefined
  ) {
    const username = req.body.username.trim();
    const result = await execQuery(userAuth(username, req.body.password));

    if(result.status === 200) {
      res.cookie("token", jwt.sign({ username }, process.env.TOKEN_SECRET), { sameSite: "lax" });
      res.cookie("username", username, { sameSite: "lax" });
    }
  }

  res.status(result.status).send();
});

const userExists = (username) => async (session) => 
  await session.executeRead(async tx => 
    (await tx.run(
      'MATCH (u:user { username: $username }) RETURN u;',
      { username }
    )).records.length > 0
  );

const createUser = (username, password) => async (session) => {
  let result = { status: 200 }; // successful user creation

  if(!(await userExists(username)(session))) {
    await session.executeWrite(async tx => {
      return await tx.run(
        'CREATE (:user { username: $username, password: $password });',
        {
          username,
          password: pbkdf2Sync(password, process.env.SPICE, 1000, 64, 'sha512').toString('hex')
        }
      );
    });
  } else {
    result.status = 409; // user already exists
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
      result = await execQuery(createUser(username, req.body.password));
    }
  }

  res.status(result.status).send();
});

const saveScore = (username, score) => async (session) => {
  let result = { status: 200 };

  if(await userExists(session, username)) {
    await session.executeWrite(async tx => {
      return await tx.run(
        'MATCH (u:user { username: $username }) CREATE (u)-[:SCORED { datetime: datetime() }]->(:score { value: $score, id: $id });',
        { username, score, id: uuidv4() }
      );
    });
  } else {
    result.status = 404;
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
    result = await execQuery(saveScore(req.token.username, req.body.score));

    if(wsHandlers[req.token.username]) {
      const topScoresResult = await execQuery(getTopScores(req.token.username));

      if(topScoresResult.status === 200) {
        wsHandlers[req.token.username](JSON.stringify(topScoresResult.data));
      }
    }
  }

  res.status(result.status).send();
});

const getTopScores = (username) => async (session) => {
  let result = { status: 200 };

  if(await userExists(session, username)) {
    const queryResult = await session.executeRead(async tx => {
      return await tx.run(
        'MATCH (:user { username: $username })-[:SCORED]->(s:score) WITH s ORDER BY s.value DESC WITH collect(s) AS scores UNWIND scores[0..10] as r RETURN r.value',
        { username }
      );
    });

    result.data = queryResult.records.map(record => record.get('r.value'));
  } else {
    result.status = 404;
  }

  return result;
};

app.get('/api/topScores', async (req, res) => {
  let result = { status: 400 };
  
  if(req.token !== undefined) {
    result = await execQuery(getTopScores(req.token.username));
  }

  res.status(result.status).json({data: result.data});
});

const getScores = (username) => async (session) => {
  let result = { status: 200 };

  if(await userExists(session, username)) {
    const queryResult = await session.executeRead(async tx => {
      return await tx.run(
        'MATCH (:user { username: $username })-[:SCORED]->(s:score) RETURN s;',
        { username }
      );
    });

    result.data = queryResult.records.map(record => record.get('s').properties);
  } else {
    result.status = 404;
  }

  return result;
};

app.get('/api/scores', async (req, res) => {
  let result = { status: 400 };
  
  if(req.token !== undefined) {
    result = await execQuery(getScores(req.token.username));
  }

  res.status(result.status).json({data: result.data});
});
/*
const scoreExists = (scoreId) => async (session) => {
  await session.executeRead(async tx =>
    tx.run("MATCH ()-[:SCORED]->(s:score { id: $id }) RETURN S"));
};*/

const deleteScore = (scoreId) => async (session) => {
  await session.executeWrite(async tx => {
    return await tx.run(
      'MATCH ()-[r:SCORED]->(s:score { id: $id }) DELETE r,s;',
      { id: scoreId }
    );
  });

  return { status: 200 };
};

app.delete('/api/scores', async (req, res) => {
  let result = { status: 400 };

  if(
    req.token !== undefined &&
    req.body.scoreId !== undefined
  ) {
    result = await execQuery(deleteScore(req.body.scoreId));
  }

  res.status(result.status).send();
});

app.post('/api/logout', (req, res) => {
  let result = { status: 400 };

  if(req.token !== undefined) {
    res.clearCookie('username', { sameSite: "lax" });
    res.clearCookie('token', { sameSite: "lax" });

    result.status = 200;
  }

  res.status(result.status).send();
});

const changeUsername = (username, newUsername) => async (session) => {
  let result = { status: 200 };

  await session.executeWrite(async tx => {
    return await tx.run(
      'MATCH (u:user { username: $username }) SET u.username=$newUsername;',
      { username, newUsername }
    );
  });

  return result;
};

app.post('/api/changeUsername', async (req, res) => {
  let result = { status: 400 };

  if(
    req.token !== undefined &&
    req.body.username !== undefined &&
    !!req.body.username.trim().match(/^[a-zA-Z0-9_]+$/)
  ) {
    const username = req.body.username.trim();
    result = await execQuery(changeUsername(req.token.username, username));

    if(result.status === 200) {
      res.cookie("token", jwt.sign({ username }, process.env.TOKEN_SECRET), { sameSite: "lax" });
      res.cookie("username", username, { sameSite: "lax"});
    }
  }

  res.status(result.status).send();
});

const getColor = (username) => async (session) => {
  let result = { status: 200 };

  const queryResult = await session.executeRead(async tx =>
    await tx.run("MATCH (u:user { username: $username }) RETURN u.color;", { username })
  );

  if(queryResult.records.length > 0) {
    result.color = queryResult.records[0].get("u.color");
  } else {
    result.status = 404;
  }

  return result;
}

app.get('/api/color', async (req, res) => {
  let result = { status: 400 };

  if(req.token !== undefined) {
    result = await execQuery(getColor(req.token.username));
  }

  res.status(result.status).json({ color: result.color });
});

const setColor = (username, color) => async (session) => {
  await session.executeWrite(async tx =>
    await tx.run("MATCH (u:user { username: $username }) SET u.color=$color;",
    { username, color })
  );

  return { status: 200 };
};

app.post('/api/color', async (req, res) => {
  let result = { status: 400 };

  if(
    req.token !== undefined &&
    req.body.color !== undefined &&
    !!req.body.color.match(/^#[0-9a-f]{6}([0-9a-f]{2})?$/)
  ) {
    result = await execQuery(setColor(req.token.username, req.body.color));
  }

  res.status(result.status).send();
});

const getCanvasSize = (username) => async (session) => {
  let result = { status: 200 };

  const queryResult = await session.executeRead(async tx =>
    await tx.run("MATCH (u:user { username: $username }) RETURN u.canvasSize;", { username })
  );

  if(queryResult.records.length > 0) {
    result.canvasSize = queryResult.records[0].get("u.canvasSize");
  } else {
    result.status = 404;
  }

  return result;
}

app.get('/api/canvasSize', async (req, res) => {
  let result = { status: 400 };

  if(req.token !== undefined) {
    result = await execQuery(getCanvasSize(req.token.username));
  }

  res.status(result.status).json({ canvasSize: result.canvasSize });
});

const setCanvasSize = (username, canvasSize) => async (session) => {
  await session.executeWrite(async tx =>
    await tx.run("MATCH (u:user { username: $username }) SET u.canvasSize=$canvasSize;",
    { username, canvasSize })
  );

  return { status: 200 };
};

app.post('/api/canvasSize', async (req, res) => {
  let result = { status: 400 };

  if(
    req.token !== undefined &&
    req.body.canvasSize !== undefined &&
    req.body.canvasSize > 0
  ) {
    result = await execQuery(setCanvasSize(req.token.username, req.body.canvasSize));
  }

  res.status(result.status).send();
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
  if(req.headers.cookie) {
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
  } else {
    socket.close();
  }
});
